import { apiError, ok, requestId, unauthorized } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { generateForUser, listGenerations, parseGenerationTestFailureMode } from "@/server/services/generation-service";
import { assertSameOriginMutation, requestIp } from "@/lib/security/request-origin";
import { isE2eTestAuthEnabled } from "@/lib/config/env";

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
    assertSameOriginMutation(request);
    const failureMode = isE2eTestAuthEnabled()
      ? parseGenerationTestFailureMode(request.headers.get("x-e2e-failure"))
      : null;
    return ok({ generation: await generateForUser(user.id, await request.json(), requestIp(request), id, failureMode) }, id, { status: 201 });
  } catch (error) {
    return apiError(error, id);
  }
}
