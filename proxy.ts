import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { blogSessionTokenEdge, safeCompareEdge } from "@/lib/blog-auth-token-edge";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isContentPage = pathname === "/" || pathname === "/posts" || /^\/posts\/[^/]+$/.test(pathname);

  if (pathname === "/write" && request.method === "POST") {
    const expected = process.env.BLOG_ADMIN_TOKEN?.trim();
    if (!expected) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Cookie 里存的是 HMAC 派生值,不是 BLOG_ADMIN_TOKEN 原文 —— 这里曾经拿原文去比,
    // 结果把每一个合法管理员的发布/删除请求都拦成了 404。
    //
    // 带了 Cookie 就必须验得过:伪造或已轮换失效的会话在这里直接掐掉,不进 Node 进程。
    // 这台机器只有 1 vCPU / 512 MB,让无效请求一路走到 Server Action 会白烧 CPU。
    //
    // 没带 Cookie 则放行:禁用 JS 时写作台把 token 作为表单字段直接 POST 到 /write
    // (WriteEditorClientImpl 的 name="token"),那条降级路径本来就没有 Cookie。
    // 放行不等于免鉴权 —— publishPost/deletePost 里的 requireAdminOrRedirect 才是权威
    // 判定,它同时校验同源与 token。
    const cookieToken = request.cookies.get("blog_admin_token")?.value?.trim();
    if (cookieToken && !safeCompareEdge(cookieToken, await blogSessionTokenEdge(expected))) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  const response = NextResponse.next();

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

// 只匹配这里真正要处理的三类路径。
//
// 曾经放宽成「除静态资源外的全部路径」,本意是给所有 Cookie 补 SameSite —— 但那段代码
// 遍历的是 NextResponse.next() 自己的 Cookie 集合,该集合恒为空,一个 Cookie 都没改到。
// 本站唯一的 Cookie(blog_admin_token)的 SameSite=Lax / HttpOnly / Secure 是在写入处
// 配置的(app/api/auth/route.ts、app/write/page.tsx),本来就已生效。
// 放宽 matcher 只是让每个请求白跑一遍 Edge 函数,故收回。
export const config = {
  matcher: ["/", "/posts/:path*", "/write"],
};
