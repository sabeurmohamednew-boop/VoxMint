import { rm } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { assertSafeTestDatabaseUrl } from "@/lib/testing/test-database";

export default async function globalSetup() {
  const databaseUrl = assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DEVELOPMENT_DATABASE_URL, process.env.PRODUCTION_DATABASE_URL);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  await prisma.$transaction([
    prisma.usageLedger.deleteMany(), prisma.monthlyUsage.deleteMany(), prisma.consentRecord.deleteMany(),
    prisma.generation.deleteMany(), prisma.voice.deleteMany(), prisma.session.deleteMany(),
    prisma.account.deleteMany(), prisma.verificationToken.deleteMany(), prisma.user.deleteMany(),
  ]);
  await prisma.$disconnect();
  const storage = path.resolve(process.cwd(), ".data", "e2e-storage");
  const allowed = path.resolve(process.cwd(), ".data") + path.sep;
  if (!(`${storage}${path.sep}`).startsWith(allowed)) throw new Error("Unsafe E2E storage cleanup path.");
  await rm(storage, { recursive: true, force: true });
}
