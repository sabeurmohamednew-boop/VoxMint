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
  const [user, activeUsage, demoUsage, voicesUsed] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true } }),
    prisma.usageLedger.aggregate({
      where: { userId, periodKey, type: "TTS_CHARACTERS", status: "COMMITTED", generation: { provider: provider.name } },
      _sum: { quantity: true },
    }),
    prisma.usageLedger.aggregate({
      where: { userId, periodKey, type: "TTS_CHARACTERS", status: "COMMITTED", generation: { provider: "mock" } },
      _sum: { quantity: true },
    }),
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
    activeProvider: provider.name,
    periodKey,
    charactersUsed: activeUsage._sum.quantity ?? 0,
    demoCharactersUsed: demoUsage._sum.quantity ?? 0,
    characterLimit: limits.characters,
    voicesUsed,
    voiceLimit: limits.voices,
  };
}
