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

const safeHttpUrl = z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "Use an HTTP(S) URL.");

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const enabledBooleanString = z
  .enum(["true", "false"])
  .default("true")
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
    E2E_TEST_AUTH: booleanString,
    ALLOW_MOCK_PROVIDER_IN_PRODUCTION: booleanString,
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    VOICE_SAMPLE_MIN_SECONDS: positiveInteger(3),
    VOICE_SAMPLE_MAX_SECONDS: positiveInteger(10),
    VOICE_SAMPLE_MAX_BYTES: positiveInteger(10 * 1024 * 1024),
    GENERATION_MAX_CHARACTERS: positiveInteger(5000),
    VOICE_CREATIONS_PER_HOUR: positiveInteger(3),
    GENERATIONS_PER_MINUTE: positiveInteger(20),
    DOWNLOADS_PER_MINUTE: positiveInteger(120),
    DAILY_CHARACTER_LIMIT: positiveInteger(25_000),
    MONTHLY_CHARACTER_LIMIT: positiveInteger(100_000),
    GLOBAL_DAILY_CHARACTER_LIMIT: positiveInteger(1_000_000),
    MAX_CONCURRENT_PROVIDER_REQUESTS: positiveInteger(1),
    VOICE_OPERATIONS_ENABLED: enabledBooleanString,
    PUBLIC_LAUNCH: booleanString,
    OPERATOR_NAME: optionalEnvString(),
    SUPPORT_EMAIL: optionalEnvString(z.string().email()),
    SUPPORT_URL: optionalEnvString(safeHttpUrl),
    ABUSE_REPORT_EMAIL: optionalEnvString(z.string().email()),
    ABUSE_REPORT_URL: optionalEnvString(safeHttpUrl),
    PRIVACY_CONTACT_EMAIL: optionalEnvString(z.string().email()),
    POLICY_EFFECTIVE_DATE: optionalEnvString(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO date (YYYY-MM-DD).")),
    LEGAL_JURISDICTION: optionalEnvString(),
    RETENTION_WORKER_ENABLED: booleanString,
    SHOW_PROVIDER_BRANDING: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  })
  .superRefine((env, context) => {
    if (env.E2E_TEST_AUTH && env.NODE_ENV !== "test") {
      context.addIssue({ code: "custom", path: ["E2E_TEST_AUTH"], message: "E2E_TEST_AUTH is allowed only when NODE_ENV=test." });
    }
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

    if (env.PUBLIC_LAUNCH) {
      const requiredLaunchValues = [
        ["OPERATOR_NAME", env.OPERATOR_NAME],
        ["PRIVACY_CONTACT_EMAIL", env.PRIVACY_CONTACT_EMAIL],
        ["POLICY_EFFECTIVE_DATE", env.POLICY_EFFECTIVE_DATE],
        ["LEGAL_JURISDICTION", env.LEGAL_JURISDICTION],
      ] as const;
      for (const [key, value] of requiredLaunchValues) {
        if (!value) context.addIssue({ code: "custom", path: [key], message: `Required when PUBLIC_LAUNCH=true.` });
      }
      if (!env.SUPPORT_EMAIL && !env.SUPPORT_URL) {
        context.addIssue({ code: "custom", path: ["SUPPORT_EMAIL"], message: "A support email or URL is required for public launch." });
      }
      if (!env.ABUSE_REPORT_EMAIL && !env.ABUSE_REPORT_URL) {
        context.addIssue({ code: "custom", path: ["ABUSE_REPORT_EMAIL"], message: "An abuse-report email or URL is required for public launch." });
      }
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

export function isE2eTestAuthEnabled(): boolean {
  const env = getEnv();
  return env.NODE_ENV === "test" && env.E2E_TEST_AUTH;
}

export function getPublicOperationsInfo() {
  const env = getEnv();
  return {
    developmentSession: env.NODE_ENV !== "production" && env.DEV_BYPASS_AUTH,
    testSession: env.NODE_ENV === "test" && env.E2E_TEST_AUTH,
    publicLaunch: env.PUBLIC_LAUNCH,
    voiceOperationsEnabled: env.VOICE_OPERATIONS_ENABLED,
    operatorName: env.OPERATOR_NAME ?? null,
    retentionWorkerEnabled: env.RETENTION_WORKER_ENABLED,
    supportEmail: env.SUPPORT_EMAIL ?? null,
    supportUrl: env.SUPPORT_URL ?? null,
    abuseReportEmail: env.ABUSE_REPORT_EMAIL ?? null,
    abuseReportUrl: env.ABUSE_REPORT_URL ?? null,
    privacyContactEmail: env.PRIVACY_CONTACT_EMAIL ?? null,
    policyEffectiveDate: env.POLICY_EFFECTIVE_DATE ?? null,
    legalJurisdiction: env.LEGAL_JURISDICTION ?? null,
  } as const;
}
