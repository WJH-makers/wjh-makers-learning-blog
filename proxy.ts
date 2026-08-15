import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { blogSessionTokenEdge, safeCompareEdge } from "@/lib/blog-auth-token-edge";

/**
 * Host 白名单：只允许正式域名与本地/内网访问。
 *
 * 背景：Vercel 副站域名(wjh-makers-learning-blog.vercel.app)绕过 Cloudflare
 * WAF 直达应用。Host 头本身可被客户端伪造（直连 Vercel 时伪造
 * Host: wwjjhh.online 即可骗过白名单），因此在 Vercel 运行时一律 403，
 * 从环境层封死整条链路，无需依赖 Host 头判断。
 */
const ON_VERCEL = process.env.VERCEL === "1";

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

export async function proxy(request: NextRequest) {
  if (ON_VERCEL) {
    return new NextResponse("403 Forbidden: vercel runtime disabled", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const rawHost = request.headers.get("host")?.trim().toLowerCase() ?? "";
  const host = rawHost.replace(/:\d+$/, "");

  if (!isLocalHost(host) && !ALLOWED_HOSTS.has(host)) {
    return new NextResponse("403 Forbidden: host not allowed", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const pathname = request.nextUrl.pathname;
  const isContentPage = pathname === "/" || pathname === "/posts" || /^\/posts\/[^/]+$/.test(pathname);

  if (pathname === "/write" && request.method === "POST") {
    const expected = process.env.BLOG_ADMIN_TOKEN?.trim();
    if (!expected) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const cookieToken = request.cookies.get("blog_admin_token")?.value?.trim();
    if (cookieToken && !safeCompareEdge(cookieToken, await blogSessionTokenEdge(expected))) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  const response = NextResponse.next();

  if (isContentPage) {
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wwjjhh.online";
    const links = [
      `<${origin}/sitemap.xml>; rel="sitemap"; type="application/xml"`,
      `<${origin}/rss.xml>; rel="alternate"; type="application/rss+xml"`,
    ];
    response.headers.set("Link", links.join(", "));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};