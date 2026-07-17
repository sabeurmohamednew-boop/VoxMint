import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { assertSafeTestDatabaseUrl } from "@/lib/testing/test-database";

export function createIsolatedTestDatabaseClient() {
  const databaseUrl = assertSafeTestDatabaseUrl(
    process.env.TEST_DATABASE_URL,
    process.env.DATABASE_URL ?? process.env.DEVELOPMENT_DATABASE_URL,
    process.env.PRODUCTION_DATABASE_URL,
  );
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
}
