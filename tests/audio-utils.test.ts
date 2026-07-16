import { describe, expect, it } from "vitest";
import { downloadFileName, extensionForMime, formatDuration, safeBaseName } from "@/lib/audio/utils";

describe("audio utilities", () => {
  it.each([[0, "00:00"], [65_000, "01:05"], [3_661_000, "1:01:01"]] as const)("formats %i ms", (value, expected) => {
    expect(formatDuration(value)).toBe(expected);
  });
  it("maps safe audio MIME types", () => {
    expect(extensionForMime("audio/wav")).toBe("wav");
    expect(extensionForMime("text/html")).toBeNull();
  });
  it("creates filesystem-safe download names", () => {
    expect(safeBaseName("Maya's <Studio> Voice")).toBe("mayas-studio-voice");
    expect(downloadFileName("Maya Voice", "audio/wav", new Date("2026-07-16T10:00:00Z"))).toBe("maya-voice-2026-07-16.wav");
    expect(downloadFileName("Maya Voice", "audio/mpeg", new Date("2026-07-16T10:00:00Z"))).toBe("maya-voice-2026-07-16.mp3");
  });
});
