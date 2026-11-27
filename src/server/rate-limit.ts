// Best-effort per-IP limit for order placement. On Vercel each instance keeps
// its own window, which is enough to stop accidental double submits and
// simple scripted spam; a shared limiter can replace it later if needed.

const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}
