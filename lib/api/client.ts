type ErrorPayload = { error?: { message?: string; code?: string } };

export class ClientApiError extends Error {
  constructor(message: string, public readonly code = "REQUEST_FAILED") {
    super(message);
    this.name = "ClientApiError";
  }
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    let payload: ErrorPayload = {};
    try {
      payload = (await response.json()) as ErrorPayload;
    } catch {
      // The generic fallback below is intentionally used for non-JSON errors.
    }
    throw new ClientApiError(payload.error?.message ?? "The request could not be completed.", payload.error?.code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
