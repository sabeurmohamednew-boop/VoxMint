import { describe, expect, it } from "vitest";
import {
  getCartesiaLanguageCapabilities,
  intersectLanguageCodes,
  MOCK_LANGUAGE_CODES,
  SUPPORTED_LANGUAGE_CODES,
} from "@/lib/languages";
import { isVoiceLanguageSupported } from "@/lib/providers/compatibility";

const productLanguages = ["en", "fr", "ar", "hi"];

describe("provider language policy", () => {
  it("keeps one typed four-language product vocabulary", () => {
    expect(SUPPORTED_LANGUAGE_CODES).toEqual(productLanguages);
  });

  it("supports all four languages deterministically in mock mode", () => {
    expect(MOCK_LANGUAGE_CODES).toEqual(productLanguages);
  });

  it.each(["sonic-3", "sonic-3-2026-01-12", "sonic-3-2025-10-27"])(
    "exposes the verified four-language capability for Cartesia %s",
    (model) => {
      const capabilities = getCartesiaLanguageCapabilities(model);
      expect(capabilities.cloneLanguages).toEqual(productLanguages);
      expect(capabilities.generationLanguages).toEqual(productLanguages);
    },
  );

  it("fails closed for an unverified Cartesia model", () => {
    expect(getCartesiaLanguageCapabilities("unverified-model")).toEqual({
      cloneLanguages: [],
      generationLanguages: [],
    });
  });

  it("uses the clone and generation intersection for saved preferences", () => {
    expect(intersectLanguageCodes(["en", "fr", "hi"], ["en", "fr"])).toEqual(["en", "fr"]);
  });

  it("rejects unknown or model-incompatible stored voice languages", () => {
    expect(isVoiceLanguageSupported("fr", ["en"])).toBe(false);
    expect(isVoiceLanguageSupported("xx", SUPPORTED_LANGUAGE_CODES)).toBe(false);
    expect(isVoiceLanguageSupported("ar", SUPPORTED_LANGUAGE_CODES)).toBe(true);
  });
});
