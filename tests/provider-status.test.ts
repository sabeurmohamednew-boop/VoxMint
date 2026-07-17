import { describe, expect, it } from "vitest";
import {
  isVoiceCompatibleWithProvider,
  shouldSeedDemoVoices,
} from "@/lib/providers/compatibility";
import { toPublicProviderInfo } from "@/lib/providers/public-info";
import type { ProviderCapabilities } from "@/lib/providers/voice-provider";

const capabilities: ProviderCapabilities = {
  instantClone: true,
  deletion: true,
  rename: true,
  multilingual: true,
  styles: ["normal"],
  outputFormats: ["wav"],
  cloneLanguages: ["en"],
  generationLanguages: ["en"],
};

describe("public provider information", () => {
  it("maps mock and Cartesia providers to accurate public labels", () => {
    expect(toPublicProviderInfo({ name: "mock", capabilities })).toMatchObject({
      name: "mock",
      label: "Demo Provider",
      isDemo: true,
    });
    expect(toPublicProviderInfo({ name: "cartesia", capabilities })).toMatchObject({
      name: "cartesia",
      label: "Cartesia",
      isDemo: false,
      capabilities: {
        cloneLanguages: ["en"],
        generationLanguages: ["en"],
      },
    });
  });

  it("never copies provider credentials into client-safe output", () => {
    const secret = "a-provider-key-that-must-stay-server-side";
    const provider = { name: "cartesia" as const, capabilities, apiKey: secret };
    const serialized = JSON.stringify(toPublicProviderInfo(provider));
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("apiKey");
  });
});

describe("provider compatibility", () => {
  it("rejects mock voices when Cartesia is active and accepts Cartesia voices", () => {
    expect(isVoiceCompatibleWithProvider("mock", "cartesia")).toBe(false);
    expect(isVoiceCompatibleWithProvider("cartesia", "cartesia")).toBe(true);
  });

  it("seeds demo voices only when mock mode is active", () => {
    expect(shouldSeedDemoVoices("mock")).toBe(true);
    expect(shouldSeedDemoVoices(" mock ")).toBe(true);
    expect(shouldSeedDemoVoices("cartesia")).toBe(false);
  });
});
