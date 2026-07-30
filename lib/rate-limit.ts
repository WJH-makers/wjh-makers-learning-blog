const hits = new Map<string, { count: number; resetAt: number }>();

// 这是单实例自托管的第二道限流；边界代理仍应负责连接数、请求体和 IP 级限流。
// 多实例部署时须改为共享存储，不能把这一张内存表当作全局防护。

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

  if (entry.count >= (scope === "login" ? 10 : 5)) {
    return { allowed: false };
  }

  entry.count++;
  return { allowed: true };
}
