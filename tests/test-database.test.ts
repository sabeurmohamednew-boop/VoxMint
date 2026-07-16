// @vitest-environment node
import { describe, expect, it } from "vitest";
import { assertSafeTestDatabaseUrl } from "@/lib/testing/test-database";

describe("Playwright database isolation", () => {
  it("accepts an explicitly named isolated test database", () => expect(assertSafeTestDatabaseUrl("postgresql://user:pass@db.internal/voxmint_e2e")).toContain("voxmint_e2e"));
  it.each([
    [undefined, undefined, undefined],
    ["postgresql://db/voxmint", "postgresql://db/voxmint", undefined],
    ["postgresql://db/voxmint", undefined, undefined],
    ["postgresql://db/voxmint_production_test", undefined, undefined],
  ])("rejects unsafe target %#", (test, development, production) => expect(() => assertSafeTestDatabaseUrl(test, development, production)).toThrow());
});
