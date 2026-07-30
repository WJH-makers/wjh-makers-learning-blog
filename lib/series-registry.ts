/**
 * 多连载注册表:跨系列统一查询,文章页 banner / 上下话导航 / 进度 key 都走这里。
 * 新开一条连载 = 写一个 series-xxx.ts + 在 SERIES_LIST 挂一行,页面零改动。
 */
import type { Route } from "next";
import { SEASONS, SERIES_META, type JavaEpisode, type JavaSeason } from "@/lib/series";
import { CLI_SEASONS, CLI_SERIES_META } from "@/lib/series-cli";
import { CAFE_SEASONS, CAFE_SERIES_META } from "@/lib/series-cafe";
import { JVM_SEASONS, JVM_SERIES_META } from "@/lib/series-jvm";
import { BUILD_SEASONS, BUILD_SERIES_META } from "@/lib/series-build";
import { MICRO_SEASONS, MICRO_SERIES_META } from "@/lib/series-micro";
import { NET_SEASONS, NET_SERIES_META } from "@/lib/series-net";
import { OS_SEASONS, OS_SERIES_META } from "@/lib/series-os";
import { DB_SEASONS, DB_SERIES_META } from "@/lib/series-db";
import { DIST_SEASONS, DIST_SERIES_META } from "@/lib/series-dist";
import { CLOUD_SEASONS, CLOUD_SERIES_META } from "@/lib/series-cloud";
import { SEC_SEASONS, SEC_SERIES_META } from "@/lib/series-sec";
import { ALGO_SEASONS, ALGO_SERIES_META } from "@/lib/series-algo";
import { AI_SEASONS, AI_SERIES_META } from "@/lib/series-ai";
import { WEB_SEASONS, WEB_SERIES_META } from "@/lib/series-web";
import { PERF_SEASONS, PERF_SERIES_META } from "@/lib/series-perf";
import { ARCH_SEASONS, ARCH_SERIES_META } from "@/lib/series-arch";
import { QA_SEASONS, QA_SERIES_META } from "@/lib/series-qa";
import { SPRING_SEASONS, SPRING_SERIES_META } from "@/lib/series-spring";
import { MQ_SEASONS, MQ_SERIES_META } from "@/lib/series-mq";
import { OBS_SEASONS, OBS_SERIES_META } from "@/lib/series-obs";
import { SRC_SEASONS, SRC_SERIES_META } from "@/lib/series-src";
import { REACTIVE_SEASONS, REACTIVE_SERIES_META } from "@/lib/series-reactive";
import { BIGDATA_SEASONS, BIGDATA_SERIES_META } from "@/lib/series-bigdata";
import { SEARCH_SEASONS, SEARCH_SERIES_META } from "@/lib/series-search";
import { GITADV_SEASONS, GITADV_SERIES_META } from "@/lib/series-gitadv";
import { CAREER_SEASONS, CAREER_SERIES_META } from "@/lib/series-career";
import { isReleasedSlug } from "@/lib/publication";

export type SeriesRef = {
  title: string;
  /** 副标题(「阿零与豆豆 · Java 生态学院」这类),列表页做次级标识 */
  alias?: string;
  /** 一句话定位,/series 索引页与 footer 用 */
  tagline: string;
  /** 贯穿全系列的长期项目 */
  project?: string;
  route: Route; // 系列首页路由(typedRoutes 校验),如 /java、/cli、/cafe
  storageKey: string; // localStorage 进度 key
  seasons: JavaSeason[];
};

/** 各 series 文件的 META 结构一致,这里统一收口,新开一条线只加一行。 */
type SeriesMetaLike = {
  readonly title: string;
  readonly alias?: string;
  readonly tagline: string;
  readonly project?: string;
  readonly storageKey?: string;
};

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
    storageKey: storageKeyOverride ?? meta.storageKey ?? `${route.slice(1)}-academy:completed`,
    seasons,
  };
}

