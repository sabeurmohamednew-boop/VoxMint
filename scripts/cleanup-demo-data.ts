import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { normalizePostgresConnectionString } from "../lib/db/connection-string";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const apply = process.argv.includes("--apply");
if (apply && (process.env.NODE_ENV === "production" || process.env.VOICE_PROVIDER !== "cartesia")) {
  throw new Error("Applying demo cleanup is allowed only outside production while VOICE_PROVIDER=cartesia.");
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: normalizePostgresConnectionString(databaseUrl) }) });
const [allMock, safeCandidates, mockGenerations] = await Promise.all([
  prisma.voice.count({ where: { provider: "mock", deletedAt: null } }),
  prisma.voice.findMany({ where: { provider: "mock", deletedAt: null, generations: { none: {} } }, select: { id: true } }),
  prisma.generation.count({ where: { provider: "mock", deletedAt: null } }),
]);
if (apply && safeCandidates.length) {
  await prisma.voice.updateMany({ where: { id: { in: safeCandidates.map((voice) => voice.id) } }, data: { status: "DELETED", deletedAt: new Date() } });
}
console.info(JSON.stringify({ mode: apply ? "apply" : "dry-run", mockVoices: allMock, safeToSoftDelete: safeCandidates.length, preservedBecauseReferenced: allMock - safeCandidates.length, preservedMockGenerations: mockGenerations }));
await prisma.$disconnect();
