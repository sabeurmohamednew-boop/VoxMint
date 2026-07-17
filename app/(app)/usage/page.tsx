import { CalendarRange, Info } from "lucide-react";
import { UsageMeter } from "@/components/usage/usage-meter";
import { LocalTime } from "@/components/ui/local-time";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getUsage } from "@/server/services/usage-service";

export default async function UsagePage() {
  const user = await requireUser();
  const usage = await getUsage(user.id);
  const recent = await prisma.usageLedger.findMany({
    where: {
      userId: user.id,
      periodKey: usage.periodKey,
      status: "COMMITTED",
      generation: { provider: usage.activeProvider },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const providerLabel = usage.activeProvider === "mock" ? "Demo provider" : "Cartesia provider";

  return (
    <>
      <header className="mb-6">
        <h1 className="text-[30px] font-bold tracking-[-0.035em]">Usage</h1>
        <p className="mt-1.5 text-sm text-[var(--foreground-secondary)]">Review usage committed through this VoxMint deployment.</p>
      </header>
      <div className="grid gap-5 md:grid-cols-2">
        <UsageMeter label={`${usage.activeProvider === "mock" ? "Demo" : "VoxMint-tracked Cartesia"} usage`} value={usage.charactersUsed} limit={usage.characterLimit} detail={`Characters generated through this deployment · ${usage.periodKey}`} />
        <UsageMeter label="Voices registered in VoxMint" value={usage.voicesUsed} limit={usage.voiceLimit} detail={`${providerLabel} configured deployment ceiling`} />
      </div>
      {usage.activeProvider !== "mock" && usage.demoCharactersUsed > 0 && <p className="mt-3 text-xs text-[var(--muted)]">Demo activity this period: {usage.demoCharactersUsed.toLocaleString()} characters. It is not included in Cartesia usage.</p>}
      <section className="panel mt-5 p-5">
        <div className="flex items-center gap-2"><CalendarRange className="h-5 w-5 text-[#9a67f0]" /><h2 className="font-semibold">Recent usage</h2></div>
        {recent.length ? <div className="mt-4 divide-y divide-[var(--border-subtle)]">{recent.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium">{entry.type === "TTS_CHARACTERS" ? "Voiceover generation" : "Voice creation"}</p><p className="mt-0.5 text-xs text-[var(--muted)]"><LocalTime value={entry.createdAt.toISOString()} includeTime /></p></div><span className="text-[var(--foreground-secondary)]">{entry.quantity.toLocaleString()} {entry.type === "TTS_CHARACTERS" ? "characters" : "voice"}</span></div>)}</div> : <p className="mt-4 text-sm text-[var(--muted)]">No committed {usage.activeProvider === "mock" ? "demo" : "Cartesia"} usage this period.</p>}
      </section>
      <div className="mt-5 flex gap-3 rounded-[12px] border border-[var(--info)]/25 bg-[var(--info)]/5 p-4 text-sm leading-6 text-[var(--foreground-secondary)]"><Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--info)]" /><p>Only successful, committed operations recorded by this VoxMint deployment count here. Failed requests release reservations. These totals are not a live Cartesia provider-account balance.</p></div>
    </>
  );
}
