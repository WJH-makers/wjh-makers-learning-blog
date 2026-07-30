import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 注意:这里必须保留内联实现,不能复用 @/lib/safe-compare —— 那份依赖 node:crypto/Buffer,
// 而本文件跑在 Edge Runtime,只有 Web API 可用。
function safeCompare(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ua = enc.encode(a);
  const ub = enc.encode(b);
  if (ua.length !== ub.length) return false;
  let r = 0;
  for (let i = 0; i < ua.length; i++) r |= ua[i] ^ ub[i];
  return r === 0;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isContentPage = pathname === "/" || pathname === "/posts" || /^\/posts\/[^/]+$/.test(pathname);

  if (request.nextUrl.pathname === "/write" && request.method === "POST") {
    const expected = process.env.BLOG_ADMIN_TOKEN?.trim();
    if (!expected) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const cookieToken = request.cookies.get("blog_admin_token")?.value?.trim();
    if (!cookieToken || !safeCompare(cookieToken, expected)) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  const response = NextResponse.next();
  if (isContentPage) {
    // 公共 HTML 只按 URL 缓存。Markdown 使用固定的 /markdown 路由并由 Link
    // 明确发现，避免 Cloudflare/Nginx 将同一 URL 的 Accept 变体互相串用。
    // 反向代理会把内部地址作为 request.url 传入；发现链接必须始终使用公网规范域名。
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wwjjhh.online";
    const links = [
      `<${origin}/llms.txt>; rel="alternate"; type="text/plain"`,
      `<${origin}/sitemap.xml>; rel="sitemap"; type="application/xml"`,
      `<${origin}/rss.xml>; rel="alternate"; type="application/rss+xml"`,
    ];
    if (/^\/posts\/[^/]+$/.test(pathname)) {
      links.push(`<${origin}${pathname}/markdown>; rel="alternate"; type="text/markdown"`);
    }
    response.headers.set("Link", links.join(", "));
  }
  return response;
}

export const config = {
  matcher: ["/", "/posts/:path*", "/write"],
};
