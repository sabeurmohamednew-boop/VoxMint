export type PutObjectInput = {
  key: string;
  bytes: Uint8Array;
  contentType: string;
  metadata?: Record<string, string>;
};

export type StoredObject = { key: string; size: number; contentType: string; etag?: string; createdAt?: Date };
export type ObjectByteRange = { start: number; end: number };
export type StoredObjectMetadata = { size: number; contentType: string; etag?: string; createdAt?: Date; metadata?: Record<string, string> };
export type StoredObjectStream = StoredObjectMetadata & {
  body: ReadableStream<Uint8Array>;
};

export interface ObjectStorage {
  put(input: PutObjectInput): Promise<StoredObject>;
  head(key: string): Promise<StoredObjectMetadata>;
  open(key: string, range?: ObjectByteRange): Promise<StoredObjectStream>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
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
