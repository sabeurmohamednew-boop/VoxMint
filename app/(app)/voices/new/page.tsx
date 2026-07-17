import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { NewVoiceClient } from "@/components/voices/new-voice-client";
import { requireUser } from "@/lib/auth/session";
import { getPublicProviderInfo } from "@/lib/providers";
import { getAccount } from "@/server/services/account-service";

export default async function NewVoicePage() {
  const user = await requireUser();
  const providerInfo = getPublicProviderInfo();
  const account = await getAccount(user.id);
  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-[30px] font-bold tracking-[-0.035em]">Create a voice</h1>
          <p className="mt-1.5 text-sm text-[var(--foreground-secondary)]">Add a voice you own or have explicit permission to use.</p>
        </div>
        <Link href="/dashboard" className="button-secondary px-4"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
      </header>
      <div className="mx-auto max-w-[760px]"><NewVoiceClient operationsEnabled={providerInfo.operationsEnabled !== false} preferredLanguage={account.preferredLanguage} supportedLanguages={providerInfo.capabilities.cloneLanguages} /></div>
    </>
  );
}
