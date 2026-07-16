import { describe, expect, it } from "vitest";
import { readAudioResponse } from "@/lib/audio/client";
import { detectAudioSignature } from "@/lib/audio/signature";

const wavHeader = new Uint8Array([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x41,0x56,0x45,0x66,0x6d,0x74,0x20]);

describe("audio response validation", () => {
  it("accepts WAV bytes with an audio MIME type", async () => {
    const blob = await readAudioResponse(new Response(wavHeader, { headers: { "content-type": "audio/wav" } }));
    expect(blob.size).toBe(wavHeader.length);
    expect(detectAudioSignature(wavHeader)).toBe("wav");
  });
  it("rejects HTML and structured API failures", async () => {
    await expect(readAudioResponse(new Response("<html/>", { headers: { "content-type": "text/html" } }))).rejects.toThrow("page instead of audio");
    await expect(readAudioResponse(Response.json({ error: { message: "Audio missing" } }, { status: 404 }))).rejects.toThrow("Audio missing");
  });
  it("rejects MIME/signature mismatches", async () => {
    await expect(readAudioResponse(new Response(wavHeader, { headers: { "content-type": "audio/mpeg" } }))).rejects.toThrow("invalid audio");
  });
});
