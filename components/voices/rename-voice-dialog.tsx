"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";
import type { VoiceDto } from "@/lib/types/dto";
import { voiceNameSchema } from "@/lib/validation/schemas";

export function RenameVoiceDialog({ voice, onOpenChange, onRename }: { voice: VoiceDto | null; onOpenChange: (open: boolean) => void; onRename: (name: string) => Promise<void> }) {
  const [name, setName] = useState(voice?.name ?? "");
  const [busy, setBusy] = useState(false);
  const valid = voiceNameSchema.safeParse(name).success;
  return (
    <AlertDialog.Root open={Boolean(voice)} onOpenChange={onOpenChange}>
      <AlertDialog.Portal><AlertDialog.Overlay className="dialog-overlay" /><AlertDialog.Content className="dialog-content"><AlertDialog.Title className="text-lg font-semibold">Rename voice</AlertDialog.Title><AlertDialog.Description className="mt-2 text-sm text-[var(--foreground-secondary)]">Choose a clear name that helps you recognize this voice.</AlertDialog.Description><label className="mt-5 block text-[13px] font-semibold" htmlFor="rename-voice">Voice name</label><input autoFocus id="rename-voice" className="field mt-2 px-3" value={name} maxLength={50} onChange={(event) => setName(event.target.value)} /><div className="mt-6 flex justify-end gap-3"><AlertDialog.Cancel className="button-secondary px-4">Cancel</AlertDialog.Cancel><button type="button" className="button-primary px-4" disabled={!valid || busy} onClick={async () => { setBusy(true); try { await onRename(name); } finally { setBusy(false); } }}>{busy ? "Saving…" : "Save name"}</button></div></AlertDialog.Content></AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