export const SERIES_LIST: SeriesRef[] = [
  defineSeries(SERIES_META, "/java", SEASONS, "java-academy:completed"),
  defineSeries(CLI_SERIES_META, "/cli", CLI_SEASONS),
  defineSeries(CAFE_SERIES_META, "/cafe", CAFE_SEASONS),
  defineSeries(JVM_SERIES_META, "/jvm", JVM_SEASONS),
  defineSeries(BUILD_SERIES_META, "/build", BUILD_SEASONS),
  defineSeries(MICRO_SERIES_META, "/micro", MICRO_SEASONS),
  defineSeries(NET_SERIES_META, "/net", NET_SEASONS),
  defineSeries(OS_SERIES_META, "/os", OS_SEASONS),
  defineSeries(DB_SERIES_META, "/db", DB_SEASONS),
  defineSeries(DIST_SERIES_META, "/dist", DIST_SEASONS),
  defineSeries(CLOUD_SERIES_META, "/cloud", CLOUD_SEASONS),
  defineSeries(SEC_SERIES_META, "/sec", SEC_SEASONS),
  defineSeries(ALGO_SERIES_META, "/algo", ALGO_SEASONS),
  defineSeries(AI_SERIES_META, "/ai", AI_SEASONS),
  defineSeries(WEB_SERIES_META, "/web", WEB_SEASONS),
  defineSeries(PERF_SERIES_META, "/perf", PERF_SEASONS),
  defineSeries(ARCH_SERIES_META, "/arch", ARCH_SEASONS),
  defineSeries(QA_SERIES_META, "/qa", QA_SEASONS),
  defineSeries(SPRING_SERIES_META, "/spring", SPRING_SEASONS),
  defineSeries(MQ_SERIES_META, "/mq", MQ_SEASONS),
  defineSeries(OBS_SERIES_META, "/obs", OBS_SEASONS),
  defineSeries(SRC_SERIES_META, "/src", SRC_SEASONS),
  defineSeries(REACTIVE_SERIES_META, "/reactive", REACTIVE_SEASONS),
  defineSeries(BIGDATA_SERIES_META, "/bigdata", BIGDATA_SEASONS),
  defineSeries(SEARCH_SERIES_META, "/search-engine", SEARCH_SEASONS),
  defineSeries(GITADV_SERIES_META, "/gitadv", GITADV_SEASONS),
  defineSeries(CAREER_SERIES_META, "/career", CAREER_SEASONS),
];

/** 一条线的全部话次(含未开更的蓝图)。 */
export function allEpisodesOf(series: SeriesRef): JavaEpisode[] {
  return series.seasons.flatMap((s) => s.episodes);
}

/** 一条线已开更的话次,按卷话顺序。 */
export function publishedEpisodesOf(series: SeriesRef): JavaEpisode[] {
  return allEpisodesOf(series).filter((e) => e.status === "published" && isReleasedSlug(e.slug));
}

/** 一条线的连载进度(已发布 / 规划总数)。 */
export function seriesProgress(series: SeriesRef): { done: number; total: number } {
  return { done: publishedEpisodesOf(series).length, total: allEpisodesOf(series).length };
}

/**
 * 按路由取一条线。各线 page.tsx 用它拿数据,写错路由在构建期就炸,
 * 不会静默渲染出一个空页面。
 */
export function seriesByRoute(route: Route): SeriesRef {
  const found = SERIES_LIST.find((s) => s.route === route);
  if (!found) throw new Error(`[series-registry] 未注册的连载路由:${route}`);
  return found;
}

/** 全站连载总量,首页/关于页/统计页共用一个口径。 */
export function allSeriesProgress(): { done: number; total: number; lines: number } {
  let done = 0;
  let total = 0;
  for (const series of SERIES_LIST) {
    const p = seriesProgress(series);
    done += p.done;
    total += p.total;
  }
  return { done, total, lines: SERIES_LIST.length };
}

export type EpisodeInfo = {
  series: SeriesRef;
  season: JavaSeason;
  episode: JavaEpisode;
  prev?: JavaEpisode;
  next?: JavaEpisode;
  /** 本季已发布话次 slug(进度条用) */
  seasonSlugs: string[];
};

/** 按文章 slug 在所有连载里定位这一话;非连载文章返回 undefined。 */
export function findEpisodeInfo(slug: string): EpisodeInfo | undefined {
  for (const series of SERIES_LIST) {
    for (const season of series.seasons) {
      const episode = season.episodes.find((e) => e.slug === slug);
      if (!episode) continue;
      const published = series.seasons
        .flatMap((s) => s.episodes)
        .filter((e) => e.status === "published" && isReleasedSlug(e.slug));
      const i = published.findIndex((e) => e.slug === slug);
      return {
        series,
        season,
        episode,
        prev: i > 0 ? published[i - 1] : undefined,
        next: i >= 0 ? published[i + 1] : undefined,
        seasonSlugs: season.episodes.filter((e) => e.status === "published" && isReleasedSlug(e.slug)).map((e) => e.slug as string),
      };
    }
  }
  return undefined;
}
