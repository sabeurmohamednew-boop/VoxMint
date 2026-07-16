import "server-only";

import { Redis } from "@upstash/redis";
import { AppError } from "@/lib/api/response";
import { getEnv } from "@/lib/config/env";

export type RateLimitRule = { limit: number; windowSeconds: number };

interface RateLimiter {
  consume(key: string, rule: RateLimitRule): Promise<void>;
}

class MemoryRateLimiter implements RateLimiter {
  private readonly entries = new Map<string, { count: number; resetsAt: number }>();

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
}

class UpstashRateLimiter implements RateLimiter {
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
}

let limiter: RateLimiter | undefined;

export function getRateLimiter(): RateLimiter {
  if (!limiter) limiter = getEnv().RATE_LIMIT_PROVIDER === "upstash" ? new UpstashRateLimiter() : new MemoryRateLimiter();
  return limiter;
}

export const rateLimits = {
  clone: { limit: 3, windowSeconds: 60 * 60 },
  generate: { limit: 20, windowSeconds: 60 },
  mutation: { limit: 30, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;
