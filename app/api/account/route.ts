import { apiError, ok, requestId, unauthorized } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { deleteAccount, getAccount, updateAccount } from "@/server/services/account-service";

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
    await deleteAccount(user.id);
    return new Response(null, { status: 204, headers: { "x-request-id": id } });
  } catch (error) {
    return apiError(error, id);
  }
}
