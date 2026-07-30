const hits = new Map<string, { count: number; resetAt: number }>();

// 注意：内存 Map 在 Vercel Serverless 冷启动时会被重置。
// 自托管 Docker 部署下此限流持续有效；Serverless 场景如需可靠限流，
// 建议迁移至 Vercel KV 或 Upstash Redis。
// 当前实现对 Docker 部署和低频 Serverless 调用仍然有效。

// 512m 容器里长驻进程不能让这张表无限长:每个来过的 IP 都会留一条永不回收的记录。
// 惰性清扫 —— 表超过阈值时顺手扔掉所有已过期条目;仍超阈值就按 resetAt 最早的批量淘汰。
const MAX_ENTRIES = 10_000;

function sweep(now: number): void {
  for (const [key, entry] of hits) {
    if (now > entry.resetAt) hits.delete(key);
  }
  if (hits.size <= MAX_ENTRIES) return;
  const victims = [...hits.entries()]
    .sort((a, b) => a[1].resetAt - b[1].resetAt)
    .slice(0, hits.size - MAX_ENTRIES);
  for (const [key] of victims) hits.delete(key);
}

function getKey(ip: string, scope?: string): string {
  return scope ? `${scope}:${ip}` : ip;
}

export function checkRateLimit(ip: string, scope?: string): { allowed: boolean } {
  const key = getKey(ip, scope);
  const now = Date.now();
  if (hits.size >= MAX_ENTRIES) sweep(now);
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + 60_000 });
    return { allowed: true };
  }

  const limit = scope === "login" ? 10 : scope === "java-run" ? 12 : 5;
  if (entry.count >= limit) {
    return { allowed: false };
  }

  entry.count++;
  return { allowed: true };
}
