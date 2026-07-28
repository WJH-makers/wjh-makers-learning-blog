---
title: "一个注册表撑起 27 条漫画连载:新开一条线只改一行"
date: 2026-07-26
summary: "博客里并行着 27 条漫画连载,每条都有季/话/进度/上下话导航/OG/sitemap。硬编码会爆炸。本文复盘我如何用一张 SeriesRef 注册表 + defineSeries 工厂把它收敛成『写一个 series-xxx.ts + 注册一行』,以及为什么可扩展性恰恰来自约束——连同那个至今没删掉的历史包袱。"
tags: [工程实录, 架构, TypeScript]
---

# 一个注册表撑起 27 条漫画连载:新开一条线只改一行

> 27 条并行的漫画连载,每条有季、话、进度、上下话导航、OG、sitemap。我没有为每条线写一套页面,而是让它们共享一张注册表——新开一条线的成本是「写一个数据文件 + 注册一行」,页面零改动。这篇讲这套约束是怎么长出来的,以及它逼我付了什么代价。

## 1. 问题:一条线不是一个页面,是一组横切关注点

这个博客把「Java 工程师要会的东西」拆成了同一个咖啡站宇宙下的多条漫画连载:主线《从零开始学 Java》,番外《JVM 火种纪》,还有 CLI、构建、微服务、网络、操作系统、数据库、分布式、云原生、安全、算法、AI、前端……到今天是 27 条。

问题在于,一条连载从来不是「一个页面」这么简单。随手数,它至少牵动这些东西:

- 系列首页(hero、进度面板、分季表格、知识地图);
- 每篇文章顶部的 banner(「你正在读 X 系列第 N 卷第 M 话」);
- 上一话 / 下一话导航;
- localStorage 里的「读过打勾」进度,需要一个稳定的 `storageKey`;
- OG / JSON-LD 结构化数据;
- sitemap.xml、llms.txt、footer 里的入口。

如果每条线各写一套,新开第 28 条时,我要在七八个地方复制粘贴,还要记得每处都改对。27 条线乘以七八个关注点,任何一处漏改都是一个静默的线上 bug。这不是「工作量大」,是「错误面积随线数量线性膨胀」。

## 2. 解法:把「一条线」压成一个数据结构

我的第一性判断是:这些页面逻辑其实完全一样,不一样的只有**数据**。那就把「一条线」定义成一个纯数据结构,页面只认这个结构,不认具体是哪条线。

于是有了 `lib/series-registry.ts` 里的 `SeriesRef`:

```typescript
export type SeriesRef = {
  title: string;
  alias?: string;      // 「阿零与豆豆 · Java 生态学院」这类副标题
  tagline: string;     // 一句话定位,/series 索引页与 footer 用
  project?: string;    // 贯穿全系列的长期项目
  route: Route;        // 系列首页路由,typedRoutes 校验,如 /java、/jvm
  storageKey: string;  // localStorage 进度 key
  seasons: JavaSeason[];
};
```

注意 `route: Route`——这是 Next.js 16 的 typedRoutes 类型。它不是装饰,是防线:如果我注册了一条 `/typo` 而项目里没有对应路由,`tsc` 直接报错。路由拼错这种「运行时才炸」的错误,被拽到了编译期。

每条线的数据放在自己的文件里,比如 `series-jvm.ts` 导出 `JVM_SEASONS` 和 `JVM_SERIES_META`。注册表把它们组装起来:

```typescript
export const SERIES_LIST: SeriesRef[] = [
  defineSeries(SERIES_META, "/java", SEASONS, "java-academy:completed"),
  defineSeries(CLI_SERIES_META, "/cli", CLI_SEASONS),
  defineSeries(JVM_SERIES_META, "/jvm", JVM_SEASONS),
  // …一直到第 27 条
  defineSeries(CAREER_SERIES_META, "/career", CAREER_SEASONS),
];
```

**新开一条线 = 写一个 `series-xxx.ts` + 在这个数组里加一行。** 这就是标题那句「只改一行」的字面意思。

## 3. defineSeries:工厂的价值在于它替我做默认决定

