import { HistoryClient } from "@/components/generations/history-client";
import { requireUser } from "@/lib/auth/session";
import { listGenerations } from "@/server/services/generation-service";
import { listVoices } from "@/server/services/voice-service";

export default async function HistoryPage() { const user = await requireUser(); const [generations, voices] = await Promise.all([listGenerations(user.id), listVoices(user.id)]); return <><header className="mb-6"><h1 className="text-[30px] font-bold tracking-[-0.035em]">History</h1><p className="mt-1.5 text-sm text-[var(--foreground-secondary)]">Replay, download, rename or remove previous voiceovers.</p></header><HistoryClient initialGenerations={generations} voices={voices} /></>; }
