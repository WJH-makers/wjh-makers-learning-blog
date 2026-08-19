import type { Metadata } from "next";
import { SITE_NAME, siteUrl } from "@/lib/site-config";

// Next 的 metadata 合并对 openGraph 是整体替换而非深合并:页面一旦自定义 openGraph,
// layout 里的 siteName/locale 就会丢失。凡自定义 openGraph 的页面用 `...OG_BASE` 展开补齐。
export const OG_BASE = {
  siteName: SITE_NAME,
  locale: "zh_CN",
} as const;

export function socialMetadata(input: {
  title: string;
  description: string;
  url: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  const image = {
    url: `${siteUrl()}/opengraph-image`,
    width: 1200,
    height: 630,
    alt: `${SITE_NAME} · 原创技术漫画与工程学习`,
  };

  return {
    openGraph: {
      ...OG_BASE,
      title: input.title,
      description: input.description,
      url: input.url,
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image],
    },
  };
}

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
    alternates: { canonical: url },
    ...(input.robots ? { robots: input.robots } : {}),
    ...socialMetadata({
      title: input.socialTitle ?? input.title,
      description: input.socialDescription ?? input.description,
      url,
    }),
  };
}
