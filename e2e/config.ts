export const E2E_APP_ORIGIN = "http://localhost:3000";
export const E2E_GENERATION_RATE_LIMIT = 3;

export function sameOriginMutationHeaders() {
  return {
    origin: E2E_APP_ORIGIN,
    "sec-fetch-site": "same-origin",
  } as const;
}
