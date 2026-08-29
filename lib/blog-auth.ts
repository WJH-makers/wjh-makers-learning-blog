import { cookies } from "next/headers";
import { blogAdminSecret } from "@/lib/auth-secrets";
import { blogSessionToken, verifyBlogSessionToken } from "@/lib/blog-auth-token";

export const BLOG_COOKIE = "blog_admin_token";

export { blogSessionToken } from "@/lib/blog-auth-token";

/**
 * 校验会话 cookie。
 *
 * 不能写成「重新签一个再比字符串」—— v3 的令牌含签发时刻，同一密钥每次签出的值都不同，
 * 那样比必然永假。必须走 verifyBlogSessionToken(解出过期时间 → 判时效 → 恒时比 MAC)。
 * v2 时代的 `safeCompare(token, blogSessionToken(secret))` 正是这种写法，换 v3 时
 * 若照搬，症状是管理员永远登不上而页面无任何报错。
 */
export function isBlogSessionToken(token: string, secret: string): boolean {
  return verifyBlogSessionToken(token, secret);
}

export async function isBlogAuthed(): Promise<boolean> {
  const secret = blogAdminSecret();
  if (!secret) return false;

  const token = (await cookies()).get(BLOG_COOKIE)?.value ?? "";
  return verifyBlogSessionToken(token, secret);
}
