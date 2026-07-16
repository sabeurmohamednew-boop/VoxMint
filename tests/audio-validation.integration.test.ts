// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateAudioFile } from "@/lib/audio/validation";
import { createTestWav } from "@/tests/fixtures";

describe("server audio validation", () => {
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
});
