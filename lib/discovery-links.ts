/**
 * 机器可读入口的 `Link` 响应头（sitemap 与 RSS 的 autodiscovery）。
 *
 * 为什么单独一个模块、而且必须由 next.config.ts 的 headers() 消费 —— 这条头曾经
 * 写在 proxy.ts 里（`response.headers.set("Link", ...)`），2026-08-29 把首页打成了 502：
 *
 *   开启 cacheComponents 后，proxy 设在 NextResponse.next() 上的响应头会被写进
 *   ISR 缓存条目的 .next/server/app/<route>.meta。每次 revalidate 时 Next 把
 *   「meta 里的旧头 + proxy 新设的头」一起写回，是 **append 而非覆盖**，于是每轮 +1 份。
 *   首页 cacheLife('content') 每小时 revalidate 一次，容器连续运行 93 小时后，
 *   单条 Link 头累积到 94 份、14598 字节，响应头总量 15997 字节。
 *   上游 vercel/next.js#94945「Proxy-generated Link header values accumulate after
 *   Cache Components revalidation」记录了同一现象，且明确「grows without an apparent
 *   upper bound」—— 没有自愈上限。
 *
 *   nginx 的 proxy_buffer_size 是 8k，读上游响应头阶段就溢出，报
 *   「upstream sent too big header」并返回 502。同 location 里那句 proxy_hide_header Link
 *   救不了：溢出发生在**读头**阶段，丢弃指令在读完之后才生效。
 *
 * 判据（同一响应、同一缓存条目里的对照）：next.config.ts 的 headers() 施加的
 * Content-Security-Policy 只出现 1 次，index.meta 里 `content-security-policy`
 * 出现 0 次 —— headers() 在缓存读取**之后**施加，不进缓存条目、不累积。
 * 因此这条头只能由 headers() 出，不能回到 proxy.ts 或任何 middleware 层。
 *
 * 零依赖（只从 site-config.ts 取值，不碰 next/*）：next.config.ts 用相对路径 import，
 * 测试用 node --test 直接 import。与 lib/security-headers.ts、lib/cache-policy.ts 同一先例。
 *
 * 另一层：nginx 对 `location /` 也配了 proxy_hide_header Link + add_header Link，
 * 值与本模块字节一致。那层是「不依赖上游页面缓存，保证首页始终暴露机器可读入口」的
 * 兜底，不是本模块的替代 —— 源站直连（127.0.0.1:3001）与本地 dev 都不经过 nginx。
 */

// 后缀不能省：本模块要被 tests/discovery-links.test.ts 直接 import，而 node --test
// 不解析 tsconfig 的 paths、也要求写全扩展名（先例：lib/session-cookie.ts）。
import { SITE_URL } from "./site-config.ts";

export type HttpHeader = { key: string; value: string };

/**
 * `Link` 头的值。绝对地址而非相对地址：RSS 阅读器与抓取器拿到相对地址解析不到，
 * tests/proxy-gates.test.ts 有一条断言专门钉这一点。
 */
export const DISCOVERY_LINK_VALUE = [
  `<${SITE_URL}/sitemap.xml>; rel="sitemap"; type="application/xml"`,
  `<${SITE_URL}/rss.xml>; rel="alternate"; type="application/rss+xml"`,
].join(", ");

export const DISCOVERY_LINK_HEADERS: ReadonlyArray<HttpHeader> = [
  { key: "Link", value: DISCOVERY_LINK_VALUE },
];

/**
 * 带 Link 头的内容页路径。
 *
 * 与 proxy.ts 原先的判定逐条等价：`/`、`/posts`、以及**单段** slug 的文章页。
 * `/posts/:slug` 在 path-to-regexp 下不匹配 `/posts/a/b`，与原先正则
 * `/^\/posts\/[^/]+$/` 的行为一致 —— 多段路径本就不是文章页。
 *
 * 刻意不含 `/tags`、`/series`、各连载首页：它们是导航页，原先也没有这条头。
 * 改这份清单等于改对外契约，tests/proxy-gates.test.ts 里正反两组断言都会跟着响应。
 */
export const DISCOVERY_LINK_PATHS: ReadonlyArray<string> = ["/", "/posts", "/posts/:slug"];
