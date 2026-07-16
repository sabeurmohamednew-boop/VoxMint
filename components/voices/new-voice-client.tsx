"use client";

import { useRouter } from "next/navigation";
import { CloneVoicePanel } from "@/components/dashboard/clone-voice-panel";

export function NewVoiceClient() {
  const router = useRouter();
  return <CloneVoicePanel onCreated={(voice) => router.push(`/dashboard?voice=${encodeURIComponent(voice.id)}#generate`)} />;
}
