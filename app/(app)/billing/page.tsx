import { BillingOverview } from "@/components/billing/billing-overview";
import { requireUser } from "@/lib/auth/session";
import { getPublicBillingState } from "@/server/services/billing-service";

export default async function BillingPage() {
  const user = await requireUser();
  const state = await getPublicBillingState(user.id);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-[30px] font-bold tracking-[-0.035em]">Service status</h1>
        <p className="mt-1.5 text-sm text-[var(--foreground-secondary)]">
          Review application access, configured deployment ceilings and payment availability.
        </p>
      </header>
      <BillingOverview state={state} />
    </>
  );
}
