import { detectAudioSignature, signatureMatchesMime } from "@/lib/audio/signature";

type ErrorPayload = { error?: { message?: string } };

function fallbackMessage(status: number): string {
  if (status === 401) return "Sign in again to access this audio.";
  if (status === 403) return "You do not have access to this audio.";
  if (status === 404) return "This audio file is no longer available.";
  return "The audio could not be loaded. Try again.";
}

export async function readAudioResponse(response: Response): Promise<Blob> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    let message = fallbackMessage(response.status);
    if (contentType.includes("application/json")) {
      try {
        const payload = await response.json() as ErrorPayload;
        if (payload.error?.message) message = payload.error.message;
      } catch {
        // Keep the status-specific fallback.
      }
    }
    throw new Error(message);
  }
  if (contentType.includes("text/html") || contentType.includes("application/json")) {
    throw new Error("The server returned a page instead of audio. Refresh and try again.");
  }
  const blob = await response.blob();
  if (!blob.size) throw new Error("The server returned an empty audio file.");
  const signature = detectAudioSignature(new Uint8Array(await blob.slice(0, 16).arrayBuffer()));
  if (!signatureMatchesMime(signature, contentType || blob.type)) {
    throw new Error("The server returned invalid audio data.");
  }
  return blob;
}

export async function fetchAudio(url: string, download = false): Promise<Blob> {
  const response = await fetch(`${url}${download ? "?download=1" : ""}`, {
    credentials: "same-origin",
    headers: { accept: "audio/wav,audio/mpeg,audio/*" },
  });
  return readAudioResponse(response);
}

export async function downloadAudio(url: string, fallbackName: string): Promise<void> {
  const response = await fetch(`${url}?download=1`, {
    credentials: "same-origin",
    headers: { accept: "audio/wav,audio/mpeg,audio/*" },
  });
  const blob = await readAudioResponse(response);
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = /filename="([^"]+)"/i.exec(disposition)?.[1] ?? fallbackName;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
