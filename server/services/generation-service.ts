import "server-only";

import { createHash } from "node:crypto";
import { parseBuffer } from "music-metadata";
import { Prisma } from "@/app/generated/prisma/client";
import { AppError } from "@/lib/api/response";
import { extensionForMime } from "@/lib/audio/utils";
import { validateGeneratedAudio } from "@/lib/audio/validation";
import { getEnv } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { ProviderError } from "@/lib/providers/errors";
import { isVoiceCompatibleWithProvider } from "@/lib/providers/compatibility";
import { getVoiceProvider } from "@/lib/providers";
import { getRateLimiter, rateLimits } from "@/lib/rate-limit/rate-limiter";
import { getObjectStorage } from "@/lib/storage";
import { generationStorageKey } from "@/lib/storage/object-storage";
import type { GenerationDto } from "@/lib/types/dto";
import { generationSchema } from "@/lib/validation/schemas";
import { generationDto } from "@/server/services/mappers";
import { currentPeriodKey, planLimits } from "@/server/services/usage-service";

export async function listGenerations(userId: string, limit = 50): Promise<GenerationDto[]> {
  const generations = await prisma.generation.findMany({
    where: { userId, deletedAt: null, status: { not: "DELETED" } },
    include: { voice: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });
  return generations.map(generationDto);
}

async function measuredDuration(bytes: Uint8Array, mimeType: string): Promise<number | null> {
  try {
    const metadata = await parseBuffer(bytes, { mimeType, size: bytes.byteLength });
    return metadata.format.duration ? Math.round(metadata.format.duration * 1000) : null;
  } catch {
    return null;
  }
}

export async function generateForUser(userId: string, unknownInput: unknown): Promise<GenerationDto> {
  const env = getEnv();
  const input = generationSchema(env.GENERATION_MAX_CHARACTERS).parse(unknownInput);
  await getRateLimiter().consume(`generate:${userId}`, rateLimits.generate);

  const existing = await prisma.generation.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
    include: { voice: { select: { name: true } } },
  });
  if (existing) return generationDto(existing);

  const voice = await prisma.voice.findFirst({
    where: { id: input.voiceId, userId, deletedAt: null },
  });
  if (!voice) throw new AppError("VOICE_NOT_FOUND", "Voice not found.", 404);
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
  const pending = await prisma.$transaction(
    async (transaction) => {
      const user = await transaction.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true } });
      const current = await transaction.usageLedger.aggregate({
        where: {
          userId,
          periodKey,
          type: "TTS_CHARACTERS",
          status: { in: ["RESERVED", "COMMITTED"] },
        },
        _sum: { quantity: true },
      });
      if ((current._sum.quantity ?? 0) + characterCount > planLimits[user.plan].characters) {
        throw new AppError("QUOTA_EXCEEDED", "You have reached this month’s character limit.", 403);
      }

      const generation = await transaction.generation.create({
        data: {
          userId,
          voiceId: voice.id,
          retryOfId: input.retryOfId,
          idempotencyKey: input.idempotencyKey,
          title: input.text.slice(0, 48),
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

  let storedKey: string | undefined;
  try {
    const generated = await provider.synthesize({
      providerVoiceId: voice.providerVoiceId,
      text: input.text,
      language: input.language,
      model: env.CARTESIA_TTS_MODEL,
    });
    validateGeneratedAudio(generated.bytes, generated.mimeType);
    const extension = extensionForMime(generated.mimeType) ?? "wav";
    storedKey = generationStorageKey(userId, pending.id, extension);
    const stored = await getObjectStorage().put({
      key: storedKey,
      bytes: generated.bytes,
      contentType: generated.mimeType,
      metadata: { generationId: pending.id },
    });
    const durationMs = generated.durationMs ?? (await measuredDuration(generated.bytes, generated.mimeType));

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
    return generationDto(ready);
  } catch (error) {
    if (storedKey) await getObjectStorage().delete(storedKey).catch(() => undefined);
    const safeMessage = error instanceof ProviderError ? error.safeMessage : "Audio could not be generated.";
    await prisma.$transaction([
      prisma.generation.update({
        where: { id: pending.id },
        data: {
          status: "FAILED",
          errorCode: error instanceof ProviderError ? error.category : "GENERATION_FAILED",
          errorMessageSafe: safeMessage,
          completedAt: new Date(),
        },
      }),
      prisma.usageLedger.updateMany({
        where: { generationId: pending.id, status: "RESERVED" },
        data: { status: "RELEASED" },
      }),
    ]);
    throw new AppError("GENERATION_FAILED", safeMessage, error instanceof ProviderError ? 502 : 500);
  }
}

export async function getGenerationAudio(userId: string, generationId: string) {
  const generation = await prisma.generation.findFirst({
    where: { id: generationId, userId, deletedAt: null, status: "READY" },
    include: { voice: { select: { name: true } } },
  });
  if (!generation?.storageKey || !generation.mimeType) {
    throw new AppError("AUDIO_NOT_FOUND", "Audio is not available.", 404);
  }
  return generation;
}

export async function deleteGenerationForUser(userId: string, generationId: string): Promise<void> {
  await getRateLimiter().consume(`generation-mutation:${userId}`, rateLimits.mutation);
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
  await getRateLimiter().consume(`generation-mutation:${userId}`, rateLimits.mutation);
  const parsedTitle = typeof title === "string" ? title.trim() : "";
  if (parsedTitle.length < 2 || parsedTitle.length > 80) {
    throw new AppError("INVALID_TITLE", "Use a title between 2 and 80 characters.", 422);
  }
  const generation = await prisma.generation.findFirst({
    where: { id: generationId, userId, deletedAt: null },
  });
  if (!generation) throw new AppError("GENERATION_NOT_FOUND", "Generation not found.", 404);
  return generationDto(
    await prisma.generation.update({
      where: { id: generation.id },
      data: { title: parsedTitle },
      include: { voice: { select: { name: true } } },
    }),
  );
}
