import Link from "next/link";
import { VoxMintLogo } from "@/components/branding/voxmint-logo";
import { getCurrentUser } from "@/lib/auth/session";
import { PublicHeader } from "@/components/public/public-navigation";

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--border-subtle)]">
      <div className="mx-auto flex max-w-[1220px] flex-col gap-4 px-5 py-8 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <VoxMintLogo />
        <nav aria-label="Policy links" className="flex flex-wrap gap-5">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/acceptable-use">Acceptable use</Link>
          <Link href="/help">Help &amp; Safety</Link>
        </nav>
      </div>
    </footer>
  );
}

export async function PublicShell({ children, signedIn }: { children: React.ReactNode; signedIn?: boolean }) {
  const resolvedSignedIn = signedIn ?? Boolean((await getCurrentUser())?.id);
  return <main><PublicHeader signedIn={resolvedSignedIn} />{children}<PublicFooter /></main>;
}
