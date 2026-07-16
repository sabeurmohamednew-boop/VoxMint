import { apiError, ok, requestId, unauthorized } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { generateForUser, listGenerations } from "@/server/services/generation-service";

export async function GET(request: Request) {
  const id = requestId(request);
  const user = await requireApiUser();
  if (!user) return unauthorized(id);
  try {
    return ok({ generations: await listGenerations(user.id) }, id);
  } catch (error) {
    return apiError(error, id);
  }
}

export async function POST(request: Request) {
  const id = requestId(request);
  const user = await requireApiUser();
  if (!user) return unauthorized(id);
  try {
    return ok({ generation: await generateForUser(user.id, await request.json()) }, id, { status: 201 });
  } catch (error) {
    return apiError(error, id);
  }
}
