export const SYNTHETIC_VOICE_DURATION_MS = 4_000;
export const SYNTHETIC_VOICE_SAMPLE_RATE = 16_000;

/**
 * Creates a small deterministic test tone. It is deliberately synthetic and
 * contains no recording or representation of a real person's voice.
 */
export function createSyntheticVoiceWav(): Buffer {
  const sampleCount = Math.floor(
    (SYNTHETIC_VOICE_DURATION_MS / 1000) * SYNTHETIC_VOICE_SAMPLE_RATE,
  );
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SYNTHETIC_VOICE_SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SYNTHETIC_VOICE_SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  const fadeSamples = Math.floor(SYNTHETIC_VOICE_SAMPLE_RATE * 0.05);
  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / SYNTHETIC_VOICE_SAMPLE_RATE;
    const envelope = Math.min(
      1,
      index / fadeSamples,
      (sampleCount - 1 - index) / fadeSamples,
    );
    const modulation = 0.85 + 0.15 * Math.sin(2 * Math.PI * 3 * time);
    const tone =
      Math.sin(2 * Math.PI * 220 * time) +
      0.35 * Math.sin(2 * Math.PI * 440 * time) +
      0.15 * Math.sin(2 * Math.PI * 660 * time);
    const sample = Math.max(-1, Math.min(1, tone * modulation * envelope * 0.24));
    buffer.writeInt16LE(Math.round(sample * 32_767), 44 + index * 2);
  }

  return buffer;
}
