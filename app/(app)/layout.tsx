import { AppShell } from "@/components/app-shell/app-shell";
import { requireUser } from "@/lib/auth/session";
import { getAccount } from "@/server/services/account-service";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const account = await getAccount(user.id);
  return (
    <AppShell title="Workspace" user={user} theme={account.theme}>
      {children}
    </AppShell>
  );
}
