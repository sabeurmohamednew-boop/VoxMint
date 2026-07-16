import { apiError, requestId, unauthorized } from "@/lib/api/response";
import { downloadFileName } from "@/lib/audio/utils";
import { requireApiUser } from "@/lib/auth/session";
import { getObjectStorage } from "@/lib/storage";
import { getGenerationAudio } from "@/server/services/generation-service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: RouteContext<"/api/generations/[generationId]/audio">,
) {
  const id = requestId(request);
  const user = await requireApiUser();
  if (!user) return unauthorized(id);
  try {
    const { generationId } = await context.params;
    const generation = await getGenerationAudio(user.id, generationId);
    const storage = getObjectStorage();
    const signedUrl = await storage.getSignedReadUrl(generation.storageKey!, 60);
    if (signedUrl) {
      return Response.redirect(signedUrl, 302);
    }
    const object = await storage.get(generation.storageKey!);
    const url = new URL(request.url);
    const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
    const body = object.bytes.buffer.slice(
      object.bytes.byteOffset,
      object.bytes.byteOffset + object.bytes.byteLength,
    ) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "content-type": object.contentType,
        "content-length": String(object.bytes.byteLength),
        "content-disposition": `${disposition}; filename="${downloadFileName(generation.voice.name)}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "x-request-id": id,
      },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
