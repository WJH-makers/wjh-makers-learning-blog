import { createHmac } from "node:crypto";

/**
 * Derive a session-only value from BLOG_ADMIN_TOKEN.
 *
 * The raw publishing secret must never become a browser cookie: a leaked
 * cookie should not be directly reusable as the server-side credential.
 * Rotating BLOG_ADMIN_TOKEN also invalidates every old session automatically.
 */
export function blogSessionToken(secret: string): string {
  return `v2.${createHmac("sha256", secret).update("blog-admin-session:v2").digest("base64url")}`;
}
