export type PreflightRow = { check: string; ok: boolean; detail: string };

const placeholderPattern = /(replace|placeholder|changeme|example|build-check|your[-_])/i;
const present = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

function databaseIsProductionAppropriate(value: unknown): boolean {
  if (!present(value) || placeholderPattern.test(value)) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const database = url.pathname.toLowerCase();
    return ["postgres:", "postgresql:"].includes(url.protocol) &&
      !["localhost", "127.0.0.1", "::1"].includes(host) &&
      !/(^|[._-])(test|testing)([._-]|$)/.test(`${host}${database}`);
  } catch {
    return false;
  }
}

export function checkProductionPreflight(
  input: Record<string, unknown>,
  options: { migrationsAvailable: boolean },
): PreflightRow[] {
  const googleComplete = present(input.AUTH_GOOGLE_ID) && present(input.AUTH_GOOGLE_SECRET);
  const r2Complete = input.STORAGE_PROVIDER === "r2" && [input.R2_ACCESS_KEY_ID, input.R2_SECRET_ACCESS_KEY, input.R2_BUCKET, input.R2_ENDPOINT].every(present);
  const upstashComplete = input.RATE_LIMIT_PROVIDER === "upstash" && [input.UPSTASH_REDIS_REST_URL, input.UPSTASH_REDIS_REST_TOKEN].every(present);
  const publicLaunch = input.PUBLIC_LAUNCH === "true" || input.PUBLIC_LAUNCH === true;
  const launchContacts = present(input.OPERATOR_NAME) &&
    (present(input.SUPPORT_EMAIL) || present(input.SUPPORT_URL)) &&
    (present(input.ABUSE_REPORT_EMAIL) || present(input.ABUSE_REPORT_URL)) &&
    present(input.PRIVACY_CONTACT_EMAIL) && present(input.POLICY_EFFECTIVE_DATE) && present(input.LEGAL_JURISDICTION);
  const secretLikeValues = [input.DATABASE_URL, input.AUTH_SECRET, input.AUTH_GOOGLE_ID, input.AUTH_GOOGLE_SECRET, input.CARTESIA_API_KEY, input.R2_ACCESS_KEY_ID, input.R2_SECRET_ACCESS_KEY, input.UPSTASH_REDIS_REST_TOKEN];
  let canonicalHttps = false;
  try { canonicalHttps = present(input.NEXT_PUBLIC_APP_URL) && new URL(input.NEXT_PUBLIC_APP_URL).protocol === "https:"; } catch { canonicalHttps = false; }
  const testDatabaseSeparated = !present(input.TEST_DATABASE_URL) || input.TEST_DATABASE_URL !== input.DATABASE_URL;

  return [
    { check: "Production database", ok: databaseIsProductionAppropriate(input.DATABASE_URL), detail: "PostgreSQL URL is present and not an obvious local/test/placeholder target." },
    { check: "Development authentication", ok: input.DEV_BYPASS_AUTH !== "true" && input.DEV_BYPASS_AUTH !== true, detail: "Development bypass is disabled." },
    { check: "Test authentication", ok: input.E2E_TEST_AUTH !== "true" && input.E2E_TEST_AUTH !== true, detail: "E2E authentication is disabled." },
    { check: "Authentication secret", ok: present(input.AUTH_SECRET) && !placeholderPattern.test(input.AUTH_SECRET), detail: "A non-placeholder authentication secret is present." },
    { check: "Google OAuth", ok: googleComplete, detail: "Both Google OAuth settings are present." },
    { check: "Cartesia", ok: input.VOICE_PROVIDER === "cartesia" && present(input.CARTESIA_API_KEY), detail: "Cartesia is selected and configured." },
    { check: "Private object storage", ok: r2Complete, detail: "R2 is selected and its required settings are present." },
    { check: "Shared rate limiting", ok: upstashComplete, detail: "Upstash is selected and configured." },
    { check: "Canonical application URL", ok: canonicalHttps, detail: "The canonical public URL uses HTTPS." },
    { check: "Provider-operation switch", ok: input.VOICE_OPERATIONS_ENABLED === "true" || input.VOICE_OPERATIONS_ENABLED === "false" || typeof input.VOICE_OPERATIONS_ENABLED === "boolean", detail: "Provider operations are explicitly enabled or disabled." },
    { check: "Public-launch contacts", ok: !publicLaunch || launchContacts, detail: publicLaunch ? "Declared launch has operator, support, abuse, privacy, date, and jurisdiction metadata." : "Public launch is not declared." },
    { check: "Test database separation", ok: testDatabaseSeparated, detail: "Production and E2E database settings are not identical." },
    { check: "Placeholder scan", ok: secretLikeValues.filter(present).every((value) => !placeholderPattern.test(value)), detail: "Known placeholder patterns were not found in required settings." },
    { check: "Committed migrations", ok: options.migrationsAvailable, detail: "At least one committed migration is available." },
    { check: "Billing disclosure", ok: true, detail: "Application checkout remains inactive; no payment adapter is configured." },
  ];
}
