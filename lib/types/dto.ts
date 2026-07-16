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
  selected?: boolean;
};

export type ProviderInfoDto = {
  name: "mock" | "cartesia";
  label: "Demo Provider" | "Cartesia";
  isDemo: boolean;
  capabilities: {
    instantClone: boolean;
    multilingual: boolean;
  };
};

export type GenerationDto = {
  id: string;
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
};

export type UsageDto = {
  plan: "FREE" | "PRO";
  periodKey: string;
  charactersUsed: number;
  characterLimit: number;
  voicesUsed: number;
  voiceLimit: number;
};
