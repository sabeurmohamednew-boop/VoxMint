// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("product consistency source guards", () => {
  it("does not globally suppress hydration warnings", () => {
    expect(source("app/layout.tsx")).not.toContain("suppressHydrationWarning");
  });

  it("keeps sidebar service-status copy truthful", () => {
    const navigation = source("components/app-shell/app-navigation.tsx");
    expect(navigation).toContain("Usage &amp; deployment");
    expect(navigation).toContain("Service status");
    expect(navigation).not.toMatch(/Go Pro|Upgrade now/i);
  });

  it("labels usage as a local deployment ledger rather than a live provider balance", () => {
    const usage = source("app/(app)/usage/page.tsx");
    expect(usage).toContain("VoxMint-tracked Cartesia");
    expect(usage).toContain("not a live Cartesia subscription balance");
    expect(usage).not.toContain("usage.plan");
  });

  it("contains focused light-theme states for fields, disabled controls, uploads and navigation", () => {
    const css = source("app/globals.css");
    expect(css).toContain("html.light .field");
    expect(css).toContain("html.light .field:disabled");
    expect(css).toContain("html.light .upload-zone");
    expect(css).toContain('html.light nav a[aria-current="page"]');
  });

  it("keeps authenticated and public landing actions explicit", () => {
    const landing = source("app/page.tsx");
    const navigation = source("components/public/public-navigation.tsx");
    expect(landing).toContain('signedIn ? "Open dashboard" : "Create a voice"');
    expect(navigation).toContain('href="/login"');
    expect(landing).toContain('href="#how-it-works"');
  });
});
