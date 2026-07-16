"use client";

import { Download, Edit3, FileText, History, LoaderCircle, Play, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AudioPlayer } from "@/components/audio/audio-player";
import { RenameGenerationDialog } from "@/components/generations/rename-generation-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LocalTime } from "@/components/ui/local-time";
import { useToast } from "@/components/ui/toast";
import { fetchJson } from "@/lib/api/client";
import { downloadAudio } from "@/lib/audio/client";
import { formatDuration, safeBaseName } from "@/lib/audio/utils";
import type { HistoryProviderFilter } from "@/lib/history/provider-filter";
import type { GenerationDto, VoiceDto } from "@/lib/types/dto";

function ActionButtons({ item, downloading, onPlay, onDetails, onDownload, onRename, onDelete }: {
  item: GenerationDto;
  downloading: boolean;
  onPlay: () => void;
  onDetails: () => void;
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const title = item.title || "Untitled voiceover";
  return <div className="flex flex-wrap justify-end gap-1"><button type="button" className="icon-button h-10 min-h-10 w-10 min-w-10" onClick={onDetails} aria-label={`View details for ${title}`} title="View details"><FileText className="h-4 w-4" /></button><button type="button" className="icon-button h-10 min-h-10 w-10 min-w-10" onClick={onPlay} disabled={!item.audioUrl} aria-label={`Play ${title}`} title="Play"><Play className="h-4 w-4" /></button><button type="button" className="icon-button h-10 min-h-10 w-10 min-w-10" onClick={onDownload} disabled={!item.audioUrl || downloading} aria-label={`Download ${title}`} title="Download">{downloading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}</button><button type="button" className="icon-button h-10 min-h-10 w-10 min-w-10" onClick={onRename} aria-label={`Rename ${title}`} title="Rename"><Edit3 className="h-4 w-4" /></button><button type="button" className="icon-button h-10 min-h-10 w-10 min-w-10 text-[var(--danger)]" onClick={onDelete} aria-label={`Delete ${title}`} title="Delete stored audio and history record"><Trash2 className="h-4 w-4" /></button></div>;
}

export function HistoryClient({ initialGenerations, voices, initialProvider }: { initialGenerations: GenerationDto[]; voices: VoiceDto[]; initialProvider: HistoryProviderFilter }) {
  const [generations, setGenerations] = useState(initialGenerations);
  const [search, setSearch] = useState("");
  const [voice, setVoice] = useState("all");
  const [provider, setProvider] = useState<HistoryProviderFilter>(initialProvider);
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState<GenerationDto | null>(null);
  const [details, setDetails] = useState<GenerationDto | null>(null);
  const [remove, setRemove] = useState<GenerationDto | null>(null);
  const [rename, setRename] = useState<GenerationDto | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { showToast } = useToast();

  function changeProvider(value: HistoryProviderFilter) {
    setProvider(value);
    const url = new URL(window.location.href);
    url.searchParams.set("provider", value);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  const filtered = useMemo(() => generations.filter((item) => {
    const needle = search.toLowerCase();
    const matchesText = item.text.toLowerCase().includes(needle) || (item.title ?? "").toLowerCase().includes(needle);
    const matchesStatus = status === "all" || (status === "MISSING" ? item.status === "READY" && !item.audioAvailable : item.status === status);
    return matchesText && (voice === "all" || item.voiceId === voice) && (provider === "all" || item.provider === provider) && matchesStatus;
  }).sort((a, b) => sort === "oldest" ? +new Date(a.createdAt) - +new Date(b.createdAt) : +new Date(b.createdAt) - +new Date(a.createdAt)), [generations, provider, search, sort, status, voice]);

  async function deleteItem() {
    if (!remove) return;
    try {
      await fetchJson<void>(`/api/generations/${remove.id}`, { method: "DELETE" });
      setGenerations((current) => current.filter((item) => item.id !== remove.id));
      if (selected?.id === remove.id) setSelected(null);
      if (details?.id === remove.id) setDetails(null);
      setRemove(null);
      showToast("Stored audio and history record deleted");
    } catch (error) { showToast(error instanceof Error ? error.message : "Delete failed.", "error"); }
  }

  async function renameItem(title: string) {
    if (!rename) return;
    try {
      const result = await fetchJson<{ generation: GenerationDto }>(`/api/generations/${rename.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title }) });
      setGenerations((current) => current.map((item) => item.id === result.generation.id ? result.generation : item));
      if (selected?.id === result.generation.id) setSelected(result.generation);
      if (details?.id === result.generation.id) setDetails(result.generation);
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

  const actions = (item: GenerationDto) => <ActionButtons item={item} downloading={downloadingId === item.id} onPlay={() => setSelected(item)} onDetails={() => setDetails(item)} onDownload={() => void downloadItem(item)} onRename={() => setRename(item)} onDelete={() => setRemove(item)} />;

  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_160px_140px_150px_130px]">
      <label className="relative sm:col-span-2 xl:col-span-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" /><span className="sr-only">Search scripts</span><input className="field pl-10 pr-3" placeholder="Search scripts and titles" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <select className="field px-3" aria-label="Filter by voice" value={voice} onChange={(event) => setVoice(event.target.value)}><option value="all">All voices</option>{voices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select className="field px-3" aria-label="Filter by provider" value={provider} onChange={(event) => changeProvider(event.target.value as HistoryProviderFilter)}><option value="all">All providers</option><option value="cartesia">Cartesia</option><option value="mock">Demo</option></select>
      <select className="field px-3" aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="READY">Ready</option><option value="MISSING">Audio missing</option><option value="FAILED">Failed</option><option value="PROCESSING">Processing</option></select>
      <select className="field px-3" aria-label="Sort history" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option></select>
    </div>
    {selected && <div className="panel mt-5 p-4"><AudioPlayer key={selected.id} generation={selected} onDelete={setRemove} onRename={setRename} /></div>}
    {details && <section className="panel mt-5 p-5" aria-labelledby="history-details-title"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.1em] text-[var(--muted)]">Generation details</p><h2 id="history-details-title" className="mt-2 break-words text-xl font-bold">{details.title || "Untitled voiceover"}</h2></div><button type="button" className="icon-button" aria-label="Close generation details" onClick={() => setDetails(null)}><X className="h-4 w-4" /></button></div><p className="mt-5 whitespace-pre-wrap break-words rounded-lg bg-[var(--panel-muted)] p-4 text-sm leading-6">{details.text}</p><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">{[["Voice", details.voiceName], ["Provider", details.provider === "mock" ? "Demo" : "Cartesia"], ["Status", details.status], ["Characters", details.characterCount.toLocaleString()], ["Duration", details.durationMs ? formatDuration(details.durationMs) : "Unavailable"], ["File type", details.mimeType ?? "Unavailable"], ["Created", <LocalTime key="created" value={details.createdAt} includeTime />], ["Audio", details.audioAvailable ? "Available" : "Unavailable"]].map(([label, value]) => <div key={String(label)}><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 break-words text-[var(--foreground-secondary)]">{value}</dd></div>)}</dl></section>}
    {filtered.length ? <><div className="mt-5 grid gap-3 md:hidden">{filtered.map((item) => <article key={item.id} className="panel min-w-0 p-4"><h2 className="break-words text-sm font-semibold">{item.title || "Untitled voiceover"}</h2><p className="mt-2 line-clamp-3 break-words text-xs leading-5 text-[var(--muted)]">{item.text}</p><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--foreground-secondary)]"><span>{item.voiceName}</span><span>·</span><span>{item.provider === "mock" ? "Demo" : "Cartesia"}</span><span>·</span><LocalTime value={item.createdAt} /></div>{item.status === "READY" && !item.audioAvailable && <p className="mt-2 text-xs text-[var(--warning)]">Audio file missing</p>}<div className="mt-4 border-t border-[var(--border-subtle)] pt-3">{actions(item)}</div></article>)}</div><div className="panel mt-5 hidden overflow-x-auto md:block"><div className="min-w-[900px]"><div className="grid grid-cols-[minmax(220px,1.5fr)_150px_90px_100px_130px_auto] gap-4 border-b border-[var(--border-subtle)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--muted)]"><span>Generation</span><span>Voice</span><span>Provider</span><span>Length</span><span>Date</span><span className="text-right">Actions</span></div>{filtered.map((item) => <article key={item.id} className="grid grid-cols-[minmax(220px,1.5fr)_150px_90px_100px_130px_auto] items-center gap-4 border-b border-[var(--border-subtle)] px-5 py-4 last:border-0"><div className="min-w-0"><h2 className="truncate text-sm font-semibold" title={item.title || "Untitled voiceover"}>{item.title || "Untitled voiceover"}</h2><p className="mt-1 truncate text-xs text-[var(--muted)]" title={item.text}>{item.text}</p>{item.status === "FAILED" && <p className="mt-1 text-xs text-[var(--danger)]">{item.errorMessageSafe}</p>}{item.status === "READY" && !item.audioAvailable && <p className="mt-1 text-xs text-[var(--warning)]">Audio file missing</p>}</div><p className="truncate text-xs text-[var(--foreground-secondary)]" title={item.voiceName}>{item.voiceName}</p><span className="w-fit rounded-full border border-[var(--border-subtle)] px-2 py-1 text-[10px] font-semibold uppercase text-[var(--muted)]">{item.provider === "mock" ? "Demo" : "Cartesia"}</span><p className="text-xs text-[var(--muted)]">{item.durationMs ? formatDuration(item.durationMs) : `${item.characterCount} chars`}</p><p className="text-xs text-[var(--muted)]"><LocalTime value={item.createdAt} /></p>{actions(item)}</article>)}</div></div></> : <div className="panel mt-5 p-12 text-center"><History className="mx-auto h-10 w-10 text-[var(--muted)]" /><h2 className="mt-4 font-semibold">No generations found</h2><p className="mt-2 text-sm text-[var(--muted)]">Your generated voiceovers will appear here.</p></div>}
    <RenameGenerationDialog key={rename?.id ?? "closed"} generation={rename} onOpenChange={(open) => { if (!open) setRename(null); }} onRename={renameItem} />
    <ConfirmDialog open={Boolean(remove)} onOpenChange={(open) => { if (!open) setRemove(null); }} title="Delete stored audio and history record?" description="The generated audio object and this VoxMint history record will no longer be available." confirmLabel="Delete audio and record" danger onConfirm={deleteItem} />
  </>;
}