`defineSeries` 看着平平无奇,但它藏了一个我踩过才补上的约定——`storageKey` 的兜底:

```typescript
function defineSeries(
  meta: SeriesMetaLike,
  route: Route,
  seasons: JavaSeason[],
  storageKeyOverride?: string,
): SeriesRef {
  return {
    title: meta.title,
    alias: meta.alias,
    tagline: meta.tagline,
    project: meta.project,
    route,
    storageKey:
      storageKeyOverride ?? meta.storageKey ?? `${route.slice(1)}-academy:completed`,
    seasons,
  };
}
```

`storageKey` 走三级兜底:显式传参 > meta 里自带 > 从路由派生 `${route.slice(1)}-academy:completed`。为什么要这么绕?因为进度存在浏览器 localStorage,key 一旦上线就不能改——改了等于让所有老读者的「已读打勾」凭空蒸发。所以主线 `/java` 我显式钉死成 `"java-academy:completed"`,历史值不能动;而新线没有历史包袱,让工厂按路由自动生成即可,省掉一次手写、也就省掉一次手滑写错的机会。

这就是工厂函数真正的价值:它不是为了少打几个字,而是**把「容易忘、忘了就是线上事故」的默认决定固化进代码**。

## 4. findEpisodeInfo:一个函数喂饱所有文章页

文章页最麻烦的地方是,它拿到的只有自己的 `slug`,却要回答「我属于哪条线、哪一卷、上一话下一话是谁」。跨 27 条线,这个定位逻辑只能有一处,否则又是 27 份副本。

```typescript
export function findEpisodeInfo(slug: string): EpisodeInfo | undefined {
  for (const series of SERIES_LIST) {
    for (const season of series.seasons) {
      const episode = season.episodes.find((e) => e.slug === slug);
      if (!episode) continue;
      const published = series.seasons
        .flatMap((s) => s.episodes)
        .filter((e) => e.status === "published" && e.slug);
      const i = published.findIndex((e) => e.slug === slug);
      return {
        series, season, episode,
        prev: i > 0 ? published[i - 1] : undefined,
        next: i >= 0 ? published[i + 1] : undefined,
        seasonSlugs: season.episodes
          .filter((e) => e.status === "published" && e.slug)
          .map((e) => e.slug as string),
      };
    }
  }
  return undefined;
}
```

三个细节是拿捏过的:

- **上下话只在「已发布」集合里导航**。`prev/next` 走的是 `published` 数组,不是全部话次。规划中(`planned`)的话有标题没 slug,绝不能让「下一话」跳到一个 404。
- **返回 `undefined` 而不是抛错**。非连载的普通文章(比如这篇实录)本来就不在任何一条线里,banner 组件拿到 `undefined` 就不渲染。「不属于任何线」是正常状态,不是异常。
- **`next: i >= 0` 而非 `i > 0`**。第一话没有上一话(`i > 0` 挡住),但第一话有下一话(`i >= 0` 放行)。边界差一个字符,含义天差地别。

文章页需要的一切——banner、上下话、进度 key——全从这一个函数的返回值里取。

## 5. 系列首页:12 份复制粘贴是怎么收敛的

早期每条线的首页是复制出来的。`app/jvm/page.tsx` 现在长这样:

```tsx
export default function JvmSeriesPage() {
  const total = jvmAllEpisodes().length;
  const done = jvmPublishedEpisodes().length;
  const progressSeasons = JVM_SEASONS.map((s) => ({
    code: s.code, title: s.title, slugs: seasonPublishedSlugs(s),
  })).filter((s) => s.slugs.length > 0);
  // …hero + JavaProgress + SeriesMap + 分季表格
}
```

关键动作是把「进度条」和「知识地图」抽成了 `JavaProgress`、`SeriesMap` 两个组件,页面只负责把 `JVM_SEASONS` 和 `storageKey` 喂进去。表格渲染也全靠共享的 `CHAPTER_TYPE_LABEL`、`STATUS_LABEL`、`seasonPublishedSlugs`——这些都在 `lib/series.ts` 里定义一次。

