"use client";

import { useState } from "react";
import { CloneVoicePanel } from "@/components/dashboard/clone-voice-panel";
import { GenerateVoicePanel } from "@/components/dashboard/generate-voice-panel";
import { RecentVoices } from "@/components/dashboard/recent-voices";
import { useToast } from "@/components/ui/toast";
import { fetchJson } from "@/lib/api/client";
import { isVoiceCompatibleWithProvider } from "@/lib/providers/compatibility";
import type { GenerationDto, ProviderInfoDto, UsageDto, VoiceDto } from "@/lib/types/dto";

export function DashboardClient({ initialVoices, initialSelectedVoiceId, initialGeneration, usage, providerInfo }: { initialVoices: VoiceDto[]; initialSelectedVoiceId: string | null; initialGeneration: GenerationDto | null; usage: UsageDto; providerInfo: ProviderInfoDto }) {
  const [voices, setVoices] = useState(initialVoices);
  const [selectedId, setSelectedId] = useState(
    initialSelectedVoiceId,
  );
  const [generation, setGeneration] = useState(initialGeneration);
  const { showToast } = useToast();

  function selectVoice(id: string) {
    if (voices.some((voice) => voice.id === id && voice.status === "READY" && isVoiceCompatibleWithProvider(voice.provider, providerInfo.name))) setSelectedId(id);
  }
  function deletedVoice(id: string) { const remaining = voices.filter((voice) => voice.id !== id); setVoices(remaining); setSelectedId((current) => current === id ? remaining.find((voice) => voice.status === "READY" && isVoiceCompatibleWithProvider(voice.provider, providerInfo.name))?.id ?? null : current); }
  async function deleteGeneration(item: GenerationDto) {
    try { await fetchJson<void>(`/api/generations/${item.id}`, { method: "DELETE" }); if (generation?.id === item.id) setGeneration(null); showToast("Generation deleted"); }
    catch (error) { showToast(error instanceof Error ? error.message : "Delete failed.", "error"); }
  }

  const usableVoices = voices.filter((voice) => voice.status === "READY" && isVoiceCompatibleWithProvider(voice.provider, providerInfo.name));
  const isOnboarding = usableVoices.length === 0;
  const generatePanel = <GenerateVoicePanel voices={voices} selectedVoiceId={selectedId} onSelectedVoice={selectVoice} generation={generation} onGenerated={setGeneration} onDeleted={(item) => void deleteGeneration(item)} usage={usage} providerInfo={providerInfo} onboardingStep={isOnboarding ? 2 : undefined} />;
  return <>{isOnboarding ? <div className="dashboard-grid"><CloneVoicePanel onCreated={(voice) => { setVoices((current) => [voice, ...current]); setSelectedId(voice.id); }} onboardingStep={1} operationsEnabled={providerInfo.operationsEnabled} />{generatePanel}</div> : <div className="dashboard-grid dashboard-grid-single">{generatePanel}</div>}<RecentVoices voices={voices} selectedId={selectedId} onSelect={selectVoice} onDelete={deletedVoice} providerInfo={providerInfo} /></>;
}
