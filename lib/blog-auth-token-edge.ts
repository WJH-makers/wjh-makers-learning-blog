/**
 * lib/blog-auth-token.ts 的 Edge Runtime 对应实现。
 *
 * proxy.ts 跑在 Edge Runtime,拿不到 node:crypto 的 createHmac 和 Buffer,因此同一个
 * 会话派生必须用 Web Crypto 重算一遍。两份实现**必须逐字节等价** —— 一旦失配,合法
 * 管理员的 POST /write 会在 proxy 层被静默拦成 404,页面侧没有任何报错。
 * tests/blog-auth.test.ts 里有一条交叉断言把这个不变式钉死,改任何一边都会红。
 *
 * 本文件只允许使用 Web 标准 API(crypto.subtle / TextEncoder / btoa),
 * 引入任何 node: 前缀的模块都会让 proxy.ts 在 Edge Runtime 下构建失败。
 */

export const BLOG_SESSION_MESSAGE = "blog-admin-session:v2";

export async function blogSessionTokenEdge(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(BLOG_SESSION_MESSAGE));

  const bytes = new Uint8Array(sig);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return `v2.${btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")}`;
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