我没有把首页做成一个「注册表驱动的通用页」再套 27 遍。因为每条线的 hero 文案、联动钩子、蓝图先行的语气有真实差异,强行模板化会牺牲叙事。**收敛的边界划在「结构统一、文案自由」**:结构(进度、地图、分季表)走共享组件,文案留在各自 `page.tsx`。这是权衡,不是不彻底。

## 6. 遍历即可见:新线自动进 sitemap / llms.txt / footer

注册表最爽的回报在 SEO 层。sitemap 直接遍历 `SERIES_LIST`:

```typescript
const seriesEntries: MetadataRoute.Sitemap = SERIES_LIST.flatMap((series) => {
  const published = series.seasons
    .flatMap((s) => s.episodes)
    .filter((e) => e.status === "published" && e.slug);
  if (published.length === 0) return [];  // 全 planned 的蓝图页是薄内容,不收录
  return [{
    url: `${base}${series.route}`,
    lastModified: latestEpisodeDate(published, latestDate),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }];
});
```

llms.txt 里也是同一套 `SERIES_LIST.filter(p.done > 0)`。这意味着:我新开第 28 条线、发布它第一话的那一刻,它自动出现在 sitemap、llms.txt、连载总台里,我**不需要记得**去更新任何索引。

还有个容易被忽略的细节:sitemap 的 `lastModified` 取的是「这条线最新一话的 slug 前 10 位日期」(`slug.slice(0, 10)` 就是 `YYYY-MM-DD`),而不是当前时间。全 planned 的线干脆不进 sitemap。过度声明 `lastModified` 会让爬虫不信任你整份 sitemap——诚实比勤快更值钱。

## 7. 取舍与历史包袱:那个至今叫 JavaEpisode 的类型

坦白一个没洗干净的地方。所有 27 条线共用的话次类型,至今叫 `JavaEpisode`、季类型叫 `JavaSeason`:

```typescript
import type { JavaEpisode, JavaSeason } from "@/lib/series";
```

`series-jvm.ts`、`series-cli.ts` 全都 `import` 这个 `JavaEpisode` 来描述自己——哪怕 CLI 线讲的根本不是 Java。这是历史顺序留下的疤:最早只有 Java 一条线,类型就随手叫了 `JavaEpisode`;等抽注册表时,已经十几条线在用,重命名要动几十个 import。

我当时的决定是:**不改**。理由很直接——这个名字是纯内部标识,不出现在任何 URL、任何页面文案、任何对外契约里。重命名带来的是零用户价值的大范围改动,而每一次大范围改动都是一次引入 bug 的机会。真正的语义耦合(咖啡站宇宙、季/话模型)是所有线共享的,这部分本就该统一;不统一的只是一个名字。所以我把它当作「已知的、被隔离的债」记下来,而不是在错误的时机去还。

如果哪天有一条线的数据模型真的需要和别人不同,那才是重命名(或抽 `Episode` 基类型)的正当时机。在那之前,为了一个名字动全仓,是洁癖,不是工程。

## 8. 如果重来

可扩展性不来自「预留扩展点」,来自**约束**。这套注册表能容纳第 27、第 50 条线,恰恰是因为我强迫每条线都长成同一个 `SeriesRef`:同样的字段、同样的进度算法、同样的定位函数。约束越紧,共享的代码面积越大,新增的边际成本越低——第 28 条线和第 2 条线的成本几乎一样。

三条能迁移的经验:

1. **先找到「不变的结构」和「可变的数据」的分界线**,把不变的写进类型和函数,把可变的赶进数据文件。分界线画对了,后面全是白捡的复用。
2. **让工厂函数替你做那些「忘了就出事」的默认决定**(比如 localStorage key 的兜底),而不只是省字。
3. **遍历优于登记**。凡是「加了东西要记得同步某个清单」的地方,都改成从单一数据源遍历。人会忘,`for` 循环不会。

至于那个叫 `JavaEpisode` 的历史包袱——留着它,也是一种取舍。工程不是把每处都擦干净,是知道**哪处的脏可以先放着,以及为什么**。
