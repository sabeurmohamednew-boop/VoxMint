"use client";

import { useSyncExternalStore } from "react";
import { formatDate, formatDateTime } from "@/lib/date";

export function LocalTime({ value, includeTime = false }: { value: string; includeTime?: boolean }) {
  const hydrated = useSyncExternalStore(() => () => undefined, () => true, () => false);
  let label = includeTime ? formatDateTime(value) : formatDate(value);
  let zone = "UTC";
  if (hydrated) {
    const date = new Date(value);
    const options: Intl.DateTimeFormatOptions = includeTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" };
    label = new Intl.DateTimeFormat(undefined, options).format(date);
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local time";
  }
  return <time dateTime={value} title={`${label} · ${zone}`}>{label}</time>;
}
