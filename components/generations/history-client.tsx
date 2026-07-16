"use client";

import { Download, Edit3, History, LoaderCircle, Play, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AudioPlayer } from "@/components/audio/audio-player";
import { RenameGenerationDialog } from "@/components/generations/rename-generation-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { fetchJson } from "@/lib/api/client";
import { downloadAudio } from "@/lib/audio/client";
import { formatDuration, safeBaseName } from "@/lib/audio/utils";
import { formatDate } from "@/lib/date";
import type { GenerationDto, VoiceDto } from "@/lib/types/dto";

export function HistoryClient({ initialGenerations, voices }: { initialGenerations: GenerationDto[]; voices: VoiceDto[] }) {
  const [generations, setGenerations] = useState(initialGenerations);
  const [search, setSearch] = useState("");
  const [voice, setVoice] = useState("all");
  const [provider, setProvider] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState<GenerationDto | null>(null);
  const [remove, setRemove] = useState<GenerationDto | null>(null);
  const [rename, setRename] = useState<GenerationDto | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const filtered = useMemo(() => generations.filter((item) => {
    const matchesText = item.text.toLowerCase().includes(search.toLowerCase()) || (item.title ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === "all" || (status === "MISSING" ? item.status === "READY" && !item.audioAvailable : item.status === status);
    return matchesText && (voice === "all" || item.voiceId === voice) && (provider === "all" || item.provider === provider) && matchesStatus;
  }).sort((a, b) => sort === "oldest" ? +new Date(a.createdAt) - +new Date(b.createdAt) : +new Date(b.createdAt) - +new Date(a.createdAt)), [generations, provider, search, sort, status, voice]);

  async function deleteItem() {
    if (!remove) return;
    try {
      await fetchJson<void>(`/api/generations/${remove.id}`, { method: "DELETE" });
      setGenerations((current) => current.filter((item) => item.id !== remove.id));
      if (selected?.id === remove.id) setSelected(null);
      setRemove(null);
      showToast("Generation deleted");
    } catch (error) { showToast(error instanceof Error ? error.message : "Delete failed.", "error"); }
  }

  async function renameItem(title: string) {
    if (!rename) return;
    try {
      const result = await fetchJson<{ generation: GenerationDto }>(`/api/generations/${rename.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title }) });
      setGenerations((current) => current.map((item) => item.id === result.generation.id ? result.generation : item));
      if (selected?.id === result.generation.id) setSelected(result.generation);
      setRename(null);
      showToast("Generation renamed");
    } catch (error) { showToast(error instanceof Error ? error.message : "Rename failed.", "error"); }
  }

  async function downloadItem(item: GenerationDto) {
    if (!item.audioUrl) return;
    setDownloadingId(item.id);
    try {
      await downloadAudio(item.audioUrl, `${safeBaseName(item.voiceName)}.${item.mimeType === "audio/mpeg" ? "mp3" : "wav"}`);
      showToast("Download started");
    } catch (error) { showToast(error instanceof Error ? error.message : "Download failed.", "error"); }
    finally { setDownloadingId(null); }
  }

  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_160px_140px_150px_130px]">
      <label className="relative sm:col-span-2 xl:col-span-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" /><span className="sr-only">Search scripts</span><input className="field pl-10 pr-3" placeholder="Search scripts and titles" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <select className="field px-3" aria-label="Filter by voice" value={voice} onChange={(event) => setVoice(event.target.value)}><option value="all">All voices</option>{voices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select className="field px-3" aria-label="Filter by provider" value={provider} onChange={(event) => setProvider(event.target.value)}><option value="all">All providers</option><option value="cartesia">Cartesia</option><option value="mock">Demo</option></select>
      <select className="field px-3" aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="READY">Ready</option><option value="MISSING">Audio missing</option><option value="FAILED">Failed</option><option value="PROCESSING">Processing</option></select>
      <select className="field px-3" aria-label="Sort history" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option></select>
    </div>
    {selected && <div className="panel mt-5 p-4"><AudioPlayer key={selected.id} generation={selected} onDelete={setRemove} onRename={setRename} /></div>}
    {filtered.length ? <div className="panel mt-5 overflow-x-auto"><div className="min-w-[820px]"><div className="grid grid-cols-[minmax(220px,1.5fr)_150px_90px_100px_120px_auto] gap-4 border-b border-[var(--border-subtle)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--muted)]"><span>Generation</span><span>Voice</span><span>Provider</span><span>Length</span><span>Date</span><span className="text-right">Actions</span></div>{filtered.map((item) => <article key={item.id} className="grid grid-cols-[minmax(220px,1.5fr)_150px_90px_100px_120px_auto] items-center gap-4 border-b border-[var(--border-subtle)] px-5 py-4 last:border-0"><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{item.title || "Untitled voiceover"}</h2><p className="mt-1 truncate text-xs text-[var(--muted)]">{item.text}</p>{item.status === "FAILED" && <p className="mt-1 text-xs text-[var(--danger)]">{item.errorMessageSafe}</p>}{item.status === "READY" && !item.audioAvailable && <p className="mt-1 text-xs text-[var(--warning)]">Audio file missing</p>}</div><p className="truncate text-xs text-[var(--foreground-secondary)]">{item.voiceName}</p><span className="w-fit rounded-full border border-[var(--border-subtle)] px-2 py-1 text-[10px] font-semibold uppercase text-[var(--muted)]">{item.provider === "mock" ? "Demo" : "Cartesia"}</span><p className="text-xs text-[var(--muted)]">{item.durationMs ? formatDuration(item.durationMs) : `${item.characterCount} chars`}</p><p className="text-xs text-[var(--muted)]">{formatDate(item.createdAt)}</p><div className="flex justify-end gap-1"><button type="button" className="icon-button h-9 min-h-9 w-9 min-w-9" onClick={() => setSelected(item)} disabled={!item.audioUrl} aria-label={`Play ${item.title}`}><Play className="h-4 w-4" /></button><button type="button" className="icon-button h-9 min-h-9 w-9 min-w-9" onClick={() => void downloadItem(item)} disabled={!item.audioUrl || downloadingId === item.id} aria-label={`Download ${item.title}`}>{downloadingId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}</button><button type="button" className="icon-button h-9 min-h-9 w-9 min-w-9" onClick={() => setRename(item)} aria-label={`Rename ${item.title}`}><Edit3 className="h-4 w-4" /></button><button type="button" className="icon-button h-9 min-h-9 w-9 min-w-9 text-[var(--danger)]" onClick={() => setRemove(item)} aria-label={`Delete ${item.title}`}><Trash2 className="h-4 w-4" /></button></div></article>)}</div></div> : <div className="panel mt-5 p-12 text-center"><History className="mx-auto h-10 w-10 text-[var(--muted)]" /><h2 className="mt-4 font-semibold">No generations found</h2><p className="mt-2 text-sm text-[var(--muted)]">Your generated voiceovers will appear here.</p></div>}
    <RenameGenerationDialog key={rename?.id ?? "closed"} generation={rename} onOpenChange={(open) => { if (!open) setRename(null); }} onRename={renameItem} />
    <ConfirmDialog open={Boolean(remove)} onOpenChange={(open) => { if (!open) setRemove(null); }} title="Delete this generation?" description="The stored audio and its history record will no longer be available." confirmLabel="Delete generation" danger onConfirm={deleteItem} />
  </>;
}
