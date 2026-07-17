import type { ProviderInfoDto } from "@/lib/types/dto";
import type { VoiceProvider } from "@/lib/providers/voice-provider";

export function toPublicProviderInfo(
  provider: Pick<VoiceProvider, "name" | "capabilities">,
): Omit<ProviderInfoDto, "operationsEnabled"> {
  const isDemo = provider.name === "mock";
  return {
    name: provider.name,
    label: isDemo ? "Demo Provider" : "Cartesia",
    isDemo,
    showBranding: true,
    capabilities: {
      instantClone: provider.capabilities.instantClone,
      multilingual: provider.capabilities.multilingual,
      cloneLanguages: [...provider.capabilities.cloneLanguages],
      generationLanguages: [...provider.capabilities.generationLanguages],
    },
  };
}
