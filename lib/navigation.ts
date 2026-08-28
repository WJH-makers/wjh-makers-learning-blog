export type SiteNavItem = {
  href: string;
  label: string;
  matches: readonly string[];
  external?: boolean;
};

/**
 * 全部连载首页路由,必须与 lib/series-registry.ts 的 SERIES_LIST 逐条对齐。
 *
 * 这里刻意抄一份字面量,而不是 `SERIES_LIST.map((s) => s.route)`,有两个硬约束:
 * 1. 本文件被 "use client" 的 SiteNav 引用,而 SiteNav 挂在根布局上全站渲染。
 *    SERIES_LIST 的每个条目都挂着 seasons,27 个 series 模块共 219 话、约 500 KB 源码
 *    全都从它可达,tree-shaking 摘不掉 —— 为一个高亮状态把整份连载数据塞进
 *    每个页面的客户端包,不值。
 * 2. series-registry.ts 内部用 `@/lib/*` 别名,而 tests/ 一律走相对路径 `../lib/x.ts`
 *    直接喂给 node --test(没有配 loader / 别名解析)。一旦本文件引它,
 *    navigation.test.ts 会立刻 ERR_MODULE_NOT_FOUND。
 *
 * 代价是新开连载要记得往这里加一行。漏了不会报错,只会静默丢掉 is-active
 * 与 aria-current(2026-08 就是这么漏了 23 条),所以补漏要靠
 * navigation.test.ts 里「每条注册路由都得被某个导航项匹配」的断言兜住。
 */
const SERIES_ROUTES = [
  "/java", "/cli", "/cafe", "/jvm", "/build", "/micro", "/net", "/os", "/db",
  "/dist", "/cloud", "/sec", "/algo", "/ai", "/web", "/perf", "/arch", "/qa",
  "/spring", "/mq", "/obs", "/src", "/reactive", "/bigdata", "/search-engine",
  "/gitadv", "/career",
] as const;

export const SITE_NAV_ITEMS: readonly SiteNavItem[] = [
  { href: "/start", label: "开始", matches: ["/start"] },
  { href: "/universe", label: "宇宙", matches: ["/universe"] },
  { href: "/series", label: "连载", matches: ["/series", "/posts", ...SERIES_ROUTES] },
  { href: "/coffee-station", label: "咖啡站", matches: ["/coffee-station"] },
  { href: "/projects", label: "项目", matches: ["/projects"] },
];

function isPathWithin(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isSiteNavItemActive(pathname: string, item: SiteNavItem): boolean {
  return item.matches.some((prefix) => isPathWithin(pathname, prefix));
}

export function isHomeActive(pathname: string): boolean {
  return pathname === "/";
}
