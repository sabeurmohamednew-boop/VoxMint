import { describe, expect, it } from "vitest";
import { normalizePostgresConnectionString } from "@/lib/db/connection-string";

describe("PostgreSQL connection normalization", () => {
  it("upgrades legacy strict SSL aliases to explicit verify-full", () => {
    const normalized = normalizePostgresConnectionString(
      "postgresql://user:password@example.test/database?sslmode=require",
    );
    expect(new URL(normalized).searchParams.get("sslmode")).toBe("verify-full");
  });

  it("leaves unrelated connection options intact", () => {
    const normalized = normalizePostgresConnectionString(
      "postgresql://user:password@example.test/database?sslmode=disable&application_name=voxmint",
    );
    const url = new URL(normalized);
    expect(url.searchParams.get("sslmode")).toBe("disable");
    expect(url.searchParams.get("application_name")).toBe("voxmint");
  });
});
