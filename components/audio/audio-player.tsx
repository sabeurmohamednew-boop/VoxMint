"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Clipboard, Download, Edit3, LoaderCircle, MoreVertical, Music2, Pause, Play, RotateCcw, RotateCw, Trash2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { diagnoseAudioPlaybackFailure, downloadAudio } from "@/lib/audio/client";
import { formatDuration, safeBaseName } from "@/lib/audio/utils";
import type { GenerationDto } from "@/lib/types/dto";
import { useToast } from "@/components/ui/toast";

let activeAudio: HTMLAudioElement | null = null;

export function AudioPlayer({ generation, selectedVoiceId, onDelete, onRename }: {
  generation: GenerationDto | null;
  selectedVoiceId?: string | null;
  onDelete?: (generation: GenerationDto) => void;
  onRename?: (generation: GenerationDto) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(generation?.durationMs ?? 0);
  const [volume, setVolume] = useState(0.72);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => () => {
    if (activeAudio === audioRef.current) activeAudio = null;
    audioRef.current?.pause();
  }, []);

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !generation?.audioUrl) return;
    setError(null);
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (activeAudio && activeAudio !== audio) activeAudio.pause();
    activeAudio = audio;
    setLoading(true);
    try {
      await audio.play();
    } catch (reason) {
      const message = reason instanceof DOMException && reason.name === "NotAllowedError"
        ? "Playback was blocked. Select play again."
        : "This audio could not be played. Refresh and try again.";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  function seek(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
  }

  async function copyScript() {
    if (!generation) return;
    await navigator.clipboard.writeText(generation.text);
    showToast("Script copied");
  }

  async function handleDownload() {
    if (!generation?.audioUrl || downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const extension = generation.mimeType === "audio/mpeg" ? "mp3" : "wav";
      await downloadAudio(generation.audioUrl, `${safeBaseName(generation.voiceName)}.${extension}`);
      showToast("Download started");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "The download could not be started.";
      setError(message);
      showToast(message, "error");
    } finally {
      setDownloading(false);
    }
  }

  async function handlePlaybackError() {
    const audio = audioRef.current;
    setPlaying(false);
    setLoading(false);
    if (activeAudio === audio) activeAudio = null;
    if (!generation?.audioUrl) return;
    const message = await diagnoseAudioPlaybackFailure(generation.audioUrl, audio?.error?.code);
    setError(message);
  }

  if (!generation?.audioUrl) {
    const missing = generation?.status === "READY" && !generation.audioAvailable;
    return (
      <div className="audio-shell flex min-h-[126px] items-center justify-center gap-3 text-[var(--muted)]">
        <span className="voice-avatar"><Music2 className="h-5 w-5" /></span>
        <div><p className="text-sm">{missing ? "Audio file unavailable" : "Your generated audio will appear here."}</p>{missing && <p className="mt-1 text-xs">The saved record remains in history, but its audio object is missing.</p>}</div>
      </div>
    );
  }

  const voiceMismatch = Boolean(selectedVoiceId && generation.voiceId !== selectedVoiceId);
  return (
    <div className="audio-shell">
      <audio
        ref={audioRef}
        src={generation.audioUrl}
        preload="metadata"
        onLoadStart={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onStalled={() => setLoading(true)}
        onPlay={() => { setPlaying(true); setLoading(false); }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime * 1000)}
        onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration * 1000); setLoading(false); }}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onError={() => void handlePlaybackError()}
      />
      {voiceMismatch && <p className="mb-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--foreground-secondary)]">Previous result generated with {generation.voiceName}.</p>}
      <div className="flex items-center gap-3">
        <span className="voice-avatar hidden sm:grid"><Music2 className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3"><p className="truncate text-[13px] font-medium">{generation.title || "Generated voiceover"}</p><span className="whitespace-nowrap text-[11.5px] text-[var(--foreground-secondary)]">{formatDuration(currentTime)} / {formatDuration(duration)}</span></div>
          <input className="mt-2 h-1.5 w-full cursor-pointer" type="range" min={0} max={Math.max(duration, 1)} value={Math.min(currentTime, duration || 1)} onChange={(event) => { const value = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = value / 1000; setCurrentTime(value); }} aria-label="Audio position" />
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-[var(--danger)]" role="alert">{error}</p>}
      <details className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-xs">
        <summary className="min-h-6 cursor-pointer font-medium text-[var(--foreground-secondary)]">View full title and script</summary>
        <p className="mt-3 break-words font-semibold">{generation.title || "Untitled voiceover"}</p>
        <p className="mt-2 max-h-52 overflow-y-auto whitespace-pre-wrap break-words leading-5 text-[var(--muted)]">{generation.text}</p>
      </details>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="icon-button h-10 min-h-10 w-10 min-w-10" onClick={() => void togglePlay()} aria-label={playing ? "Pause audio" : "Play audio"}>{loading ? <LoaderCircle className="h-[18px] w-[18px] animate-spin" /> : playing ? <Pause className="h-[18px] w-[18px]" /> : <Play className="h-[18px] w-[18px] fill-current" />}</button>
        <button type="button" className="icon-button hidden h-10 min-h-10 w-10 min-w-10 sm:inline-flex" onClick={() => seek(-10)} aria-label="Skip back 10 seconds"><RotateCcw className="h-[17px] w-[17px]" /></button>
        <button type="button" className="icon-button hidden h-10 min-h-10 w-10 min-w-10 sm:inline-flex" onClick={() => seek(10)} aria-label="Skip forward 10 seconds"><RotateCw className="h-[17px] w-[17px]" /></button>
        <button type="button" className="button-ghost min-h-10 px-2" onClick={() => { const next = !muted; setMuted(next); if (audioRef.current) audioRef.current.muted = next; }} aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX className="h-[18px] w-[18px]" /> : <Volume2 className="h-[18px] w-[18px]" />}</button>
        <input className="hidden w-[104px] sm:block" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); if (audioRef.current) audioRef.current.volume = next; }} aria-label="Volume" />
        <div className="ml-auto flex gap-2">
          <button type="button" className="button-secondary min-h-10 px-3" onClick={() => void handleDownload()} disabled={downloading} aria-label={downloading ? "Preparing audio download" : "Download audio"}>{downloading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}<span className="hidden sm:inline">{downloading ? "Preparing" : "Download"}</span></button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild><button type="button" className="icon-button h-10 min-h-10 w-10 min-w-10" aria-label="More audio actions"><MoreVertical className="h-4 w-4" /></button></DropdownMenu.Trigger>
            <DropdownMenu.Portal><DropdownMenu.Content className="menu-content" sideOffset={6} align="end">{onRename && <DropdownMenu.Item className="menu-item" onSelect={() => onRename(generation)}><Edit3 className="h-4 w-4" />Rename</DropdownMenu.Item>}<DropdownMenu.Item className="menu-item" onSelect={() => void copyScript()}><Clipboard className="h-4 w-4" />Copy script</DropdownMenu.Item>{onDelete && <DropdownMenu.Item className="menu-item danger" onSelect={() => onDelete(generation)}><Trash2 className="h-4 w-4" />Delete</DropdownMenu.Item>}</DropdownMenu.Content></DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border-subtle)] pt-3 text-[11px] text-[var(--muted)]"><span>{generation.voiceName}</span><span>{generation.provider === "mock" ? "Demo" : "Cartesia"}</span><span>{generation.characterCount.toLocaleString()} characters</span><span>{generation.mimeType === "audio/wav" ? "WAV" : "MP3"}</span></div>
    </div>
  );
}
