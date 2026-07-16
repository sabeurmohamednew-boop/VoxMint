import { apiError, ok, requestId, unauthorized } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { deleteAccount, getAccount, updateAccount } from "@/server/services/account-service";
import { AppError } from "@/lib/api/response";
import { getPublicOperationsInfo } from "@/lib/config/env";
import { assertSameOriginMutation } from "@/lib/security/request-origin";

export async function GET(request: Request) {
  const id = requestId(request);
  const user = await requireApiUser();
  if (!user) return unauthorized(id);
  try {
    return ok({ account: await getAccount(user.id) }, id);
  } catch (error) {
    return apiError(error, id);
  }
}

export async function PATCH(request: Request) {
  const id = requestId(request);
  const user = await requireApiUser();
  if (!user) return unauthorized(id);
  try {
    assertSameOriginMutation(request);
    return ok({ account: await updateAccount(user.id, await request.json()) }, id);
  } catch (error) {
    return apiError(error, id);
  }
}

export async function DELETE(request: Request) {
  const id = requestId(request);
  const user = await requireApiUser();
  if (!user) return unauthorized(id);
  try {
    assertSameOriginMutation(request);
    if (getPublicOperationsInfo().developmentSession) {
      throw new AppError("DEMO_ACCOUNT_DELETE_DISABLED", "Account deletion is disabled for the development session.", 409);
    }
    const body = await request.json().catch(() => ({})) as { confirmation?: unknown };
    if (body.confirmation !== "DELETE MY ACCOUNT") {
      throw new AppError("CONFIRMATION_REQUIRED", "Type DELETE MY ACCOUNT to confirm.", 422);
    }
    await deleteAccount(user.id);
    return new Response(null, { status: 204, headers: { "x-request-id": id } });
  } catch (error) {
    return apiError(error, id);
  }
}
