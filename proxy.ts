import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { blogAdminSecret, sessionSigningKey } from "@/lib/auth-secrets";
import { verifyBlogSessionTokenEdge } from "@/lib/blog-auth-token-edge";
import { ALLOWED_HOSTS } from "@/lib/site-config";

/**
 * Host 白名单：只允许正式域名与本地/内网访问。白名单本体在 lib/site-config.ts，
 * 由 PRIMARY_HOST 派生 —— 它是字面常量而非环境变量，改一个 env 不能扩大可信来源。
 *
 * 背景：Vercel 副站域名(wjh-makers-learning-blog.vercel.app)绕过 Cloudflare
 * WAF 直达应用。Host 头本身可被客户端伪造（直连 Vercel 时伪造
 * Host: wwjjhh.online 即可骗过白名单），因此在 Vercel 运行时一律 403，
 * 从环境层封死整条链路，无需依赖 Host 头判断。
 */
const ON_VERCEL = process.env.VERCEL === "1";

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

  if (pathname === "/write" && request.method === "POST") {
    const expected = blogAdminSecret();
    if (!expected) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // 无 cookie 时刻意放行：首次登录走表单 token，在此拦掉登录就走不通。
    // 真正的把关在页面侧的 requireAdminOrRedirect（含限流），这层只是纵深。
    const cookieToken = request.cookies.get("blog_admin_token")?.value?.trim();
    // 必须用会话签名密钥验，不是登录凭据 —— 与 lib/blog-auth.ts 那侧同一个换算。
    // 漏掉这层换算的症状是配了 SESSION_SIGNING_KEY 之后，合法管理员的 POST /write
    // 在 Edge 层被静默拦成 404 而页面侧毫无报错（正是本文件历史上出过的那类事故）。
    if (cookieToken && !(await verifyBlogSessionTokenEdge(cookieToken, sessionSigningKey(expected)))) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  /**
   * 这里**不要**设任何响应头。
   *
   * 开启 cacheComponents 后，设在 NextResponse.next() 上的头会被写进 ISR 缓存条目的
   * .meta，每次 revalidate 时「旧头 + 新头」一起 append 回去，无上限增长；累积到超过
   * nginx 的 proxy_buffer_size 就是 502。2026-08-29 首页因此挂了一天，
   * 详见 lib/discovery-links.ts 的模块注释与 vercel/next.js#94945。
   *
   * 响应头一律交给 next.config.ts 的 headers()：那层在缓存读取之后施加，不进缓存条目。
   */
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};