import { apiError, ok, requestId, unauthorized } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { deleteVoiceForUser, getVoiceForUser, updateVoiceForUser } from "@/server/services/voice-service";
import { assertSameOriginMutation, requestIp } from "@/lib/security/request-origin";
import { consumeMutationLimits } from "@/lib/rate-limit/rate-limiter";

export async function GET(request: Request, context: RouteContext<"/api/voices/[voiceId]">) {
  const id = requestId(request);
  const user = await requireApiUser();
  if (!user) return unauthorized(id);
  try {
    const { voiceId } = await context.params;
    return ok({ voice: await getVoiceForUser(user.id, voiceId) }, id);
  } catch (error) { return apiError(error, id); }
}

export async function PATCH(request: Request, context: RouteContext<"/api/voices/[voiceId]">) {
  const id = requestId(request);
  const user = await requireApiUser();
  if (!user) return unauthorized(id);
  try {
    assertSameOriginMutation(request);
    await consumeMutationLimits("voice-update", user.id, requestIp(request));
    const { voiceId } = await context.params;
    return ok({ voice: await updateVoiceForUser(user.id, voiceId, await request.json()) }, id);
  } catch (error) {
    return apiError(error, id);
  }
}

export async function DELETE(request: Request, context: RouteContext<"/api/voices/[voiceId]">) {
  const id = requestId(request);
  const user = await requireApiUser();
  if (!user) return unauthorized(id);
  try {
    assertSameOriginMutation(request);
    await consumeMutationLimits("voice-delete", user.id, requestIp(request));
    const { voiceId } = await context.params;
    await deleteVoiceForUser(user.id, voiceId);
    return new Response(null, { status: 204, headers: { "x-request-id": id } });
  } catch (error) {
    return apiError(error, id);
  }
}
