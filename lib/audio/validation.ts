import "server-only";

import { fileTypeFromBuffer } from "file-type";
import { parseBuffer } from "music-metadata";
import { AppError } from "@/lib/api/response";
import { getEnv } from "@/lib/config/env";
import { detectAudioSignature, signatureMatchesMime } from "@/lib/audio/signature";

const SUPPORTED_TYPES = new Set([
  "audio/flac",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
]);

export type ValidatedAudio = {
  bytes: Uint8Array;
  mimeType: string;
  extension: string;
  durationMs: number;
  sanitizedName: string;
};

function sanitizedUploadName(name: string, extension: string): string {
  const base = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} ._'\-]/gu, "")
    .trim()
    .slice(0, 80) || "voice-sample";
  return `${base}.${extension}`;
}

export async function validateAudioFile(file: File): Promise<ValidatedAudio> {
  const env = getEnv();
  if (file.size <= 0) throw new AppError("EMPTY_FILE", "Choose an audio file that is not empty.", 422);
  if (file.size > env.VOICE_SAMPLE_MAX_BYTES) {
    throw new AppError("FILE_TOO_LARGE", "The sample must be 10 MB or smaller.", 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(bytes);
  if (!detected || !SUPPORTED_TYPES.has(detected.mime)) {
    throw new AppError("UNSUPPORTED_AUDIO", "The selected format is not supported.", 422);
  }

  let durationSeconds: number | undefined;
  try {
    const metadata = await parseBuffer(bytes, {
      mimeType: detected.mime,
      size: bytes.byteLength,
    });
    durationSeconds = metadata.format.duration;
  } catch {
    throw new AppError("UNDECODABLE_AUDIO", "This audio file could not be decoded.", 422);
  }

  if (!durationSeconds || !Number.isFinite(durationSeconds)) {
    throw new AppError("UNKNOWN_DURATION", "The sample duration could not be verified.", 422);
  }
  if (durationSeconds < env.VOICE_SAMPLE_MIN_SECONDS) {
    throw new AppError("SAMPLE_TOO_SHORT", "The sample is too short.", 422);
  }
  if (durationSeconds > env.VOICE_SAMPLE_MAX_SECONDS) {
    throw new AppError(
      "SAMPLE_TOO_LONG",
      `Keep the sample under ${env.VOICE_SAMPLE_MAX_SECONDS} seconds.`,
      422,
    );
  }

  return {
    bytes,
    mimeType: detected.mime,
    extension: detected.ext,
    durationMs: Math.round(durationSeconds * 1000),
    sanitizedName: sanitizedUploadName(file.name, detected.ext),
  };
}

export function validateGeneratedAudio(bytes: Uint8Array, mimeType: string): void {
  if (!bytes.byteLength) {
    throw new AppError("EMPTY_PROVIDER_AUDIO", "The audio provider returned an empty file.", 502);
  }
  if (!new Set(["audio/wav", "audio/mpeg"]).has(mimeType)) {
    throw new AppError("INVALID_PROVIDER_AUDIO", "The audio provider returned an unsupported format.", 502);
  }
  if (!signatureMatchesMime(detectAudioSignature(bytes.subarray(0, 16)), mimeType)) {
    throw new AppError("INVALID_PROVIDER_AUDIO", "The audio provider returned invalid audio data.", 502);
  }
}
