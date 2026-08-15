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

  // 修复 Cookie SameSite 属性配置不合理的问题
  // 为所有 cookie 设置安全属性
  const cookies = response.cookies.getAll();
  cookies.forEach((cookie) => {
    response.cookies.set({
      name: cookie.name,
      value: cookie.value,
      httpOnly: cookie.name !== "blog_admin_token" ? true : cookie.name === "blog_admin_token",
      secure: true,
      sameSite: "lax", // 推荐值: lax 在大多数场景下安全且兼容
      path: "/",
    });
  });

  // 移除可能泄漏服务器信息的头
  response.headers.delete("Server");
  response.headers.delete("X-Powered-By");

  if (isContentPage) {
    // 反向代理会把内部地址作为 request.url 传入；发现链接必须始终使用公网规范域名。
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
  matcher: [
    // 匹配所有路径,除了静态资源
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};
