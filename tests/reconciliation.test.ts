// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { reconcileVoiceRecords } from "@/lib/providers/reconciliation";

const records = [{ id: "one", providerVoiceId: "provider-one", status: "READY" }];
describe("voice provider reconciliation", () => {
  it("reports existing provider voices without changes", async () => expect(await reconcileVoiceRecords(records, async () => "ready", { apply: false })).toEqual([{ id: "one", previousStatus: "READY", state: "ready", action: "none" }]));
  it("keeps dry runs read-only for missing voices", async () => {
    const apply = vi.fn();
    const result = await reconcileVoiceRecords(records, async () => "missing", { apply: false, markMissing: apply });
    expect(result[0]?.state).toBe("provider_missing");
    expect(apply).not.toHaveBeenCalled();
  });
  it("applies only the expected missing record", async () => {
    const apply = vi.fn();
    await reconcileVoiceRecords([...records, { id: "two", providerVoiceId: "provider-two", status: "READY" }], async (id) => id === "provider-one" ? "missing" : "ready", { apply: true, markMissing: apply });
    expect(apply).toHaveBeenCalledOnce();
    expect(apply).toHaveBeenCalledWith(records[0]);
  });
  it("reports provider outages without applying changes", async () => {
    const apply = vi.fn();
    const result = await reconcileVoiceRecords(records, async () => { throw new Error("unavailable"); }, { apply: true, markMissing: apply });
    expect(result[0]?.state).toBe("provider_unavailable");
    expect(apply).not.toHaveBeenCalled();
  });
});
