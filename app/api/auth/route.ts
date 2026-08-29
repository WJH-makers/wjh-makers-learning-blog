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

/**
 * 注销。
 *
 * v3 之前根本没有这个入口：会话令牌不含过期时间，服务端无法吊销，唯一手段是轮换
 * BLOG_ADMIN_TOKEN —— 那会把管理员自己一起踢下线。有了 v3 才谈得上「主动结束会话」。
 *
 * 同源校验要保留：否则任意站点都能让访客的管理会话掉线（虽然只是骚扰，不是提权）。
 * 不做限流 —— 注销失败没有任何可猜的秘密，把它限流反而会在配额耗尽时挡住正常退出。
 */
export async function DELETE() {
  const headersList = await headers();
  if (!isSameOriginRequest(headersList)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const cookieStore = await cookies();
  // 用同一份属性（含 path）删除：path 不一致时浏览器会保留原 cookie，注销静默失效。
  cookieStore.set(BLOG_COOKIE, "", { ...adminSessionCookieOptions(), maxAge: 0 });
  return NextResponse.json({ ok: true });
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
