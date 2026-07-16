import { PublicShell } from "@/components/public/public-shell";
import { getPublicOperationsInfo } from "@/lib/config/env";
import { formatPolicyDate, POLICY_TEMPLATE_UPDATED_AT } from "@/lib/policy/metadata";

export async function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  const operations = getPublicOperationsInfo();
  const date = formatPolicyDate(operations.policyEffectiveDate ?? POLICY_TEMPLATE_UPDATED_AT);
  return <PublicShell><article className="mx-auto max-w-[820px] px-5 pb-24 pt-14 sm:px-8"><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#a875f2]">VoxMint policy</p><h1 className="mt-3 text-4xl font-bold tracking-[-0.045em]">{title}</h1><p className="mt-4 text-base leading-7 text-[var(--foreground-secondary)]">{intro}</p><div className="mt-10 space-y-8 text-sm leading-7 text-[var(--foreground-secondary)] [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[var(--foreground)] [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">{children}</div><p className="mt-12 border-t border-[var(--border-subtle)] pt-5 text-xs text-[var(--muted)]">{operations.policyEffectiveDate ? `Effective ${date}.` : `Template updated ${date}.`} This deployment policy template requires operator and legal review before public launch.</p></article></PublicShell>;
}
