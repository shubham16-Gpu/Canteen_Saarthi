/**
 * Sliding-window rate limiter for OTP requests.
 *
 * Defaults: max 5 requests per identifier per 60 minutes.
 * In-memory (single-process). For multi-instance deployments swap the
 * `store` Map with a Redis-backed implementation — interface stays the same.
 */

interface Window {
  timestamps: number[];
}

const store: Map<string, Window> = new Map();

const MAX_REQUESTS = parseInt(process.env.OTP_RATE_LIMIT_MAX || '5', 10);
const WINDOW_MS = parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MS || `${60 * 60 * 1000}`, 10);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkOtpRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const win = store.get(identifier) || { timestamps: [] };

  // drop timestamps outside the window
  win.timestamps = win.timestamps.filter((t) => now - t < WINDOW_MS);

  if (win.timestamps.length >= MAX_REQUESTS) {
    const oldest = win.timestamps[0]!;
    const retryAfter = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds: retryAfter };
  }

  win.timestamps.push(now);
  store.set(identifier, win);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - win.timestamps.length,
    retryAfterSeconds: 0,
  };
}

// periodic cleanup so the map doesn't grow unbounded
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of store.entries()) {
    win.timestamps = win.timestamps.filter((t) => now - t < WINDOW_MS);
    if (win.timestamps.length === 0) store.delete(key);
  }
}, 5 * 60 * 1000).unref?.();
