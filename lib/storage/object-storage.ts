export type PutObjectInput = {
  key: string;
  bytes: Uint8Array;
  contentType: string;
  metadata?: Record<string, string>;
};

export type StoredObject = { key: string; size: number; contentType: string };

export interface ObjectStorage {
  put(input: PutObjectInput): Promise<StoredObject>;
  get(key: string): Promise<{ bytes: Uint8Array; contentType: string }>;
  getSignedReadUrl(key: string, expiresInSeconds: number): Promise<string | null>;
  delete(key: string): Promise<void>;
  exists?(key: string): Promise<boolean>;
}

export function generationStorageKey(
  userId: string,
  generationId: string,
  extension: string,
): string {
  const safe = /^[a-zA-Z0-9_-]+$/;
  if (!safe.test(userId) || !safe.test(generationId) || !/^[a-z0-9]+$/.test(extension)) {
    throw new Error("Unsafe storage key segment.");
  }
  return `users/${userId}/generations/${generationId}/audio.${extension}`;
}
