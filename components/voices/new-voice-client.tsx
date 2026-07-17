"use client";

import { useRouter } from "next/navigation";
import { CloneVoicePanel } from "@/components/dashboard/clone-voice-panel";
import type { SupportedLanguage } from "@/lib/languages";

export function NewVoiceClient({ operationsEnabled, preferredLanguage, supportedLanguages }: { operationsEnabled: boolean; preferredLanguage: string; supportedLanguages: readonly SupportedLanguage[] }) {
  const router = useRouter();
  return <CloneVoicePanel operationsEnabled={operationsEnabled} preferredLanguage={preferredLanguage} supportedLanguages={supportedLanguages} onCreated={(voice) => router.push(`/dashboard?voice=${encodeURIComponent(voice.id)}#generate`)} />;
}
