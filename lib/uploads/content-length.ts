import { AppError } from "@/lib/api/response";

export const MULTIPART_OVERHEAD_ALLOWANCE = 64 * 1024;

export function assertUploadContentLength(
  headerValue: string | null,
  maximumFileBytes: number,
): void {
  if (!headerValue) {
    throw new AppError(
      "CONTENT_LENGTH_REQUIRED",
      "The upload size could not be verified. Choose the file again and retry.",
      411,
    );
  }

  const declaredLength = Number(headerValue);
  if (!Number.isSafeInteger(declaredLength) || declaredLength <= 0) {
    throw new AppError("INVALID_CONTENT_LENGTH", "The upload size is invalid.", 400);
  }
  if (declaredLength > maximumFileBytes + MULTIPART_OVERHEAD_ALLOWANCE) {
    throw new AppError("PAYLOAD_TOO_LARGE", "The upload is too large.", 413);
  }
}
