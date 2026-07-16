import { defineConfig, devices } from "@playwright/test";
import { assertSafeTestDatabaseUrl } from "./lib/testing/test-database";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const testDatabaseUrl = assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL, process.env.PRODUCTION_DATABASE_URL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: "http://127.0.0.1:3000", trace: "on-first-retry" },
  webServer: {
    command: "npm run db:deploy && npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      NODE_ENV: "test",
      AUTH_SECRET: "playwright-only-secret-playwright-only-secret",
      DEV_BYPASS_AUTH: "false",
      E2E_TEST_AUTH: "true",
      VOICE_PROVIDER: "mock",
      STORAGE_PROVIDER: "local",
      LOCAL_STORAGE_PATH: ".data/e2e-storage",
      RATE_LIMIT_PROVIDER: "memory",
      VOICE_OPERATIONS_ENABLED: "true",
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
