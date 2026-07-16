import "server-only";

type LogValue = string | number | boolean | null | undefined;
type LogContext = Record<string, LogValue>;

const blockedKeys = new Set(["apiKey", "token", "script", "audio", "signedUrl"]);

function sanitize(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).filter(([key]) => !blockedKeys.has(key)),
  );
}

export const logger = {
  info(operation: string, context: LogContext = {}) {
    console.info(JSON.stringify({ level: "info", operation, ...sanitize(context) }));
  },
  error(operation: string, context: LogContext = {}) {
    console.error(JSON.stringify({ level: "error", operation, ...sanitize(context) }));
  },
};
