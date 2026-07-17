import type { ProviderInfoDto, UsageDto } from "@/lib/types/dto";

export type BillingMode = "disabled" | "development" | "live";

export type PublicBillingState = {
  enabled: boolean;
  mode: BillingMode;
  applicationPlanLabel: string;
  providerAllowanceLabel?: string;
  providerName: ProviderInfoDto["name"];
  characterAllowance: number;
  voiceAllowance: number;
  checkoutAvailable: boolean;
  currentApplicationPlanId: string | null;
  availableUpgradePlanId: string | null;
};

export function createPublicBillingState(input: {
  developmentSession: boolean;
  providerInfo: ProviderInfoDto;
  usage: UsageDto;
}): PublicBillingState {
  return {
    enabled: false,
    mode: input.developmentSession ? "development" : "disabled",
    applicationPlanLabel: input.developmentSession ? "Developer access" : "Billing unavailable",
    providerAllowanceLabel: `${input.providerInfo.label} configured ceiling`,
    providerName: input.providerInfo.name,
    characterAllowance: input.usage.characterLimit,
    voiceAllowance: input.usage.voiceLimit,
    checkoutAvailable: false,
    currentApplicationPlanId: null,
    availableUpgradePlanId: null,
  };
}

export function canStartCheckout(state: PublicBillingState): boolean {
  return Boolean(
    state.enabled &&
      state.checkoutAvailable &&
      state.availableUpgradePlanId &&
      state.availableUpgradePlanId !== state.currentApplicationPlanId,
  );
}
