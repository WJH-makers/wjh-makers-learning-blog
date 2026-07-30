import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 报纸风社交分享卡的共享排版:供系列页等页面级 opengraph-image 复用。
 * 与 app/posts/[slug]/opengraph-image.tsx 同族(该文件保持独立实现,不依赖本模块)。
 *
 * satori 约束:所有 div 必须显式 display:flex;不支持 woff2,中文字体用本地
 * public/fonts/noto-sc-bold-subset.ttf(子集,缺字时 @vercel/og 会在线拉 Google Fonts 兜底,
 * 但兜底字重是 400,与 700 主字重有肉眼可见差异——eyebrow 文案尽量只用子集内字符)。
 */
export const OG_SIZE = { width: 1200, height: 630 };

// 模块加载时读一次(build 预生成时复用)
export const ogFontData = readFileSync(join(process.cwd(), "public", "fonts", "noto-sc-bold-subset.ttf"));

export function ogCard({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
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
  );
}
