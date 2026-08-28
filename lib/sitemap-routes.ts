/**
 * sitemap 固定入口。除路径/优先级外还声明「lastmod 该跟谁走」——
 *
 * 原先 14 条一律用「最新文章日期」,于是发一篇文章,连《角色档案》《项目》《此刻》
 * 这些跟文章毫无数据依赖的页面 lastmod 也一起跳到当天。这是虚报:Google 判定
 * lastmod 不可靠时是整份 sitemap 一起不信,代价会落到同一份里 200+ 条文章 URL 上
 * 那些本来准确的日期。宁可少报(少报只是晚一点重抓)也不多报。
 */
export type SitemapRoute = {
  path: string;
  changeFrequency: "daily" | "weekly" | "monthly";
  priority: number;
  /**
   * 页面渲染结果只随「某条连载是否已开更」变化(availabilityOf 推导),
   * 与单篇文章无关。真实日期由 app/sitemap.ts 按该页展示的线逐个推导,
   * 不在这里手写 —— 手写一份就会和 series-registry 脱节,
   * lib/universe.ts 开头那段注释记的就是这个坑。
   */
  tracksSeriesOpening?: true;
  /**
   * 纯静态页:内容写死在源码里,只有作者改文案才变。手写日期,改文案时一起改。
   * 没这个字段也没 tracksSeriesOpening 的,才是真的跟着最新文章走。
   */
  updatedOn?: string;
};

export const STATIC_SITEMAP_ROUTES: readonly SitemapRoute[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/start", changeFrequency: "weekly", priority: 0.9, tracksSeriesOpening: true },
  // JAVA_LABS 列表 + 纯本机学习记录面板,读的是 localStorage 不是文章库
  { path: "/learning", changeFrequency: "weekly", priority: 0.6, updatedOn: "2026-07-31" },
  { path: "/universe", changeFrequency: "weekly", priority: 0.8, tracksSeriesOpening: true },
  // CHARACTERS 常量,末次改动即 lib/universe.ts 定稿日
  { path: "/characters", changeFrequency: "monthly", priority: 0.6, updatedOn: "2026-07-31" },
  { path: "/coffee-station", changeFrequency: "weekly", priority: 0.8, tracksSeriesOpening: true },
  { path: "/series", changeFrequency: "weekly", priority: 0.8 },
  { path: "/archive", changeFrequency: "weekly", priority: 0.7 },
  { path: "/cheatsheets", changeFrequency: "weekly", priority: 0.7 },
  { path: "/posts", changeFrequency: "weekly", priority: 0.7 },
  { path: "/tags", changeFrequency: "weekly", priority: 0.5 },
  // PROJECTS 常量,末次实质改动是下掉 ARC Lab 条目
  { path: "/projects", changeFrequency: "monthly", priority: 0.6, updatedOn: "2026-08-15" },
  // 与页面正文里那句「更新于 …」同一个日期(app/now/page.tsx 的 UPDATED),两处要一起改
  { path: "/now", changeFrequency: "monthly", priority: 0.5, updatedOn: "2026-08-06" },
  { path: "/stats", changeFrequency: "weekly", priority: 0.4 },
];
