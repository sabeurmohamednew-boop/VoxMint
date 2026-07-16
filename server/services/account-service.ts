import "server-only";

import { AppError } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { updateAccountSchema } from "@/lib/validation/schemas";
import { getObjectStorage } from "@/lib/storage";
import { getVoiceProvider } from "@/lib/providers";

export async function getAccount(userId: string) {
  const account = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      plan: true,
      preferredLanguage: true,
      preferredAudioFormat: true,
      theme: true,
      retentionDays: true,
    },
  });
  if (!account) throw new AppError("ACCOUNT_NOT_FOUND", "Account not found.", 404);
  return account;
}

export async function updateAccount(userId: string, unknownInput: unknown) {
  const input = updateAccountSchema.parse(unknownInput);
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
    prisma.generation.findMany({ where: { userId, storageKey: { not: null }, deletedAt: null } }),
  ]);
  const provider = getVoiceProvider();
  for (const voice of voices) {
    if (voice.provider === provider.name && provider.capabilities.deletion) {
      await provider.deleteVoice(voice.providerVoiceId);
    }
  }
  for (const generation of generations) {
    if (generation.storageKey) await getObjectStorage().delete(generation.storageKey);
  }
  const now = new Date();
  await prisma.$transaction([
    prisma.generation.updateMany({ where: { userId }, data: { deletedAt: now, status: "DELETED", storageKey: null } }),
    prisma.voice.updateMany({ where: { userId }, data: { deletedAt: now, status: "DELETED" } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.user.update({ where: { id: userId }, data: { deletedAt: now, name: "Deleted user", image: null } }),
  ]);
}
