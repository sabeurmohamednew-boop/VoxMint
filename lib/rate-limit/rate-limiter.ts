import "server-only";

import { Redis } from "@upstash/redis";
import { AppError } from "@/lib/api/response";
import { getEnv } from "@/lib/config/env";

export type RateLimitRule = { limit: number; windowSeconds: number };

export interface RateLimiter {
  consume(key: string, rule: RateLimitRule): Promise<void>;
  acquire(key: string, limit: number, ttlSeconds: number): Promise<() => Promise<void>>;
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
      throw new AppError("RATE_LIMITED", "Too many requests. Try again shortly.", 429);
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
    if (count > rule.limit) throw new AppError("RATE_LIMITED", "Too many requests. Try again shortly.", 429);
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
): Promise<void> {
  const limiter = getRateLimiter();
  const rule = configuredRateLimits()[operation];
  await Promise.all([
    limiter.consume(`${operation}:user:${userId}`, rule),
    limiter.consume(`${operation}:ip:${ip}`, rule),
  ]);
}

export function assertVoiceOperationsEnabled(): void {
  if (!getEnv().VOICE_OPERATIONS_ENABLED) {
    throw new AppError("VOICE_OPERATIONS_DISABLED", "New voice operations are temporarily paused. Existing audio remains available.", 503);
  }
}

export async function withProviderConcurrency<T>(userId: string, operation: () => Promise<T>): Promise<T> {
  const env = getEnv();
  const release = await getRateLimiter().acquire(`provider:user:${userId}`, env.MAX_CONCURRENT_PROVIDER_REQUESTS, 120);
  try {
    return await operation();
  } finally {
    await release();
  }
}
