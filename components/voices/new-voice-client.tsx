"use client";

import { useRouter } from "next/navigation";
import { CloneVoicePanel } from "@/components/dashboard/clone-voice-panel";

export function NewVoiceClient({ operationsEnabled }: { operationsEnabled: boolean }) {
  const router = useRouter();
  return <CloneVoicePanel operationsEnabled={operationsEnabled} onCreated={(voice) => router.push(`/dashboard?voice=${encodeURIComponent(voice.id)}#generate`)} />;
}
