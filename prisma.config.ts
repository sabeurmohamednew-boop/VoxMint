import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import { normalizePostgresConnectionString } from "./lib/db/connection-string";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: normalizePostgresConnectionString(env("DATABASE_URL")),
  },
});
