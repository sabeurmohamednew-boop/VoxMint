import { getEnv } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const env = getEnv();
  let database: "ok" | "unavailable" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "unavailable";
  }
  const ready = database === "ok";
  return Response.json({
    status: ready ? "ready" : "not_ready",
    checks: {
      database,
      storage: env.STORAGE_PROVIDER === "r2" ? "private_object_storage_configured" : "development_local_storage",
      rateLimit: env.RATE_LIMIT_PROVIDER === "upstash" ? "shared_backend_configured" : "development_memory_backend",
      provider: env.VOICE_PROVIDER,
      providerOperations: env.VOICE_OPERATIONS_ENABLED ? "enabled" : "disabled",
    },
  }, { status: ready ? 200 : 503, headers: { "cache-control": "no-store" } });
}
