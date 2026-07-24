import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const BLOG_AUTH_COOKIE = "blog_admin_session";
export const MONITOR_AUTH_COOKIE = "monitor_session";

type SessionRole = "blog" | "monitor";

function secretFor(role: SessionRole): string {
  if (role === "blog") return process.env.BLOG_ADMIN_TOKEN?.trim() ?? "";
  const user = process.env.MONITOR_USER?.trim() ?? "";
  const password = process.env.MONITOR_PASS?.trim() ?? "";
  return user && password ? `${user}\n${password}` : "";
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSession(role: SessionRole, maxAgeSeconds: number): string | undefined {
  const secret = secretFor(role);
  if (!secret) return undefined;
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    role,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
    nonce: randomBytes(24).toString("base64url"),
  })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySession(value: string | undefined, role: SessionRole): boolean {
  const secret = secretFor(role);
  if (!secret || !value) return false;
  const [payload, signature, ...rest] = value.split(".");
  if (!payload || !signature || rest.length > 0 || !safeEqual(signature, sign(payload, secret))) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      v?: number;
      role?: string;
      exp?: number;
      nonce?: string;
    };
    return parsed.v === 1 && parsed.role === role && typeof parsed.nonce === "string" && parsed.nonce.length >= 24
      && typeof parsed.exp === "number" && parsed.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
