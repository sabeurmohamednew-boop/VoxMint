"use client";

import { useState } from "react";
import { CloneVoicePanel } from "@/components/dashboard/clone-voice-panel";
import { GenerateVoicePanel } from "@/components/dashboard/generate-voice-panel";
import { RecentVoices } from "@/components/dashboard/recent-voices";
import { useToast } from "@/components/ui/toast";
import { fetchJson } from "@/lib/api/client";
import type { GenerationDto, UsageDto, VoiceDto } from "@/lib/types/dto";

export function DashboardClient({ initialVoices, initialGeneration, usage }: { initialVoices: VoiceDto[]; initialGeneration: GenerationDto | null; usage: UsageDto }) {
  const [voices, setVoices] = useState(initialVoices);
  const [selectedId, setSelectedId] = useState(initialVoices.find((voice) => voice.status === "READY")?.id ?? null);
  const [generation, setGeneration] = useState(initialGeneration);
  const { showToast } = useToast();

  function created(voice: VoiceDto) { setVoices((current) => [voice, ...current]); setSelectedId(voice.id); }
  function deletedVoice(id: string) { setVoices((current) => current.filter((voice) => voice.id !== id)); setSelectedId((current) => current === id ? voices.find((voice) => voice.id !== id && voice.status === "READY")?.id ?? null : current); }
  async function deleteGeneration(item: GenerationDto) {
    try { await fetchJson<void>(`/api/generations/${item.id}`, { method: "DELETE" }); if (generation?.id === item.id) setGeneration(null); showToast("Generation deleted"); }
    catch (error) { showToast(error instanceof Error ? error.message : "Delete failed.", "error"); }
  }

  return <><div className="dashboard-grid"><CloneVoicePanel onCreated={created} /><GenerateVoicePanel voices={voices} selectedVoiceId={selectedId} onSelectedVoice={setSelectedId} generation={generation} onGenerated={setGeneration} onDeleted={(item) => void deleteGeneration(item)} usage={usage} /></div><RecentVoices voices={voices} selectedId={selectedId} onSelect={setSelectedId} onDelete={deletedVoice} onGenerated={setGeneration} /></>;
}
