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

export async function diagnoseAudioPlaybackFailure(
  url: string,
  mediaErrorCode?: number,
): Promise<string> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      credentials: "same-origin",
      headers: { accept: "audio/wav,audio/mpeg,audio/*" },
      cache: "no-store",
    });
    if (response.status === 401) return "Your session expired. Sign in again, then retry playback.";
    if (response.status === 403) return "You no longer have permission to play this stored audio.";
    if (response.status === 404) return "The generation succeeded, but its stored audio is no longer available.";
    if (response.status >= 500) return "The generation succeeded, but stored audio is temporarily unavailable. Retry playback shortly.";
    if (!response.ok) return fallbackMessage(response.status);

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("audio/")) {
      return "The stored file is not a supported audio format. The generation record is still available.";
    }
    if (mediaErrorCode === 2) {
      return "Playback was interrupted by the network. The stored generation is still available; retry playback.";
    }
    if (
      mediaErrorCode === 3 ||
      mediaErrorCode === 4
    ) {
      return "This browser could not decode the stored audio format. Download remains available if validation succeeds.";
    }
    return "Playback was interrupted. The generation succeeded; retry playback or use Download.";
  } catch {
    return "Playback could not reach the audio service because of a network interruption. The generation itself was not changed.";
  }
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
