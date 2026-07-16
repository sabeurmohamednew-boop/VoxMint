"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/audio/utils";

export function LocalAudioPreview({ src, onDuration }: { src: string; onDuration: (durationMs: number) => void }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => ref.current?.pause(), []);
  async function toggle() {
    const audio = ref.current;
    if (!audio) return;
    if (!audio.paused) { audio.pause(); return; }
    try { await audio.play(); }
    catch { setError("This sample could not be previewed."); }
  }
  return <div className="mt-3 rounded-lg border border-[var(--border-subtle)] p-3"><audio ref={ref} src={src} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime * 1000)} onLoadedMetadata={(event) => { const value = Math.round(event.currentTarget.duration * 1000); setDuration(value); onDuration(value); }} onError={() => setError("This sample could not be previewed.")} /><div className="flex items-center gap-3"><button className="icon-button h-9 min-h-9 w-9 min-w-9" type="button" onClick={() => void toggle()} aria-label={playing ? "Pause sample" : "Play sample"}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}</button><input className="min-w-0 flex-1" type="range" min={0} max={Math.max(duration, 1)} value={Math.min(position, duration || 1)} onChange={(event) => { const value = Number(event.target.value); if (ref.current) ref.current.currentTime = value / 1000; setPosition(value); }} aria-label="Sample position" /><span className="text-[11px] text-[var(--muted)]">{formatDuration(position)} / {formatDuration(duration)}</span></div>{error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}</div>;
}
