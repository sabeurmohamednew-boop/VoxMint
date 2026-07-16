import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getVoiceProvider } from "@/lib/providers";
import type { UsageDto } from "@/lib/types/dto";

export const planLimits = {
  FREE: { characters: 10_000, voices: 2 },
  PRO: { characters: 100_000, voices: 20 },
} as const;

export function currentPeriodKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export async function getUsage(userId: string): Promise<UsageDto> {
  const periodKey = currentPeriodKey();
  const provider = getVoiceProvider();
  const [user, usage, voicesUsed] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true } }),
    prisma.monthlyUsage.findUnique({ where: { userId_periodKey: { userId, periodKey } } }),
    prisma.voice.count({
      where: {
        userId,
        provider: provider.name,
        deletedAt: null,
        status: { not: "DELETED" },
      },
    }),
  ]);
  const limits = planLimits[user.plan];
  return {
    plan: user.plan,
    periodKey,
    charactersUsed: usage?.charactersUsed ?? 0,
    characterLimit: limits.characters,
    voicesUsed,
    voiceLimit: limits.voices,
  };
}
