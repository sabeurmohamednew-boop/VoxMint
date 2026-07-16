import { AppSidebar, MobileNavigation } from "@/components/app-shell/app-navigation";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { UserMenu } from "@/components/app-shell/user-menu";

export function AppShell({
  children,
  title,
  user,
  theme,
}: {
  children: React.ReactNode;
  title: string;
  user: { name?: string | null; email?: string | null; image?: string | null };
  theme: "SYSTEM" | "DARK" | "LIGHT";
}) {
  const controls = <UserMenu user={user} />;
  return (
    <div className="app-shell">
      <AppSidebar />
      <MobileNavigation title={title} right={controls} />
      <main className="app-main">
        <div className="app-content">
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
