import "server-only";

import type { ObjectStorage } from "@/lib/storage/object-storage";
import { logger } from "@/lib/logging/logger";

export async function compensateStoredObject(
  storage: Pick<ObjectStorage, "delete">,
  key: string,
  context: { user: string; provider: string; requestId?: string },
): Promise<boolean> {
  try {
    await storage.delete(key);
    logger.info("generation.storage_cleanup", { ...context, status: "deleted" });
    return true;
  } catch {
    logger.error("generation.storage_cleanup", { ...context, status: "failed" });
    return false;
  }
}
