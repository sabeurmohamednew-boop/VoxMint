import "server-only";

import { createHash } from "node:crypto";
import { parseBuffer } from "music-metadata";
import { Prisma } from "@/app/generated/prisma/client";
import { AppError } from "@/lib/api/response";
import { extensionForMime } from "@/lib/audio/utils";
import { validateGeneratedAudio } from "@/lib/audio/validation";
import { getEnv } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { ProviderAuthenticationError, ProviderError, ProviderRateLimitError, ProviderTimeoutError } from "@/lib/providers/errors";
import { isVoiceCompatibleWithProvider } from "@/lib/providers/compatibility";
import { getVoiceProvider } from "@/lib/providers";
import { assertVoiceOperationsEnabled, consumeOperationLimits, withProviderConcurrency } from "@/lib/rate-limit/rate-limiter";
import { getObjectStorage } from "@/lib/storage";
import { generationStorageKey } from "@/lib/storage/object-storage";
import type { GenerationDto } from "@/lib/types/dto";
import { generationSchema } from "@/lib/validation/schemas";
import { generationDto } from "@/server/services/mappers";
import { currentPeriodKey, planLimits } from "@/server/services/usage-service";
import { requireOwnedAudioObject, requireOwnedGeneration, requireOwnedVoice } from "@/server/services/ownership-service";
import { logger, safeUserId } from "@/lib/logging/logger";
import { compensateStoredObject } from "@/server/services/storage-compensation";
import { deriveGenerationTitle } from "@/lib/generations/title";

