"use client";

import { BarChart3, Clock3, Crown, HelpCircle, Home, Menu, Mic2, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { VoxMintLogo } from "@/components/branding/voxmint-logo";

const navigation = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/voices", label: "My Voices", icon: Mic2 },
  { href: "/history", label: "History", icon: Clock3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="space-y-1 px-4 py-5">
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[48px] items-center gap-3 rounded-[9px] px-3 text-[14px] font-medium transition-colors ${active ? "bg-[var(--panel-strong)] text-[#c9a9ff]" : "text-[var(--foreground-secondary)] hover:bg-[var(--panel-muted)] hover:text-[var(--foreground)]"}`}
          >
            <Icon className={`h-[19px] w-[19px] ${active ? "text-[#8859ef]" : "text-[var(--muted)]"}`} strokeWidth={1.9} />
            {label}
          </Link>
        );
      })}
      <Link href="/usage" onClick={onNavigate} className="mt-3 flex min-h-[44px] items-center gap-3 rounded-[9px] px-3 text-[13px] font-medium text-[var(--muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--foreground)]">
        <BarChart3 className="h-[18px] w-[18px]" />Usage
      </Link>
    </nav>
  );
}

export function AppSidebar() {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand"><Link href="/dashboard"><VoxMintLogo /></Link></div>
      <NavItems />
      <div className="mt-auto px-5 pb-5">
        <div className="panel-quiet p-4">
          <div className="flex items-center gap-2 text-[#a36afb]"><Crown className="h-5 w-5 text-[#f4ac52]" /><span className="font-semibold">Go Pro</span></div>
          <p className="mt-3 text-[12.5px] leading-5 text-[var(--foreground-secondary)]">More voices, longer scripts, and higher monthly usage.</p>
          <Link href="/billing" className="button-primary mt-4 w-full min-h-[40px]">View plans</Link>
        </div>
      </div>
      <div className="border-t border-[var(--border-subtle)] px-5 py-4">
        <Link href="/help" className="flex min-h-[38px] items-center gap-2.5 text-[13px] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"><HelpCircle className="h-[18px] w-[18px]" />Help &amp; Safety</Link>
        <p className="px-0.5 pt-1 text-[10px] text-[var(--muted-dark)]">VoxMint 0.1.0</p>
      </div>
    </aside>
  );
}

export function MobileNavigation({ title, right }: { title: string; right: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  return (
    <>
      <header className="mobile-bar">
        <button type="button" className="icon-button border-0 bg-transparent" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
        <div className="flex items-center gap-2"><VoxMintLogo compact /><span className="text-sm font-semibold">{title}</span></div>
        {right}
      </header>
      {open && (
        <div className="fixed inset-0 z-[80] bg-black/65" role="presentation" onMouseDown={() => setOpen(false)}>
          <aside className="flex h-full w-[min(86vw,320px)] flex-col border-r border-[var(--border)] bg-[var(--sidebar)]" role="dialog" aria-modal="true" aria-label="Navigation" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sidebar-brand justify-between"><VoxMintLogo /><button type="button" className="icon-button border-0 bg-transparent" onClick={() => setOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></button></div>
            <NavItems onNavigate={() => setOpen(false)} />
            <Link href="/help" onClick={() => setOpen(false)} className="mt-auto flex min-h-[56px] items-center gap-3 border-t border-[var(--border-subtle)] px-7 text-sm text-[var(--foreground-secondary)]"><HelpCircle className="h-5 w-5" />Help &amp; Safety</Link>
          </aside>
        </div>
      )}
    </>
  );
}
