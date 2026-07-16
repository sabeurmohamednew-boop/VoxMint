"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Clipboard, Download, Edit3, MoreVertical, Music2, Pause, Play, RotateCcw, RotateCw, Trash2, Volume2, VolumeX } from "lucide-react";
import { useRef, useState } from "react";
import { formatDuration } from "@/lib/audio/utils";
import type { GenerationDto } from "@/lib/types/dto";
import { useToast } from "@/components/ui/toast";

export function AudioPlayer({ generation, onDelete, onRename }: { generation: GenerationDto | null; onDelete?: (generation: GenerationDto) => void; onRename?: (generation: GenerationDto) => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(generation?.durationMs ?? 0);
  const [volume, setVolume] = useState(0.72);
  const [muted, setMuted] = useState(false);
  const { showToast } = useToast();

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play(); else audio.pause();
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

  if (!generation?.audioUrl) {
    return (
      <div className="audio-shell flex min-h-[126px] items-center justify-center gap-3 text-[var(--muted)]">
        <span className="voice-avatar"><Music2 className="h-5 w-5" /></span>
        <p className="text-sm">Your generated audio will appear here.</p>
      </div>
    );
  }

  return (
    <div className="audio-shell">
      <audio
        ref={audioRef}
        src={generation.audioUrl}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime * 1000)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration * 1000)}
        onEnded={() => setPlaying(false)}
        onError={() => showToast("Audio playback failed. Try again.", "error")}
      />
      <div className="flex items-center gap-3">
        <span className="voice-avatar hidden sm:grid"><Music2 className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3"><p className="truncate text-[13px] font-medium">{generation.title || "Generated voiceover"}</p><span className="whitespace-nowrap text-[11.5px] text-[var(--foreground-secondary)]">{formatDuration(currentTime)} / {formatDuration(duration)}</span></div>
          <input className="mt-2 h-1.5 w-full cursor-pointer" type="range" min={0} max={Math.max(duration, 1)} value={Math.min(currentTime, duration || 1)} onChange={(event) => { const value = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = value / 1000; setCurrentTime(value); }} aria-label="Audio position" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="icon-button h-10 min-h-10 w-10 min-w-10" onClick={togglePlay} aria-label={playing ? "Pause audio" : "Play audio"}>{playing ? <Pause className="h-[18px] w-[18px]" /> : <Play className="h-[18px] w-[18px] fill-current" />}</button>
        <button type="button" className="icon-button hidden h-10 min-h-10 w-10 min-w-10 sm:inline-flex" onClick={() => seek(-10)} aria-label="Skip back 10 seconds"><RotateCcw className="h-[17px] w-[17px]" /></button>
        <button type="button" className="icon-button hidden h-10 min-h-10 w-10 min-w-10 sm:inline-flex" onClick={() => seek(10)} aria-label="Skip forward 10 seconds"><RotateCw className="h-[17px] w-[17px]" /></button>
        <button type="button" className="button-ghost min-h-10 px-2" onClick={() => { const next = !muted; setMuted(next); if (audioRef.current) audioRef.current.muted = next; }} aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX className="h-[18px] w-[18px]" /> : <Volume2 className="h-[18px] w-[18px]" />}</button>
        <input className="hidden w-[104px] sm:block" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); if (audioRef.current) audioRef.current.volume = next; }} aria-label="Volume" />
        <div className="ml-auto flex gap-2">
          <a className="button-secondary min-h-10 px-3" href={`${generation.audioUrl}?download=1`} download onClick={() => showToast("Audio downloaded")}><Download className="h-4 w-4" /><span className="hidden sm:inline">Download</span></a>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild><button type="button" className="icon-button h-10 min-h-10 w-10 min-w-10" aria-label="More audio actions"><MoreVertical className="h-4 w-4" /></button></DropdownMenu.Trigger>
            <DropdownMenu.Portal><DropdownMenu.Content className="menu-content" sideOffset={6} align="end">{onRename && <DropdownMenu.Item className="menu-item" onSelect={() => onRename(generation)}><Edit3 className="h-4 w-4" />Rename</DropdownMenu.Item>}<DropdownMenu.Item className="menu-item" onSelect={() => void copyScript()}><Clipboard className="h-4 w-4" />Copy script</DropdownMenu.Item>{onDelete && <DropdownMenu.Item className="menu-item danger" onSelect={() => onDelete(generation)}><Trash2 className="h-4 w-4" />Delete</DropdownMenu.Item>}</DropdownMenu.Content></DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border-subtle)] pt-3 text-[11px] text-[var(--muted)]"><span>{generation.voiceName}</span><span>{generation.characterCount.toLocaleString()} characters</span><span>{generation.mimeType === "audio/wav" ? "WAV" : "MP3"}</span></div>
    </div>
  );
}
