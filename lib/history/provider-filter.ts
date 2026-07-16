import type { ProviderInfoDto } from "@/lib/types/dto";

export type HistoryProviderFilter = "all" | ProviderInfoDto["name"];

export function normalizeHistoryProvider(
  value: string | undefined,
  activeProvider: ProviderInfoDto["name"],
): HistoryProviderFilter {
  return value === "all" || value === "mock" || value === "cartesia" ? value : activeProvider;
}
