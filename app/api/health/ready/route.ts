import { getEnv } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { checkReadiness } from "@/lib/health/readiness";
import { getVoiceProvider } from "@/lib/providers";
import { getRateLimiter } from "@/lib/rate-limit/rate-limiter";
import { getObjectStorage } from "@/lib/storage";

export async function GET() {
  const env = getEnv();
  const result = await checkReadiness({
    queryDatabase: () => prisma.$queryRaw`SELECT 1`,
    initializeStorage: getObjectStorage,
    initializeRateLimit: getRateLimiter,
    initializeProvider: getVoiceProvider,
    storageName: env.STORAGE_PROVIDER,
    rateLimitName: env.RATE_LIMIT_PROVIDER,
    providerName: env.VOICE_PROVIDER,
    providerOperationsEnabled: env.VOICE_OPERATIONS_ENABLED,
  });
  return Response.json(result, { status: result.status === "ready" ? 200 : 503, headers: { "cache-control": "no-store" } });
}
