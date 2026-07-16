import type { Generation, Voice } from "@/app/generated/prisma/client";
import type { GenerationDto, VoiceDto } from "@/lib/types/dto";

type VoiceWithGenerationCount = Voice & {
  _count?: { generations: number };
};

export function voiceDto(voice: VoiceWithGenerationCount): VoiceDto {
  return {
    id: voice.id,
    provider: voice.provider,
    name: voice.name,
    description: voice.description,
    primaryLanguage: voice.primaryLanguage,
    status: voice.status,
    createdAt: voice.createdAt.toISOString(),
    lastUsedAt: voice.lastUsedAt?.toISOString() ?? null,
    sourceDurationMs: voice.sourceDurationMs,
    generationCount: voice._count?.generations ?? 0,
  };
}

type GenerationWithVoice = Generation & { voice: Pick<Voice, "name"> };

export function generationDto(generation: GenerationWithVoice, audioAvailable = generation.status === "READY"): GenerationDto {
  return {
    id: generation.id,
    provider: generation.provider === "cartesia" ? "cartesia" : "mock",
    voiceId: generation.voiceId,
    voiceName: generation.voice.name,
    title: generation.title,
    text: generation.text,
    characterCount: generation.characterCount,
    language: generation.language,
    status: generation.status,
    mimeType: generation.mimeType,
    durationMs: generation.durationMs,
    createdAt: generation.createdAt.toISOString(),
    completedAt: generation.completedAt?.toISOString() ?? null,
    errorMessageSafe: generation.errorMessageSafe,
    audioUrl: generation.status === "READY" && audioAvailable
      ? `/api/generation-audio/${generation.id}`
      : null,
    audioAvailable: generation.status === "READY" && audioAvailable,
  };
}
