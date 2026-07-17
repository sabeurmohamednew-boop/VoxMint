"use client";

import { LogOut, Save, ShieldAlert } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { fetchJson } from "@/lib/api/client";
import { getLanguageLabel, getLanguageOptions, intersectLanguageCodes, isSupportedLanguage } from "@/lib/languages";
import type { ProviderInfoDto } from "@/lib/types/dto";

type Account = { name: string | null; email: string | null; preferredLanguage: string; preferredAudioFormat: string; theme: "SYSTEM" | "DARK" | "LIGHT"; retentionDays: number | null };
type Operations = { developmentSession: boolean; retentionWorkerEnabled: boolean };

export function SettingsClient({ account, operations, providerInfo }: { account: Account; operations: Operations; providerInfo: ProviderInfoDto }) {
  const [form, setForm] = useState({ name: account.name ?? "", preferredLanguage: account.preferredLanguage, preferredAudioFormat: account.preferredAudioFormat, theme: account.theme, retentionDays: account.retentionDays ? String(account.retentionDays) : "none" });
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { showToast } = useToast();
  const supportedLanguageCodes = intersectLanguageCodes(
    providerInfo.capabilities.cloneLanguages,
    providerInfo.capabilities.generationLanguages,
  );
  const languageOptions = getLanguageOptions(supportedLanguageCodes);
  const preferredLanguageAvailable = isSupportedLanguage(form.preferredLanguage) && supportedLanguageCodes.includes(form.preferredLanguage);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { retentionDays, preferredLanguage, ...preferences } = form;
      const compatiblePreferences = preferredLanguageAvailable
        ? { ...preferences, preferredLanguage }
        : preferences;
      const payload = operations.retentionWorkerEnabled
        ? { ...compatiblePreferences, retentionDays: retentionDays !== "none" ? Number(retentionDays) : null }
        : compatiblePreferences;
      await fetchJson("/api/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      document.documentElement.classList.toggle("light", form.theme === "LIGHT");
      showToast("Settings saved");
    } catch (error) { showToast(error instanceof Error ? error.message : "Settings could not be saved.", "error"); }
    finally { setBusy(false); }
  }

  async function deleteAccount() {
    try {
      await fetchJson<void>("/api/account", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation: "DELETE MY ACCOUNT" }) });
      showToast("Account deleted");
      await signOut({ redirectTo: "/" });
    } catch (error) { showToast(error instanceof Error ? error.message : "Account deletion failed.", "error"); }
  }

  return <>
    <form onSubmit={save} className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <section className="panel p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold">Profile &amp; preferences</h2>{operations.developmentSession && <span className="development-badge">Development account</span>}</div>{operations.developmentSession && <p className="mt-2 text-xs leading-5 text-[var(--muted)]">This identity is provided by local development authentication and is not a permanent production account.</p>}<div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="text-[13px] font-semibold">Display name<input className="field mt-2 px-3" value={form.name} minLength={2} maxLength={80} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="text-[13px] font-semibold">Email<input className="field mt-2 px-3 opacity-70" value={account.email ?? ""} disabled /></label>
        <label className="text-[13px] font-semibold">Default language<select className="field mt-2 px-3" value={form.preferredLanguage} onChange={(event) => setForm({ ...form, preferredLanguage: event.target.value })}>{!preferredLanguageAvailable && <option value={form.preferredLanguage} disabled>{getLanguageLabel(form.preferredLanguage)} (unavailable with {providerInfo.label})</option>}{languageOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label>
        <label className="text-[13px] font-semibold">Preferred output<select className="field mt-2 px-3" value={form.preferredAudioFormat} onChange={(event) => setForm({ ...form, preferredAudioFormat: event.target.value })}><option value="wav">WAV</option><option value="mp3">MP3</option></select></label>
        <label className="text-[13px] font-semibold">Theme<select className="field mt-2 px-3" value={form.theme} onChange={(event) => setForm({ ...form, theme: event.target.value as Account["theme"] })}><option value="DARK">Dark</option><option value="LIGHT">Light</option><option value="SYSTEM">System</option></select></label>
        <label className="text-[13px] font-semibold"><span className="flex items-center gap-2">Retention preference{!operations.retentionWorkerEnabled && <span className="status-badge">Inactive</span>}</span><select className="field mt-2 px-3" aria-describedby="retention-status" value={operations.retentionWorkerEnabled ? form.retentionDays : "none"} disabled={!operations.retentionWorkerEnabled} onChange={(event) => setForm({ ...form, retentionDays: event.target.value })}><option value="none">Keep until I delete</option><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select></label>
      </div><p id="retention-status" className="mt-3 text-[11.5px] leading-5 text-[var(--muted)]">{operations.retentionWorkerEnabled ? "Scheduled retention is active for this deployment." : <>Scheduled retention is not active in this deployment. Delete audio manually from <a href="/history" className="font-semibold text-[#8b55e8]">History</a>.</>}</p><button className="button-primary mt-5 px-5" disabled={busy}><Save className="h-4 w-4" />{busy ? "Saving…" : "Save settings"}</button></section>
      <aside className="space-y-5"><section className="panel p-5"><h2 className="text-base font-semibold">Session</h2><p className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)]">Sign out of this browser. Your saved voices and history will remain.</p><button type="button" className="button-secondary mt-4 px-4" onClick={() => void signOut({ redirectTo: "/" })}><LogOut className="h-4 w-4" />Sign out</button></section><section className="rounded-[14px] border border-[var(--danger)]/35 bg-[var(--danger)]/5 p-5"><div className="flex items-center gap-2 text-[var(--danger)]"><ShieldAlert className="h-5 w-5" /><h2 className="font-semibold">Delete account</h2></div><p className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)]">Permanently delete provider voices, stored audio, and access to this account.</p><button type="button" className="button-secondary mt-4 border-[var(--danger)]/50 px-4 text-[var(--danger)]" onClick={() => setDeleteOpen(true)} disabled={operations.developmentSession} title={operations.developmentSession ? "Disabled for the development session" : undefined}>Delete account</button>{operations.developmentSession && <p className="mt-2 text-xs text-[var(--muted)]">Disabled for this development session.</p>}</section></aside>
    </form>
    <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete your VoxMint account?" description="This stages deletion, removes provider voices and stored audio, then closes the account. If an external step fails, the account remains active so you can retry." confirmLabel="Delete my account" confirmationPhrase="DELETE MY ACCOUNT" danger onConfirm={deleteAccount} />
  </>;
}
