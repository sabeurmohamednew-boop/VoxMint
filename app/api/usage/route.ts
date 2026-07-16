import { apiError, ok, requestId, unauthorized } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { getUsage } from "@/server/services/usage-service";

export async function GET(request: Request) {
  const id = requestId(request);
  const user = await requireApiUser();
  if (!user) return unauthorized(id);
  try {
    return ok({ usage: await getUsage(user.id) }, id);
  } catch (error) {
    return apiError(error, id);
  }
}
