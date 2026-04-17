import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

// Vercel's Upstash integration provisions KV_REST_API_URL / KV_REST_API_TOKEN.
// We wire them explicitly rather than relying on Redis.fromEnv()'s default
// UPSTASH_* prefixes.
const redis =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      })
    : null;

function makeLimiter(tokens: number, window: "1 h" | "1 m") {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: false,
    prefix: "pubscrawl",
  });
}

export const uploadLimiter = makeLimiter(5, "1 h");
export const updateLimiter = makeLimiter(30, "1 h");

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
