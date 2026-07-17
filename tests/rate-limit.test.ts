// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MemoryRateLimiter } from "@/lib/rate-limit/rate-limiter";
import { apiError } from "@/lib/api/response";

describe("memory rate-limit contract", () => {
  it("isolates per-user and per-IP keys", async () => {
    const limiter = new MemoryRateLimiter();
    const rule = { limit: 1, windowSeconds: 60 };
    await limiter.consume("generate:user:a", rule);
    const limited = await limiter.consume("generate:user:a", rule).catch((error: unknown) => error);
    expect(limited).toMatchObject({ code: "RATE_LIMITED", headers: { "retry-after": "60" } });
    const response = apiError(limited, "request-1");
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    await expect(limiter.consume("generate:user:b", rule)).resolves.toBeUndefined();
    await expect(limiter.consume("generate:ip:203.0.113.1", rule)).resolves.toBeUndefined();
  });
  it("limits concurrency and releases leases exactly once", async () => {
    const limiter = new MemoryRateLimiter();
    const release = await limiter.acquire("provider:user:a", 1, 60);
    await expect(limiter.acquire("provider:user:a", 1, 60)).rejects.toMatchObject({ code: "PROVIDER_CONCURRENCY_LIMIT" });
    await release(); await release();
    await expect(limiter.acquire("provider:user:a", 1, 60)).resolves.toBeTypeOf("function");
  });
});
