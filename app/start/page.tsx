import Link from "next/link";
import { READING_PATHS } from "@/lib/universe";
import { staticPageMetadata } from "@/lib/og-base";

export const revalidate = 3600;
export const runtime = "nodejs";

export const metadata = staticPageMetadata({
  title: "从这里开始",
  description: "选择你的阅读目标，进入咖啡站宇宙的 Java、后端工程或部署路线。",
  path: "/start",
});

export default function StartPage() {
  return (
    <div className="page-shell narrow universe-page">
      <div className="page-title">
        <p className="eyebrow">Start Here · 从这里开始</p>
        <h1>别从目录里迷路</h1>
        <p>这不是按技术名词堆起来的资料库。先选你现在想抵达的地方，再沿一条完整路线往前读。</p>
      </div>

      <section className="universe-intro">
        <p className="eyebrow">咖啡站宇宙的阅读约定</p>
        <p>每一话都把一个技术问题放回咖啡站的成长：先遇到具体麻烦，再写代码、留证据、承认边界。读不完全部也没关系，路线会告诉你下一站。</p>
      </section>

      <div className="reading-paths">
        {READING_PATHS.filter((path) => path.availability === "open").map((path, index) => (
          <article className="card reading-path" key={path.title}>
            <p className="reading-path-no">路线 {String(index + 1).padStart(2, "0")}</p>
            <h2>{path.title}</h2>
            <p>{path.audience}</p>
            <ol>
              {path.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <Link className="button primary" href={path.route}>进入这条路线 →</Link>
          </article>
        ))}
      </div>

      <p className="universe-footnote">终端、部署与咖啡站本传仍在创作中；它们会在真正开更后出现在这张路线图里。</p>

      <p className="universe-footnote">想先看全貌而不是直接开始？去 <Link href={"/universe" as never}>咖啡站宇宙地图</Link>。</p>
    </div>
  );
}
