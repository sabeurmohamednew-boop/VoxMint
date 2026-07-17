import { isSupportedLanguage, type SupportedLanguage } from "@/lib/languages";
import type { VoiceProviderName } from "@/lib/providers/voice-provider";

export function isVoiceCompatibleWithProvider(
  voiceProvider: string,
  activeProvider: VoiceProviderName,
): boolean {
  return voiceProvider === activeProvider;
}

export function isVoiceLanguageSupported(
  voiceLanguage: string,
  generationLanguages: readonly SupportedLanguage[],
): boolean {
  return isSupportedLanguage(voiceLanguage) && generationLanguages.includes(voiceLanguage);
}

export function shouldSeedDemoVoices(configuredProvider: string | undefined): boolean {
  return (configuredProvider?.trim().toLowerCase() || "mock") === "mock";
}
