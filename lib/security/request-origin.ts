import { AppError } from "@/lib/api/response";
import { getEnv } from "@/lib/config/env";

export type OriginCheckInput = {
  requestOrigin: string | null;
  fetchSite: string | null;
  requestUrl: string;
  configuredAppUrl: string;
  nodeEnv: "development" | "test" | "production";
};

export function isAllowedMutationOrigin(input: OriginCheckInput): boolean {
  if (input.fetchSite && input.fetchSite !== "same-origin") return false;
  if (!input.requestOrigin) return false;
  let origin: string;
  let configuredOrigin: string;
  let requestUrlOrigin: string;
  try {
    origin = new URL(input.requestOrigin).origin;
    configuredOrigin = new URL(input.configuredAppUrl).origin;
    requestUrlOrigin = new URL(input.requestUrl).origin;
  } catch {
    return false;
  }
  const expected = input.nodeEnv === "production" ? configuredOrigin : requestUrlOrigin;
  return origin === expected;
}

export function assertSameOriginMutation(request: Request): void {
  const env = getEnv();
  if (!isAllowedMutationOrigin({
    requestOrigin: request.headers.get("origin"),
    fetchSite: request.headers.get("sec-fetch-site"),
    requestUrl: request.url,
    configuredAppUrl: env.NEXT_PUBLIC_APP_URL,
    nodeEnv: env.NODE_ENV,
  })) {
    throw new AppError("INVALID_REQUEST_ORIGIN", "This request must come from the VoxMint application.", 403);
  }
}

export function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}
