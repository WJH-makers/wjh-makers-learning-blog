import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 写作台会话令牌。
 *
 * 形态 `v3.<过期秒数>.<HMAC-SHA256(key=secret, msg="blog-admin-session:v3:<过期秒数>")>`。
 *
 * ## 为什么 v2 要换掉
 *
 * v2 是 `v2.HMAC(secret, "blog-admin-session:v2")` —— 消息是**常量**，于是派生值也是常量：
 * 服务端手上没有「这个 token 何时签发」这个信息，`maxAge` 只是发给浏览器的提示。
 * 攻击者拿到 cookie 值后用 curl 手动带上，第 31 天、第 300 天照样放行。
 * 唯一吊销手段是轮换 BLOG_ADMIN_TOKEN，代价是同时把管理员自己踢下线。
 *
 * v3 把过期时间放进消息并纳入 HMAC：改一个字节 MAC 就不匹配，所以过期时间不可篡改，
 * 且服务端只凭 secret 就能独立判断有效性，不需要维护吊销名单。
 *
 * ## 轮换后果
 *
 * 上线即让所有 v2 cookie 失效（`isBlogSessionToken` 不认 v2 前缀），管理员需重新登录一次。
 * 单人博客可接受；这也正是「会话可被吊销」这个能力第一次真正生效。
 *
 * 原始密钥仍然绝不进浏览器：cookie 里只有派生值，泄露它不等于泄露 BLOG_ADMIN_TOKEN。
 */

export const BLOG_SESSION_VERSION = "v3";
const MESSAGE_PREFIX = `blog-admin-session:${BLOG_SESSION_VERSION}:`;

/** 与 cookie 的 maxAge 一致（lib/cache-policy.ts 的 ADMIN_SESSION_MAX_AGE_SECONDS）。 */
import { ADMIN_SESSION_MAX_AGE_SECONDS } from "./cache-policy.ts";

function mac(secret: string, expiresAt: number): string {
  return createHmac("sha256", secret).update(`${MESSAGE_PREFIX}${expiresAt}`).digest("base64url");
}

/**
 * 签发一个新会话令牌。
 * `now` 可注入，仅为测试能构造「已过期」的令牌，生产调用一律不传。
 */
export function blogSessionToken(secret: string, now: number = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS;
  return `${BLOG_SESSION_VERSION}.${expiresAt}.${mac(secret, expiresAt)}`;
}

/**
 * 校验令牌：先解出过期时间判时效，再恒时比对 MAC。
 *
 * 顺序无所谓安全性（两步都必须过），但先判时效能避免为已过期的令牌白算一次 HMAC。
 * 任何格式不符、非数字过期时间、已过期、MAC 不匹配，一律 false。
 */
export function verifyBlogSessionToken(
  token: string,
  secret: string,
  now: number = Date.now(),
): boolean {
  if (!secret || !token) return false;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== BLOG_SESSION_VERSION) return false;

  // 只接受纯数字：`Number("12e9")`、`Number(" 12 ")` 这类宽松解析会让过期时间被绕过。
  if (!/^\d+$/.test(parts[1])) return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt * 1000 <= now) return false;

  const expected = mac(secret, expiresAt);
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
