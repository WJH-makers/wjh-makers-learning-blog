import { cookies } from "next/headers";
import { blogAdminSecret } from "@/lib/auth-secrets";
import { blogSessionToken } from "@/lib/blog-auth-token";
import { safeCompare } from "@/lib/safe-compare";

export const BLOG_COOKIE = "blog_admin_token";

export { blogSessionToken } from "@/lib/blog-auth-token";

export function isBlogSessionToken(token: string, secret: string): boolean {
  return Boolean(secret) && safeCompare(token, blogSessionToken(secret));
}

export async function isBlogAuthed(): Promise<boolean> {
  const secret = blogAdminSecret();
  if (!secret) return false;

  const token = (await cookies()).get(BLOG_COOKIE)?.value ?? "";
  return isBlogSessionToken(token, secret);
}
