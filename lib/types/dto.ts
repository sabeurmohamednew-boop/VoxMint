export type VoiceDto = {
  id: string;
  provider: string;
  name: string;
  description: string | null;
  primaryLanguage: string;
  status: "PROCESSING" | "READY" | "FAILED" | "DELETING" | "DELETED";
  createdAt: string;
  lastUsedAt: string | null;
  sourceDurationMs: number;
  generationCount: number;
  reconciliationState?: "provider_missing" | null;
  latestGeneration?: GenerationDto | null;
  selected?: boolean;
};

export type ProviderInfoDto = {
  name: "mock" | "cartesia";
  label: "Demo Provider" | "Cartesia";
  isDemo: boolean;
  showBranding: boolean;
  operationsEnabled: boolean;
  capabilities: {
    instantClone: boolean;
    multilingual: boolean;
  };
};

export type GenerationDto = {
  id: string;
  provider: "mock" | "cartesia";
  voiceId: string;
  voiceName: string;
  title: string | null;
  text: string;
  characterCount: number;
  language: string;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED" | "DELETING" | "DELETED";
  mimeType: string | null;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
  errorMessageSafe: string | null;
  audioUrl: string | null;
  audioAvailable: boolean;
};

export type UsageDto = {
  plan: "FREE" | "PRO";
  activeProvider: "mock" | "cartesia";
  periodKey: string;
  charactersUsed: number;
  demoCharactersUsed: number;
  characterLimit: number;
  voicesUsed: number;
  voiceLimit: number;
};
