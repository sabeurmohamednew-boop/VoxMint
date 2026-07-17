// @vitest-environment node
import { describe, expect, it } from "vitest";
import { securityHeadersForEnvironment } from "@/next.config";

function headerMap(environment: string) {
  return new Map(securityHeadersForEnvironment(environment).map((header) => [header.key, header.value]));
}

describe("security response headers", () => {
  it("sets a practical CSP and frame, MIME, referrer and capability protections", () => {
    const headers = headerMap("development");
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("media-src 'self' blob:");
    expect(headers.get("Content-Security-Policy")).not.toMatch(/(?:^|;\s)[\w-]+-src \*/u);
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Permissions-Policy")).toContain("microphone=()");
  });

  it("adds HSTS and removes development script exceptions only in production", () => {
    const development = headerMap("development");
    const production = headerMap("production");
    expect(development.has("Strict-Transport-Security")).toBe(false);
    expect(development.get("Content-Security-Policy")).toContain("'unsafe-eval'");
    expect(production.get("Strict-Transport-Security")).toContain("max-age=63072000");
    expect(production.get("Content-Security-Policy")).not.toContain("'unsafe-eval'");
    expect(production.get("Content-Security-Policy")).toContain("upgrade-insecure-requests");
  });
});
