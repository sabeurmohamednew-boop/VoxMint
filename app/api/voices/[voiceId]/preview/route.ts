import { apiError, ok, requestId, unauthorized } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { generateForUser } from "@/server/services/generation-service";

export async function POST(request: Request, context: RouteContext<"/api/voices/[voiceId]/preview">) {
  const id = requestId(request);
  const user = await requireApiUser();
  if (!user) return unauthorized(id);
  try {
    const { voiceId } = await context.params;
    const generation = await generateForUser(user.id, {
      voiceId,
      text: "Hello from VoxMint. Your voice is ready for a new script.",
      language: "en",
      style: "normal",
      idempotencyKey: `preview_${crypto.randomUUID()}`,
    });
    return ok({ generation }, id, { status: 201 });
  } catch (error) {
    return apiError(error, id);
  }
}
