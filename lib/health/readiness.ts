export type ReadinessState = {
  status: "ready" | "not_ready";
  checks: {
    database: "ok" | "unavailable";
    storage: string;
    rateLimit: string;
    provider: string;
    providerOperations: "enabled" | "disabled";
  };
};

export async function checkReadiness(input: {
  queryDatabase: () => Promise<unknown>;
  initializeStorage: () => unknown;
  initializeRateLimit: () => unknown;
  initializeProvider: () => unknown;
  storageName: string;
  rateLimitName: string;
  providerName: string;
  providerOperationsEnabled: boolean;
}): Promise<ReadinessState> {
  const results = await Promise.allSettled([
    Promise.resolve().then(input.queryDatabase),
    Promise.resolve().then(input.initializeStorage),
    Promise.resolve().then(input.initializeRateLimit),
    Promise.resolve().then(input.initializeProvider),
  ]);
  const [database, storage, rateLimit, provider] = results;
  const ready = results.every((result) => result.status === "fulfilled");

  return {
    status: ready ? "ready" : "not_ready",
    checks: {
      database: database.status === "fulfilled" ? "ok" : "unavailable",
      storage: storage.status === "fulfilled" ? `${input.storageName}_adapter_ready` : "unavailable",
      rateLimit: rateLimit.status === "fulfilled" ? `${input.rateLimitName}_adapter_ready` : "unavailable",
      provider: provider.status === "fulfilled" ? `${input.providerName}_adapter_ready` : "unavailable",
      providerOperations: input.providerOperationsEnabled ? "enabled" : "disabled",
    },
  };
}
