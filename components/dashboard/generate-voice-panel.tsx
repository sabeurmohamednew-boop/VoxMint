"use client";

import { Eraser, Mic2, Plus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AudioPlayer } from "@/components/audio/audio-player";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AppSelect } from "@/components/ui/app-select";
import { useToast } from "@/components/ui/toast";
import { fetchJson } from "@/lib/api/client";
import { isVoiceCompatibleWithProvider } from "@/lib/providers/compatibility";
import type { GenerationDto, ProviderInfoDto, UsageDto, VoiceDto } from "@/lib/types/dto";

const MAX_CHARACTERS = 5000;

export function GenerateVoicePanel({
  voices,
  selectedVoiceId,
  onSelectedVoice,
  generation,
  onGenerated,
  onDeleted,
  usage,
  providerInfo,
}: {
  voices: VoiceDto[];
  selectedVoiceId: string | null;
  onSelectedVoice: (id: string) => void;
  generation: GenerationDto | null;
  onGenerated: (generation: GenerationDto) => void;
  onDeleted: (generation: GenerationDto) => void;
  usage: UsageDto;
  providerInfo: ProviderInfoDto;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [stateLabel, setStateLabel] = useState("Generate Voiceover");
  const [error, setError] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const { showToast } = useToast();
  const selectableVoices = useMemo(
    () =>
      voices.filter(
        (voice) =>
          voice.status !== "DELETED" &&
          isVoiceCompatibleWithProvider(voice.provider, providerInfo.name),
      ),
    [providerInfo.name, voices],
  );
  const selected = useMemo(
    () => selectableVoices.find((voice) => voice.id === selectedVoiceId) ?? null,
    [selectableVoices, selectedVoiceId],
  );
  const count = Array.from(text).length;
  const estimatedSeconds = count ? Math.max(1, Math.round(count / 14)) : 0;
  const overQuota = usage.charactersUsed + count > usage.characterLimit;
  const canGenerate = Boolean(selected?.status === "READY" && count > 0 && count <= MAX_CHARACTERS && !overQuota && !busy);

  useEffect(() => {
    const draft = sessionStorage.getItem("voxmint-script-draft");
    if (draft) window.requestAnimationFrame(() => setText(draft));
  }, []);
  useEffect(() => { if (text) sessionStorage.setItem("voxmint-script-draft", text); else sessionStorage.removeItem("voxmint-script-draft"); }, [text]);

  async function generate() {
    if (!selected || !canGenerate) return;
    setBusy(true); setError(null); setStateLabel("Validating…");
    const timer = window.setTimeout(() => setStateLabel("Generating speech…"), 400);
    try {
      const result = await fetchJson<{ generation: GenerationDto }>("/api/generations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ voiceId: selected.id, text, language: selected.primaryLanguage, style: "normal", idempotencyKey: crypto.randomUUID() }),
      });
      window.clearTimeout(timer); setStateLabel("Storing audio…");
      onGenerated(result.generation); showToast("Voiceover generated");
    } catch (reason) {
      window.clearTimeout(timer);
      const message = reason instanceof Error ? reason.message : "Generation failed.";
      setError(message); showToast(message, "error");
    } finally {
      setBusy(false); setStateLabel("Generate Voiceover");
    }
  }

  function clearText() {
    if (count > 500) setClearOpen(true); else setText("");
  }

  return (
    <section id="generate" className="generate-panel panel p-5 sm:p-[22px]" aria-labelledby="generate-title">
      <div className="flex items-start gap-3"><span className="step-badge">2</span><div><div className="flex flex-wrap items-center gap-2"><h2 id="generate-title" className="text-[19px] font-semibold tracking-[-0.015em]">Generate Voiceover</h2>{(providerInfo.isDemo || providerInfo.showBranding) && <span className="rounded-full border border-[#7c56d9]/30 bg-[#7547d8]/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[.08em] text-[#b68cff]" aria-label={`Active provider: ${providerInfo.label}`}>{providerInfo.label}</span>}</div><p className="mt-1 text-[13px] leading-5 text-[var(--foreground-secondary)]">Enter text and generate speech using one of your saved voices.</p></div></div>
      <div className="mt-6"><div className="flex items-center justify-between gap-3"><span className="text-[13px] font-semibold">Select voice</span><a href="#clone" className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold text-[#aa7aff] hover:text-[#c49cff]"><Plus className="h-3.5 w-3.5" />Clone new voice</a></div>{selectableVoices.length ? <div className="relative mt-2"><Mic2 className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[#a267f3]" /><AppSelect label="Select voice" className="py-2 pl-11" value={selected?.id ?? selectableVoices[0]!.id} onValueChange={onSelectedVoice} options={selectableVoices.map((voice) => ({ value: voice.id, label: `${voice.name} · ${voice.primaryLanguage.toUpperCase()} · ${voice.status === "READY" ? "Ready" : voice.status}` }))} /></div> : <div className="panel-quiet mt-2 p-4 text-sm text-[var(--foreground-secondary)]">{voices.length ? `No ${providerInfo.label} voices are available. Demo voices remain visible in My Voices but cannot be used with the active provider.` : "Create your first permitted voice before generating audio."} <a href="#clone" className="font-semibold text-[#a777f1]">Clone a new voice</a></div>}</div>
      <div className="mt-5"><label htmlFor="script" className="text-[13px] font-semibold">Enter text</label><div className="relative mt-2"><textarea id="script" className="field min-h-[164px] resize-y px-3 py-3 pb-9 text-sm leading-6" value={text} maxLength={MAX_CHARACTERS} onChange={(event) => setText(event.target.value)} placeholder="Type or paste your script here…" /><span className={`absolute bottom-3 right-3 text-[11px] ${count > 4500 ? "text-[var(--warning)]" : "text-[var(--muted)]"}`}>{count.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()}</span></div></div>
      <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" className="button-secondary min-h-[40px] px-3" onClick={clearText} disabled={!text}><Eraser className="h-4 w-4" />Clear text</button><span className="ml-auto text-[11.5px] text-[var(--muted)]">≈ {estimatedSeconds}s</span><span className="button-secondary min-h-[40px] cursor-default px-3 text-[12px]" aria-label="Delivery style: Normal">Normal</span></div>
      {overQuota && <p className="mt-3 text-xs text-[var(--warning)]">This script would exceed your monthly character limit.</p>}
      {error && <p className="mt-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2.5 text-sm text-[#ff9aaa]" role="alert">{error}</p>}
      <button type="button" className="button-primary mt-4 w-full" disabled={!canGenerate} onClick={() => void generate()}><Sparkles className="h-[18px] w-[18px]" />{stateLabel}</button>
      <div className="mt-6"><h3 className="mb-3 text-[13px] font-semibold">Output</h3><AudioPlayer key={generation?.id ?? "empty"} generation={generation} selectedVoiceId={selectedVoiceId} onDelete={onDeleted} /></div>
      <ConfirmDialog open={clearOpen} onOpenChange={setClearOpen} title="Clear this script?" description="This draft is fairly long. Clearing it cannot be undone." confirmLabel="Clear script" onConfirm={() => { setText(""); setClearOpen(false); }} />
    </section>
  );
}
