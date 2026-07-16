import "server-only";

import { AppError } from "@/lib/api/response";
import type { ValidatedAudio } from "@/lib/audio/validation";
import { prisma } from "@/lib/db/prisma";
import { isVoiceCompatibleWithProvider } from "@/lib/providers/compatibility";
import { ProviderError } from "@/lib/providers/errors";
import { getVoiceProvider } from "@/lib/providers";
import { assertVoiceOperationsEnabled, consumeOperationLimits, getRateLimiter, configuredRateLimits, withProviderConcurrency } from "@/lib/rate-limit/rate-limiter";
import type { VoiceDto } from "@/lib/types/dto";
import { updateVoiceSchema } from "@/lib/validation/schemas";
import { voiceDto } from "@/server/services/mappers";
import { planLimits } from "@/server/services/usage-service";
import { requireOwnedVoice } from "@/server/services/ownership-service";
import { getObjectStorage } from "@/lib/storage";
import { logger, safeUserId } from "@/lib/logging/logger";

export const CONSENT_VERSION = "2026-07-16";
export const CONSENT_STATEMENT =
  "I confirm that I own this voice or have explicit permission from the speaker to clone and use it.";

export async function listVoices(userId: string, limit = 50): Promise<VoiceDto[]> {
  const voices = await prisma.voice.findMany({
    where: { userId, deletedAt: null, status: { not: "DELETED" } },
    orderBy: [{ lastUsedAt: "desc" }, { createdAt: "desc" }],
    take: Math.min(limit, 100),
    include: {
      _count: {
        select: { generations: { where: { deletedAt: null } } },
      },
      generations: {
        where: { deletedAt: null, status: "READY", storageKey: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  const storage = getObjectStorage();
  return Promise.all(voices.map(async (voice) => {
    const latest = voice.generations[0];
    const available = latest?.storageKey ? await storage.exists(latest.storageKey).catch(() => false) : false;
    return voiceDto(voice, available);
  }));
}

export async function getVoiceForUser(userId: string, voiceId: string): Promise<VoiceDto> {
  await requireOwnedVoice(userId, voiceId);
  const voice = await prisma.voice.findFirstOrThrow({
    where: { id: voiceId, userId, deletedAt: null },
    include: {
      _count: { select: { generations: { where: { deletedAt: null } } } },
      generations: { where: { deletedAt: null, status: "READY", storageKey: { not: null } }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const latest = voice.generations[0];
  const available = latest?.storageKey ? await getObjectStorage().exists(latest.storageKey).catch(() => false) : false;
  return voiceDto(voice, available);
}

export async function cloneVoiceForUser(input: {
  userId: string;
  name: string;
  description?: string;
  language: string;
  audio: ValidatedAudio;
  userAgentHash?: string;
  requestIp?: string;
  idempotencyKey?: string;
  requestId?: string;
}): Promise<VoiceDto> {
  const startedAt = Date.now();
  assertVoiceOperationsEnabled();
  const idempotencyKey = input.idempotencyKey?.trim();
  if (!idempotencyKey || !/^[A-Za-z0-9_-]{8,100}$/.test(idempotencyKey)) {
    throw new AppError("IDEMPOTENCY_KEY_REQUIRED", "A valid clone request key is required.", 422);
  }
  const existing = await prisma.voice.findUnique({
    where: { userId_idempotencyKey: { userId: input.userId, idempotencyKey } },
    include: { _count: { select: { generations: { where: { deletedAt: null } } } } },
  });
  if (existing) return voiceDto(existing);
  await consumeOperationLimits("clone", input.userId, input.requestIp ?? "unknown");
  const provider = getVoiceProvider();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: input.userId }, select: { plan: true } });
  const activeVoices = await prisma.voice.count({
    where: {
      userId: input.userId,
      provider: provider.name,
      deletedAt: null,
      status: { in: ["PROCESSING", "READY"] },
    },
  });
  if (activeVoices >= planLimits[user.plan].voices) {
    throw new AppError("VOICE_QUOTA_EXCEEDED", "You have reached your saved voice limit.", 403);
  }

  if (!provider.capabilities.cloneLanguages.includes(input.language)) {
    throw new AppError("UNSUPPORTED_LANGUAGE", "This language is not supported for voice creation.", 422);
  }

  let cloned: Awaited<ReturnType<typeof provider.cloneVoice>>;
  try {
    cloned = await withProviderConcurrency(input.userId, () => provider.cloneVoice({
      bytes: input.audio.bytes,
      fileName: input.audio.sanitizedName,
      mimeType: input.audio.mimeType,
      name: input.name,
      description: input.description,
      language: input.language,
    }));
  } catch (error) {
    if (error instanceof ProviderError) throw new AppError("PROVIDER_ERROR", error.safeMessage, 502);
    throw error;
  }

  try {
    const voice = await prisma.$transaction(async (transaction) => {
      const created = await transaction.voice.create({
        data: {
          userId: input.userId,
          provider: provider.name,
          providerVoiceId: cloned.providerVoiceId,
          idempotencyKey,
          name: input.name,
          description: input.description || null,
          primaryLanguage: input.language,
          status: cloned.status,
          sourceMimeType: input.audio.mimeType,
          sourceDurationMs: input.audio.durationMs,
          providerModel: null,
          providerMetadata: cloned.metadata,
          consentConfirmedAt: new Date(),
        },
      });
      await transaction.consentRecord.create({
        data: {
          userId: input.userId,
          voiceId: created.id,
          consentVersion: CONSENT_VERSION,
          statement: CONSENT_STATEMENT,
          confirmedAt: new Date(),
          userAgentHash: input.userAgentHash,
        },
      });
      return created;
    });
    logger.info("voice.clone", { requestId: input.requestId, user: safeUserId(input.userId), provider: provider.name, status: "ready", latencyMs: Date.now() - startedAt });
    return voiceDto(voice);
  } catch (error) {
    try {
      await provider.deleteVoice(cloned.providerVoiceId);
    } catch {
      // Cleanup is best effort; provider identifiers are intentionally not logged here.
    }
    const duplicate = await prisma.voice.findUnique({
      where: { userId_idempotencyKey: { userId: input.userId, idempotencyKey } },
      include: { _count: { select: { generations: { where: { deletedAt: null } } } } },
    }).catch(() => null);
    if (duplicate) return voiceDto(duplicate);
    logger.error("voice.clone", { requestId: input.requestId, user: safeUserId(input.userId), provider: provider.name, status: "failed", latencyMs: Date.now() - startedAt });
    throw error;
  }
}

export async function updateVoiceForUser(userId: string, voiceId: string, unknownInput: unknown) {
  await getRateLimiter().consume(`voice-mutation:${userId}`, configuredRateLimits().mutation);
  const input = updateVoiceSchema.parse(unknownInput);
  const voice = await requireOwnedVoice(userId, voiceId);
  const provider = getVoiceProvider();
  if (
    isVoiceCompatibleWithProvider(voice.provider, provider.name) &&
    provider.updateVoice &&
    provider.capabilities.rename
  ) {
    try {
      await provider.updateVoice(voice.providerVoiceId, {
        name: input.name,
        description: input.description ?? undefined,
      });
    } catch (error) {
      if (error instanceof ProviderError) throw new AppError("PROVIDER_ERROR", error.safeMessage, 502);
      throw error;
    }
  }
  return voiceDto(
    await prisma.voice.update({
      where: { id: voice.id },
      data: { name: input.name, description: input.description },
      include: {
        _count: {
          select: { generations: { where: { deletedAt: null } } },
        },
      },
    }),
  );
}

export async function deleteVoiceForUser(userId: string, voiceId: string): Promise<void> {
  await getRateLimiter().consume(`voice-mutation:${userId}`, configuredRateLimits().mutation);
  const voice = await prisma.voice.findFirst({ where: { id: voiceId, userId } });
  if (!voice || voice.status === "DELETED") return;
  await prisma.voice.update({ where: { id: voice.id }, data: { status: "DELETING" } });
  const provider = getVoiceProvider();
  try {
    if (
      isVoiceCompatibleWithProvider(voice.provider, provider.name) &&
      provider.capabilities.deletion
    ) {
      await provider.deleteVoice(voice.providerVoiceId);
    }
  } catch (error) {
    if (error instanceof ProviderError) throw new AppError("DELETE_PENDING", "Voice deletion is pending. Try again.", 502);
    throw error;
  }
  await prisma.voice.update({
    where: { id: voice.id },
    data: { status: "DELETED", deletedAt: new Date() },
  });
}
