// @vitest-environment node
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseEnv } from "@/lib/config/env";

const localEnv = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/voxmint",
  AUTH_SECRET: "development-secret",
  VOICE_PROVIDER: "mock",
  STORAGE_PROVIDER: "local",
  LOCAL_STORAGE_PATH: ".data/storage",
  RATE_LIMIT_PROVIDER: "memory",
  DEV_BYPASS_AUTH: "true",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
} as const;

const productionEnv = {
  ...localEnv,
  NODE_ENV: "production",
  DEV_BYPASS_AUTH: "false",
  AUTH_GOOGLE_ID: "google-client",
  AUTH_GOOGLE_SECRET: "google-secret",
  VOICE_PROVIDER: "cartesia",
  CARTESIA_API_KEY: "cartesia-key",
  STORAGE_PROVIDER: "r2",
  R2_ACCESS_KEY_ID: "r2-access",
  R2_SECRET_ACCESS_KEY: "r2-secret",
  R2_BUCKET: "voxmint",
  R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  RATE_LIMIT_PROVIDER: "upstash",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "upstash-token",
} as const;

function issuePaths(input: Record<string, unknown>): string[] {
  try {
    parseEnv(input);
    return [];
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;
    return error.issues.map((issue) => issue.path.join("."));
  }
}

describe("optional environment values", () => {
  it("normalizes empty or whitespace-only optional values to undefined", () => {
    const env = parseEnv({
      ...localEnv,
      AUTH_EMAIL_FROM: " ",
      R2_ENDPOINT: "",
      UPSTASH_REDIS_REST_URL: "   ",
    });

    expect(env.AUTH_EMAIL_FROM).toBeUndefined();
    expect(env.R2_ENDPOINT).toBeUndefined();
    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
  });

  it("trims configured optional values", () => {
    const env = parseEnv({ ...localEnv, AUTH_GOOGLE_ID: " client ", AUTH_GOOGLE_SECRET: " secret " });
    expect(env.AUTH_GOOGLE_ID).toBe("client");
    expect(env.AUTH_GOOGLE_SECRET).toBe("secret");
  });
});

describe("provider-specific configuration", () => {
  it("allows local storage without R2 configuration", () => {
    expect(() => parseEnv(localEnv)).not.toThrow();
  });

  it("requires complete, valid R2 configuration only in R2 mode", () => {
    expect(issuePaths({ ...localEnv, STORAGE_PROVIDER: "r2" })).toEqual(
      expect.arrayContaining(["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_ENDPOINT"]),
    );
    expect(() =>
      parseEnv({
        ...localEnv,
        STORAGE_PROVIDER: "r2",
        R2_ACCESS_KEY_ID: "access",
        R2_SECRET_ACCESS_KEY: "secret",
        R2_BUCKET: "bucket",
        R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      }),
    ).not.toThrow();
    expect(issuePaths({ ...localEnv, STORAGE_PROVIDER: "r2", R2_ENDPOINT: "not-a-url" })).toContain(
      "R2_ENDPOINT",
    );
  });

  it("allows memory rate limiting without Upstash configuration", () => {
    expect(() => parseEnv({ ...localEnv, UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "" })).not.toThrow();
  });

  it("requires complete, valid Upstash configuration in Upstash mode", () => {
    expect(issuePaths({ ...localEnv, RATE_LIMIT_PROVIDER: "upstash" })).toContain(
      "UPSTASH_REDIS_REST_URL",
    );
    expect(issuePaths({ ...localEnv, RATE_LIMIT_PROVIDER: "upstash", UPSTASH_REDIS_REST_URL: "invalid" })).toContain(
      "UPSTASH_REDIS_REST_URL",
    );
    expect(() =>
      parseEnv({
        ...localEnv,
        RATE_LIMIT_PROVIDER: "upstash",
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "token",
      }),
    ).not.toThrow();
  });

  it("allows mock mode without Cartesia credentials and requires them in Cartesia mode", () => {
    expect(() => parseEnv({ ...localEnv, CARTESIA_API_KEY: "" })).not.toThrow();
    expect(issuePaths({ ...localEnv, VOICE_PROVIDER: "cartesia" })).toContain("CARTESIA_API_KEY");
    expect(() => parseEnv({ ...localEnv, VOICE_PROVIDER: "cartesia", CARTESIA_API_KEY: "key" })).not.toThrow();
  });

  it("refuses the mock provider in production", () => {
    expect(issuePaths({ ...productionEnv, VOICE_PROVIDER: "mock", CARTESIA_API_KEY: undefined })).toContain("VOICE_PROVIDER");
  });
});

describe("authentication configuration", () => {
  it("allows development bypass outside production and rejects it in production", () => {
    expect(parseEnv(localEnv).DEV_BYPASS_AUTH).toBe(true);
    expect(issuePaths({ ...productionEnv, DEV_BYPASS_AUTH: "true" })).toContain("DEV_BYPASS_AUTH");
  });

  it("rejects partial Google OAuth configuration", () => {
    expect(issuePaths({ ...localEnv, AUTH_GOOGLE_ID: "client" })).toContain("AUTH_GOOGLE_SECRET");
    expect(issuePaths({ ...localEnv, AUTH_GOOGLE_SECRET: "secret" })).toContain("AUTH_GOOGLE_ID");
  });

  it("rejects partial email-provider configuration while allowing it to be omitted", () => {
    expect(() => parseEnv({ ...localEnv, AUTH_EMAIL_SERVER: "", AUTH_EMAIL_FROM: "" })).not.toThrow();
    expect(issuePaths({ ...localEnv, AUTH_EMAIL_SERVER: "smtp://localhost:1025" })).toContain("AUTH_EMAIL_FROM");
    expect(issuePaths({ ...localEnv, AUTH_EMAIL_FROM: "hello@voxmint.test" })).toContain("AUTH_EMAIL_SERVER");
  });

  it("allows test auth only in the test environment", () => {
    expect(issuePaths({ ...localEnv, E2E_TEST_AUTH: "true" })).toContain("E2E_TEST_AUTH");
    expect(() => parseEnv({ ...localEnv, NODE_ENV: "test", DEV_BYPASS_AUTH: "false", E2E_TEST_AUTH: "true" })).not.toThrow();
    expect(issuePaths({ ...productionEnv, E2E_TEST_AUTH: "true" })).toContain("E2E_TEST_AUTH");
  });

  it("requires real launch contacts when public launch is declared", () => {
    expect(issuePaths({ ...productionEnv, PUBLIC_LAUNCH: "true" })).toEqual(expect.arrayContaining(["OPERATOR_NAME", "SUPPORT_EMAIL", "ABUSE_REPORT_EMAIL", "PRIVACY_CONTACT_EMAIL", "POLICY_EFFECTIVE_DATE", "LEGAL_JURISDICTION"]));
    expect(() => parseEnv({ ...productionEnv, PUBLIC_LAUNCH: "true", OPERATOR_NAME: "Example operator", SUPPORT_URL: "https://support.example.test", ABUSE_REPORT_EMAIL: "abuse@example.test", PRIVACY_CONTACT_EMAIL: "privacy@example.test", POLICY_EFFECTIVE_DATE: "2026-07-16", LEGAL_JURISDICTION: "France" })).not.toThrow();
  });

  it("rejects unsafe contact URL schemes", () => {
    expect(issuePaths({ ...localEnv, SUPPORT_URL: "javascript:alert(1)" })).toContain("SUPPORT_URL");
  });
});
