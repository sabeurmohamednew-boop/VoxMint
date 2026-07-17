import { describe, expect, it } from "vitest";
import { deriveGenerationTitle, UNTITLED_GENERATION } from "@/lib/generations/title";

describe("automatic generation titles", () => {
  it("falls back for empty scripts", () => {
    expect(deriveGenerationTitle(" \n\t ")).toBe(UNTITLED_GENERATION);
  });

  it("uses the first meaningful sentence or clause and normalizes whitespace", () => {
    expect(deriveGenerationTitle("  Hello   from VoxMint.\nThis is the rest.  ")).toBe("Hello from VoxMint.");
    expect(deriveGenerationTitle("First clause: second clause continues")).toBe("First clause:");
  });

  it("truncates long Unicode text without splitting a character", () => {
    const title = deriveGenerationTitle(`Voice ${"\u{1f399}\ufe0f ".repeat(50)}continues`);
    expect(Array.from(title).length).toBeLessThanOrEqual(64);
    expect(title.endsWith("\u2026")).toBe(true);
    expect(title).not.toContain("\ufffd");
  });

  it("supports non-Latin sentence punctuation", () => {
    expect(deriveGenerationTitle("\u4f60\u597d\u4e16\u754c\u3002\u8fd9\u662f\u7b2c\u4e8c\u53e5\u3002")).toBe("\u4f60\u597d\u4e16\u754c\u3002");
  });
});
