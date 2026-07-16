import "server-only";

import { AppError } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { updateAccountSchema } from "@/lib/validation/schemas";
import { getObjectStorage } from "@/lib/storage";
import { getVoiceProvider } from "@/lib/providers";
import { getEnv } from "@/lib/config/env";
import { logger, safeUserId } from "@/lib/logging/logger";

export async function getAccount(userId: string) {
  const account = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      plan: true,
      preferredLanguage: true,
      preferredAudioFormat: true,
      theme: true,
      retentionDays: true,
    },
  });
  if (!account) throw new AppError("ACCOUNT_NOT_FOUND", "Account not found.", 404);
  return { ...account, emailVerified: Boolean(account.emailVerified) };
}

export async function updateAccount(userId: string, unknownInput: unknown) {
  const input = updateAccountSchema.parse(unknownInput);
  if (input.retentionDays && !getEnv().RETENTION_WORKER_ENABLED) {
    throw new AppError("RETENTION_UNAVAILABLE", "Automated retention is not enabled on this deployment.", 409);
  }
  return prisma.user.update({
    where: { id: userId },
    data: input,
    select: {
      id: true,
      name: true,
      email: true,
      preferredLanguage: true,
      preferredAudioFormat: true,
      theme: true,
      retentionDays: true,
    },
  });
}

export async function deleteAccount(userId: string): Promise<void> {
  const [voices, generations] = await Promise.all([
    prisma.voice.findMany({ where: { userId, deletedAt: null } }),
    prisma.generation.findMany({ where: { userId, deletedAt: null } }),
  ]);
  const provider = getVoiceProvider();
  if (!provider.capabilities.deletion || voices.some((voice) => voice.provider !== provider.name)) {
    throw new AppError("ACCOUNT_DELETE_PROVIDER_MISMATCH", "Account deletion requires the provider used by every active voice.", 409);
  }
  await prisma.$transaction([
    prisma.voice.updateMany({ where: { userId, deletedAt: null }, data: { status: "DELETING" } }),
    prisma.generation.updateMany({ where: { userId, deletedAt: null }, data: { status: "DELETING" } }),
  ]);
  const failures: unknown[] = [];
  for (const voice of voices) {
    await provider.deleteVoice(voice.providerVoiceId).catch((error) => failures.push(error));
  }
  for (const generation of generations) {
    if (generation.storageKey) await getObjectStorage().delete(generation.storageKey).catch((error) => failures.push(error));
  }
  if (failures.length) {
    logger.error("account.delete", { user: safeUserId(userId), status: "cleanup_pending", category: "ACCOUNT_DELETE_INCOMPLETE", failureCount: failures.length });
    throw new AppError("ACCOUNT_DELETE_INCOMPLETE", "Account deletion is pending. The account remains active; retry after provider or storage recovery.", 502);
  }
  const now = new Date();
  await prisma.$transaction([
    prisma.generation.updateMany({ where: { userId }, data: { deletedAt: now, status: "DELETED", storageKey: null } }),
    prisma.voice.updateMany({ where: { userId }, data: { deletedAt: now, status: "DELETED" } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.user.update({ where: { id: userId }, data: { deletedAt: now, name: "Deleted user", image: null } }),
  ]);
  logger.info("account.delete", { user: safeUserId(userId), status: "deleted", provider: provider.name });
}
