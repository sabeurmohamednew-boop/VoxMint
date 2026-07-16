// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalObjectStorage } from "@/lib/storage/local-storage";

let root: string;
let storage: LocalObjectStorage;
beforeEach(async () => { root = await mkdtemp(path.join(os.tmpdir(), "voxmint-storage-test-")); storage = new LocalObjectStorage(root); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe("isolated local object-storage contract", () => {
  it("writes metadata, serves full content and supports first, middle, and suffix-equivalent ranges", async () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
    const stored = await storage.put({ key: "users/user/generations/gen/audio.wav", bytes, contentType: "audio/wav", metadata: { generationId: "gen" } });
    expect(stored.etag).toMatch(/^[a-f0-9]{64}$/);
    const head = await storage.head(stored.key);
    expect(head).toMatchObject({ size: 8, contentType: "audio/wav", metadata: { generationId: "gen" } });
    for (const [range, expected] of [[undefined, bytes], [{ start: 0, end: 0 }, new Uint8Array([0])], [{ start: 2, end: 4 }, new Uint8Array([2, 3, 4])], [{ start: 6, end: 7 }, new Uint8Array([6, 7])]] as const) {
      const object = await storage.open(stored.key, range);
      expect(new Uint8Array(await new Response(object.body).arrayBuffer())).toEqual(expected);
    }
  });
  it("reports missing objects and deletes idempotently", async () => {
    const key = "users/user/generations/gen/audio.wav";
    expect(await storage.exists(key)).toBe(false);
    await storage.delete(key); await storage.delete(key);
    expect(await storage.exists(key)).toBe(false);
  });
});
