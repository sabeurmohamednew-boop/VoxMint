import { apiError, ok, requestId, unauthorized } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { listVoices } from "@/server/services/voice-service";

export async function GET(request: Request) {
  const id = requestId(request);
  const user = await requireApiUser();
  if (!user) return unauthorized(id);
  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 50);
    return ok({ voices: await listVoices(user.id, Number.isFinite(limit) ? limit : 50) }, id);
  } catch (error) {
    return apiError(error, id);
  }
}
