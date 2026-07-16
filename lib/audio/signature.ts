export type AudioSignature = "wav" | "mp3" | "unknown";

export function detectAudioSignature(bytes: Uint8Array): AudioSignature {
  const wav = bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45;
  if (wav) return "wav";
  const id3 = bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const frame = bytes.length >= 2 && bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0;
  return id3 || frame ? "mp3" : "unknown";
}

export function signatureMatchesMime(signature: AudioSignature, mimeType: string): boolean {
  const normalized = mimeType.split(";", 1)[0]!.trim().toLowerCase();
  return (signature === "wav" && ["audio/wav", "audio/x-wav"].includes(normalized)) ||
    (signature === "mp3" && normalized === "audio/mpeg");
}
