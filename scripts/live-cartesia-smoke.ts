import Cartesia from "@cartesia/cartesia-js";
import { validateGeneratedAudio } from "@/lib/audio/validation";

if (process.env.LIVE_CARTESIA_E2E !== "true") throw new Error("Live Cartesia smoke is disabled. Set LIVE_CARTESIA_E2E=true explicitly.");
const apiKey = process.env.CARTESIA_E2E_API_KEY;
const voiceId = process.env.CARTESIA_E2E_VOICE_ID;
if (!apiKey || !voiceId) throw new Error("Separate CARTESIA_E2E_API_KEY and CARTESIA_E2E_VOICE_ID values are required.");

const client = new Cartesia({
  apiKey,
  timeout: 30_000,
  maxRetries: 0,
  defaultHeaders: { "Cartesia-Version": process.env.CARTESIA_API_VERSION ?? "2026-03-01" },
});
const response = await client.tts.generate({
  model_id: process.env.CARTESIA_TTS_MODEL ?? "sonic-3",
  transcript: "VoxMint live smoke test.",
  language: "en",
  voice: { mode: "id", id: voiceId },
  output_format: { container: "wav", encoding: "pcm_s16le", sample_rate: 44_100 },
});
const bytes = new Uint8Array(await response.arrayBuffer());
validateGeneratedAudio(bytes, "audio/wav");
console.info(JSON.stringify({ status: "passed", mimeType: "audio/wav", bytes: bytes.byteLength }));
