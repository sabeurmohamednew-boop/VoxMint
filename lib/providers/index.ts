import "server-only";

import { getEnv } from "@/lib/config/env";
import { CartesiaVoiceProvider } from "@/lib/providers/cartesia-provider";
import { MockVoiceProvider } from "@/lib/providers/mock-provider";
import type { VoiceProvider } from "@/lib/providers/voice-provider";

let provider: VoiceProvider | undefined;

export function getVoiceProvider(): VoiceProvider {
  if (!provider) {
    provider = getEnv().VOICE_PROVIDER === "cartesia" ? new CartesiaVoiceProvider() : new MockVoiceProvider();
  }
  return provider;
}
