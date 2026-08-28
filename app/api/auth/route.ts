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

  // 四个失败分支都带 message,与 app/api/monitor-auth/route.ts 同一成色。
  // 原先全是裸 { ok:false },客户端只能把 403/429/400/401 一律说成「密钥不正确」——
  // 被限流的作者会以为自己记错了密钥,然后继续猛试,把限流窗口一直续下去。
  // 注意 401 的文案刻意不区分「密钥错」与「服务端没配 BLOG_ADMIN_TOKEN」:
  // 那个区别对未通过认证的人是信息泄漏,配置缺失由服务端日志和 /write 页面自己提示。
  if (!isSameOriginRequest(headersList)) {
    return NextResponse.json({ ok: false, message: "请求来源不受信任" }, { status: 403 });
  }

  if (!checkRateLimit(ip, "login").allowed) {
    return NextResponse.json({ ok: false, message: "尝试次数过多，请 1 分钟后重试" }, { status: 429 });
  }

  // 畸形 body 属于客户端错误,应答 400;裸 await request.json() 会让它变成未捕获异常 → 500。
  let token: unknown;
  try {
    ({ token } = await request.json());
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式有误" }, { status: 400 });
  }
  const expected = blogAdminSecret();

  if (!expected || typeof token !== "string" || !safeCompare(token, expected)) {
    return NextResponse.json({ ok: false, message: "写入密钥不正确" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(BLOG_COOKIE, blogSessionToken(expected), adminSessionCookieOptions());

  return NextResponse.json({ ok: true });
}
