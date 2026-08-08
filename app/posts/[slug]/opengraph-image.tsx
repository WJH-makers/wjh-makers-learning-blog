import { ImageResponse } from "next/og";
import type { Route } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LEGACY_POST_SLUG_REDIRECTS } from "@/lib/legacy-slug-redirects";
import { getPublishedPost } from "@/lib/posts";
import { findEpisodeInfo } from "@/lib/series-registry";

// 文章级社交分享图:报纸风 + 卷话信息 + 中文标题。
// 中文字体用本地思源黑体子集(satori 不支持 woff2,故用子集 ttf)。
// 系列信息走多连载注册表:Java / CLI / Cafe 三条线统一取系列名+卷次。
export const alt = "咖啡站技术志 · 连载与笔记";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 模块加载时读一次(build 预生成时复用)
const fontData = readFileSync(join(process.cwd(), "public", "fonts", "noto-sc-bold-subset.ttf"));

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) {
    const legacy = LEGACY_POST_SLUG_REDIRECTS.find((item) => item.from === slug);
    if (legacy) permanentRedirect(`/posts/${legacy.to}/opengraph-image` as Route);
    notFound();
  }

  const rawTitle = post.title;
  // 去掉《系列名》NN · 前缀,只留话名
  const title = rawTitle.replace(/^《[^》]+》\s*\d+\s*·\s*/, "");
  const info = findEpisodeInfo(post.slug);
  const eyebrow = info
    ? `${info.series.title} · 第${info.season.season}卷 ${info.season.title}`
    : "咖啡站技术志 · 技术笔记";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#f9f9f7",
          padding: 72,
          border: "18px solid #111111",
          fontFamily: "NotoSC",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 2, color: "#cc0000", fontWeight: 700 }}>
          {eyebrow}
        </div>
        <div style={{ display: "flex", fontSize: 74, lineHeight: 1.25, color: "#111111", fontWeight: 700, maxWidth: 1010 }}>
          {title}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#555555" }}>
          <div style={{ display: "flex" }}>咖啡站技术志</div>
          <div style={{ display: "flex" }}>技术故事 · 可验证实践</div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "NotoSC", data: fontData, weight: 700, style: "normal" }] },
  );
}
