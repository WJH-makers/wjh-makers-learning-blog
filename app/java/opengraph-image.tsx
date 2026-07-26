import { ImageResponse } from "next/og";
import { SERIES_META } from "@/lib/series";
import { OG_SIZE, ogCard, ogFontData } from "@/lib/og-card";

// 系列页社交分享图:报纸边框 + 系列名,风格与文章级 OG 图同族。
export const alt = "从零开始学 Java · 连载特刊";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    ogCard({ eyebrow: "连载特刊 · Serial 01", title: SERIES_META.title }),
    { ...OG_SIZE, fonts: [{ name: "NotoSC", data: ogFontData, weight: 700, style: "normal" }] },
  );
}
