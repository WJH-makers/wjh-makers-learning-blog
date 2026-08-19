/**
 * 站点身份的单一事实源。
 *
 * 收敛前：`?? "https://wwjjhh.online"` 这条 fallback 在 app/layout.tsx、lib/posts.ts、
 * proxy.ts 各存一份副本，Host 白名单又在 proxy.ts 里独立硬编码一遍。换域名要改 4 处，
 * 漏一处的表现是「SEO 正常但同源校验静默失效」——最难发现的那类分歧。
 *
 * 本模块刻意零依赖（不 import 任何东西，也不碰 next/*）：
 *   - next.config.ts 可用相对路径直接 import（与 lib/legacy-slug-redirects.ts 同一先例）
 *   - proxy.ts 在 Edge 运行时可用
 *   - 客户端组件可用（只含公开值，绝不放服务端密钥）
 *   - tests 可用 node --test 直接 import
 *
 * 边界：本模块只放「跨模块重复出现」的站点级事实。单点出现的文案（ICP 备案号、
 * 页脚标语、作者署名）留在使用处——把只用一次的字符串搬进配置模块，是把可读性
 * 换成了假的整洁。各 feature 自己的环境变量（MONGODB_*、TURNSTILE_*、JAVA_JUDGE0_*、
 * R2_*）同样留在各自模块：那才是高内聚，集中到一处只会造出混装无关领域的上帝模块。
 */

/**
 * 正式域名。写成字面常量而非从环境变量派生，是安全决定：
 * Host 白名单必须不受运行时环境影响，否则改一个 env 就能扩大可信来源集合。
 */
export const PRIMARY_HOST = "wwjjhh.online";

/** 站点公开根地址。末尾斜杠一律剥掉，保证 `${SITE_URL}/path` 不会拼出双斜杠。 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? `https://${PRIMARY_HOST}`).replace(/\/$/, "");

/**
 * Host 白名单：从 PRIMARY_HOST 派生，改域名只改上面一行。
 * 本地与内网地址不在此列，由 proxy.ts 的 isLocalHost 单独判定（语义不同：
 * 那是「开发/健康检查放行」，这是「正式对外域名」）。
 */
export const ALLOWED_HOSTS: ReadonlySet<string> = new Set([PRIMARY_HOST, `www.${PRIMARY_HOST}`]);

/**
 * 机器可读的出版实体名。
 *
 * 只用于 JSON-LD 与 OpenGraph —— 这些位置的值必须字节一致，分歧会让结构化数据
 * 指向两个不同实体。正文、导航、页脚里出现的同名文字是文案不是配置，不要改成引用
 * 本常量：那些位置本就该允许「咖啡站技术志 · 原创技术故事」这类上下文变体。
 */
export const SITE_NAME = "咖啡站技术志";

/** 运维子域。仅 /monitor 页面的外链使用，集中在此免得散落成裸字符串。 */
export const OPS_SUBDOMAINS = {
  netdata: `https://monitor.${PRIMARY_HOST}`,
  uptimeKuma: `https://status.${PRIMARY_HOST}`,
} as const;

/**
 * 容器内自访问地址。
 *
 * 生产走 127.0.0.1:3001（nginx 与 docker-compose 端口映射同一个数字，见
 * docker-compose.yml 的 `127.0.0.1:3001:3001` 与 scripts/deploy-from-origin.sh 的健康检查）；
 * 开发走 next dev 的 3000。走公网域名会绕一圈 Cloudflare 再回源，白付一次 RTT。
 */
export const INTERNAL_ORIGIN = process.env.NODE_ENV === "production"
  ? "http://127.0.0.1:3001"
  : "http://localhost:3000";

/** 站点公开根地址（函数形式）。历史调用点众多，保留函数签名避免无谓的大改。 */
export function siteUrl(): string {
  return SITE_URL;
}
