import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { NewVoiceClient } from "@/components/voices/new-voice-client";
import { getPublicProviderInfo } from "@/lib/providers";

export default function NewVoicePage() {
  const providerInfo = getPublicProviderInfo();
  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-[30px] font-bold tracking-[-0.035em]">Create a voice</h1>
          <p className="mt-1.5 text-sm text-[var(--foreground-secondary)]">Add a voice you own or have explicit permission to use.</p>
        </div>
        <Link href="/dashboard" className="button-secondary px-4"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
      </header>
      <div className="mx-auto max-w-[760px]"><NewVoiceClient operationsEnabled={providerInfo.operationsEnabled !== false} /></div>
    </>
  );
}
