import type { VoiceProviderName } from "@/lib/providers/voice-provider";

export function isVoiceCompatibleWithProvider(
  voiceProvider: string,
  activeProvider: VoiceProviderName,
): boolean {
  return voiceProvider === activeProvider;
}

export function shouldSeedDemoVoices(configuredProvider: string | undefined): boolean {
  return (configuredProvider?.trim().toLowerCase() || "mock") === "mock";
}
