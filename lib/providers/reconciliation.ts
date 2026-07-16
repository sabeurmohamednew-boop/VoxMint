export type ReconciliationRecord = {
  id: string;
  providerVoiceId: string;
  status: string;
};

export type ReconciliationResult = {
  id: string;
  previousStatus: string;
  state: "ready" | "provider_missing" | "provider_unavailable";
  action: "none" | "mark_failed";
};

export async function reconcileVoiceRecords(
  records: ReconciliationRecord[],
  check: (providerVoiceId: string) => Promise<"ready" | "missing">,
  options: { apply: boolean; markMissing?: (record: ReconciliationRecord) => Promise<void> },
): Promise<ReconciliationResult[]> {
  const results: ReconciliationResult[] = [];
  for (const record of records) {
    try {
      const state = await check(record.providerVoiceId);
      if (state === "missing") {
        if (options.apply && options.markMissing) await options.markMissing(record);
        results.push({ id: record.id, previousStatus: record.status, state: "provider_missing", action: options.apply ? "mark_failed" : "none" });
      } else {
        results.push({ id: record.id, previousStatus: record.status, state: "ready", action: "none" });
      }
    } catch {
      results.push({ id: record.id, previousStatus: record.status, state: "provider_unavailable", action: "none" });
    }
  }
  return results;
}
