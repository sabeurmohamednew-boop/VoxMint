import { CreditCard, Gauge, KeyRound } from "lucide-react";
import Link from "next/link";
import type { PublicBillingState } from "@/lib/billing/public-state";

export function BillingOverview({ state }: { state: PublicBillingState }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <section className="panel p-6">
        <div className="flex items-center gap-2 text-[#9a67f0]">
          <KeyRound className="h-5 w-5" />
          <p className="text-xs font-semibold uppercase tracking-[.12em]">Application access</p>
        </div>
        <h2 className="mt-3 text-xl font-bold">{state.applicationPlanLabel}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)]">
          {state.mode === "development"
            ? "This workspace uses development access. It is not a paid VoxMint subscription."
            : "No application billing plan is configured for this deployment."}
        </p>
      </section>

      <section className="panel p-6">
        <div className="flex items-center gap-2 text-[#9a67f0]">
          <Gauge className="h-5 w-5" />
          <p className="text-xs font-semibold uppercase tracking-[.12em]">Provider allowance</p>
        </div>
        <h2 className="mt-3 text-xl font-bold">{state.providerAllowanceLabel}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)]">
          {state.characterAllowance.toLocaleString()} characters and {state.voiceAllowance} saved voices
          are available under the active provider allowance.
        </p>
        <Link href="/usage" className="button-secondary mt-5 px-4">View usage</Link>
      </section>

      <section className="panel p-6">
        <div className="flex items-center gap-2 text-[var(--muted)]">
          <CreditCard className="h-5 w-5" />
          <p className="text-xs font-semibold uppercase tracking-[.12em]">Payments</p>
        </div>
        <h2 className="mt-3 text-xl font-bold">Payments unavailable</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)]">
          Checkout is not configured, so VoxMint will not present an upgrade action or collect payment.
        </p>
        <span className="status-badge mt-5">Inactive</span>
      </section>
    </div>
  );
}
