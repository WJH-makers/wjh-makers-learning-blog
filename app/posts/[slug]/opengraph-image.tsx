import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getPublishedPost } from "@/lib/posts";
import { episodeBySlug, SEASONS, SERIES_META } from "@/lib/series";

// 文章级社交分享图:报纸风 + 卷话信息 + 中文标题。
// 中文字体用本地思源黑体子集(satori 不支持 woff2,故用子集 ttf)。
export const alt = "从零开始学 Java · WJH-makers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 模块加载时读一次(build 预生成时复用)
const fontData = readFileSync(join(process.cwd(), "public", "fonts", "noto-sc-bold-subset.ttf"));

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  const rawTitle = post?.title ?? "从零开始学 Java";
  // 去掉《从零开始学 Java》NN · 前缀,只留话名
  const title = rawTitle.replace(/^《从零开始学 Java》\s*\d+\s*·\s*/, "");
  const ep = episodeBySlug(slug);
  const season = ep ? SEASONS.find((s) => s.season === ep.season) : undefined;
  const eyebrow = season
    ? `${SERIES_META.title} · 第${season.season}卷 ${season.title}`
    : "WJH-makers · 技术笔记";

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
          <div style={{ display: "flex" }}>wwjjhh.online</div>
          <div style={{ display: "flex" }}>@WJH-makers</div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "NotoSC", data: fontData, weight: 700, style: "normal" }] },
  );
}
