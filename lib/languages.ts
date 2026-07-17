export const SUPPORTED_LANGUAGE_CODES = ["en", "fr", "ar", "hi"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  fr: "French",
  ar: "Arabic",
  hi: "Hindi",
};

export const SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGE_CODES.map((code) => ({
  code,
  label: LANGUAGE_LABELS[code],
}));
