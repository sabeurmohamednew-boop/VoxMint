import "server-only";

import { getEnv } from "@/lib/config/env";
import { LocalObjectStorage } from "@/lib/storage/local-storage";
import type { ObjectStorage } from "@/lib/storage/object-storage";
import { R2ObjectStorage } from "@/lib/storage/r2-storage";

let storage: ObjectStorage | undefined;

export function getObjectStorage(): ObjectStorage {
  if (!storage) storage = getEnv().STORAGE_PROVIDER === "r2" ? new R2ObjectStorage() : new LocalObjectStorage();
  return storage;
}
