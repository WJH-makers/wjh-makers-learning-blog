/**
 * 全站响应头的单一事实源。
 *
 * 收敛前：8 个安全头的值写在 next.config.ts 里，契约测试用正则去扒那份配置文本
 * （tests/seo-contract.test.ts 就因此被自己的注释绊过一次，见该文件注释）。
 * 现在头定义是数据，测试直接 import 断言结构，不再依赖正则能不能匹配上格式。
 *
 * 零依赖：next.config.ts 用相对路径 import，测试用 node --test 直接 import。
 *
 * 层级现状（2026-08-19 三层实测，见 cloudflare-security-rules.md）：
 *   Next.js :3001  → 本模块定义的 8 个头，全部发出
 *   nginx   :80/:443 → 全部透传，不增不改（配置里没有任何 add_header 涉及安全头）
 *   Cloudflare 边缘 → Managed Transform「Add security headers」覆写 3 个：
 *                     HSTS 降到 31536000 且去掉 preload、X-Frame-Options 降为
 *                     SAMEORIGIN、Referrer-Policy 改为 same-origin。
 * 这 3 项只能在 Dashboard 关掉那条 Managed Transform，代码层改不动。
 * 因此本模块是「源站声明」的唯一定义，不是「浏览器最终收到」的定义。
 */

export type HttpHeader = { key: string; value: string };

/**
 * CSP 白名单。资源换域名（NEXT_PUBLIC_ASSET_PREFIX）就必须同步放行，
 * 否则整站脚本样式字体全被拦掉，所以按 assetOrigin 参数化而不是写死。
 */
export function contentSecurityPolicy(assetPrefix = ""): string {
  // 参数是「资源前缀」本身（可为空串），前导空格在此处补 —— 不要让调用方传带空格的值：
  // 收敛前 next.config.ts 里的 assetOrigin 变量就是「已带前导空格」的形态，两种语义
  // 同名极易在下一次改动时串线。
  const asset = assetPrefix ? ` ${assetPrefix}` : "";
  return [
    "default-src 'self'",
    // clarity.ms 已移除:实测国内读者 100% 加载失败(curl http=000、浏览器
    // ERR_CONNECTION_CLOSED),数据一条收不到,只换来每页两个控制台错误。
    // cloudflareinsights 仍保留 —— beacon 是 CF 边缘自动注入的,在 Dashboard
    // 关掉 Web Analytics 之前先留着白名单:删了它拦不住注入,只会把网络错误
    // 变成 CSP violation,页面上照样报错。
    `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com${asset}`,
    `style-src 'self' 'unsafe-inline'${asset}`,
    "img-src 'self' data: https:",
    `font-src 'self' data:${asset}`,
    `connect-src 'self' https://challenges.cloudflare.com https://cloudflareinsights.com${asset}`,
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    // 表单只能提交回本站:即便某处被注入了 <form action="//evil">,浏览器也会拦下,
    // 这是 CSP 里少数能挡住「数据外带」而非「脚本执行」的指令。
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** 与 CSP 无关、不随构建参数变化的那部分安全头。 */
export const STATIC_SECURITY_HEADERS: ReadonlyArray<HttpHeader> = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 不要求搜索引擎保留可直接访问的历史快照；不影响正常索引，但不是反爬安全边界。
  { key: "X-Robots-Tag", value: "noarchive" },
  // 全站生效(原先只挂在 /api 下,HTML 与静态资源反而没保护)。
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 防止点击劫持攻击
  { key: "X-Frame-Options", value: "DENY" },
  // 启用浏览器内置的 XSS 防护
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // 站点没有任何需要这些硬件/API 的功能,一律关掉,缩小第三方脚本的可乘之机。
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // 源站自己也声明 HSTS,不把「只走 HTTPS」这件事全押在 CF 配置不被改上。
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** 全站安全头完整集合（CSP + 静态项）。next.config.ts 的 `/(.*)` 规则消费。 */
export function securityHeaders(assetPrefix = ""): HttpHeader[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(assetPrefix) },
    ...STATIC_SECURITY_HEADERS,
  ];
}

/**
 * 静态产物一旦搬到 cdn 子域，字体与 module 脚本就成了跨域请求 —— 浏览器会因为
 * 缺 CORS 头直接拒绝加载(字体尤其静默失败，只表现为字体回退)。这些文件带 hash、
 * 内容公开且不含凭据，放行任意来源是安全的。
 */
export const STATIC_ASSET_CORS_HEADERS: ReadonlyArray<HttpHeader> = [
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Timing-Allow-Origin", value: "*" },
];
