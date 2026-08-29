import type { NextConfig } from "next";
import { LEGACY_POST_SLUG_REDIRECTS } from "./lib/legacy-slug-redirects";
import { IMMUTABLE_ASSET_CACHE_CONTROL, NO_STORE_CACHE_CONTROL } from "./lib/cache-policy";
import { DISCOVERY_LINK_HEADERS, DISCOVERY_LINK_PATHS } from "./lib/discovery-links";
import { STATIC_ASSET_CORS_HEADERS, securityHeaders } from "./lib/security-headers";

// 国内访问会被 Cloudflare 调度到西雅图(实测 colo=SEA，首页 1461–5166ms)，而源站在
// 上海、直连 RTT 只有 43–104ms。因此把 HTML 交给源站直连拿延迟，把 /_next/static/ 下
// 那 286KB 的 JS/CSS/字体留在 CF 边缘 —— 它们带 hash、immutable 缓存一年，正适合 CDN，
// 也让源站 4.4Mbps 的出口只需要扛 HTML。
//
// 空值 = 关闭(与改造前完全一致)。DNS 与 Tunnel 就绪后才在构建期注入，
// 出问题把变量拿掉重新 build 即可回退。
// CSP 白名单要跟着一起放行；由 lib/security-headers.ts 的 contentSecurityPolicy(assetPrefix) 处理。
const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX?.trim() || "";

const nextConfig: NextConfig = {
  output: "standalone",
  // 迁移中（feat/cache-components-migration）：开启后路由段的 dynamic/revalidate/fetchCache
  // 一律报错，缓存改由 'use cache' + cacheLife 表达。档位集中定义在下面的 cacheLife 里 ——
  // 这正是 lib/cache-policy.ts 的 REVALIDATE_TIERS 想做而做不到的事（路由段配置必须是
  // 字面量，不能 import 常量）。
  cacheComponents: true,
  cacheLife: {
    // 与 lib/cache-policy.ts 的 REVALIDATE_TIERS 一一对应，命名保持一致便于对照。
    // stale = 客户端不回源的时长；revalidate = 服务端刷新频率；expire = 超过即转动态。
    content: { stale: 3600, revalidate: 3600, expire: 86400 },
    article: { stale: 3600, revalidate: 604800, expire: 2592000 },
    nearStatic: { stale: 3600, revalidate: 86400, expire: 604800 },
    // 数据库文章的共享窗口，对应 PUBLIC_POSTS_REVALIDATE_SECONDS。
    publicPosts: { stale: 60, revalidate: 300, expire: 3600 },
  },
  typedRoutes: true,
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  ...(assetPrefix ? { assetPrefix } : {}),
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
  // 头与缓存的**值**都定义在 lib/security-headers.ts 与 lib/cache-policy.ts，
  // 这里只负责把它们挂到路径上。契约测试因此能直接 import 那两个模块断言结构，
  // 不必再拿正则去扒本文件的文本（那种断言会被本文件的注释绊倒，有过前例）。
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders(assetPrefix),
    },
    {
      source: "/_next/static/:path*",
      headers: [...STATIC_ASSET_CORS_HEADERS],
    },
    {
      // 漫画与本地回退图都用稳定版本名作文件名，正文引用变更时才会换 URL。
      source: "/comics/:path*",
      headers: [{ key: "Cache-Control", value: IMMUTABLE_ASSET_CACHE_CONTROL }],
    },
    {
      source: "/images/:path*",
      headers: [{ key: "Cache-Control", value: IMMUTABLE_ASSET_CACHE_CONTROL }],
    },
    {
      source: "/api/:path*",
      headers: [
        // nosniff 已由上面的全站规则覆盖,这里只补接口特有的「永不缓存」。
        { key: "Cache-Control", value: NO_STORE_CACHE_CONTROL },
      ],
    },
    // 内容页的 sitemap/RSS autodiscovery。这条头原先在 proxy.ts,必须留在 headers()
    // 这一层：proxy 设的头会进 ISR 缓存条目并每轮 append,累积到 502。
    // 详见 lib/discovery-links.ts 的模块注释。
    ...DISCOVERY_LINK_PATHS.map((source) => ({
      source,
      headers: [...DISCOVERY_LINK_HEADERS],
    })),
  ],
};

export default nextConfig;
