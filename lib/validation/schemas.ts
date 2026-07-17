import { z } from "zod";
import { SUPPORTED_LANGUAGE_CODES } from "@/lib/languages";

const voiceNamePattern = /^(?=.*[\p{L}\p{N}])[\p{L}\p{N}][\p{L}\p{N} '\-]*[\p{L}\p{N}]$/u;

export const voiceNameSchema = z
  .string()
  .trim()
  .min(2, "Use at least 2 characters.")
  .max(50, "Use no more than 50 characters.")
  .regex(voiceNamePattern, "Use letters, numbers, spaces, hyphens, or apostrophes.");

export const languageSchema = z.enum(SUPPORTED_LANGUAGE_CODES);

export const cloneMetadataSchema = z.object({
  name: voiceNameSchema,
  description: z.string().trim().max(160).optional().default(""),
  language: languageSchema.default("en"),
  consent: z.literal("true", {
    error: "You must confirm that you have permission to use this voice.",
  }),
});

export function generationSchema(maxCharacters: number) {
  return z.object({
    voiceId: z.string().cuid(),
    text: z
      .string()
      .transform((value) => value.replace(/\r\n?/g, "\n").trim())
      .pipe(
        z
          .string()
          .min(1, "Enter a script to generate audio.")
          .max(maxCharacters, `Scripts are limited to ${maxCharacters.toLocaleString()} characters.`),
      ),
    language: languageSchema.default("en"),
    style: z.literal("normal").default("normal"),
    idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/),
    retryOfId: z.string().cuid().optional(),
  });
}

export const updateVoiceSchema = z
  .object({
    name: voiceNameSchema.optional(),
    description: z.string().trim().max(160).nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.description !== undefined, {
    message: "Provide a name or description to update.",
  });

export const updateAccountSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  preferredLanguage: languageSchema.optional(),
  preferredAudioFormat: z.enum(["wav", "mp3"]).optional(),
  theme: z.enum(["SYSTEM", "DARK", "LIGHT"]).optional(),
  retentionDays: z.union([z.literal(7), z.literal(30), z.literal(90), z.null()]).optional(),
});
