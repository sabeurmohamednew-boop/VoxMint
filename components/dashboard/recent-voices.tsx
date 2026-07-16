"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Mic2, Settings2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { fetchJson } from "@/lib/api/client";
import { isVoiceCompatibleWithProvider } from "@/lib/providers/compatibility";
import type { ProviderInfoDto, VoiceDto } from "@/lib/types/dto";
import { formatDate } from "@/lib/date";

export function RecentVoices({
  voices,
  selectedId,
  onSelect,
  onDelete,
  providerInfo,
}: {
  voices: VoiceDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  providerInfo: ProviderInfoDto;
}) {
  const [deleteVoice, setDeleteVoice] = useState<VoiceDto | null>(null);
  const { showToast } = useToast();
  const visibleVoices = useMemo(
    () =>
      [...voices].sort(
        (first, second) =>
          Number(isVoiceCompatibleWithProvider(second.provider, providerInfo.name)) -
          Number(isVoiceCompatibleWithProvider(first.provider, providerInfo.name)),
      ),
    [providerInfo.name, voices],
  );

  async function confirmDelete() {
    if (!deleteVoice) return;
    try {
      await fetchJson<void>(`/api/voices/${deleteVoice.id}`, { method: "DELETE" });
      onDelete(deleteVoice.id);
      showToast("Voice deleted");
      setDeleteVoice(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Voice deletion failed.", "error");
    }
  }

  return (
    <section className="panel mt-5 p-5" aria-labelledby="recent-voices-title">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Mic2 className="h-6 w-6 text-[#8e58ee]" />
          <div>
            <h2 id="recent-voices-title" className="text-[15px] font-semibold">My Voices</h2>
            <p className="mt-0.5 text-xs text-[var(--foreground-secondary)]">View and manage your saved voices.</p>
          </div>
        </div>
        <Link href="/voices" className="text-xs font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground)]">View all →</Link>
      </div>

      {visibleVoices.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleVoices.slice(0, 3).map((voice) => {
            const compatible = isVoiceCompatibleWithProvider(voice.provider, providerInfo.name);
            const usable = compatible && voice.status === "READY";
            return (
              <div
                key={voice.id}
                className={`voice-card ${usable ? "" : "opacity-70"}`}
                data-selected={usable && voice.id === selectedId}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  disabled={!usable}
                  title={usable ? `Use ${voice.name}` : `${voice.name} is unavailable for generation`}
                  onClick={() => {
                    onSelect(voice.id);
                    document.querySelector("#generate")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <span className="voice-avatar"><Mic2 className="h-5 w-5" /></span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="block truncate text-[13px] font-semibold">{voice.name}</span>
                      {voice.provider === "mock" && <span className="rounded-full border border-[#7c56d9]/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#b68cff]">Demo voice</span>}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[var(--foreground-secondary)]">
                      {voice.primaryLanguage.toUpperCase()} · {formatDate(voice.createdAt)}
                    </span>
                  </span>
                </button>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button type="button" className="button-ghost h-11 min-h-11 w-11 p-0" aria-label={`Actions for ${voice.name}`}><MoreVertical className="h-4 w-4" /></button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content className="menu-content" sideOffset={6} align="end">
                      <DropdownMenu.Item className="menu-item" disabled={!usable} asChild={usable}>{usable ? <Link href={`/dashboard?voice=${encodeURIComponent(voice.id)}#generate`}><Mic2 className="h-4 w-4" />Use voice</Link> : <span><Mic2 className="h-4 w-4" />Use voice</span>}</DropdownMenu.Item>
                      <DropdownMenu.Item className="menu-item" asChild><Link href="/voices"><Settings2 className="h-4 w-4" />Manage</Link></DropdownMenu.Item>
                      <DropdownMenu.Item className="menu-item danger" onSelect={() => setDeleteVoice(voice)}><Trash2 className="h-4 w-4" />Delete</DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="panel-quiet mt-4 p-8 text-center">
          <Mic2 className="mx-auto h-8 w-8 text-[var(--muted)]" />
          <p className="mt-3 text-sm font-semibold">No saved voices yet</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Create a permitted voice above to get started.</p>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteVoice)}
        onOpenChange={(open) => { if (!open) setDeleteVoice(null); }}
        title={`Delete ${deleteVoice?.name ?? "voice"}?`}
        description="The voice will no longer be available for new scripts. Existing generated audio remains in History until you delete it separately."
        confirmLabel="Delete voice"
        danger
        onConfirm={confirmDelete}
      />
    </section>
  );
}
