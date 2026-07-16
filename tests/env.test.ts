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
  ALLOW_MOCK_PROVIDER_IN_PRODUCTION: "false",
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
});
