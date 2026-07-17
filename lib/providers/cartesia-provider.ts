import "server-only";

import Cartesia, { toFile } from "@cartesia/cartesia-js";
import { getEnv } from "@/lib/config/env";
import { SUPPORTED_LANGUAGE_CODES } from "@/lib/languages";
import {
  ProviderAuthenticationError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  ProviderUnknownError,
  ProviderValidationError,
} from "@/lib/providers/errors";
import type { VoiceProvider } from "@/lib/providers/voice-provider";

function mapCartesiaError(error: unknown): never {
  if (error instanceof Cartesia.APIConnectionTimeoutError) throw new ProviderTimeoutError(error.message);
  if (error instanceof Cartesia.APIError) {
    if (error.status === 401 || error.status === 403) throw new ProviderAuthenticationError(error.message);
    if (error.status === 429) throw new ProviderRateLimitError(error.message);
    if (error.status === 400 || error.status === 422) throw new ProviderValidationError(error.message);
    if (error.status && error.status >= 500) throw new ProviderUnavailableError(error.message);
  }
  throw new ProviderUnknownError(error instanceof Error ? error.message : "Unknown Cartesia error");
}

export class CartesiaVoiceProvider implements VoiceProvider {
  readonly name = "cartesia";
  readonly capabilities = {
    instantClone: true,
    deletion: true,
    rename: true,
    multilingual: true,
    styles: ["normal"],
    outputFormats: ["wav", "mp3"],
    cloneLanguages: SUPPORTED_LANGUAGE_CODES,
  } as const;
  private readonly client: Cartesia;
  private readonly model: string;

  constructor() {
    const env = getEnv();
    if (!env.CARTESIA_API_KEY) throw new ProviderAuthenticationError("CARTESIA_API_KEY is missing.");
    this.model = env.CARTESIA_TTS_MODEL;
    this.client = new Cartesia({
      apiKey: env.CARTESIA_API_KEY,
      timeout: 30_000,
      maxRetries: 1,
      defaultHeaders: { "Cartesia-Version": env.CARTESIA_API_VERSION },
    });
  }

  async cloneVoice(input: Parameters<VoiceProvider["cloneVoice"]>[0]) {
    try {
      const metadata = await this.client.voices.clone({
        clip: await toFile(input.bytes, input.fileName, { type: input.mimeType }),
        name: input.name,
        description: input.description,
        language: input.language,
      });
      return {
        providerVoiceId: metadata.id,
        status: "READY" as const,
        metadata: { createdAt: metadata.created_at, language: metadata.language },
      };
    } catch (error) {
      return mapCartesiaError(error);
    }
  }

  async synthesize(input: Parameters<VoiceProvider["synthesize"]>[0]) {
    try {
      const response = await this.client.tts.generate({
        model_id: input.model || this.model,
        transcript: input.text,
        language: input.language,
        voice: { mode: "id", id: input.providerVoiceId },
        output_format: { container: "wav", encoding: "pcm_s16le", sample_rate: 44_100 },
      });
      return {
        bytes: new Uint8Array(await response.arrayBuffer()),
        mimeType: "audio/wav" as const,
        providerRequestId: response.headers.get("x-request-id") ?? undefined,
      };
    } catch (error) {
      return mapCartesiaError(error);
    }
  }

  async deleteVoice(providerVoiceId: string) {
    try {
      await this.client.voices.delete(providerVoiceId);
    } catch (error) {
      if (error instanceof Cartesia.APIError && error.status === 404) return;
      return mapCartesiaError(error);
    }
  }

  async updateVoice(providerVoiceId: string, input: { name?: string; description?: string }) {
    try {
      await this.client.voices.update(providerVoiceId, input);
    } catch (error) {
      return mapCartesiaError(error);
    }
  }

  async getVoiceState(providerVoiceId: string) {
    try {
      await this.client.voices.get(providerVoiceId);
      return "ready" as const;
    } catch (error) {
      if (error instanceof Cartesia.APIError && error.status === 404) return "missing" as const;
      return mapCartesiaError(error);
    }
  }
}
