import { describe, expect, it } from "vitest";
import { isAllowedMutationOrigin } from "@/lib/security/request-origin";

const base = { requestUrl: "https://voxmint.example/api/generations", configuredAppUrl: "https://voxmint.example", nodeEnv: "production" as const };
describe("browser mutation origin checks", () => {
  it("allows the configured same origin", () => expect(isAllowedMutationOrigin({ ...base, requestOrigin: "https://voxmint.example", fetchSite: "same-origin" })).toBe(true));
  it.each([
    { requestOrigin: "https://attacker.example", fetchSite: "cross-site" },
    { requestOrigin: null, fetchSite: null },
    { requestOrigin: "not a url", fetchSite: "same-origin" },
  ])("rejects untrusted browser context %#", (input) => expect(isAllowedMutationOrigin({ ...base, ...input })).toBe(false));
});
