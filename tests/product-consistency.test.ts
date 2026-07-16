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

  it("keeps sidebar billing copy informational", () => {
    const navigation = source("components/app-shell/app-navigation.tsx");
    expect(navigation).toContain("deployment billing status");
    expect(navigation).not.toMatch(/Go Pro|Upgrade now/i);
  });

  it("labels usage as a provider allowance rather than an application plan", () => {
    const usage = source("app/(app)/usage/page.tsx");
    expect(usage).toContain("provider allowance");
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
    expect(landing).toContain('user ? "Open dashboard" : "Create a voice"');
    expect(landing).toContain('href="/login"');
    expect(landing).toContain('href="#how-it-works"');
  });
});
