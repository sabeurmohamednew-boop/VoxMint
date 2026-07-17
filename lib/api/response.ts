import { ZodError } from "zod";
import { logger } from "@/lib/logging/logger";

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly headers: Readonly<Record<string, string>> = {},
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function requestId(request: Request): string {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function apiError(error: unknown, id: string): Response {
  if (error instanceof ZodError) {
    logger.info("api.error", { requestId: id, category: "validation", status: 422 });
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: error.issues[0]?.message ?? "Invalid request.", requestId: id } },
      { status: 422, headers: { "x-request-id": id } },
    );
  }
  if (error instanceof AppError) {
    logger.info("api.error", { requestId: id, category: error.code, status: error.status });
    return Response.json(
      { error: { code: error.code, message: error.message, requestId: id } },
      { status: error.status, headers: { ...error.headers, "x-request-id": id } },
    );
  }
  logger.error("api.error", { requestId: id, category: error instanceof Error ? error.name : "unknown", status: 500 });
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Try again.", requestId: id } },
    { status: 500, headers: { "x-request-id": id } },
  );
}

export function unauthorized(id: string): Response {
  return Response.json(
    { error: { code: "UNAUTHORIZED", message: "Sign in to continue.", requestId: id } },
    { status: 401, headers: { "x-request-id": id } },
  );
}

export function ok<T>(data: T, id: string, init?: ResponseInit): Response {
  return Response.json(data, {
    ...init,
    headers: { ...init?.headers, "x-request-id": id },
  });
}