export async function listGenerations(userId: string, limit = 50, provider?: "mock" | "cartesia"): Promise<GenerationDto[]> {
  const generations = await prisma.generation.findMany({
    where: { userId, deletedAt: null, status: { not: "DELETED" }, provider },
    include: { voice: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });
  const storage = getObjectStorage();
  return Promise.all(generations.map(async (generation) => {
    const audioAvailable = generation.status === "READY" && Boolean(generation.storageKey) &&
      await storage.exists(generation.storageKey!).catch(() => false);
    return generationDto(generation, audioAvailable);
  }));
}

async function measuredDuration(bytes: Uint8Array, mimeType: string): Promise<number | null> {
  try {
    const metadata = await parseBuffer(bytes, { mimeType, size: bytes.byteLength });
    return metadata.format.duration ? Math.round(metadata.format.duration * 1000) : null;
  } catch {
    return null;
  }
}

export type GenerationTestFailureMode =
  | "database-before-provider"
  | "provider-authentication"
  | "provider-rate-limit"
  | "provider-timeout"
  | "provider-empty-audio"
  | "provider-malformed-audio"
  | "provider-delay"
  | "storage"
  | "db-finalize";

const generationTestFailureModes = new Set<GenerationTestFailureMode>([
  "database-before-provider",
  "provider-authentication",
  "provider-rate-limit",
  "provider-timeout",
  "provider-empty-audio",
  "provider-malformed-audio",
  "provider-delay",
  "storage",
  "db-finalize",
]);

export function parseGenerationTestFailureMode(value: string | null): GenerationTestFailureMode | null {
  return value && generationTestFailureModes.has(value as GenerationTestFailureMode)
    ? value as GenerationTestFailureMode
    : null;
}

export async function generateForUser(userId: string, unknownInput: unknown, requestIp = "unknown", requestId?: string, testFailureMode: GenerationTestFailureMode | null = null, testGenerationRateLimit?: number): Promise<GenerationDto> {
  const startedAt = Date.now();
  const env = getEnv();
  const input = generationSchema(env.GENERATION_MAX_CHARACTERS).parse(unknownInput);

  const existing = await prisma.generation.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
    include: { voice: { select: { name: true } } },
  });
  if (existing) return generationDto(existing);
  assertVoiceOperationsEnabled();
  await consumeOperationLimits("generate", userId, requestIp, {
    e2eGenerationLimit: testGenerationRateLimit,
  });

  const voice = await requireOwnedVoice(userId, input.voiceId);
  if (voice.status !== "READY") throw new AppError("VOICE_NOT_READY", "This voice is not ready yet.", 409);
  const provider = getVoiceProvider();
  if (!isVoiceCompatibleWithProvider(voice.provider, provider.name)) {
    const message =
      voice.provider === "mock" && provider.name === "cartesia"
        ? "This demo voice is unavailable while Cartesia is active. Choose a Cartesia voice."
        : `This voice belongs to a different provider. Choose a ${provider.name} voice.`;
    throw new AppError("VOICE_PROVIDER_MISMATCH", message, 409);
  }

  const characterCount = Array.from(input.text).length;
  const textHash = createHash("sha256").update(input.text).digest("hex");
  const periodKey = currentPeriodKey();
  if (testFailureMode === "database-before-provider") {
    throw new AppError("TEST_DATABASE_UNAVAILABLE", "The generation could not be started.", 500);
  }
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  let pending: { id: string };
  try {
    pending = await prisma.$transaction(
    async (transaction) => {
      const user = await transaction.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true } });
      const current = await transaction.usageLedger.aggregate({
        where: {
          userId,
          periodKey,
          type: "TTS_CHARACTERS",
          status: { in: ["RESERVED", "COMMITTED"] },
          generation: { provider: provider.name },
        },
        _sum: { quantity: true },
      });
      const [daily, globalDaily] = await Promise.all([
        transaction.usageLedger.aggregate({
          where: { userId, type: "TTS_CHARACTERS", status: { in: ["RESERVED", "COMMITTED"] }, createdAt: { gte: dayStart }, generation: { provider: provider.name } },
          _sum: { quantity: true },
        }),
        transaction.usageLedger.aggregate({
          where: { type: "TTS_CHARACTERS", status: { in: ["RESERVED", "COMMITTED"] }, createdAt: { gte: dayStart }, generation: { provider: provider.name } },
          _sum: { quantity: true },
        }),
      ]);
      const monthlyLimit = Math.min(planLimits[user.plan].characters, env.MONTHLY_CHARACTER_LIMIT);
      if ((current._sum.quantity ?? 0) + characterCount > monthlyLimit) {
        throw new AppError("QUOTA_EXCEEDED", "You have reached this month’s character limit.", 403);
      }
      if ((daily._sum.quantity ?? 0) + characterCount > env.DAILY_CHARACTER_LIMIT) {
        throw new AppError("DAILY_QUOTA_EXCEEDED", "You have reached today’s VoxMint generation ceiling.", 403);
      }
      if ((globalDaily._sum.quantity ?? 0) + characterCount > env.GLOBAL_DAILY_CHARACTER_LIMIT) {
        throw new AppError("GLOBAL_BUDGET_REACHED", "New generations are paused because this deployment reached its daily ceiling.", 503);
      }

      const generation = await transaction.generation.create({
        data: {
          userId,
          voiceId: voice.id,
          retryOfId: input.retryOfId,
          idempotencyKey: input.idempotencyKey,
          title: deriveGenerationTitle(input.text),
          text: input.text,
          textHash,
          characterCount,
          language: input.language,
          style: input.style,
          provider: provider.name,
          providerModel: env.CARTESIA_TTS_MODEL,
          status: "PROCESSING",
        },
      });
      await transaction.usageLedger.create({
        data: {
          userId,
          generationId: generation.id,
          type: "TTS_CHARACTERS",
          quantity: characterCount,
          status: "RESERVED",
          periodKey,
          idempotencyKey: `tts:${input.idempotencyKey}`,
        },
      });
      return generation;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    const duplicate = await prisma.generation.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
      include: { voice: { select: { name: true } } },
    }).catch(() => null);
    if (duplicate) return generationDto(duplicate);
    throw error;
  }

  let storedKey: string | undefined;
  try {
    if (testFailureMode === "provider-authentication") throw new ProviderAuthenticationError("Injected test authentication failure");
    if (testFailureMode === "provider-rate-limit") throw new ProviderRateLimitError("Injected test rate limit");
    if (testFailureMode === "provider-timeout") throw new ProviderTimeoutError("Injected test timeout");
    if (testFailureMode === "provider-delay") await new Promise((resolve) => setTimeout(resolve, 350));
    let generated = await withProviderConcurrency(userId, () => provider.synthesize({
      providerVoiceId: voice.providerVoiceId,
      text: input.text,
      language: input.language,
      model: env.CARTESIA_TTS_MODEL,
    }));
    if (testFailureMode === "provider-empty-audio") {
      generated = { ...generated, bytes: new Uint8Array() };
    }
    if (testFailureMode === "provider-malformed-audio") {
      generated = { ...generated, bytes: new TextEncoder().encode("not audio") };
    }
    validateGeneratedAudio(generated.bytes, generated.mimeType);
    if (testFailureMode === "storage") throw new Error("Injected test storage failure");
    const extension = extensionForMime(generated.mimeType) ?? "wav";
    storedKey = generationStorageKey(userId, pending.id, extension);
    const stored = await getObjectStorage().put({
      key: storedKey,
      bytes: generated.bytes,
      contentType: generated.mimeType,
      metadata: { generationId: pending.id },
    });
    const durationMs = generated.durationMs ?? (await measuredDuration(generated.bytes, generated.mimeType));
    if (testFailureMode === "db-finalize") throw new Error("Injected test finalization failure");

    const ready = await prisma.$transaction(async (transaction) => {
      const generation = await transaction.generation.update({
        where: { id: pending.id },
        data: {
          status: "READY",
          storageKey: stored.key,
          mimeType: stored.contentType,
          fileSizeBytes: stored.size,
          durationMs,
          providerRequestId: generated.providerRequestId,
          completedAt: new Date(),
        },
        include: { voice: { select: { name: true } } },
      });
      await transaction.usageLedger.updateMany({
        where: { generationId: pending.id, status: "RESERVED" },
        data: { status: "COMMITTED" },
      });
      await transaction.monthlyUsage.upsert({
        where: { userId_periodKey: { userId, periodKey } },
        create: { userId, periodKey, charactersUsed: characterCount },
        update: { charactersUsed: { increment: characterCount } },
      });
      await transaction.voice.update({ where: { id: voice.id }, data: { lastUsedAt: new Date() } });
      return generation;
    });
    logger.info("generation.create", { requestId, user: safeUserId(userId), provider: provider.name, status: "ready", latencyMs: Date.now() - startedAt, characterCount });
    return generationDto(ready);
  } catch (error) {
    if (storedKey) {
      await compensateStoredObject(getObjectStorage(), storedKey, { requestId, user: safeUserId(userId), provider: provider.name });
    }
    const safeMessage = error instanceof ProviderError
      ? error.safeMessage
      : error instanceof AppError
        ? error.message
        : "Audio could not be generated.";
    const errorCategory = error instanceof ProviderError
      ? error.category
      : error instanceof AppError
        ? error.code
        : "GENERATION_FAILED";
    await prisma.$transaction([
      prisma.generation.update({
        where: { id: pending.id },
        data: {
          status: "FAILED",
          errorCode: errorCategory,
          errorMessageSafe: safeMessage,
          completedAt: new Date(),
        },
      }),
      prisma.usageLedger.updateMany({
        where: { generationId: pending.id, status: "RESERVED" },
        data: { status: "RELEASED" },
      }),
    ]);
    logger.error("generation.create", { requestId, user: safeUserId(userId), provider: provider.name, status: "failed", latencyMs: Date.now() - startedAt, characterCount, category: errorCategory });
    const status = error instanceof ProviderError ? 502 : error instanceof AppError ? error.status : 500;
    throw new AppError("GENERATION_FAILED", safeMessage, status);
  }
}

