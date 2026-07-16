import "server-only";

import { getEnv } from "@/lib/config/env";
import { CartesiaVoiceProvider } from "@/lib/providers/cartesia-provider";
import { MockVoiceProvider } from "@/lib/providers/mock-provider";
import { toPublicProviderInfo } from "@/lib/providers/public-info";
import type { VoiceProvider } from "@/lib/providers/voice-provider";
import type { ProviderInfoDto } from "@/lib/types/dto";

let provider: VoiceProvider | undefined;

export function getVoiceProvider(): VoiceProvider {
  if (!provider) {
    provider = getEnv().VOICE_PROVIDER === "cartesia" ? new CartesiaVoiceProvider() : new MockVoiceProvider();
  }
  return provider;
}

export function getPublicProviderInfo(): ProviderInfoDto {
  return { ...toPublicProviderInfo(getVoiceProvider()), showBranding: getEnv().SHOW_PROVIDER_BRANDING, operationsEnabled: getEnv().VOICE_OPERATIONS_ENABLED };
}
