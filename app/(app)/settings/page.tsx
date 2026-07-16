import { SettingsClient } from "@/components/settings/settings-client";
import { requireUser } from "@/lib/auth/session";
import { getPublicOperationsInfo } from "@/lib/config/env";
import { getAccount } from "@/server/services/account-service";

export default async function SettingsPage() {
  const user = await requireUser();
  const account = await getAccount(user.id);
  const operations = getPublicOperationsInfo();
  return <><header className="mb-6"><h1 className="text-[30px] font-bold tracking-[-0.035em]">Settings</h1><p className="mt-1.5 text-sm text-[var(--foreground-secondary)]">Manage your profile, preferences and account data.</p></header><SettingsClient account={account} operations={operations} /></>;
}
