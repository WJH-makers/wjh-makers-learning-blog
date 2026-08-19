import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { blogAdminSecret } from "@/lib/auth-secrets";
import { BLOG_COOKIE, blogSessionToken, isBlogAuthed } from "@/lib/blog-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { isSameOriginRequest } from "@/lib/request-origin";
import { safeCompare } from "@/lib/safe-compare";
import { adminSessionCookieOptions } from "@/lib/session-cookie";

export async function GET() {
  return NextResponse.json({ authed: await isBlogAuthed() });
}

export async function POST(request: Request) {
  const headersList = await headers();
  const ip = clientIp(headersList);

  if (!isSameOriginRequest(headersList)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  if (!checkRateLimit(ip, "login").allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  // 畸形 body 属于客户端错误,应答 400;裸 await request.json() 会让它变成未捕获异常 → 500。
  let token: unknown;
  try {
    ({ token } = await request.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const expected = blogAdminSecret();

  if (!expected || typeof token !== "string" || !safeCompare(token, expected)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(BLOG_COOKIE, blogSessionToken(expected), adminSessionCookieOptions());

  return NextResponse.json({ ok: true });
}
