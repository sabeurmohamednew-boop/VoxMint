export function createTestWav(durationMs = 4_000, options: { sampleRate?: number; channels?: number; audioFormat?: number; fileName?: string } = {}): Uint8Array {
  const sampleRate = options.sampleRate ?? 8_000;
  const channels = options.channels ?? 1;
  const sampleCount = Math.floor((durationMs / 1000) * sampleRate);
  const dataSize = sampleCount * channels * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write("WAVE", 8);
  buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(options.audioFormat ?? 1, 20);
  buffer.writeUInt16LE(channels, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * channels * 2, 28);
  buffer.writeUInt16LE(channels * 2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(dataSize, 40);
  return new Uint8Array(buffer);
}
