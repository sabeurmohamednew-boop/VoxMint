"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

export function AppSelect({ value, onValueChange, options, label, className = "" }: {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  label: string;
  className?: string;
}) {
  return <Select.Root value={value} onValueChange={onValueChange}><Select.Trigger aria-label={label} className={`field flex min-w-0 items-center justify-between gap-3 overflow-hidden px-3 text-left ${className}`}><span className="min-w-0 flex-1 truncate"><Select.Value /></span><Select.Icon className="shrink-0"><ChevronDown className="h-4 w-4 text-[var(--muted)]" /></Select.Icon></Select.Trigger><Select.Portal><Select.Content className="menu-content z-[110] max-w-[calc(100vw-24px)] min-w-[var(--radix-select-trigger-width)]" position="popper" sideOffset={5}><Select.Viewport>{options.map((option) => <Select.Item className="menu-item relative pr-8" key={option.value} value={option.value} disabled={option.disabled}><Select.ItemText>{option.label}</Select.ItemText><Select.ItemIndicator className="absolute right-2"><Check className="h-4 w-4" /></Select.ItemIndicator></Select.Item>)}</Select.Viewport></Select.Content></Select.Portal></Select.Root>;
}
