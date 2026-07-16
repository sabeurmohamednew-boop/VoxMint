"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";
import type { GenerationDto } from "@/lib/types/dto";

export function RenameGenerationDialog({ generation, onOpenChange, onRename }: { generation: GenerationDto | null; onOpenChange: (open: boolean) => void; onRename: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState(generation?.title ?? ""); const [busy, setBusy] = useState(false);
  return <AlertDialog.Root open={Boolean(generation)} onOpenChange={onOpenChange}><AlertDialog.Portal><AlertDialog.Overlay className="dialog-overlay" /><AlertDialog.Content className="dialog-content"><AlertDialog.Title className="text-lg font-semibold">Rename generation</AlertDialog.Title><AlertDialog.Description className="mt-2 text-sm text-[var(--foreground-secondary)]">Give this audio a short, recognizable title.</AlertDialog.Description><label htmlFor="generation-title" className="mt-5 block text-[13px] font-semibold">Title</label><input id="generation-title" autoFocus className="field mt-2 px-3" value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} /><div className="mt-6 flex justify-end gap-3"><AlertDialog.Cancel className="button-secondary px-4">Cancel</AlertDialog.Cancel><button type="button" className="button-primary px-4" disabled={title.trim().length < 2 || busy} onClick={async () => { setBusy(true); try { await onRename(title); } finally { setBusy(false); } }}>{busy ? "Saving…" : "Save title"}</button></div></AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root>;
}
