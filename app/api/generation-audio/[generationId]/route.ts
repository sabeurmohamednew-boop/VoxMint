import { AppError, apiError, requestId, unauthorized } from "@/lib/api/response";
import { downloadFileName } from "@/lib/audio/utils";
import { requireApiUser } from "@/lib/auth/session";
import { InvalidByteRangeError, parseByteRange } from "@/lib/http/byte-range";
import { getObjectStorage } from "@/lib/storage";
import { getGenerationAudio } from "@/server/services/generation-service";

export const runtime = "nodejs";

async function serveAudio(
  request: Request,
  context: RouteContext<"/api/generation-audio/[generationId]">,
  includeBody: boolean,
) {
  const id = requestId(request);
  const user = await requireApiUser();
  if (!user) return unauthorized(id);
  try {
    const { generationId } = await context.params;
    const generation = await getGenerationAudio(user.id, generationId);
    const storage = getObjectStorage();
    const exists = await storage.exists(generation.storageKey!);
    if (!exists) throw new AppError("AUDIO_MISSING", "This audio file is no longer available.", 404);
    const metadata = await storage.head(generation.storageKey!);
    let range;
    try {
      range = parseByteRange(request.headers.get("range"), metadata.size);
    } catch (error) {
      if (!(error instanceof InvalidByteRangeError)) throw error;
      return new Response(null, {
        status: 416,
        headers: {
          "accept-ranges": "bytes",
          "content-range": `bytes */${metadata.size}`,
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
          "x-request-id": id,
        },
      });
    }
    const url = new URL(request.url);
    const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
    const contentLength = range ? range.end - range.start + 1 : metadata.size;
    const headers: Record<string, string> = {
      "accept-ranges": "bytes",
      "content-type": metadata.contentType,
      "content-length": String(contentLength),
      "content-disposition": `${disposition}; filename="${downloadFileName(generation.voice.name, metadata.contentType, generation.createdAt)}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "x-request-id": id,
    };
    if (range) headers["content-range"] = `bytes ${range.start}-${range.end}/${metadata.size}`;
    if (!includeBody) return new Response(null, { status: range ? 206 : 200, headers });
    const object = await storage.open(generation.storageKey!, range ?? undefined);
    return new Response(object.body, { status: range ? 206 : 200, headers });
  } catch (error) {
    return apiError(error, id);
  }
}

export function GET(request: Request, context: RouteContext<"/api/generation-audio/[generationId]">) {
  return serveAudio(request, context, true);
}

export function HEAD(request: Request, context: RouteContext<"/api/generation-audio/[generationId]">) {
  return serveAudio(request, context, false);
}
