import type { Generation, Voice } from "@/app/generated/prisma/client";
import type { GenerationDto, VoiceDto } from "@/lib/types/dto";

export function voiceDto(voice: Voice): VoiceDto {
  return {
    id: voice.id,
    name: voice.name,
    description: voice.description,
    primaryLanguage: voice.primaryLanguage,
    status: voice.status,
    createdAt: voice.createdAt.toISOString(),
    lastUsedAt: voice.lastUsedAt?.toISOString() ?? null,
    sourceDurationMs: voice.sourceDurationMs,
  };
}

type GenerationWithVoice = Generation & { voice: Pick<Voice, "name"> };

export function generationDto(generation: GenerationWithVoice): GenerationDto {
  return {
    id: generation.id,
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
    audioUrl:
      generation.status === "READY"
        ? `/api/generations/${generation.id}/audio`
        : null,
  };
}
