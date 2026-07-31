import type { NextConfig } from "next";
import { LEGACY_POST_SLUG_REDIRECTS } from "./lib/legacy-slug-redirects";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: true,
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["@blocknote/core", "@blocknote/mantine"],
    // 小规格自托管机器上，默认静态生成会同时拉起大量 worker；数百篇课程页会与在线容器争抢
    // 内存。发布可以慢，不能因构建把服务挤掉，因此固定为单 worker、单页并发。
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1000,
    cpus: 1,
  },
  redirects: async () => [
    {
      source: "/security.txt",
      destination: "/.well-known/security.txt",
      permanent: true,
    },
    // 自我介绍页已退役；保留永久跳转，让既有搜索结果与书签落到连载入口。
    {
      source: "/about",
      destination: "/series",
      permanent: true,
    },
    // 两条完结连载的排期日期倒推回真实区间后 slug 前缀变了，旧链接一律永久跳转到新地址。
    ...LEGACY_POST_SLUG_REDIRECTS.map(({ from, to }) => ({
      source: `/posts/${from}`,
      destination: `/posts/${to}`,
      permanent: true,
    })),
  ],
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.clarity.ms https://static.cloudflareinsights.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://challenges.cloudflare.com https://*.clarity.ms https://*.clarity.microsoft.com https://cloudflareinsights.com",
            "frame-src https://challenges.cloudflare.com",
            "object-src 'none'",
            "base-uri 'none'",
            "frame-ancestors 'none'",
            // 表单只能提交回本站:即便某处被注入了 <form action="//evil">,浏览器也会拦下,
            // 这是 CSP 里少数能挡住「数据外带」而非「脚本执行」的指令。
            "form-action 'self'",
            "upgrade-insecure-requests",
          ].join("; "),
        },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // 不要求搜索引擎保留可直接访问的历史快照；不影响正常索引，但不是反爬安全边界。
        { key: "X-Robots-Tag", value: "noarchive" },
        // 全站生效(原先只挂在 /api 下,HTML 与静态资源反而没保护)。
        { key: "X-Content-Type-Options", value: "nosniff" },
        // 站点没有任何需要这些硬件/API 的功能,一律关掉,缩小第三方脚本的可乘之机。
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
        },
        // 源站自己也声明 HSTS,不把「只走 HTTPS」这件事全押在 CF 配置不被改上。
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    },
    {
      // 漫画文件名为稳定版本名，正文引用变更时才会换 URL；允许 CDN 与浏览器长期复用。
      // 注:/_next/static 不在这里 —— Next 自己就发 immutable 长缓存,再自定义一遍是冗余,
      // 且会触发「Custom Cache-Control can break Next.js development behavior」告警。
      source: "/comics/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      source: "/api/:path*",
      headers: [
        // nosniff 已由上面的全站规则覆盖,这里只补接口特有的「永不缓存」。
        { key: "Cache-Control", value: "no-store" },
      ],
    },
  ],
};

export default nextConfig;
