const ipHits = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;
const MAX_HITS = 5;

export function checkRateLimit(ip: string): { allowed: boolean } {
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_HITS) {
    return { allowed: false };
  }

  entry.count++;
  return { allowed: true };
}
