// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkProductionPreflight } from "@/lib/config/production-preflight";

const valid = {
  DATABASE_URL: "postgresql://service:private@db.acme.net/voxmint",
  AUTH_SECRET: "a-long-random-production-value",
  DEV_BYPASS_AUTH: "false", E2E_TEST_AUTH: "false",
  AUTH_GOOGLE_ID: "google-client-id", AUTH_GOOGLE_SECRET: "google-client-secret",
  VOICE_PROVIDER: "cartesia", CARTESIA_API_KEY: "cartesia-live-value",
  STORAGE_PROVIDER: "r2", R2_ACCESS_KEY_ID: "r2-access", R2_SECRET_ACCESS_KEY: "r2-private", R2_BUCKET: "voxmint-private", R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  RATE_LIMIT_PROVIDER: "upstash", UPSTASH_REDIS_REST_URL: "https://redis.upstash.io", UPSTASH_REDIS_REST_TOKEN: "upstash-private",
  NEXT_PUBLIC_APP_URL: "https://voxmint.acme.net", VOICE_OPERATIONS_ENABLED: "true", PUBLIC_LAUNCH: "false",
};
describe("production preflight", () => {
  it("passes a complete private deployment without exposing values", () => {
    const rows = checkProductionPreflight(valid, { migrationsAvailable: true });
    expect(rows.every((row) => row.ok)).toBe(true);
    const output = JSON.stringify(rows);
    for (const secret of [valid.AUTH_SECRET, valid.CARTESIA_API_KEY, valid.R2_SECRET_ACCESS_KEY, valid.UPSTASH_REDIS_REST_TOKEN]) expect(output).not.toContain(secret);
  });
  it("rejects unsafe adapters, placeholders, test database reuse, and incomplete public launch", () => {
    const rows = checkProductionPreflight({ ...valid, DATABASE_URL: "postgresql://localhost/voxmint", TEST_DATABASE_URL: "postgresql://localhost/voxmint", STORAGE_PROVIDER: "local", RATE_LIMIT_PROVIDER: "memory", CARTESIA_API_KEY: "replace-me", PUBLIC_LAUNCH: "true" }, { migrationsAvailable: false });
    expect(rows.filter((row) => !row.ok).map((row) => row.check)).toEqual(expect.arrayContaining(["Production database", "Private object storage", "Shared rate limiting", "Public-launch contacts", "Test database separation", "Placeholder scan", "Committed migrations"]));
  });
});
