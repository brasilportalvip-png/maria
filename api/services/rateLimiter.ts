interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetTime) {
    store.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, entry.resetTime - now),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetInMs: Math.max(0, entry.resetTime - now),
  };
}
