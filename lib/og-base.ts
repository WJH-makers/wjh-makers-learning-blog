import type { Metadata } from "next";
import { SITE_NAME, siteUrl } from "@/lib/site-config";

// Next 的 metadata 合并对 openGraph 是整体替换而非深合并:页面一旦自定义 openGraph,
// layout 里的 siteName/locale 就会丢失。凡自定义 openGraph 的页面用 `...OG_BASE` 展开补齐。
export const OG_BASE = {
  siteName: SITE_NAME,
  locale: "zh_CN",
} as const;

/**
 * 自带 `opengraph-image.tsx` 的路由段。
 *
 * Next 的文件式 OG 图只在「本层导出的 metadata 里 openGraph 自身没有 images 属性」时才合入
 * (resolve-metadata.js 的 mergeStaticMetadata 用 hasOwnProperty 判,给 images 赋 undefined 也算有)。
 * 而 openGraph 是整体替换:页面一旦声明 openGraph,根 layout 那层已合进去的默认图会被整段顶掉。
 * 两条规则叠起来的结果是——images 必须按路由二选一:
 *   - 本段有自己的 opengraph-image.tsx → 整个 images 键都不能出现,把补图交还 Next;
 *   - 没有 → 必须自己写死默认图,否则该页 og:image 直接消失(不会回落到根那张)。
 * 所以这里只能是一份显式清单。新增 <segment>/opengraph-image.tsx 时必须同步登记,
 * 漏登记的症状是那张图照样进构建、却没有任何 meta 指向它(F28 就是这么来的)。
 */
const ROUTES_WITH_OWN_OG_IMAGE: ReadonlySet<string> = new Set(["/java", "/cli", "/cafe"]);

export function socialMetadata(input: {
  title: string;
  description: string;
  url: string;
  /** 交给文件式 opengraph-image 出图:省略 images 键(不是置空),见上方清单注释。 */
  useRouteImage?: boolean;
}): Pick<Metadata, "openGraph" | "twitter"> {
  const image = {
    url: `${siteUrl()}/opengraph-image`,
    width: 1200,
    height: 630,
    alt: `${SITE_NAME} · 原创技术漫画与工程学习`,
  };
  // twitter 那侧不必单列:本站没有 twitter-image.tsx,Next 的 postProcessMetadata
  // 会在 twitter 缺图时用最终 openGraph.images 自动补,card 值保留不动。
  const images = input.useRouteImage ? {} : { images: [image] };

  return {
    openGraph: {
      ...OG_BASE,
      title: input.title,
      description: input.description,
      url: input.url,
      type: "website",
      ...images,
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      ...images,
    },
  };
}

/**
 * RSS autodiscovery 的 `<link rel="alternate">`,凡设 canonical 处必须一起带上。
 *
 * alternates 和 openGraph 一样是整体覆写(resolveAlternates 只从子级取
 * canonical/languages/media/types,不与父级深合并),所以页面只写 canonical
 * 就会把根 layout 的 types 顶掉,全站 40+ 个可索引页面的 RSS <link> 一起消失。
 * 这里导出常量而不是各处手抄,免得四份值日后漂移。
 */
export const RSS_ALTERNATE_TYPES = {
  types: { "application/rss+xml": "/rss.xml" },
} as const;

export function staticPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  robots?: Metadata["robots"];
  socialTitle?: string;
  socialDescription?: string;
}): Metadata {
  if (!input.path.startsWith("/")) {
    throw new Error(`页面 metadata path 必须以 / 开头：${input.path}`);
  }
  const url = `${siteUrl()}${input.path}`;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url, ...RSS_ALTERNATE_TYPES },
    ...(input.robots ? { robots: input.robots } : {}),
    ...socialMetadata({
      title: input.socialTitle ?? input.title,
      description: input.socialDescription ?? input.description,
      url,
      useRouteImage: ROUTES_WITH_OWN_OG_IMAGE.has(input.path),
    }),
  };
}
