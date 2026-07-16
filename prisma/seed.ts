import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { shouldSeedDemoVoices } from "../lib/providers/compatibility";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed VoxMint.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const demoEmail = "demo@voxmint.local";

function mockWav(durationMs: number): Uint8Array {
  const sampleRate = 22_050;
  const sampleCount = Math.floor((durationMs / 1000) * sampleRate);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write("WAVE", 8);
  buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < sampleCount; i += 1) {
    const sample = Math.sin((2 * Math.PI * 190 * i) / sampleRate) * 0.17;
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  return new Uint8Array(buffer);
}

async function main() {
  if (!shouldSeedDemoVoices(process.env.VOICE_PROVIDER)) {
    console.info("Demo data skipped because VOICE_PROVIDER is not mock.");
    return;
  }

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: { deletedAt: null, name: "Maya Chen", plan: "PRO" },
    create: { email: demoEmail, name: "Maya Chen", emailVerified: new Date(), theme: "DARK", plan: "PRO" },
  });

  const voiceInputs = [
    { providerVoiceId: "mock_seed_studio", name: "Studio Narration", description: "Balanced and clear for product walkthroughs.", language: "en" },
    { providerVoiceId: "mock_seed_calm", name: "Calm Guide", description: "Measured delivery for guided lessons.", language: "en" },
    { providerVoiceId: "mock_seed_french", name: "Voix Française", description: "A warm French demo voice.", language: "fr" },
  ];

  const voices = [];
  for (const input of voiceInputs) {
    const voice = await prisma.voice.upsert({
      where: { provider_providerVoiceId: { provider: "mock", providerVoiceId: input.providerVoiceId } },
      update: { userId: user.id, name: input.name, description: input.description, deletedAt: null, status: "READY" },
      create: {
        userId: user.id,
        provider: "mock",
        providerVoiceId: input.providerVoiceId,
        name: input.name,
        description: input.description,
        primaryLanguage: input.language,
        status: "READY",
        sourceMimeType: "audio/wav",
        sourceDurationMs: 5_000,
        consentConfirmedAt: new Date(),
        providerMetadata: { seeded: true },
      },
    });
    voices.push(voice);
    const consent = await prisma.consentRecord.findFirst({ where: { userId: user.id, voiceId: voice.id } });
    if (!consent) {
      await prisma.consentRecord.create({
        data: {
          userId: user.id,
          voiceId: voice.id,
          consentVersion: "2026-07-16",
          statement: "I confirm that I own this voice or have explicit permission from the speaker to clone and use it.",
          confirmedAt: new Date(),
        },
      });
    }
  }

  const scripts = [
    "Welcome to VoxMint. Your next voiceover is ready to take shape.",
    "A quiet recording and a clear speaker create the strongest result.",
    "Use generated audio transparently and only with the speaker’s permission.",
  ];
  const storageRoot = path.resolve(process.cwd(), process.env.LOCAL_STORAGE_PATH ?? ".data/storage");
  for (let index = 0; index < scripts.length; index += 1) {
    const voice = voices[index % voices.length];
    if (!voice) continue;
    const idempotencyKey = `seed_generation_${index + 1}`;
    let generation = await prisma.generation.findUnique({ where: { userId_idempotencyKey: { userId: user.id, idempotencyKey } } });
    if (!generation) {
      generation = await prisma.generation.create({
        data: {
          userId: user.id,
          voiceId: voice.id,
          idempotencyKey,
          title: ["Welcome message", "Recording tips", "Safety reminder"][index],
          text: scripts[index]!,
          textHash: createHash("sha256").update(scripts[index]!).digest("hex"),
          characterCount: Array.from(scripts[index]!).length,
          language: voice.primaryLanguage,
          style: "normal",
          provider: "mock",
          providerModel: "mock-wav-v1",
          status: "PROCESSING",
        },
      });
    }
    const bytes = mockWav(2_800 + index * 500);
    const storageKey = `users/${user.id}/generations/${generation.id}/audio.wav`;
    const target = path.join(storageRoot, storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    await writeFile(`${target}.meta.json`, JSON.stringify({ contentType: "audio/wav" }));
    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: "READY", storageKey, mimeType: "audio/wav", fileSizeBytes: bytes.byteLength, durationMs: 2_800 + index * 500, completedAt: new Date() },
    });
  }
}

main()
  .then(() => console.info("VoxMint demo data seeded."))
  .finally(async () => prisma.$disconnect());
