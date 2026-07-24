const hits = new Map<string, { count: number; resetAt: number }>();
const MAX_KEYS = 1024;
let nextSweepAt = 0;

function getKey(ip: string, scope?: string): string {
  return scope ? `${scope}:${ip}` : ip;
}

export function checkRateLimit(ip: string, scope?: string): { allowed: boolean } {
  const key = getKey(ip, scope);
  const now = Date.now();
  if (now >= nextSweepAt || hits.size >= MAX_KEYS) {
    for (const [candidate, candidateEntry] of hits) {
      if (candidateEntry.resetAt <= now || hits.size > MAX_KEYS) hits.delete(candidate);
    }
    nextSweepAt = now + 60_000;
  }
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + 60_000 });
    return { allowed: true };
  }

  if (entry.count >= (scope === "login" ? 10 : 5)) {
    return { allowed: false };
  }

  entry.count++;
  return { allowed: true };
}
