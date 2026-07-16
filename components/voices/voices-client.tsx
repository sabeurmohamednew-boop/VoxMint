"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowDownAZ, Edit3, Mic2, MoreVertical, Play, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RenameVoiceDialog } from "@/components/voices/rename-voice-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { fetchJson } from "@/lib/api/client";
import { isVoiceCompatibleWithProvider } from "@/lib/providers/compatibility";
import type { ProviderInfoDto, VoiceDto } from "@/lib/types/dto";
import { formatDate } from "@/lib/date";

export function VoicesClient({
  initialVoices,
  providerInfo,
}: {
  initialVoices: VoiceDto[];
  providerInfo: ProviderInfoDto;
}) {
  const [voices, setVoices] = useState(initialVoices);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [status, setStatus] = useState("all");
  const [rename, setRename] = useState<VoiceDto | null>(null);
  const [remove, setRemove] = useState<VoiceDto | null>(null);
  const { showToast } = useToast();
  const filtered = useMemo(
    () =>
      voices
        .filter(
          (voice) =>
            voice.name.toLowerCase().includes(search.toLowerCase()) &&
            (status === "all" || voice.status === status),
        )
        .sort((first, second) => {
          if (sort === "name") return first.name.localeCompare(second.name);
          if (sort === "oldest") return +new Date(first.createdAt) - +new Date(second.createdAt);
          return +(new Date(second.lastUsedAt ?? second.createdAt)) - +(new Date(first.lastUsedAt ?? first.createdAt));
        }),
    [voices, search, sort, status],
  );

  async function renameVoice(name: string) {
    if (!rename) return;
    try {
      const result = await fetchJson<{ voice: VoiceDto }>(`/api/voices/${rename.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setVoices((current) => current.map((voice) => voice.id === result.voice.id ? result.voice : voice));
      setRename(null);
      showToast("Voice renamed");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Rename failed.", "error");
    }
  }

  async function deleteVoice() {
    if (!remove) return;
    try {
      await fetchJson<void>(`/api/voices/${remove.id}`, { method: "DELETE" });
      setVoices((current) => current.filter((voice) => voice.id !== remove.id));
      setRemove(null);
      showToast("Voice deleted");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Delete failed.", "error");
    }
  }

  async function preview(voice: VoiceDto) {
    if (!isVoiceCompatibleWithProvider(voice.provider, providerInfo.name)) return;
    try {
      await fetchJson(`/api/voices/${voice.id}/preview`, { method: "POST" });
      showToast("Test voiceover added to History");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Test failed.", "error");
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search voices</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input className="field pl-10 pr-3" placeholder="Search voices" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select className="field min-w-[150px] px-3" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="READY">Ready</option>
            <option value="PROCESSING">Processing</option>
            <option value="FAILED">Failed</option>
          </select>
        </label>
        <label className="relative">
          <ArrowDownAZ className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <span className="sr-only">Sort voices</span>
          <select className="field min-w-[160px] pl-10 pr-3" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="recent">Recently used</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      {filtered.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((voice) => {
            const compatible = isVoiceCompatibleWithProvider(voice.provider, providerInfo.name);
            return (
              <article className={`panel p-5 ${compatible ? "" : "opacity-75"}`} key={voice.id}>
                <div className="flex items-start gap-3">
                  <span className="voice-avatar"><Mic2 className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-sm font-semibold">{voice.name}</h2>
                      {voice.provider === "mock" ? (
                        <span className="rounded-full border border-[#7c56d9]/30 bg-[#7547d8]/8 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#b68cff]">Demo voice</span>
                      ) : (
                        <span className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">Cartesia</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">{voice.primaryLanguage.toUpperCase()} · {voice.status}</p>
                    {!compatible && <p className="mt-1 text-[11px] text-[var(--warning)]">Unavailable while {providerInfo.label} is active</p>}
                  </div>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button type="button" className="button-ghost h-9 min-h-9 w-9 p-0" aria-label={`Actions for ${voice.name}`}><MoreVertical className="h-4 w-4" /></button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content className="menu-content" sideOffset={6} align="end">
                        {compatible ? (
                          <DropdownMenu.Item className="menu-item" asChild><Link href="/dashboard#generate"><Mic2 className="h-4 w-4" />Use voice</Link></DropdownMenu.Item>
                        ) : (
                          <DropdownMenu.Item className="menu-item" disabled><Mic2 className="h-4 w-4" />Use voice</DropdownMenu.Item>
                        )}
                        <DropdownMenu.Item className="menu-item" disabled={!compatible} onSelect={() => void preview(voice)}><Play className="h-4 w-4" />Generate test</DropdownMenu.Item>
                        <DropdownMenu.Item className="menu-item" onSelect={() => setRename(voice)}><Edit3 className="h-4 w-4" />Rename</DropdownMenu.Item>
                        <DropdownMenu.Item className="menu-item danger" onSelect={() => setRemove(voice)}><Trash2 className="h-4 w-4" />Delete</DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
                {voice.description && <p className="mt-4 line-clamp-2 text-xs leading-5 text-[var(--foreground-secondary)]">{voice.description}</p>}
                <div className="mt-5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-4 text-[11px] text-[var(--muted)]">
                  <span>Created {formatDate(voice.createdAt)}</span>
                  <span>{Math.round(voice.sourceDurationMs / 100) / 10}s sample</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="panel mt-5 p-12 text-center">
          <Mic2 className="mx-auto h-10 w-10 text-[var(--muted)]" />
          <h2 className="mt-4 font-semibold">{voices.length ? "No voices match" : "No voices yet"}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{voices.length ? "Try a different search or filter." : "Create your first permitted voice from the dashboard."}</p>
          {!voices.length && <Link href="/dashboard#clone" className="button-primary mt-5 px-5">Clone a voice</Link>}
        </div>
      )}

      <RenameVoiceDialog key={rename?.id ?? "closed"} voice={rename} onOpenChange={(open) => { if (!open) setRename(null); }} onRename={renameVoice} />
      <ConfirmDialog
        open={Boolean(remove)}
        onOpenChange={(open) => { if (!open) setRemove(null); }}
        title={`Delete ${remove?.name ?? "voice"}?`}
        description="This voice cannot be used for new scripts. Existing generated audio will remain until deleted separately."
        confirmLabel="Delete voice"
        danger
        onConfirm={deleteVoice}
      />
    </>
  );
}
