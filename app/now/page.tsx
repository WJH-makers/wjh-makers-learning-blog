import Link from "next/link";
import { SITE_NAME, siteUrl } from "@/lib/site-config";
import { jsonLdSafe } from "@/lib/jsonld";
import { staticPageMetadata } from "@/lib/og-base";

export const revalidate = 86400;
export const runtime = "nodejs";

// /now 页:一份手写的「此刻在忙什么」快照。改动只需编辑这里。
// 快照日期硬编码,提醒自己定期更新(过期的 /now 比没有更糟)。
const UPDATED = "2026-08-06";

const NOW = {
  focus: [
    "《JVM 火种纪》已经开更:以 Java 25 为稳定基线,每篇发布前重新核对 OpenJDK JEP 状态和可运行示例。",
    "Java、命令行与《豆豆咖啡站》主线已经完结,正在把内容从“文章堆”整理成可按目标进入、可持续复习的工程知识地图。",
    "继续打磨博客分发与阅读链路:静态资源、连载导航、阅读进度、可观测性和搜索入口。",
    "把 Windows 游戏/开发工作站收束成可验证的边界:Java 多版本、WSL2 GPU、缓存和容器后端各司其职。",
  ],
  learning: [
    "Java 25 的稳定能力与预览 API 边界,尤其是结构化并发、AOT 缓存和 JVM 可观测性",
    "遥感多模态的小样本迁移",
    "MoE 的路由稳定性与负载均衡",
  ],
  reading: [
    "OpenJDK 25/26 的 JEP、规范与发行说明,并跟踪 JDK 27 早期访问版的变化",
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
    name: `现在 · ${SITE_NAME}`,
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
