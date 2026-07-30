import { ImageResponse } from "next/og";

// 全站默认社交分享图(Open Graph / Twitter Card)。
// 纯排版品牌卡,工程报纸风:黑白纸底 + 红强调 + 硬边框。
// 刻意不含头像/真名/联系方式 —— 干净、无隐私、无外部图片依赖。
export const alt = "豆豆课程组 · 技术学习与工程实践";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
const SITE_HOST = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://wwjjhh.online").host;

export default function Image() {
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
          padding: 80,
          border: "18px solid #111111",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 8, color: "#cc0000", fontWeight: 700 }}>
          LEARNING &amp; ENGINEERING NOTES
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 800, color: "#111111", lineHeight: 1 }}>
            豆豆课程组
          </div>
          <div style={{ display: "flex", fontSize: 46, color: "#333333", marginTop: 30 }}>
            Java · Systems · AI
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, color: "#555555" }}>
          <div style={{ display: "flex" }}>{SITE_HOST}</div>
          <div style={{ display: "flex" }}>@豆豆课程组</div>
        </div>
      </div>
    ),
    size,
  );
}
