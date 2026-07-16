"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  danger = false,
  confirmationPhrase,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  danger?: boolean;
  confirmationPhrase?: string;
}) {
  const [confirmation, setConfirmation] = useState("");
  const confirmed = !confirmationPhrase || confirmation === confirmationPhrase;
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => { if (!next) setConfirmation(""); onOpenChange(next); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-content">
          <AlertDialog.Title className="text-lg font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)]">{description}</AlertDialog.Description>
          {confirmationPhrase && <label className="mt-4 block text-xs font-semibold">Type <span className="font-mono text-[var(--danger)]">{confirmationPhrase}</span> to continue<input className="field mt-2 px-3" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></label>}
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel className="button-secondary px-4">Cancel</AlertDialog.Cancel>
            <AlertDialog.Action
              className={`button-primary px-4 ${danger ? "!bg-[var(--danger)] !bg-none" : ""}`}
              onClick={() => void onConfirm()}
              disabled={!confirmed}
            >
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
