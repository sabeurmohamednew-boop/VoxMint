"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";
import type { VoiceDto } from "@/lib/types/dto";
import { voiceNameSchema } from "@/lib/validation/schemas";

export function RenameVoiceDialog({
  voice,
  onOpenChange,
  onSave,
}: {
  voice: VoiceDto | null;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, description: string | null) => Promise<void>;
}) {
  const [name, setName] = useState(voice?.name ?? "");
  const [description, setDescription] = useState(voice?.description ?? "");
  const [busy, setBusy] = useState(false);
  const valid = voiceNameSchema.safeParse(name).success && description.length <= 160;

  return (
    <AlertDialog.Root open={Boolean(voice)} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-content">
          <AlertDialog.Title className="text-lg font-semibold">Edit voice</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-[var(--foreground-secondary)]">
            Update the name and optional description used in your voice library.
          </AlertDialog.Description>
          <label className="mt-5 block text-[13px] font-semibold" htmlFor="edit-voice-name">Voice name</label>
          <input autoFocus id="edit-voice-name" className="field mt-2 px-3" value={name} maxLength={50} onChange={(event) => setName(event.target.value)} />
          <label className="mt-4 block text-[13px] font-semibold" htmlFor="edit-voice-description">Description</label>
          <textarea id="edit-voice-description" className="field mt-2 min-h-[92px] resize-y px-3 py-2.5" value={description} maxLength={160} onChange={(event) => setDescription(event.target.value)} />
          <p className="mt-1 text-right text-[11px] text-[var(--muted)]">{description.length} / 160</p>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel className="button-secondary px-4">Cancel</AlertDialog.Cancel>
            <button type="button" className="button-primary px-4" disabled={!valid || busy} onClick={async () => { setBusy(true); try { await onSave(name, description.trim() || null); } finally { setBusy(false); } }}>
              {busy ? "Saving..." : "Save changes"}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
