import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function safeCompare(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ua = enc.encode(a);
  const ub = enc.encode(b);
  if (ua.length !== ub.length) return false;
  let r = 0;
  for (let i = 0; i < ua.length; i++) r |= ua[i] ^ ub[i];
  return r === 0;
}

export function middleware(request: NextRequest) {
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
    return NextResponse.rewrite(target);
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
