import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { requireUser } from "@/lib/auth/session";
import { getPublicProviderInfo } from "@/lib/providers";
import { listGenerations } from "@/server/services/generation-service";
import { getUsage } from "@/server/services/usage-service";
import { listVoices } from "@/server/services/voice-service";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ voice?: string | string[] }>;
}) {
  const user = await requireUser();
  const providerInfo = getPublicProviderInfo();
  const [voices, generations, usage] = await Promise.all([listVoices(user.id), listGenerations(user.id, 1, providerInfo.name), getUsage(user.id)]);
  const requestedVoiceId = (await searchParams).voice;
  const requested = typeof requestedVoiceId === "string" ? requestedVoiceId : null;
  const usableVoices = voices.filter((voice) => voice.status === "READY" && voice.provider === providerInfo.name);
  const initialSelectedVoiceId = usableVoices.some((voice) => voice.id === requested)
    ? requested
    : usableVoices[0]?.id ?? null;
  return (
    <>
      <header className="mb-6"><h1 className="text-[30px] font-bold tracking-[-0.035em] sm:text-[32px]">VoxMint</h1><p className="mt-1.5 text-[14px] text-[var(--foreground-secondary)]">Create a permitted voice clone and turn scripts into natural speech.</p></header>
      <DashboardClient initialVoices={voices} initialSelectedVoiceId={initialSelectedVoiceId} initialGeneration={generations[0] ?? null} usage={usage} providerInfo={providerInfo} />
    </>
  );
}
