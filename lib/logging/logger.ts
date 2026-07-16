import "server-only";

import { createHash } from "node:crypto";

type LogValue = string | number | boolean | null | undefined;
type LogContext = Record<string, LogValue>;

const blockedKeys = new Set(["apiKey", "token", "script", "text", "audio", "signedUrl", "authorization", "objectKey", "password"]);

function sanitize(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).filter(([key]) => !blockedKeys.has(key)),
  );
}

export function safeUserId(userId: string): string {
  return createHash("sha256").update(`voxmint-user:${userId}`).digest("hex").slice(0, 16);
}

export const logger = {
  info(operation: string, context: LogContext = {}) {
    console.info(JSON.stringify({ level: "info", operation, ...sanitize(context) }));
  },
  error(operation: string, context: LogContext = {}) {
    console.error(JSON.stringify({ level: "error", operation, ...sanitize(context) }));
  },
};
