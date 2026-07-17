import { afterEach, describe, expect, it, vi } from "vitest";
import { diagnoseAudioPlaybackFailure, readAudioResponse } from "@/lib/audio/client";
import { detectAudioSignature } from "@/lib/audio/signature";

const wavHeader = new Uint8Array([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x41,0x56,0x45,0x66,0x6d,0x74,0x20]);

describe("audio response validation", () => {
  afterEach(() => vi.restoreAllMocks());
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
  it("distinguishes authentication, storage, format and network playback failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));
    await expect(diagnoseAudioPlaybackFailure("/audio")).resolves.toMatch(/session expired/i);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 502 })));
    await expect(diagnoseAudioPlaybackFailure("/audio")).resolves.toMatch(/stored audio is temporarily unavailable/i);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { headers: { "content-type": "audio/wav" } })));
    await expect(diagnoseAudioPlaybackFailure("/audio", 3)).resolves.toMatch(/could not decode/i);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    await expect(diagnoseAudioPlaybackFailure("/audio")).resolves.toMatch(/network interruption/i);
  });
});
