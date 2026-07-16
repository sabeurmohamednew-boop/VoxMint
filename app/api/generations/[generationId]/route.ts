import { apiError, requestId, unauthorized } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { deleteGenerationForUser, renameGenerationForUser } from "@/server/services/generation-service";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/generations/[generationId]">,
) {
  const id = requestId(request);
  const user = await requireApiUser();
  if (!user) return unauthorized(id);
  try {
    const { generationId } = await context.params;
    const body = (await request.json()) as { title?: unknown };
    const generation = await renameGenerationForUser(user.id, generationId, body.title);
    return Response.json({ generation }, { headers: { "x-request-id": id } });
  } catch (error) {
    return apiError(error, id);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/generations/[generationId]">,
) {
  const id = requestId(request);
  const user = await requireApiUser();
  if (!user) return unauthorized(id);
  try {
    const { generationId } = await context.params;
    await deleteGenerationForUser(user.id, generationId);
    return new Response(null, { status: 204, headers: { "x-request-id": id } });
  } catch (error) {
    return apiError(error, id);
  }
}
