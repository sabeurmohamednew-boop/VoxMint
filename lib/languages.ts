export const SUPPORTED_LANGUAGE_CODES = ["en", "fr", "ar", "hi"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export type SupportedLanguageOption = {
  code: SupportedLanguage;
  label: string;
};

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  fr: "French",
  ar: "Arabic",
  hi: "Hindi",
};

export const SUPPORTED_LANGUAGES: readonly SupportedLanguageOption[] = SUPPORTED_LANGUAGE_CODES.map((code) => ({
  code,
  label: LANGUAGE_LABELS[code],
}));

export const MOCK_LANGUAGE_CODES = SUPPORTED_LANGUAGE_CODES;

const CARTESIA_CLONE_LANGUAGE_CODES = SUPPORTED_LANGUAGE_CODES;

const CARTESIA_TTS_LANGUAGE_CODES_BY_MODEL = {
  "sonic-3": SUPPORTED_LANGUAGE_CODES,
  "sonic-3-2026-01-12": SUPPORTED_LANGUAGE_CODES,
  "sonic-3-2025-10-27": SUPPORTED_LANGUAGE_CODES,
  "sonic-3.5": SUPPORTED_LANGUAGE_CODES,
  "sonic-3.5-2026-05-04": SUPPORTED_LANGUAGE_CODES,
} as const satisfies Record<string, readonly SupportedLanguage[]>;

const NO_SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [];

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(value);
}

export function getLanguageOptions(
  codes: readonly SupportedLanguage[],
): readonly SupportedLanguageOption[] {
  return codes.map((code) => ({ code, label: LANGUAGE_LABELS[code] }));
}

export function getLanguageLabel(code: string): string {
  return isSupportedLanguage(code) ? LANGUAGE_LABELS[code] : code.toUpperCase();
}

export function intersectLanguageCodes(
  first: readonly SupportedLanguage[],
  second: readonly SupportedLanguage[],
): readonly SupportedLanguage[] {
  return first.filter((code) => second.includes(code));
}

export function getCartesiaLanguageCapabilities(model: string): {
  cloneLanguages: readonly SupportedLanguage[];
  generationLanguages: readonly SupportedLanguage[];
} {
  const modelLanguages = CARTESIA_TTS_LANGUAGE_CODES_BY_MODEL as Readonly<
    Record<string, readonly SupportedLanguage[]>
  >;
  const generationLanguages = modelLanguages[model.trim()] ?? NO_SUPPORTED_LANGUAGES;
  return {
    cloneLanguages: intersectLanguageCodes(CARTESIA_CLONE_LANGUAGE_CODES, generationLanguages),
    generationLanguages,
  };
}
