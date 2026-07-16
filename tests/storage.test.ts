import { describe, expect, it } from "vitest";
import { generationStorageKey } from "@/lib/storage/object-storage";

describe("storage key generation", () => {
  it("scopes generated audio by user and generation", () => {
    expect(generationStorageKey("user_123", "gen_456", "wav")).toBe("users/user_123/generations/gen_456/audio.wav");
  });
  it("rejects traversal and unsafe segments", () => {
    expect(() => generationStorageKey("../user", "gen", "wav")).toThrow("Unsafe storage key");
    expect(() => generationStorageKey("user", "gen", "../exe")).toThrow("Unsafe storage key");
  });
});
