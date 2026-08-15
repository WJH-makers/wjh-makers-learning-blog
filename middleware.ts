import { NextRequest, NextResponse } from "next/server";

/**
 * Host 白名单：只允许正式域名与本地/内网访问。
 *
 * 背景：Vercel 副站域名(wjh-makers-learning-blog.vercel.app)绕过 Cloudflare
 * WAF 直达应用，作为第二攻击面。本中间件在应用层兜底拦截非法 Host，
 * 无需在 Vercel 控制台做任何配置。
 *
 * 允许清单：
 * - wwjjhh.online / www.wwjjhh.online（正式域名，经 Cloudflare Tunnel 回源）
 * - localhost / 127.0.0.1 / *.internal（本机与 Docker 健康检查）
 */
const ALLOWED_HOSTS = new Set(["wwjjhh.online", "www.wwjjhh.online"]);

function isLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  );
}

export function middleware(request: NextRequest) {
  const rawHost = request.headers.get("host")?.trim().toLowerCase() ?? "";
  const host = rawHost.replace(/:\d+$/, "");

  if (isLocalHost(host) || ALLOWED_HOSTS.has(host)) {
    return NextResponse.next();
  }

  return new NextResponse("403 Forbidden: host not allowed", {
    status: 403,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};