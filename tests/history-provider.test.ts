import { describe, expect, it } from "vitest";
import { normalizeHistoryProvider } from "@/lib/history/provider-filter";

describe("history provider query", () => {
  it("defaults missing and invalid values to the active provider", () => {
    expect(normalizeHistoryProvider(undefined, "cartesia")).toBe("cartesia");
    expect(normalizeHistoryProvider("unknown", "mock")).toBe("mock");
  });

  it("preserves explicit Cartesia, Demo and All filters", () => {
    expect(normalizeHistoryProvider("cartesia", "mock")).toBe("cartesia");
    expect(normalizeHistoryProvider("mock", "cartesia")).toBe("mock");
    expect(normalizeHistoryProvider("all", "cartesia")).toBe("all");
  });
});
