const hits = new Map<string, { count: number; resetAt: number }>();

function getKey(ip: string, scope?: string): string {
  return scope ? `${scope}:${ip}` : ip;
}

export function checkRateLimit(ip: string, scope?: string): { allowed: boolean } {
  const key = getKey(ip, scope);
  const now = Date.now();
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
