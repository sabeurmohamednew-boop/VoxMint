import "server-only";

import type { CloneVoiceInput, SynthesizeInput, VoiceProvider } from "@/lib/providers/voice-provider";

function createWav(durationMs: number): Uint8Array {
  const sampleRate = 22_050;
  const sampleCount = Math.floor((durationMs / 1000) * sampleRate);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < sampleCount; i += 1) {
    const envelope = Math.min(1, i / 400) * Math.min(1, (sampleCount - i) / 600);
    const voiceLike =
      Math.sin((2 * Math.PI * 180 * i) / sampleRate) * 0.18 +
      Math.sin((2 * Math.PI * 360 * i) / sampleRate) * 0.06;
    buffer.writeInt16LE(Math.round(voiceLike * envelope * 32767), 44 + i * 2);
  }
  return new Uint8Array(buffer);
}

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class MockVoiceProvider implements VoiceProvider {
  readonly name = "mock";
  readonly capabilities = {
    instantClone: true,
    deletion: true,
    rename: true,
    multilingual: true,
    styles: ["normal"],
    outputFormats: ["wav"],
    cloneLanguages: ["en", "fr", "ar"],
  } as const;

  async cloneVoice(input: CloneVoiceInput) {
    void input;
    await delay(250);
    return {
      providerVoiceId: `mock_${crypto.randomUUID()}`,
      status: "READY" as const,
      metadata: { localDemo: true },
    };
  }

  async synthesize(input: SynthesizeInput) {
    await delay(320);
    const durationMs = Math.max(1_200, Math.min(8_000, Math.round((input.text.length / 14) * 1000)));
    return {
      bytes: createWav(durationMs),
      mimeType: "audio/wav" as const,
      durationMs,
      providerRequestId: `mock_req_${crypto.randomUUID()}`,
    };
  }

  async deleteVoice() {
    await delay(80);
  }

  async updateVoice() {
    await delay(80);
  }

  async getVoiceState() {
    return "ready" as const;
  }
}
