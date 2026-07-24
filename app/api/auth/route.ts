import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { BLOG_AUTH_COOKIE, createSession, verifySession } from "@/lib/auth-session";

const encoder = new TextEncoder();

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(encoder.encode(a), encoder.encode(b));
}

export async function GET() {
  const cookieStore = await cookies();
  return NextResponse.json({ authed: verifySession(cookieStore.get(BLOG_AUTH_COOKIE)?.value, "blog") });
}

export async function POST(request: Request) {
  // Forwarded client-IP headers are not a trustworthy boundary in this deployment.
  if (!checkRateLimit("blog-login", "login").allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const { token } = await request.json();
  const expected = process.env.BLOG_ADMIN_TOKEN?.trim();

  if (!expected || !safeCompare(token ?? "", expected)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const session = createSession("blog", 60 * 60 * 24 * 7);
  if (!session) return NextResponse.json({ ok: false }, { status: 503 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(BLOG_AUTH_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  response.cookies.set("blog_admin_token", "", { httpOnly: true, maxAge: 0, path: "/" });
  return response;
}
