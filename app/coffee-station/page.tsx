import Link from "next/link";
import { cacheLife } from "next/cache";
import { COFFEE_PROJECT_STAGES, availabilityOf } from "@/lib/universe";
import { staticPageMetadata } from "@/lib/og-base";


export const metadata = staticPageMetadata({
  title: "豆豆咖啡站项目线",
  description: "从一行 Java 输出到可部署系统：咖啡站是整个漫画宇宙共享的长期项目。",
  path: "/coffee-station",
});

export default async function CoffeeStationPage() {
  "use cache";
  cacheLife("content");

  return (
    <div className="page-shell narrow universe-page">
      <div className="page-title">
        <p className="eyebrow">Long-term Project · 豆豆咖啡站</p>
        <h1>一间店，贯穿整个宇宙</h1>
        <p>知识点不单独毕业。它们会回到同一间咖啡站，变成菜单、订单、库存、服务、故障与重新营业的能力。</p>
      </div>

      <ol className="coffee-timeline">
        {COFFEE_PROJECT_STAGES.map((stage, index) => (
          <li key={stage.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <article>
              <h2>{stage.title}</h2>
              <p>{stage.summary}</p>
              {availabilityOf(stage.route) === "open" ? (
                <Link href={stage.route}>查看关联世界 →</Link>
              ) : (
                <span className="muted">后续篇章 · 尚未开更</span>
              )}
            </article>
          </li>
        ))}
      </ol>

      <section className="universe-intro">
        <p className="eyebrow">现实与故事的边界</p>
        <p>咖啡站是教学世界里的长期项目；现实项目的运行记录、压测和复现要求则放在 <Link href="/career">工程师航线</Link>。两者互相照亮，但不把示意代码冒充生产事实。</p>
      </section>
    </div>
  );
}
