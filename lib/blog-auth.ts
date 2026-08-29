import { cookies } from "next/headers";
import { blogAdminSecret, sessionSigningKey } from "@/lib/auth-secrets";
import {
  blogSessionToken as signWithKey,
  verifyBlogSessionToken as verifyWithKey,
} from "@/lib/blog-auth-token";

export const BLOG_COOKIE = "blog_admin_token";

/**
 * 签发会话令牌。
 *
 * 这一层的职责就是「把登录凭据换成会话签名密钥」——放在这里而不是让每个调用点
 * 各自包一层 `sessionSigningKey(...)`：那种写法漏掉任意一处，就会出现「用 A 签、用 B 验」
 * 的静默失配，症状是管理员登录后立刻掉线且无任何报错。
 * 参数名保留 `secret`（登录凭据）而非签名密钥，调用方无需知道里面换过。
 */
export function blogSessionToken(secret: string, now?: number): string {
  return signWithKey(sessionSigningKey(secret), now);
}

/**
 * 校验会话 cookie。
 *
 * 不能写成「重新签一个再比字符串」—— v3 的令牌含签发时刻，同一密钥每次签出的值都不同，
 * 那样比必然永假。必须走 verifyBlogSessionToken(解出过期时间 → 判时效 → 恒时比 MAC)。
 * v2 时代的 `safeCompare(token, blogSessionToken(secret))` 正是这种写法，换 v3 时
 * 若照搬，症状是管理员永远登不上而页面无任何报错。
 */
export function isBlogSessionToken(token: string, secret: string): boolean {
  return verifyWithKey(token, sessionSigningKey(secret));
}

export async function isBlogAuthed(): Promise<boolean> {
  // 判「功能是否可用」看登录凭据，判「这张 cookie 是否有效」用会话签名密钥 ——
  // 两者在未配置 SESSION_SIGNING_KEY 时是同一个值，配了就分离。
  const secret = blogAdminSecret();
  if (!secret) return false;

  const token = (await cookies()).get(BLOG_COOKIE)?.value ?? "";
  return isBlogSessionToken(token, secret);
}
