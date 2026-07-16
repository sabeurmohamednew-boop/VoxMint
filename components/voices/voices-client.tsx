"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowDownAZ, Edit3, Mic2, MoreVertical, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RenameVoiceDialog } from "@/components/voices/rename-voice-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AudioPlayer } from "@/components/audio/audio-player";
import { LocalTime } from "@/components/ui/local-time";
import { useToast } from "@/components/ui/toast";
import { fetchJson } from "@/lib/api/client";
import { isVoiceCompatibleWithProvider } from "@/lib/providers/compatibility";
import type { ProviderInfoDto, VoiceDto } from "@/lib/types/dto";

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
  const [edit, setEdit] = useState<VoiceDto | null>(null);
  const [remove, setRemove] = useState<VoiceDto | null>(null);
  const [preview, setPreview] = useState<VoiceDto | null>(null);
  const { showToast } = useToast();
  const filtered = useMemo(
    () => voices
      .filter((voice) => voice.name.toLowerCase().includes(search.toLowerCase()) && (status === "all" || voice.status === status))
      .sort((first, second) => {
        if (sort === "name") return first.name.localeCompare(second.name);
        if (sort === "oldest") return +new Date(first.createdAt) - +new Date(second.createdAt);
        if (sort === "newest") return +new Date(second.createdAt) - +new Date(first.createdAt);
        return +(new Date(second.lastUsedAt ?? second.createdAt)) - +(new Date(first.lastUsedAt ?? first.createdAt));
      }),
    [voices, search, sort, status],
  );

  async function saveVoice(name: string, description: string | null) {
    if (!edit) return;
    try {
      const result = await fetchJson<{ voice: VoiceDto }>(`/api/voices/${edit.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      setVoices((current) => current.map((voice) => voice.id === result.voice.id ? result.voice : voice));
      setEdit(null);
      showToast("Voice updated");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Update failed.", "error");
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

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1"><span className="sr-only">Search voices</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" /><input className="field pl-10 pr-3" placeholder="Search voices" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label><span className="sr-only">Filter by status</span><select className="field min-w-[150px] px-3" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="READY">Ready</option><option value="PROCESSING">Processing</option><option value="FAILED">Failed</option></select></label>
        <label className="relative"><ArrowDownAZ className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" /><span className="sr-only">Sort voices</span><select className="field min-w-[160px] pl-10 pr-3" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Recently used</option><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Name</option></select></label>
      </div>

      {preview?.latestGeneration && <section className="panel mt-5 p-5" aria-label={`Latest generation for ${preview.name}`}><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold break-words">{preview.name}</p><p className="mt-1 text-xs text-[var(--muted)]">Latest saved generation · no new provider operation</p></div><button type="button" className="button-ghost px-3" onClick={() => setPreview(null)}>Close</button></div><AudioPlayer generation={preview.latestGeneration} /></section>}

      {filtered.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((voice) => {
            const compatible = isVoiceCompatibleWithProvider(voice.provider, providerInfo.name);
            const usable = compatible && voice.status === "READY";
            return (
              <article className={`panel flex min-h-[300px] min-w-0 flex-col p-5 ${compatible ? "" : "opacity-75"}`} key={voice.id}>
                <div className="flex items-start gap-3">
                  <span className="voice-avatar"><Mic2 className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="min-w-0 break-words text-sm font-semibold" title={voice.name}>{voice.name}</h2><span className={voice.provider === "mock" ? "demo-voice-badge" : "provider-badge"}>{voice.provider === "mock" ? "Demo voice" : "Cartesia"}</span></div>
                    <p className="mt-1 text-xs text-[var(--muted)]">{voice.primaryLanguage.toUpperCase()} · {voice.status === "READY" ? "Ready" : voice.status.toLowerCase()}</p>
                    {!compatible && <p className="mt-1 text-[11px] text-[var(--warning)]">Unavailable while {providerInfo.label} is active</p>}
                    {voice.reconciliationState === "provider_missing" && <p className="mt-1 text-[11px] text-[var(--danger)]">Provider voice is missing. New generation is unavailable.</p>}
                  </div>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild><button type="button" className="button-ghost h-11 min-h-11 w-11 p-0" aria-label={`Actions for ${voice.name}`}><MoreVertical className="h-4 w-4" /></button></DropdownMenu.Trigger>
                    <DropdownMenu.Portal><DropdownMenu.Content className="menu-content" sideOffset={6} align="end"><DropdownMenu.Item className="menu-item" onSelect={() => setEdit(voice)}><Edit3 className="h-4 w-4" />Edit voice</DropdownMenu.Item><DropdownMenu.Item className="menu-item danger" onSelect={() => setRemove(voice)}><Trash2 className="h-4 w-4" />Delete</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
                {voice.description ? <p className="mt-4 line-clamp-2 text-xs leading-5 text-[var(--foreground-secondary)]">{voice.description}</p> : <p className="mt-4 text-xs italic text-[var(--muted)]">No description</p>}
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--border-subtle)] pt-4 text-[11px]">
                  <div><dt className="text-[var(--muted)]">Created</dt><dd className="mt-0.5 text-[var(--foreground-secondary)]"><LocalTime value={voice.createdAt} /></dd></div>
                  <div><dt className="text-[var(--muted)]">Original sample duration</dt><dd className="mt-0.5 text-[var(--foreground-secondary)]">{Math.round(voice.sourceDurationMs / 100) / 10}s</dd></div>
                  <div><dt className="text-[var(--muted)]">Last used</dt><dd className="mt-0.5 text-[var(--foreground-secondary)]">{voice.lastUsedAt ? <LocalTime value={voice.lastUsedAt} /> : "Never"}</dd></div>
                  <div><dt className="text-[var(--muted)]">Generations</dt><dd className="mt-0.5 text-[var(--foreground-secondary)]">{voice.generationCount.toLocaleString()}</dd></div>
                </dl>
                <div className="mt-auto flex flex-col items-stretch gap-2 pt-5 sm:flex-row sm:items-center">
                  {usable ? <Link href={`/dashboard?voice=${encodeURIComponent(voice.id)}#generate`} className="button-primary w-full px-4 sm:flex-1"><Mic2 className="h-4 w-4" />Use voice</Link> : <button type="button" className="button-primary w-full px-4 sm:flex-1" disabled title={compatible ? "Voice is not ready" : `Unavailable with ${providerInfo.label}`}><Mic2 className="h-4 w-4" />Use voice</button>}
                  {voice.latestGeneration?.audioUrl ? <button type="button" className="button-secondary min-h-[44px] w-full px-3 text-[11px] sm:w-auto" onClick={() => setPreview(voice)}>Play latest generation</button> : <span className="button-secondary min-h-[44px] w-full cursor-default px-3 text-[11px] text-[var(--muted)] sm:w-auto" title="No saved playable generation is available">No preview available</span>}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="panel mt-5 p-12 text-center"><Mic2 className="mx-auto h-10 w-10 text-[var(--muted)]" /><h2 className="mt-4 font-semibold">{voices.length ? "No voices match" : "No voices yet"}</h2><p className="mt-2 text-sm text-[var(--muted)]">{voices.length ? "Try a different search or filter." : "Create your first permitted voice."}</p>{!voices.length && <Link href="/voices/new" className="button-primary mt-5 px-5">Create a voice</Link>}</div>
      )}

      <RenameVoiceDialog key={edit?.id ?? "closed"} voice={edit} onOpenChange={(open) => { if (!open) setEdit(null); }} onSave={saveVoice} />
      <ConfirmDialog open={Boolean(remove)} onOpenChange={(open) => { if (!open) setRemove(null); }} title={`Delete ${remove?.name ?? "voice"}?`} description="This voice cannot be used for new scripts. Existing generated audio will remain until deleted separately." confirmLabel="Delete voice" danger onConfirm={deleteVoice} />
    </>
  );
}
