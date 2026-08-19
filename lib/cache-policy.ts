/**
 * 缓存策略的单一事实源。
 *
 * 零依赖，供 next.config.ts、lib/posts.ts 与契约测试共同 import。
 *
 * ## 一条官方约束决定了本模块的边界
 *
 * 路由段配置 `export const revalidate` **必须是可静态分析的字面量**：
 *
 * > The revalidate value needs to be statically analyzable.
 * > For example `revalidate = 600` is valid, but `revalidate = 60 * 10` is not.
 * > —— https://nextjs.org/docs/app/guides/caching-without-cache-components
 *
 * 所以全站 30 余处 `export const revalidate = 3600` **不能**改成 import 本模块的常量：
 * 那会让 Next 静态分析失败。这类值只能靠命名分层 + 契约测试收敛（见 REVALIDATE_TIERS
 * 与 tests/cache-policy-contract.test.ts），不能靠模块收敛。
 *
 * 反过来，`unstable_cache(fn, keys, { revalidate })` 里的 revalidate 是**运行时函数参数**、
 * 不受静态分析约束，可以且已经改成引用常量。cookie 的 maxAge 同理。
 */

// ── HTTP Cache-Control ─────────────────────────────────────────────────────

/**
 * 内容寻址资源的不可变缓存。
 *
 * 用于 /comics/** 与 /images/**：文件名为稳定版本名，正文引用变更时才会换 URL。
 * 注：/_next/static 不用这条 —— Next 自己就发 immutable 长缓存，再自定义一遍是冗余，
 * 且会触发「Custom Cache-Control can break Next.js development behavior」告警。
 *
 * 与 nginx 的差异是刻意的：nginx 在同名 location 里额外发 `s-maxage=31536000`，
 * 那是给 CF 边缘的共享缓存指令，源站响应头不需要它。ops/sync-r2-assets.py 里的
 * R2 对象元数据必须与本常量逐字节一致，由 tests/r2-assets-contract.test.ts 钉住
 * （Python 不能 import TS，只能靠测试跨语言比对）。
 */
export const IMMUTABLE_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

/** 接口一律不进任何缓存层。 */
export const NO_STORE_CACHE_CONTROL = "no-store";

// ── 数据层缓存 ─────────────────────────────────────────────────────────────

/**
 * 数据库文章的共享缓存窗口（秒）。
 *
 * 300 秒是「发布后最迟多久自然可见」的上限，不是实际延迟：/write 发布会
 * updateTag(PUBLIC_POSTS_CACHE_TAG) 主动失效，正常路径下立刻可见。这个窗口只兜
 * 「绕过 /write 直接改库」的情况。
 */
export const PUBLIC_POSTS_REVALIDATE_SECONDS = 300;

// ── 会话时长 ───────────────────────────────────────────────────────────────

/** 写作台会话 30 天。app/api/auth 与 app/write 必须一致，否则两条登录路径给出不同有效期。 */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** 监控台会话 8 小时。面板暴露服务器指标，比写作台更短。 */
export const MONITOR_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

// ── 路由段 revalidate 分层（只能是文档 + 契约，不能被 import 进路由） ──────

/**
 * 允许的路由段 revalidate 取值。**不要**在页面里 import 这些值——
 * 路由段配置必须是字面量（见模块顶部约束）。这里是给契约测试当白名单用的：
 * 新页面只能从这四档里选，不许再冒出 1800、7200 这类第五档。
 *
 *   3600   常规内容页（列表、标签、系列落地页、RSS、sitemap）
 *   604800 文章正文与文章列表：内容定稿后极少改，发布时由 revalidatePath 主动刷
 *   86400  近乎静态的展示页（/now、/projects）
 *   false  完全静态，无时间失效
 *
 * force-dynamic 的页面不设 revalidate，不在此列。
 */
export const REVALIDATE_TIERS = {
  content: 3600,
  article: 604800,
  nearStatic: 86400,
} as const;
