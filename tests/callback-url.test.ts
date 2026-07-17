import { describe, expect, it } from "vitest";
import { normalizeCallbackUrl } from "@/lib/auth/callback-url";

describe("authentication callback URLs", () => {
  it("preserves local paths, queries and fragments", () => {
    expect(normalizeCallbackUrl("/history?provider=cartesia#latest")).toBe("/history?provider=cartesia#latest");
    expect(normalizeCallbackUrl("https://voxmint.example/history?provider=cartesia", "/dashboard", "https://voxmint.example")).toBe("/history?provider=cartesia");
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "/\\evil.example",
    "/dashboard\nlocation:https://evil.example",
  ])("rejects unsafe callback %s", (value) => {
    expect(normalizeCallbackUrl(value)).toBe("/dashboard");
  });

  it("uses the safe fallback for missing values", () => {
    expect(normalizeCallbackUrl(null)).toBe("/dashboard");
    expect(normalizeCallbackUrl("https://evil.example/steal", "/dashboard", "https://voxmint.example")).toBe("/dashboard");
  });
});
