export type VoiceProviderName = "mock" | "cartesia";

export type ProviderCapabilities = {
  instantClone: boolean;
  deletion: boolean;
  rename: boolean;
  multilingual: boolean;
  styles: readonly string[];
  outputFormats: readonly string[];
  cloneLanguages: readonly string[];
};

export type CloneVoiceInput = {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  name: string;
  description?: string;
  language: string;
};

export type CloneVoiceResult = {
  providerVoiceId: string;
  providerRequestId?: string;
  status: "READY" | "PROCESSING";
  metadata?: Record<string, string | number | boolean | null>;
};

export type SynthesizeInput = {
  providerVoiceId: string;
  text: string;
  language: string;
  model: string;
};

export type SynthesizeResult = {
  bytes: Uint8Array;
  mimeType: "audio/wav" | "audio/mpeg";
  durationMs?: number;
  providerRequestId?: string;
};

export interface VoiceProvider {
  readonly name: VoiceProviderName;
  readonly capabilities: ProviderCapabilities;
  cloneVoice(input: CloneVoiceInput): Promise<CloneVoiceResult>;
  synthesize(input: SynthesizeInput): Promise<SynthesizeResult>;
  deleteVoice(providerVoiceId: string): Promise<void>;
  updateVoice?(providerVoiceId: string, input: { name?: string; description?: string }): Promise<void>;
  getVoiceState?(providerVoiceId: string): Promise<"ready" | "missing">;
}