export async function getGenerationAudio(userId: string, generationId: string) {
  return requireOwnedAudioObject(userId, generationId);
}

export async function getGenerationForUser(userId: string, generationId: string): Promise<GenerationDto> {
  await requireOwnedGeneration(userId, generationId);
  const generation = await prisma.generation.findFirstOrThrow({
    where: { id: generationId, userId, deletedAt: null },
    include: { voice: { select: { name: true } } },
  });
  const audioAvailable = generation.status === "READY" && Boolean(generation.storageKey) &&
    await getObjectStorage().exists(generation.storageKey!).catch(() => false);
  return generationDto(generation, audioAvailable);
}

export async function deleteGenerationForUser(userId: string, generationId: string): Promise<void> {
  const generation = await prisma.generation.findFirst({ where: { id: generationId, userId } });
  if (!generation || generation.status === "DELETED") return;
  await prisma.generation.update({ where: { id: generation.id }, data: { status: "DELETING" } });
  if (generation.storageKey) await getObjectStorage().delete(generation.storageKey);
  await prisma.generation.update({
    where: { id: generation.id },
    data: { status: "DELETED", deletedAt: new Date(), storageKey: null },
  });
}

export async function renameGenerationForUser(
  userId: string,
  generationId: string,
  title: unknown,
): Promise<GenerationDto> {
  const parsedTitle = typeof title === "string" ? title.trim() : "";
  if (parsedTitle.length < 2 || parsedTitle.length > 80) {
    throw new AppError("INVALID_TITLE", "Use a title between 2 and 80 characters.", 422);
  }
  const generation = await requireOwnedGeneration(userId, generationId);
  return generationDto(
    await prisma.generation.update({
      where: { id: generation.id },
      data: { title: parsedTitle },
      include: { voice: { select: { name: true } } },
    }),
  );
}
