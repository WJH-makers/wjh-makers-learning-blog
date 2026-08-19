import Link from "next/link";
import { UNIVERSE_DISTRICTS, availabilityOf } from "@/lib/universe";
import { staticPageMetadata } from "@/lib/og-base";


export const metadata = staticPageMetadata({
  title: "咖啡站宇宙地图",
  description: "一张把 Java、命令行、故事、后端工程、项目与 AI 番外串起来的阅读地图。",
  path: "/universe",
});

export default function UniversePage() {
  return (
    <div className="page-shell universe-page">
      <div className="page-title">
        <p className="eyebrow">Universe Map · 咖啡站宇宙</p>
        <h1>技术永远长在故事里</h1>
        <p>亮着的区域可以立即进入；远处的雾区只说明世界观，不提供尚未开更的目录或链接。先读已经经得起阅读与验证的故事。</p>
      </div>

      <section className="universe-spine" aria-label="宇宙主脉络">
        <span>起点</span><i />
        <span>Java</span><i />
        <span>工程</span><i />
        <span>系统</span><i />
        <span>现实项目</span>
      </section>

      <div className="universe-grid">
        {UNIVERSE_DISTRICTS.map((district, index) => {
          const open = availabilityOf(district.route) === "open";
          const content = <>
            <p className="universe-card-no">区域 {String(index + 1).padStart(2, "0")} · {district.role}</p>
            <h2>{district.title}</h2>
            <p>{district.description}</p>
            <span>{open ? `项目阶段：${district.projectStage}` : "雾区 · 尚未开更"}</span>
          </>;

          return open ? (
            <Link className="card universe-card" href={district.route} key={district.title}>{content}</Link>
          ) : (
            <article className="card universe-card is-horizon" key={district.title}>{content}</article>
          );
        })}
      </div>

      <section className="universe-callout">
        <div>
          <p className="eyebrow">想按人物进入？</p>
          <h2>角色不是装饰，是技术叙事的导航。</h2>
        </div>
        <Link className="button" href={"/characters" as never}>查看角色档案 →</Link>
      </section>
    </div>
  );
}
