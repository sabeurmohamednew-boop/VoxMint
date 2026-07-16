"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { BarChart3, ChevronDown, LogOut, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";

function initials(name: string | null | undefined, email: string | null | undefined) {
  const source = name || email || "V";
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function UserMenu({
  user,
  developmentSession,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  developmentSession: boolean;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="button-ghost min-h-[44px] gap-2 px-1.5" aria-label="Open account menu">
          <span className="relative">
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#7b4ae6] to-[#4b2cb7] text-sm font-bold text-white">
              {initials(user.name, user.email)}
            </span>
            {developmentSession && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--background)] bg-[var(--warning)]" aria-hidden="true" />}
          </span>
          {developmentSession && <span className="development-badge hidden sm:inline-flex">Development account</span>}
          <ChevronDown className="hidden h-4 w-4 sm:block" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="menu-content" sideOffset={8} align="end">
          <div className="border-b border-[var(--border-subtle)] px-2.5 py-2.5">
            <p className="truncate text-sm font-semibold">{user.name || "VoxMint user"}</p>
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{user.email}</p>
            {developmentSession && <p className="mt-2 text-[11px] leading-4 text-[var(--warning)]">Development account · local authentication only</p>}
          </div>
          <DropdownMenu.Item className="menu-item" asChild><Link href="/settings"><Settings className="h-4 w-4" />Settings</Link></DropdownMenu.Item>
          <DropdownMenu.Item className="menu-item" asChild><Link href="/usage"><BarChart3 className="h-4 w-4" />Usage</Link></DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-[var(--border-subtle)]" />
          <DropdownMenu.Item className="menu-item danger" onSelect={() => void signOut({ redirectTo: "/" })}>
            <LogOut className="h-4 w-4" />Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
