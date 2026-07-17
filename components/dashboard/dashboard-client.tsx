"use client";

import { useState } from "react";
import { CloneVoicePanel } from "@/components/dashboard/clone-voice-panel";
import { GenerateVoicePanel } from "@/components/dashboard/generate-voice-panel";
import { RecentVoices } from "@/components/dashboard/recent-voices";
import { useToast } from "@/components/ui/toast";
import { fetchJson } from "@/lib/api/client";
import { isVoiceCompatibleWithProvider, isVoiceLanguageSupported } from "@/lib/providers/compatibility";
import type { GenerationDto, ProviderInfoDto, UsageDto, VoiceDto } from "@/lib/types/dto";

export function DashboardClient({ initialVoices, initialSelectedVoiceId, initialGeneration, initialScript, usage, providerInfo, preferredLanguage }: { initialVoices: VoiceDto[]; initialSelectedVoiceId: string | null; initialGeneration: GenerationDto | null; initialScript?: string; usage: UsageDto; providerInfo: ProviderInfoDto; preferredLanguage: string }) {
  const [voices, setVoices] = useState(initialVoices);
  const [selectedId, setSelectedId] = useState(
    initialSelectedVoiceId,
  );
  const [generation, setGeneration] = useState(initialGeneration);
  const { showToast } = useToast();

  function selectVoice(id: string) {
    if (voices.some((voice) => voice.id === id && voice.status === "READY" && isVoiceCompatibleWithProvider(voice.provider, providerInfo.name) && isVoiceLanguageSupported(voice.primaryLanguage, providerInfo.capabilities.generationLanguages))) setSelectedId(id);
  }
  function deletedVoice(id: string) { const remaining = voices.filter((voice) => voice.id !== id); setVoices(remaining); setSelectedId((current) => current === id ? remaining.find((voice) => voice.status === "READY" && isVoiceCompatibleWithProvider(voice.provider, providerInfo.name) && isVoiceLanguageSupported(voice.primaryLanguage, providerInfo.capabilities.generationLanguages))?.id ?? null : current); }
  async function deleteGeneration(item: GenerationDto) {
    try { await fetchJson<void>(`/api/generations/${item.id}`, { method: "DELETE" }); if (generation?.id === item.id) setGeneration(null); showToast("Generation deleted"); }
    catch (error) { showToast(error instanceof Error ? error.message : "Delete failed.", "error"); }
  }

  const usableVoices = voices.filter((voice) => voice.status === "READY" && isVoiceCompatibleWithProvider(voice.provider, providerInfo.name) && isVoiceLanguageSupported(voice.primaryLanguage, providerInfo.capabilities.generationLanguages));
  const isOnboarding = usableVoices.length === 0;
  const generatePanel = <GenerateVoicePanel voices={voices} selectedVoiceId={selectedId} onSelectedVoice={selectVoice} generation={generation} onGenerated={setGeneration} onDeleted={(item) => void deleteGeneration(item)} usage={usage} providerInfo={providerInfo} onboardingStep={isOnboarding ? 2 : undefined} initialScript={initialScript} />;
  return <>{isOnboarding ? <div className="dashboard-grid"><CloneVoicePanel onCreated={(voice) => { setVoices((current) => [voice, ...current]); setSelectedId(voice.id); }} onboardingStep={1} operationsEnabled={providerInfo.operationsEnabled} preferredLanguage={preferredLanguage} supportedLanguages={providerInfo.capabilities.cloneLanguages} />{generatePanel}</div> : <div className="dashboard-grid dashboard-grid-single">{generatePanel}</div>}<RecentVoices voices={voices} selectedId={selectedId} onSelect={selectVoice} onDelete={deletedVoice} providerInfo={providerInfo} /></>;
}
