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

export type SeriesRef = {
  title: string;
  route: Route; // 系列首页路由(typedRoutes 校验),如 /java、/cli、/cafe
  storageKey: string; // localStorage 进度 key
  seasons: JavaSeason[];
};

export const SERIES_LIST: SeriesRef[] = [
  { title: SERIES_META.title, route: "/java", storageKey: "java-academy:completed", seasons: SEASONS },
  { title: CLI_SERIES_META.title, route: "/cli", storageKey: CLI_SERIES_META.storageKey, seasons: CLI_SEASONS },
  { title: CAFE_SERIES_META.title, route: "/cafe", storageKey: CAFE_SERIES_META.storageKey, seasons: CAFE_SEASONS },
  { title: JVM_SERIES_META.title, route: "/jvm", storageKey: JVM_SERIES_META.storageKey, seasons: JVM_SEASONS },
  { title: BUILD_SERIES_META.title, route: "/build", storageKey: BUILD_SERIES_META.storageKey, seasons: BUILD_SEASONS },
  { title: MICRO_SERIES_META.title, route: "/micro", storageKey: MICRO_SERIES_META.storageKey, seasons: MICRO_SEASONS },
  { title: NET_SERIES_META.title, route: "/net", storageKey: NET_SERIES_META.storageKey, seasons: NET_SEASONS },
  { title: OS_SERIES_META.title, route: "/os", storageKey: OS_SERIES_META.storageKey, seasons: OS_SEASONS },
  { title: DB_SERIES_META.title, route: "/db", storageKey: DB_SERIES_META.storageKey, seasons: DB_SEASONS },
  { title: DIST_SERIES_META.title, route: "/dist", storageKey: DIST_SERIES_META.storageKey, seasons: DIST_SEASONS },
  { title: CLOUD_SERIES_META.title, route: "/cloud", storageKey: CLOUD_SERIES_META.storageKey, seasons: CLOUD_SEASONS },
  { title: SEC_SERIES_META.title, route: "/sec", storageKey: SEC_SERIES_META.storageKey, seasons: SEC_SEASONS },
  { title: ALGO_SERIES_META.title, route: "/algo", storageKey: ALGO_SERIES_META.storageKey, seasons: ALGO_SEASONS },
  { title: AI_SERIES_META.title, route: "/ai", storageKey: AI_SERIES_META.storageKey, seasons: AI_SEASONS },
  { title: WEB_SERIES_META.title, route: "/web", storageKey: WEB_SERIES_META.storageKey, seasons: WEB_SEASONS },
];

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
        .filter((e) => e.status === "published" && e.slug);
      const i = published.findIndex((e) => e.slug === slug);
      return {
        series,
        season,
        episode,
        prev: i > 0 ? published[i - 1] : undefined,
        next: i >= 0 ? published[i + 1] : undefined,
        seasonSlugs: season.episodes.filter((e) => e.status === "published" && e.slug).map((e) => e.slug as string),
      };
    }
  }
  return undefined;
}
