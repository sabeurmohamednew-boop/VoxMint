// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateGeneratedAudio } from "@/lib/audio/validation";
import {
  ProviderAuthenticationError,
  ProviderRateLimitError,
  ProviderTimeoutError,
} from "@/lib/providers/errors";

const wavHeader = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0,
  0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
]);

describe("generated provider audio validation", () => {
  it("accepts a matching audio signature", () => {
    expect(() => validateGeneratedAudio(wavHeader, "audio/wav")).not.toThrow();
  });

  it("rejects empty, malformed, and unsupported provider payloads", () => {
    expect(() => validateGeneratedAudio(new Uint8Array(), "audio/wav")).toThrowError(expect.objectContaining({ code: "EMPTY_PROVIDER_AUDIO", status: 502 }));
    expect(() => validateGeneratedAudio(new TextEncoder().encode("not audio"), "audio/wav")).toThrowError(expect.objectContaining({ code: "INVALID_PROVIDER_AUDIO", status: 502 }));
    expect(() => validateGeneratedAudio(wavHeader, "text/html")).toThrowError(expect.objectContaining({ code: "INVALID_PROVIDER_AUDIO", status: 502 }));
  });
});

describe("provider failure categories", () => {
  it.each([
    [new ProviderAuthenticationError("raw authentication detail"), "authentication", "The voice provider is not configured correctly."],
    [new ProviderRateLimitError("raw rate-limit detail"), "rate_limit", "The voice provider is busy. Try again shortly."],
    [new ProviderTimeoutError("raw timeout detail"), "timeout", "Generation timed out. Try again."],
  ])("provides a safe message for %s", (error, category, safeMessage) => {
    expect(error).toMatchObject({ category, safeMessage });
    expect(error.safeMessage).not.toContain("raw");
  });
});
