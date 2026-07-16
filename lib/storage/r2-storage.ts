import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getEnv } from "@/lib/config/env";
import type { ObjectByteRange, ObjectStorage, PutObjectInput } from "@/lib/storage/object-storage";

export class R2ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const env = getEnv();
    if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET || !env.R2_ENDPOINT) {
      throw new Error("R2 storage configuration is incomplete.");
    }
    this.bucket = env.R2_BUCKET;
    this.client = new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  async put(input: PutObjectInput) {
    const response = await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.bytes,
        ContentType: input.contentType,
        Metadata: input.metadata,
      }),
    );
    return { key: input.key, size: input.bytes.byteLength, contentType: input.contentType, etag: response.ETag, createdAt: new Date() };
  }

  async head(key: string) {
    const response = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    return {
      size: Number(response.ContentLength ?? 0),
      contentType: response.ContentType ?? "application/octet-stream",
      etag: response.ETag,
      createdAt: response.LastModified,
      metadata: response.Metadata,
    };
  }

  async open(key: string, range?: ObjectByteRange) {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Range: range ? `bytes=${range.start}-${range.end}` : undefined,
    }));
    if (!response.Body) throw new Error("Stored object has no body.");
    return {
      body: response.Body.transformToWebStream(),
      size: Number(response.ContentLength ?? 0),
      contentType: response.ContentType ?? "application/octet-stream",
      etag: response.ETag,
      createdAt: response.LastModified,
      metadata: response.Metadata,
    };
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}
