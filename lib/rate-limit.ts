const hits = new Map<string, { count: number; resetAt: number }>();

// 从可信反代注入的头提取客户端 IP。不直接用整个 X-Forwarded-For:
// 客户端可预置伪造的最左段,每次换一个即绕过限流;真实 IP 由反代追加在最右(或走 CF/Real-IP)。
export function clientIp(h: Headers): string {
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    return parts[parts.length - 1] || "unknown";
  }
  return "unknown";
}

function getKey(ip: string, scope?: string): string {
  return scope ? `${scope}:${ip}` : ip;
}

export function checkRateLimit(ip: string, scope?: string): { allowed: boolean } {
  const key = getKey(ip, scope);
  const now = Date.now();

  // 惰性清理过期项,避免 Map 无限增长(内存缓慢泄漏)。
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (now > v.resetAt) hits.delete(k);
    }
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
