// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { checkReadiness } from "@/lib/health/readiness";

const healthy = {
  queryDatabase: vi.fn(async () => 1),
  initializeStorage: vi.fn(() => ({})),
  initializeRateLimit: vi.fn(() => ({})),
  initializeProvider: vi.fn(() => ({})),
  storageName: "r2",
  rateLimitName: "upstash",
  providerName: "cartesia",
  providerOperationsEnabled: true,
};

describe("readiness checks", () => {
  it("reports initialized dependencies without exposing configuration values", async () => {
    const result = await checkReadiness(healthy);
    expect(result).toEqual({
      status: "ready",
      checks: {
        database: "ok",
        storage: "r2_adapter_ready",
        rateLimit: "upstash_adapter_ready",
        provider: "cartesia_adapter_ready",
        providerOperations: "enabled",
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/key|token|secret|url/i);
  });

  it("marks any failed critical initialization as not ready", async () => {
    const result = await checkReadiness({ ...healthy, initializeStorage: () => { throw new Error("private detail"); } });
    expect(result.status).toBe("not_ready");
    expect(result.checks.storage).toBe("unavailable");
    expect(JSON.stringify(result)).not.toContain("private detail");
  });

  it("converts synchronous database check failures into a safe status", async () => {
    const result = await checkReadiness({ ...healthy, queryDatabase: () => { throw new Error("connection detail"); } });
    expect(result.status).toBe("not_ready");
    expect(result.checks.database).toBe("unavailable");
    expect(JSON.stringify(result)).not.toContain("connection detail");
  });
});
