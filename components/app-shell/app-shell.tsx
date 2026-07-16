import { AppSidebar, MobileNavigation } from "@/components/app-shell/app-navigation";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { UserMenu } from "@/components/app-shell/user-menu";

export function AppShell({
  children,
  title,
  user,
  theme,
  developmentSession,
}: {
  children: React.ReactNode;
  title: string;
  user: { name?: string | null; email?: string | null; image?: string | null };
  theme: "SYSTEM" | "DARK" | "LIGHT";
  developmentSession: boolean;
}) {
  const controls = <UserMenu user={user} />;
  return (
    <div className="app-shell">
      <AppSidebar />
      <MobileNavigation title={title} right={controls} />
      <main className="app-main">
        <div className="app-content">
          {developmentSession && <div className="mb-4 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--warning)]">Development session · not a production account</div>}
          <div className="mb-4 hidden items-center justify-end gap-2 md:flex">
            <ThemeToggle initialTheme={theme} />
            {controls}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
