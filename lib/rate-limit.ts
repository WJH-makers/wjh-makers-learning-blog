const hits = new Map<string, { count: number; resetAt: number }>();

// 注意：内存 Map 在 Vercel Serverless 冷启动时会被重置。
// 自托管 Docker 部署下此限流持续有效；Serverless 场景如需可靠限流，
// 建议迁移至 Vercel KV 或 Upstash Redis。
// 当前实现对 Docker 部署和低频 Serverless 调用仍然有效。

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
