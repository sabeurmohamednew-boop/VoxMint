const sslAliasesWithCurrentStrictBehavior = new Set(["prefer", "require", "verify-ca"]);

export function normalizePostgresConnectionString(connectionString: string): string {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
  if (sslMode && sslAliasesWithCurrentStrictBehavior.has(sslMode)) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}
