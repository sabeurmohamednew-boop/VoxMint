// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { compensateStoredObject } from "@/server/services/storage-compensation";

describe("storage compensation", () => {
  it("deletes a stored object after finalization failure", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    await expect(compensateStoredObject({ delete: remove }, "private-key", { user: "safe-user", provider: "mock" })).resolves.toBe(true);
    expect(remove).toHaveBeenCalledWith("private-key");
  });
  it("records cleanup failure without hiding the original failure path", async () => {
    const remove = vi.fn().mockRejectedValue(new Error("storage unavailable"));
    await expect(compensateStoredObject({ delete: remove }, "private-key", { user: "safe-user", provider: "mock" })).resolves.toBe(false);
  });
});
