import "server-only";

import { z } from "zod";

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function optionalEnvString(schema: z.ZodString = z.string()) {
  return z.preprocess(emptyStringToUndefined, schema.optional());
}

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const positiveInteger = (fallback: number) =>
  z.coerce.number().int().positive().default(fallback);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z
      .string()
      .min(1)
      .default("postgresql://postgres:postgres@localhost:5432/voxmint"),
    AUTH_SECRET: optionalEnvString(),
    AUTH_GOOGLE_ID: optionalEnvString(),
    AUTH_GOOGLE_SECRET: optionalEnvString(),
    AUTH_EMAIL_SERVER: optionalEnvString(),
    AUTH_EMAIL_FROM: optionalEnvString(z.string().email()),
    VOICE_PROVIDER: z.enum(["mock", "cartesia"]).default("mock"),
    CARTESIA_API_KEY: optionalEnvString(),
    CARTESIA_API_VERSION: z.string().default("2026-03-01"),
    CARTESIA_TTS_MODEL: z.string().default("sonic-3"),
    STORAGE_PROVIDER: z.enum(["local", "r2"]).default("local"),
    LOCAL_STORAGE_PATH: z.string().default(".data/storage"),
    R2_ACCOUNT_ID: optionalEnvString(),
    R2_ACCESS_KEY_ID: optionalEnvString(),
    R2_SECRET_ACCESS_KEY: optionalEnvString(),
    R2_BUCKET: optionalEnvString(),
    R2_ENDPOINT: optionalEnvString(z.string().url()),
    RATE_LIMIT_PROVIDER: z.enum(["memory", "upstash"]).default("memory"),
    UPSTASH_REDIS_REST_URL: optionalEnvString(z.string().url()),
    UPSTASH_REDIS_REST_TOKEN: optionalEnvString(),
    DEV_BYPASS_AUTH: booleanString,
    ALLOW_MOCK_PROVIDER_IN_PRODUCTION: booleanString,
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    VOICE_SAMPLE_MIN_SECONDS: positiveInteger(3),
    VOICE_SAMPLE_MAX_SECONDS: positiveInteger(10),
    VOICE_SAMPLE_MAX_BYTES: positiveInteger(10 * 1024 * 1024),
    GENERATION_MAX_CHARACTERS: positiveInteger(5000),
  })
  .superRefine((env, context) => {
    if (env.VOICE_SAMPLE_MIN_SECONDS >= env.VOICE_SAMPLE_MAX_SECONDS) {
      context.addIssue({
        code: "custom",
        path: ["VOICE_SAMPLE_MAX_SECONDS"],
        message: "The maximum sample duration must exceed the minimum.",
      });
    }

    const hasGoogleId = Boolean(env.AUTH_GOOGLE_ID);
    const hasGoogleSecret = Boolean(env.AUTH_GOOGLE_SECRET);
    if (hasGoogleId !== hasGoogleSecret) {
      context.addIssue({
        code: "custom",
        path: [hasGoogleId ? "AUTH_GOOGLE_SECRET" : "AUTH_GOOGLE_ID"],
        message: "Google OAuth requires both AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.",
      });
    }

    const hasEmailServer = Boolean(env.AUTH_EMAIL_SERVER);
    const hasEmailFrom = Boolean(env.AUTH_EMAIL_FROM);
    if (hasEmailServer !== hasEmailFrom) {
      context.addIssue({
        code: "custom",
        path: [hasEmailServer ? "AUTH_EMAIL_FROM" : "AUTH_EMAIL_SERVER"],
        message: "Email login requires both AUTH_EMAIL_SERVER and AUTH_EMAIL_FROM.",
      });
    }

    if (env.VOICE_PROVIDER === "cartesia" && !env.CARTESIA_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["CARTESIA_API_KEY"],
        message: "Required when VOICE_PROVIDER=cartesia.",
      });
    }

    if (env.STORAGE_PROVIDER === "r2") {
      for (const key of [
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET",
        "R2_ENDPOINT",
      ] as const) {
        if (!env[key]) {
          context.addIssue({
            code: "custom",
            path: [key],
            message: `Required when STORAGE_PROVIDER=r2.`,
          });
        }
      }
    }

    if (
      env.RATE_LIMIT_PROVIDER === "upstash" &&
      (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN)
    ) {
      context.addIssue({
        code: "custom",
        path: [
          env.UPSTASH_REDIS_REST_URL
            ? "UPSTASH_REDIS_REST_TOKEN"
            : "UPSTASH_REDIS_REST_URL",
        ],
        message: "Upstash mode requires both REST URL and token.",
      });
    }

    if (env.NODE_ENV !== "production") return;

    if (env.DEV_BYPASS_AUTH) {
      context.addIssue({
        code: "custom",
        path: ["DEV_BYPASS_AUTH"],
        message: "DEV_BYPASS_AUTH cannot be enabled in production.",
      });
    }
    if (!env.AUTH_SECRET) {
      context.addIssue({ code: "custom", path: ["AUTH_SECRET"], message: "Required in production." });
    }
    if (!hasGoogleId || !hasGoogleSecret) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_GOOGLE_ID"],
        message: "Google OAuth is required in production.",
      });
    }
    if (env.VOICE_PROVIDER === "mock" && !env.ALLOW_MOCK_PROVIDER_IN_PRODUCTION) {
      context.addIssue({
        code: "custom",
        path: ["VOICE_PROVIDER"],
        message: "Mock provider is refused in production.",
      });
    }
    if (env.STORAGE_PROVIDER !== "r2") {
      context.addIssue({
        code: "custom",
        path: ["STORAGE_PROVIDER"],
        message: "Production storage must be R2/S3-compatible.",
      });
    }
    if (env.RATE_LIMIT_PROVIDER !== "upstash") {
      context.addIssue({
        code: "custom",
        path: ["RATE_LIMIT_PROVIDER"],
        message: "Persistent rate limiting is required in production.",
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

export function parseEnv(input: Record<string, unknown>): AppEnv {
  return envSchema.parse(input);
}

export function getEnv(): AppEnv {
  if (!cachedEnv) cachedEnv = parseEnv(process.env);
  return cachedEnv;
}

export function isDemoAuthEnabled(): boolean {
  const env = getEnv();
  return env.NODE_ENV !== "production" && env.DEV_BYPASS_AUTH;
}
