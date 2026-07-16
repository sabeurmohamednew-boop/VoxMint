import { createHash } from "node:crypto";
import { apiError, ok, requestId, unauthorized, AppError } from "@/lib/api/response";
import { validateAudioFile } from "@/lib/audio/validation";
import { requireApiUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/config/env";
import { cloneMetadataSchema } from "@/lib/validation/schemas";
import { cloneVoiceForUser } from "@/server/services/voice-service";
import { assertSameOriginMutation, requestIp } from "@/lib/security/request-origin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const id = requestId(request);
  const user = await requireApiUser();
  if (!user) return unauthorized(id);
  try {
    assertSameOriginMutation(request);
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > getEnv().VOICE_SAMPLE_MAX_BYTES + 64 * 1024) {
      throw new AppError("PAYLOAD_TOO_LARGE", "The upload is too large.", 413);
    }
    const form = await request.formData();
    const file = form.get("sample");
    if (!(file instanceof File)) throw new AppError("MISSING_SAMPLE", "Choose an audio sample.", 422);
    const metadata = cloneMetadataSchema.parse({
      name: form.get("name"),
      description: form.get("description") ?? "",
      language: form.get("language"),
      consent: form.get("consent"),
    });
    const audio = await validateAudioFile(file);
    const userAgent = request.headers.get("user-agent");
    const userAgentHash = userAgent
      ? createHash("sha256").update(userAgent).digest("hex").slice(0, 32)
      : undefined;
    const voice = await cloneVoiceForUser({
      userId: user.id,
      name: metadata.name,
      description: metadata.description || undefined,
      language: metadata.language,
      audio,
      userAgentHash,
      requestIp: requestIp(request),
      idempotencyKey: request.headers.get("idempotency-key") ?? undefined,
      requestId: id,
    });
    return ok({ voice }, id, { status: 201 });
  } catch (error) {
    return apiError(error, id);
  }
}
