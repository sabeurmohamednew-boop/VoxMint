import type { ProviderInfoDto } from "@/lib/types/dto";
import type { VoiceProvider } from "@/lib/providers/voice-provider";

export function toPublicProviderInfo(
  provider: Pick<VoiceProvider, "name" | "capabilities">,
): ProviderInfoDto {
  const isDemo = provider.name === "mock";
  return {
    name: provider.name,
    label: isDemo ? "Demo Provider" : "Cartesia",
    isDemo,
    capabilities: {
      instantClone: provider.capabilities.instantClone,
      multilingual: provider.capabilities.multilingual,
    },
  };
}
