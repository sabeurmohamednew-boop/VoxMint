// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  createSyntheticVoiceWav,
  SYNTHETIC_VOICE_DURATION_MS,
  SYNTHETIC_VOICE_SAMPLE_RATE,
} from "@/e2e/fixtures";
import { validateAudioFile } from "@/lib/audio/validation";

describe("Playwright synthetic voice fixture", () => {
  it("passes the same server validation as a permitted upload", async () => {
    const wav = createSyntheticVoiceWav();
    const samples = new Int16Array(
      wav.buffer.slice(wav.byteOffset + 44, wav.byteOffset + wav.byteLength),
    );
    expect(Array.from(samples).some((sample) => sample !== 0)).toBe(true);
    expect(wav.byteLength).toBe(44 + SYNTHETIC_VOICE_SAMPLE_RATE * 2 * 4);

    const bytes = wav.buffer.slice(
      wav.byteOffset,
      wav.byteOffset + wav.byteLength,
    ) as ArrayBuffer;
    const validated = await validateAudioFile(
      new File([bytes], "synthetic-voice.wav", { type: "audio/wav" }),
    );
    expect(validated).toMatchObject({
      mimeType: "audio/wav",
      durationMs: SYNTHETIC_VOICE_DURATION_MS,
    });
  });
});
