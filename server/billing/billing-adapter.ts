import "server-only";

import type { PublicBillingState } from "@/lib/billing/public-state";

/** Boundary for a future payment integration. No payment adapter is configured today. */
export interface BillingAdapter {
  getPublicState(userId: string): Promise<PublicBillingState>;
  createCheckout(userId: string, planId: string): Promise<{ url: string }>;
}
