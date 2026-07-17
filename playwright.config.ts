import { defineConfig, devices } from "@playwright/test";
import { assertSafeTestDatabaseUrl } from "./lib/testing/test-database";
import nextEnv from "@next/env";
import { E2E_APP_ORIGIN, E2E_GENERATION_RATE_LIMIT } from "./e2e/config";

nextEnv.loadEnvConfig(process.cwd());
const testDatabaseUrl = assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL, process.env.PRODUCTION_DATABASE_URL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: E2E_APP_ORIGIN,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run db:deploy && npm run dev -- --hostname localhost",
    url: E2E_APP_ORIGIN,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      NODE_ENV: "test",
      AUTH_SECRET: "playwright-only-secret-playwright-only-secret",
      DEV_BYPASS_AUTH: "false",
      E2E_TEST_AUTH: "true",
      NEXT_PUBLIC_APP_URL: E2E_APP_ORIGIN,
      VOICE_PROVIDER: "mock",
      STORAGE_PROVIDER: "local",
      LOCAL_STORAGE_PATH: ".data/e2e-storage",
      RATE_LIMIT_PROVIDER: "memory",
      VOICE_CREATIONS_PER_HOUR: "20",
      GENERATIONS_PER_MINUTE: "20",
      E2E_GENERATIONS_PER_MINUTE: String(E2E_GENERATION_RATE_LIMIT),
      VOICE_OPERATIONS_ENABLED: "true",
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
