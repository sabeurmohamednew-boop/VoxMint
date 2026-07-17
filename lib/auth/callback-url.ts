const DEFAULT_CALLBACK_URL = "/dashboard";
const CALLBACK_BASE = "https://voxmint.invalid";

export function normalizeCallbackUrl(
  value: FormDataEntryValue | string | null | undefined,
  fallback = DEFAULT_CALLBACK_URL,
  allowedOrigin?: string,
): string {
  if (
    typeof value !== "string" ||
    /[\\\u0000-\u001f\u007f]/u.test(value)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, CALLBACK_BASE);
    const absoluteAllowedOrigin = allowedOrigin ? new URL(allowedOrigin).origin : null;
    const isRootRelative = value.startsWith("/") && !value.startsWith("//");
    const isAllowedAbsolute = absoluteAllowedOrigin !== null && parsed.origin === absoluteAllowedOrigin;
    if ((!isRootRelative && !isAllowedAbsolute) || parsed.username || parsed.password) return fallback;
    if (isRootRelative && parsed.origin !== CALLBACK_BASE) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
