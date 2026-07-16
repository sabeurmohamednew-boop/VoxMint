// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateAudioFile } from "@/lib/audio/validation";
import { createTestWav } from "@/tests/fixtures";

describe("server audio validation", () => {
  const asFile = (bytes: Uint8Array, name = "voice.wav", type = "audio/wav") => new File([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], name, { type });
  it("detects and decodes a valid WAV independently of the browser MIME", async () => {
    const bytes = createTestWav(4_000);
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const result = await validateAudioFile(new File([arrayBuffer], "voice.not-trusted", { type: "text/plain" }));
    expect(result.mimeType).toBe("audio/wav");
    expect(result.durationMs).toBeGreaterThanOrEqual(3_900);
  });
  it("rejects files whose magic bytes are not supported audio", async () => {
    await expect(validateAudioFile(new File(["not audio"], "voice.wav", { type: "audio/wav" }))).rejects.toMatchObject({ code: "UNSUPPORTED_AUDIO" });
  });
  it.each([
    ["excessive sample rate", createTestWav(4_000, { sampleRate: 384_000 }), "UNSUPPORTED_SAMPLE_RATE"],
    ["excessive channel count", createTestWav(4_000, { channels: 3 }), "UNSUPPORTED_CHANNEL_COUNT"],
    ["unsupported codec", createTestWav(4_000, { audioFormat: 17 }), "UNSUPPORTED_CODEC"],
  ])("rejects %s", async (_label, bytes, code) => {
    await expect(validateAudioFile(asFile(bytes as Uint8Array))).rejects.toMatchObject({ code });
  });
  it("accepts the exact lower and upper duration boundaries", async () => {
    await expect(validateAudioFile(asFile(createTestWav(3_000)))).resolves.toMatchObject({ durationMs: 3_000 });
    await expect(validateAudioFile(asFile(createTestWav(10_000)))).resolves.toMatchObject({ durationMs: 10_000 });
  });
  it("sanitizes Unicode names and traversal characters without trusting the declared MIME", async () => {
    const result = await validateAudioFile(asFile(createTestWav(), "../صوت 🎙️.exe", "application/x-msdownload"));
    expect(result.sanitizedName).not.toContain("..");
    expect(result.sanitizedName).toMatch(/\.wav$/);
  });
  it.each([
    ["truncated WAV", createTestWav().subarray(0, 30)],
    ["invalid RIFF", new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45])],
    ["zero duration", createTestWav(0)],
  ])("rejects %s", async (_label, bytes) => {
    await expect(validateAudioFile(asFile(bytes as Uint8Array))).rejects.toBeDefined();
  });
  it("rejects an oversized file before decoding", async () => {
    const oversized = new Uint8Array(10 * 1024 * 1024 + 1);
    await expect(validateAudioFile(asFile(oversized))).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
  });
});
