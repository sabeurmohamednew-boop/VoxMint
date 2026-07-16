import "server-only";

import { createPublicBillingState } from "@/lib/billing/public-state";
import { getPublicOperationsInfo } from "@/lib/config/env";
import { getPublicProviderInfo } from "@/lib/providers";
import { getUsage } from "@/server/services/usage-service";

export async function getPublicBillingState(userId: string) {
  const usage = await getUsage(userId);
  return createPublicBillingState({
    developmentSession: getPublicOperationsInfo().developmentSession,
    providerInfo: getPublicProviderInfo(),
    usage,
  });
}
