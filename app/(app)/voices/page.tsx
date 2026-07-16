import Link from "next/link";
import { Plus } from "lucide-react";
import { VoicesClient } from "@/components/voices/voices-client";
import { requireUser } from "@/lib/auth/session";
import { listVoices } from "@/server/services/voice-service";

export default async function VoicesPage() {
  const user = await requireUser(); const voices = await listVoices(user.id);
  return <><header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-[30px] font-bold tracking-[-0.035em]">My Voices</h1><p className="mt-1.5 text-sm text-[var(--foreground-secondary)]">Manage the voices you have created with permission.</p></div><Link href="/dashboard#clone" className="button-primary px-4"><Plus className="h-4 w-4" />Clone new voice</Link></header><VoicesClient initialVoices={voices} /></>;
}
