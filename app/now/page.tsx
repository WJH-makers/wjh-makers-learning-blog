import Link from "next/link";
import { siteUrl } from "@/lib/posts";
import { jsonLdSafe } from "@/lib/jsonld";
import { staticPageMetadata } from "@/lib/og-base";

export const revalidate = 86400;
export const runtime = "nodejs";

// /now 页:一份手写的「此刻在忙什么」快照。改动只需编辑这里。
// 快照日期硬编码,提醒自己定期更新(过期的 /now 比没有更糟)。
const UPDATED = "2026-07-26";

const NOW = {
  focus: [
    "把 Java 工程师需要的整个知识面,写成同一个咖啡站宇宙下的十几条漫画连载 —— 蓝图先行,逐话开更。",
    "《豆豆咖啡站》收尾:纯故事线,十年前那杯没做完的拿铁,要在大结局送到。",
    "博客本身的持续打磨:渲染引擎、可观测性、SEO 与阅读体验。",
  ],
  learning: [
    "虚拟线程与结构化并发在真实负载下的取舍",
    "遥感多模态的小样本迁移",
    "MoE 的路由稳定性与负载均衡",
  ],
  reading: [
    "JVM 与 GC 的一手材料(JEP 与官方博客,而不是二手八股)",
    "分布式系统的经典论文重读",
  ],
};

export const metadata = staticPageMetadata({
  title: "现在",
  description: `咖啡站技术志此刻在更新什么、研究什么、阅读什么 —— 更新于 ${UPDATED}。`,
  path: "/now",
  socialTitle: "现在 | 咖啡站技术志",
  socialDescription: "此刻在做什么、在学什么、在读什么。",
});

export default function NowPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "现在 · 咖啡站技术志",
    url: `${siteUrl()}/now`,
    dateModified: UPDATED,
    inLanguage: "zh-CN",
  };

  return (
    <div className="page-shell narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }} />

      <div className="page-title">
        <p className="eyebrow">Now · 现在</p>
        <h1>此刻在忙什么</h1>
        <p>
          一份会过期的快照,更新于 {UPDATED}。灵感来自{" "}
          <a href="https://nownownow.com/about" target="_blank" rel="noreferrer">nownownow</a> 的 /now 页运动。
        </p>
      </div>

      <section className="now-block">
        <h2>正在做</h2>
        <ul>
          {NOW.focus.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="now-block">
        <h2>正在学</h2>
        <ul>
          {NOW.learning.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="now-block">
        <h2>正在读</h2>
        <ul>
          {NOW.reading.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <p className="now-more">项目全貌见 <Link href="/projects">/projects</Link>。</p>
    </div>
  );
}
