import "server-only";

import { AppError } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";

export async function requireOwnedVoice(userId: string, voiceId: string) {
  const voice = await prisma.voice.findFirst({
    where: { id: voiceId, userId, deletedAt: null, status: { not: "DELETED" } },
  });
  if (!voice) throw new AppError("VOICE_NOT_FOUND", "Voice not found.", 404);
  return voice;
}

export async function requireOwnedGeneration(userId: string, generationId: string) {
  const generation = await prisma.generation.findFirst({
    where: { id: generationId, userId, deletedAt: null, status: { not: "DELETED" } },
  });
  if (!generation) throw new AppError("GENERATION_NOT_FOUND", "Generation not found.", 404);
  return generation;
}

export async function requireOwnedAudioObject(userId: string, generationId: string) {
  const generation = await prisma.generation.findFirst({
    where: { id: generationId, userId, deletedAt: null, status: "READY" },
    include: { voice: { select: { name: true } } },
  });
  if (!generation?.storageKey || !generation.mimeType) {
    throw new AppError("AUDIO_NOT_FOUND", "Audio is not available.", 404);
  }
  return generation;
}
