import { describe, expect, it } from "vitest";
import { canStartCheckout, createPublicBillingState, type PublicBillingState } from "@/lib/billing/public-state";
import type { ProviderInfoDto, UsageDto } from "@/lib/types/dto";

const providerInfo: ProviderInfoDto = {
  name: "cartesia",
  label: "Cartesia",
  isDemo: false,
  showBranding: true,
  operationsEnabled: true,
  capabilities: { instantClone: true, multilingual: true, cloneLanguages: ["en", "fr", "ar", "hi"], generationLanguages: ["en", "fr", "ar", "hi"] },
};

const usage: UsageDto = {
  plan: "PRO",
  activeProvider: "cartesia",
  periodKey: "2026-07",
  charactersUsed: 20,
  demoCharactersUsed: 0,
  characterLimit: 100_000,
  voicesUsed: 1,
  voiceLimit: 20,
};

describe("public billing state", () => {
  it("separates development access from provider allowance and excludes secrets", () => {
    const state = createPublicBillingState({ developmentSession: true, providerInfo, usage });
    const serialized = JSON.stringify(state);
    expect(state).toMatchObject({ enabled: false, mode: "development", applicationPlanLabel: "Developer access", providerAllowanceLabel: "Cartesia configured ceiling", checkoutAvailable: false });
    expect(serialized).not.toContain("PRO");
    expect(serialized).not.toMatch(/api.?key|secret|token/i);
  });

  it("refuses checkout when unavailable or when the target is the current plan", () => {
    const base: PublicBillingState = createPublicBillingState({ developmentSession: false, providerInfo, usage });
    expect(canStartCheckout(base)).toBe(false);
    expect(canStartCheckout({ ...base, enabled: true, checkoutAvailable: true, currentApplicationPlanId: "standard", availableUpgradePlanId: "standard" })).toBe(false);
    expect(canStartCheckout({ ...base, enabled: true, checkoutAvailable: true, currentApplicationPlanId: "standard", availableUpgradePlanId: "plus" })).toBe(true);
  });
});
