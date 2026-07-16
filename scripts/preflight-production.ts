import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";
import { checkProductionPreflight } from "@/lib/config/production-preflight";

nextEnv.loadEnvConfig(process.cwd());
const migrationsPath = path.join(process.cwd(), "prisma", "migrations");
const migrationsAvailable = existsSync(migrationsPath) && readdirSync(migrationsPath, { withFileTypes: true }).some((entry) => entry.isDirectory());
const rows = checkProductionPreflight(process.env, { migrationsAvailable });
console.table(rows.map((row) => ({ check: row.check, result: row.ok ? "PASS" : "FAIL", detail: row.detail })));
if (rows.some((row) => !row.ok)) {
  console.error("Production preflight failed. Values are intentionally redacted.");
  process.exitCode = 1;
} else {
  console.info("Production preflight passed. Values are intentionally redacted.");
}
