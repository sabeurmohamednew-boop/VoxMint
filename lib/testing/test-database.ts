export function assertSafeTestDatabaseUrl(testUrl: string | undefined, developmentUrl?: string, productionUrl?: string): string {
  if (!testUrl) throw new Error("TEST_DATABASE_URL is required. Playwright never falls back to another database.");
  if (testUrl === developmentUrl) throw new Error("TEST_DATABASE_URL must not equal DATABASE_URL.");
  if (productionUrl && testUrl === productionUrl) throw new Error("TEST_DATABASE_URL must not equal PRODUCTION_DATABASE_URL.");
  let parsed: URL;
  try { parsed = new URL(testUrl); } catch { throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL."); }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
  const identity = `${parsed.hostname}${parsed.pathname}${parsed.searchParams.get("schema") ?? ""}`.toLowerCase();
  if (!/(test|e2e|playwright)/.test(identity)) {
    throw new Error("TEST_DATABASE_URL must visibly identify an isolated test database or schema.");
  }
  if (/(^|[._/-])(prod|production)([._/-]|$)/.test(identity)) throw new Error("TEST_DATABASE_URL appears to target production.");
  return testUrl;
}
