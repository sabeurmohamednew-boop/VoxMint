import "server-only";

import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { AppError } from "@/lib/api/response";
import { getEnv } from "@/lib/config/env";

export type RateLimitRule = { limit: number; windowSeconds: number };

export interface RateLimiter {
  consume(key: string, rule: RateLimitRule): Promise<void>;
  acquire(key: string, limit: number, ttlSeconds: number): Promise<() => Promise<void>>;
}

export function safeRateLimitIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function rateLimitError(retryAfterSeconds: number): AppError {
  return new AppError(
    "RATE_LIMITED",
    "Too many requests. Try again shortly.",
    429,
    { "retry-after": String(Math.max(1, Math.ceil(retryAfterSeconds))) },
  );
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly entries = new Map<string, { count: number; resetsAt: number }>();
  private readonly concurrent = new Map<string, number>();

  async consume(key: string, rule: RateLimitRule) {
    const now = Date.now();
    const current = this.entries.get(key);
    if (!current || current.resetsAt <= now) {
      this.entries.set(key, { count: 1, resetsAt: now + rule.windowSeconds * 1000 });
      return;
    }
    if (current.count >= rule.limit) {
      throw rateLimitError((current.resetsAt - now) / 1000);
    }
    current.count += 1;
  }

  async acquire(key: string, limit: number, ttlSeconds: number) {
    void ttlSeconds;
    const count = this.concurrent.get(key) ?? 0;
    if (count >= limit) throw new AppError("PROVIDER_CONCURRENCY_LIMIT", "Another voice operation is already in progress.", 409);
    this.concurrent.set(key, count + 1);
    let released = false;
    return async () => {
      if (released) return;
      released = true;
      const current = this.concurrent.get(key) ?? 1;
      if (current <= 1) this.concurrent.delete(key);
      else this.concurrent.set(key, current - 1);
    };
  }
}

export class UpstashRateLimiter implements RateLimiter {
  private readonly redis: Redis;

  constructor() {
    const env = getEnv();
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error("Upstash rate-limit configuration is incomplete.");
    }
    this.redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });
  }

  async consume(key: string, rule: RateLimitRule) {
    const bucket = `voxmint:rate:${key}:${Math.floor(Date.now() / (rule.windowSeconds * 1000))}`;
    const count = await this.redis.incr(bucket);
    if (count === 1) await this.redis.expire(bucket, rule.windowSeconds + 1);
    if (count > rule.limit) {
      const elapsedInWindow = Math.floor(Date.now() / 1000) % rule.windowSeconds;
      throw rateLimitError(rule.windowSeconds - elapsedInWindow);
    }
  }


  async acquire(key: string, limit: number, ttlSeconds: number) {
    const bucket = `voxmint:concurrency:${key}`;
    const count = await this.redis.incr(bucket);
    if (count === 1) await this.redis.expire(bucket, ttlSeconds);
    if (count > limit) {
      await this.redis.decr(bucket);
      throw new AppError("PROVIDER_CONCURRENCY_LIMIT", "Another voice operation is already in progress.", 409);
    }
    let released = false;
    return async () => {
      if (released) return;
      released = true;
      await this.redis.decr(bucket);
    };
  }
}

let limiter: RateLimiter | undefined;

export function getRateLimiter(): RateLimiter {
  if (!limiter) limiter = getEnv().RATE_LIMIT_PROVIDER === "upstash" ? new UpstashRateLimiter() : new MemoryRateLimiter();
  return limiter;
}

export function configuredRateLimits() {
  const env = getEnv();
  return {
  clone: { limit: env.VOICE_CREATIONS_PER_HOUR, windowSeconds: 60 * 60 },
  generate: { limit: env.GENERATIONS_PER_MINUTE, windowSeconds: 60 },
  download: { limit: env.DOWNLOADS_PER_MINUTE, windowSeconds: 60 },
  mutation: { limit: 30, windowSeconds: 60 },
  } satisfies Record<string, RateLimitRule>;
}

export async function consumeOperationLimits(
  operation: "clone" | "generate" | "download",
  userId: string,
  ip: string,
  options: { e2eGenerationLimit?: number } = {},
): Promise<void> {
  const env = getEnv();
  const e2eGenerationLimit = options.e2eGenerationLimit;
  if (
    e2eGenerationLimit !== undefined &&
    (
      operation !== "generate" ||
      env.NODE_ENV !== "test" ||
      !env.E2E_TEST_AUTH ||
      env.E2E_GENERATIONS_PER_MINUTE !== e2eGenerationLimit
    )
  ) {
    throw new Error("The E2E generation rate-limit override is unavailable.");
  }
  const limiter = getRateLimiter();
  const configuredRule = configuredRateLimits()[operation];
  const rule = e2eGenerationLimit === undefined
    ? configuredRule
    : { ...configuredRule, limit: e2eGenerationLimit };
  const keyPrefix = e2eGenerationLimit === undefined ? operation : `${operation}:e2e-probe`;
  await Promise.all([
    limiter.consume(`${keyPrefix}:user:${safeRateLimitIdentifier(userId)}`, rule),
    limiter.consume(`${keyPrefix}:ip:${safeRateLimitIdentifier(ip)}`, rule),
  ]);
}

export async function consumeMutationLimits(
  operation: string,
  userId: string,
  ip: string,
): Promise<void> {
  const rule = configuredRateLimits().mutation;
  const rateLimiter = getRateLimiter();
  await Promise.all([
    rateLimiter.consume(`mutation:${operation}:user:${safeRateLimitIdentifier(userId)}`, rule),
    rateLimiter.consume(`mutation:${operation}:ip:${safeRateLimitIdentifier(ip)}`, rule),
  ]);
}

export function assertVoiceOperationsEnabled(): void {
  if (!getEnv().VOICE_OPERATIONS_ENABLED) {
    throw new AppError("VOICE_OPERATIONS_DISABLED", "New voice operations are temporarily paused. Existing audio remains available.", 503);
  }
}

export async function withProviderConcurrency<T>(userId: string, operation: () => Promise<T>): Promise<T> {
  const env = getEnv();
  const release = await getRateLimiter().acquire(`provider:user:${safeRateLimitIdentifier(userId)}`, env.MAX_CONCURRENT_PROVIDER_REQUESTS, 120);
  try {
    return await operation();
  } finally {
    await release();
  }
}
