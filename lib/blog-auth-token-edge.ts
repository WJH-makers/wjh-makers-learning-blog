/**
 * lib/blog-auth-token.ts 的 Edge Runtime 对应实现。
 *
 * proxy.ts 跑在 Edge Runtime,拿不到 node:crypto 的 createHmac 和 Buffer,因此同一个
 * 会话派生必须用 Web Crypto 重算一遍。两份实现**必须逐字节等价** —— 一旦失配,合法
 * 管理员的 POST /write 会在 proxy 层被静默拦成 404,页面侧没有任何报错。
 * tests/blog-auth.test.ts 里有交叉断言把这个不变式钉死,改任何一边都会红。
 *
 * 本文件只允许使用 Web 标准 API(crypto.subtle / TextEncoder / btoa),
 * 引入任何 node: 前缀的模块都会让 proxy.ts 在 Edge Runtime 下构建失败 ——
 * 所以过期时长在这里是**独立的字面量**,不能 import lib/cache-policy.ts
 * (那个模块本身零依赖、技术上可 import,但让 Edge 侧只依赖 Web API 是刻意的边界)。
 * 两处数值由 tests/blog-auth.test.ts 断言一致。
 */

export const BLOG_SESSION_VERSION = "v3";
const MESSAGE_PREFIX = `blog-admin-session:${BLOG_SESSION_VERSION}:`;

/** 必须等于 lib/cache-policy.ts 的 ADMIN_SESSION_MAX_AGE_SECONDS（30 天）。 */
export const EDGE_ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

async function macEdge(secret: string, expiresAt: number): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${MESSAGE_PREFIX}${expiresAt}`));

  const bytes = new Uint8Array(sig);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function blogSessionTokenEdge(secret: string, now: number = Date.now()): Promise<string> {
  const expiresAt = Math.floor(now / 1000) + EDGE_ADMIN_SESSION_MAX_AGE_SECONDS;
  return `${BLOG_SESSION_VERSION}.${expiresAt}.${await macEdge(secret, expiresAt)}`;
}

/** 与 node 侧 verifyBlogSessionToken 同语义:先判时效再恒时比对 MAC。 */
export async function verifyBlogSessionTokenEdge(
  token: string,
  secret: string,
  now: number = Date.now(),
): Promise<boolean> {
  if (!secret || !token) return false;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== BLOG_SESSION_VERSION) return false;
  if (!/^\d+$/.test(parts[1])) return false;

  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt * 1000 <= now) return false;

  return safeCompareEdge(parts[2], await macEdge(secret, expiresAt));
}

/** 定长比较,避免按字符提前返回泄漏前缀信息。lib/safe-compare 那份依赖 Buffer,Edge 用不了。 */
export function safeCompareEdge(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ua = enc.encode(a);
  const ub = enc.encode(b);
  if (ua.length !== ub.length) return false;
  let r = 0;
  for (let i = 0; i < ua.length; i++) r |= ua[i] ^ ub[i];
  return r === 0;
}
