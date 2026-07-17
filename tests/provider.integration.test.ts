// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseBuffer } from "music-metadata";
import { MockVoiceProvider } from "@/lib/providers/mock-provider";

describe("mock provider integration", () => {
  it("creates a private provider identifier and valid WAV speech", async () => {
    const provider = new MockVoiceProvider();
    const clone = await provider.cloneVoice({ bytes: new Uint8Array([1]), fileName: "sample.wav", mimeType: "audio/wav", name: "Studio Voice", language: "en" });
    expect(clone.providerVoiceId).toMatch(/^mock_/);
    const result = await provider.synthesize({ providerVoiceId: clone.providerVoiceId, text: "A deterministic test script.", language: "en", model: "mock" });
    expect(Buffer.from(result.bytes).subarray(0, 4).toString()).toBe("RIFF");
    const metadata = await parseBuffer(result.bytes, { mimeType: result.mimeType, size: result.bytes.byteLength });
    expect(metadata.format.duration).toBeGreaterThan(1);
  });

  it("keeps Hindi synthesis deterministic without external provider calls", async () => {
    const provider = new MockVoiceProvider();
    const input = { providerVoiceId: "mock_hindi", text: "नमस्ते दुनिया", language: "hi" as const, model: "mock" };
    const first = await provider.synthesize(input);
    const second = await provider.synthesize(input);
    expect(first.bytes).toEqual(second.bytes);
    expect(Buffer.from(first.bytes).subarray(0, 4).toString()).toBe("RIFF");
  });
});
