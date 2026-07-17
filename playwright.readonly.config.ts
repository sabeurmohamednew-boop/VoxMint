import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-readonly",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "test-results/read-only",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "clean-chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
