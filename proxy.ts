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
  const accept = request.headers.get("accept")?.toLowerCase() ?? "";
  const acceptsMarkdown = accept.split(",").some((item) => {
    const mediaType = item.trim();
    return mediaType.startsWith("text/markdown") && !/;\s*q=0(?:\.0+)?(?:;|$)/.test(mediaType);
  });

  // 仅为公开的内容页协商 Markdown；写作台、接口和任何未公开路由保持原行为。
  const isContentPage = pathname === "/" || pathname === "/posts" || /^\/posts\/[^/]+$/.test(pathname);
  if (request.method === "GET" && acceptsMarkdown && isContentPage) {
    // 文章直接复用其固定的 Markdown 路由；不要依赖内部 rewrite 的查询参数传递。
    const target = pathname === "/" || pathname === "/posts"
      ? new URL("/agent/markdown", request.url)
      : new URL(`${pathname}/markdown`, request.url);
    const rewritten = NextResponse.rewrite(target);
    // 同一 URL 会按 Accept 返回 HTML 或 Markdown 两种内容:不声明 Vary,
    // CF/nginx 只按 URL 缓存 —— agent 抓一次就可能让后续浏览器读者拿到裸 Markdown。
    rewritten.headers.append("Vary", "Accept");
    // 这份变体只服务内容协商,不进共享缓存,避免上游代理把它当作该 URL 的规范表示。
    rewritten.headers.set("Cache-Control", "private, no-store");
    return rewritten;
  }

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
    // HTML 与 Markdown 共用同一 URL,必须声明按 Accept 分表示,否则共享缓存会串味。
    response.headers.append("Vary", "Accept");
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
