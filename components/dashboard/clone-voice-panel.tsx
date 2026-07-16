"use client";

import { Check, CloudUpload, FileAudio, Mic2, Plus, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { fetchJson } from "@/lib/api/client";
import { formatDuration } from "@/lib/audio/utils";
import type { VoiceDto } from "@/lib/types/dto";
import { voiceNameSchema } from "@/lib/validation/schemas";
import { useToast } from "@/components/ui/toast";
import { LocalAudioPreview } from "@/components/audio/local-audio-preview";

type Phase = "idle" | "selected" | "client-validating" | "uploading" | "cloning" | "saving" | "success" | "error";
type State = { phase: Phase; file: File | null; error: string | null };
type Action =
  | { type: "select"; file: File }
  | { type: "remove" }
  | { type: "phase"; phase: Phase }
  | { type: "error"; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "select": return { phase: "selected", file: action.file, error: null };
    case "remove": return { phase: "idle", file: null, error: null };
    case "phase": return { ...state, phase: action.phase, error: null };
    case "error": return { ...state, phase: "error", error: action.error };
  }
}

function humanSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CloneVoicePanel({ onCreated }: { onCreated: (voice: VoiceDto) => void }) {
  const [state, dispatch] = useReducer(reducer, { phase: "idle", file: null, error: null });
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [consent, setConsent] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const previewUrl = useMemo(() => (state.file ? URL.createObjectURL(state.file) : null), [state.file]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const nameValid = voiceNameSchema.safeParse(name).success;
  const busy = ["client-validating", "uploading", "cloning", "saving"].includes(state.phase);
  const canSubmit = Boolean(state.file && nameValid && consent && !busy);

  function selectFile(file: File | undefined) {
    if (!file) return;
    setDuration(null);
    dispatch({ type: "select", file });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!state.file || !canSubmit) return;
    dispatch({ type: "phase", phase: "client-validating" });
    const data = new FormData();
    data.set("sample", state.file);
    data.set("name", name);
    data.set("language", language);
    data.set("description", description);
    data.set("consent", "true");
    dispatch({ type: "phase", phase: "uploading" });
    const phaseTimer = window.setTimeout(() => dispatch({ type: "phase", phase: "cloning" }), 450);
    try {
      const result = await fetchJson<{ voice: VoiceDto }>("/api/voices/clone", { method: "POST", body: data });
      window.clearTimeout(phaseTimer);
      dispatch({ type: "phase", phase: "saving" });
      onCreated(result.voice);
      dispatch({ type: "phase", phase: "success" });
      showToast("Voice created");
      setName(""); setDescription(""); setConsent(false); setDuration(null);
      window.setTimeout(() => dispatch({ type: "remove" }), 500);
    } catch (error) {
      window.clearTimeout(phaseTimer);
      dispatch({ type: "error", error: error instanceof Error ? error.message : "Voice creation failed." });
      showToast(error instanceof Error ? error.message : "Voice creation failed.", "error");
    }
  }

  const statusLabels: Partial<Record<Phase, string>> = {
    "client-validating": "Validating sample…",
    uploading: "Uploading sample…",
    cloning: "Creating voice…",
    saving: "Saving voice…",
  };
  const statusLabel = statusLabels[state.phase] ?? "Working…";

  return (
    <section id="clone" className="clone-panel panel p-5 sm:p-[22px]" aria-labelledby="clone-title">
      <div className="flex items-start gap-3">
        <span className="step-badge">1</span>
        <div><h2 id="clone-title" className="text-[19px] font-semibold tracking-[-0.015em]">Clone a Voice</h2><p className="mt-1 text-[13px] leading-5 text-[var(--foreground-secondary)]">Upload a clean sample of a voice you own or have permission to use.</p></div>
      </div>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <input ref={inputRef} className="sr-only" type="file" accept=".flac,.mp3,.mpeg,.mpga,.oga,.ogg,.wav,.webm,audio/flac,audio/mpeg,audio/ogg,audio/wav,audio/webm" onChange={(event) => selectFile(event.target.files?.[0])} />
        {!state.file ? (
          <div
            className="upload-zone px-5 py-6"
            data-dragging={dragging}
            role="button"
            tabIndex={0}
            aria-label="Choose or drop an audio sample"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); inputRef.current?.click(); } }}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files[0]); }}
          >
            <CloudUpload className="h-12 w-12 text-[#8050eb]" strokeWidth={1.6} />
            <p className="mt-3 text-sm font-semibold">Drag &amp; drop an audio file here</p>
            <p className="my-2 text-xs text-[var(--muted)]">or</p>
            <span className="button-primary min-h-[40px] px-5">Choose File</span>
            <p className="mt-4 max-w-[320px] text-[11.5px] leading-5 text-[var(--muted)]">FLAC, MP3, OGG, WAV or WebM · Max 10 MB<br />Recommended: 3–10 seconds of clear speech</p>
          </div>
        ) : (
          <div className="panel-quiet p-4">
            <div className="flex items-start gap-3"><span className="voice-avatar h-10 w-10"><FileAudio className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{state.file.name.replace(/[<>:"/\\|?*]/g, "")}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{humanSize(state.file.size)}{duration !== null ? ` · ${formatDuration(duration)}` : ""}</p></div><button type="button" className="button-ghost min-h-9 px-2" onClick={() => dispatch({ type: "remove" })} aria-label="Remove selected sample"><Trash2 className="h-4 w-4" /></button></div>
            {previewUrl && <LocalAudioPreview src={previewUrl} onDuration={setDuration} />}
            <button type="button" className="button-secondary mt-3 min-h-[38px] px-3" onClick={() => inputRef.current?.click()}><RotateCcw className="h-4 w-4" />Replace</button>
          </div>
        )}

        <div><label htmlFor="voice-name" className="text-[13px] font-semibold">Voice name</label><input id="voice-name" className="field mt-2 px-3" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Studio Narration" maxLength={50} aria-invalid={name.length > 0 && !nameValid} />{name.length > 0 && !nameValid && <p className="mt-1.5 text-xs text-[var(--danger)]">Use 2–50 letters or numbers; spaces, hyphens and apostrophes are allowed.</p>}</div>
        <div className="grid gap-3 sm:grid-cols-2"><div><label htmlFor="voice-language" className="text-[13px] font-semibold">Primary language</label><select id="voice-language" className="field mt-2 px-3" value={language} onChange={(event) => setLanguage(event.target.value)}><option value="en">English</option><option value="fr">French</option><option value="ar">Arabic</option></select></div><div className="flex items-end">{!showDescription ? <button type="button" className="button-ghost w-full" onClick={() => setShowDescription(true)}><Plus className="h-4 w-4" />Add description</button> : <label className="w-full text-[13px] font-semibold">Description<input className="field mt-2 px-3" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={160} /></label>}</div></div>
        <label className="flex cursor-pointer items-start gap-3 rounded-[9px] border border-[var(--border-subtle)] bg-[var(--panel-muted)] p-3.5"><input className="mt-1 h-4 w-4 accent-[#7447e8]" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span className="text-[12.5px] leading-5 text-[var(--foreground-secondary)]"><strong className="font-semibold text-[var(--foreground)]">I confirm that I own this voice or have explicit permission from the speaker to clone and use it.</strong><br />Do not upload audio taken from media, calls or private recordings without permission. <Link href="/acceptable-use" className="text-[#aa7aff] hover:underline">Acceptable Use</Link></span></label>
        {state.error && <p className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2.5 text-sm text-[#ff9aaa]" role="alert">{state.error}</p>}
        <button className="button-primary w-full" type="submit" disabled={!canSubmit}>{busy ? statusLabel : <><Mic2 className="h-[18px] w-[18px]" />Clone Voice</>}</button>
      </form>
      <div className="mt-5 rounded-[10px] border border-[var(--border-subtle)] p-4"><p className="text-[12.5px] font-semibold">Tips for best results</p><ul className="mt-3 space-y-2 text-[12px] text-[var(--foreground-secondary)]">{["Use one clear speaker", "Record in a quiet room", "Avoid music, echo and heavy processing", "Speak naturally"].map((tip) => <li key={tip} className="flex items-center gap-2"><Check className="h-4 w-4 text-[var(--success)]" />{tip}</li>)}</ul></div>
    </section>
  );
}
