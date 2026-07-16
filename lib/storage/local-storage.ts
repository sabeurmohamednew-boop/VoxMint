import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { createHash } from "node:crypto";
import { getEnv } from "@/lib/config/env";
import type { ObjectByteRange, ObjectStorage, PutObjectInput } from "@/lib/storage/object-storage";

function assertKey(key: string): void {
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(key) || key.includes("..") || path.isAbsolute(key)) {
    throw new Error("Invalid storage key.");
  }
}

export class LocalObjectStorage implements ObjectStorage {
  private readonly root: string;

  constructor(rootOverride?: string) {
    this.root = rootOverride
      ? path.resolve(rootOverride)
      : path.resolve(/* turbopackIgnore: true */ process.cwd(), getEnv().LOCAL_STORAGE_PATH);
    const workspace = `${path.resolve(process.cwd())}${path.sep}`;
    if (!rootOverride && !`${this.root}${path.sep}`.startsWith(workspace)) {
      throw new Error("LOCAL_STORAGE_PATH must stay inside the project directory.");
    }
  }

  private resolve(key: string): string {
    assertKey(key);
    const target = path.resolve(this.root, key);
    if (!target.startsWith(`${this.root}${path.sep}`)) throw new Error("Storage path traversal blocked.");
    return target;
  }

  async put(input: PutObjectInput) {
    const target = this.resolve(input.key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, input.bytes, { flag: "w" });
    const createdAt = new Date();
    const etag = createHash("sha256").update(input.bytes).digest("hex");
    await writeFile(`${target}.meta.json`, JSON.stringify({ contentType: input.contentType, metadata: input.metadata, etag, createdAt: createdAt.toISOString() }), { flag: "w" });
    return { key: input.key, size: input.bytes.byteLength, contentType: input.contentType, etag, createdAt };
  }

  async head(key: string) {
    const target = this.resolve(key);
    const [info, metadata] = await Promise.all([
      stat(target),
      readFile(`${target}.meta.json`, "utf8").then((value) => JSON.parse(value) as { contentType: string; etag?: string; createdAt?: string; metadata?: Record<string, string> }),
    ]);
    return { size: Number(info.size), contentType: metadata.contentType, etag: metadata.etag, createdAt: metadata.createdAt ? new Date(metadata.createdAt) : info.birthtime, metadata: metadata.metadata };
  }

  async open(key: string, range?: ObjectByteRange) {
    const target = this.resolve(key);
    const metadata = await this.head(key);
    const stream = createReadStream(target, range ? { start: range.start, end: range.end } : undefined);
    return {
      body: Readable.toWeb(stream) as ReadableStream<Uint8Array>,
      size: range ? range.end - range.start + 1 : metadata.size,
      contentType: metadata.contentType,
    };
  }

  async delete(key: string) {
    const target = this.resolve(key);
    await Promise.all([
      rm(target, { force: true }),
      rm(`${target}.meta.json`, { force: true }),
    ]);
  }

  async exists(key: string) {
    try {
      await stat(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }
}
