import type { Metadata } from "next";
import Link from "next/link";
import { getAllPublishedPosts, siteUrl } from "@/lib/posts";
import { allSeriesProgress } from "@/lib/series-registry";
import { PROJECTS, STATUS_LABEL } from "@/lib/projects";
import { jsonLdSafe } from "@/lib/jsonld";
import { OG_BASE } from "@/lib/og-base";

export const revalidate = 86400;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "关于",
  description: "豆豆课程组:把工程知识写成漫画连载与可验证练习。",
  alternates: { canonical: `${siteUrl()}/about` },
  openGraph: {
    ...OG_BASE,
    title: "关于 | 豆豆课程组",
    description: "把工程知识写成漫画连载与可验证练习。",
    url: `${siteUrl()}/about`,
  },
};

// 技术栈按层归类,一眼看清广度而不是堆一长串。
const STACK: { group: string; items: string[] }[] = [
  { group: "编程基础", items: ["Java", "命令行", "Git", "SQL"] },
  { group: "工程实践", items: ["构建", "测试", "调试", "部署"] },
  { group: "系统主题", items: ["网络", "数据库", "并发", "分布式"] },
];

export default async function AboutPage() {
  const posts = await getAllPublishedPosts();
  const total = allSeriesProgress();
  const activeProjects = PROJECTS.filter((p) => p.status === "active" || p.status === "research");

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "关于 豆豆课程组",
    url: `${siteUrl()}/about`,
    description: "豆豆课程组 的技术学习与工程实践",
    inLanguage: "zh-CN",
    mainEntity: {
      "@type": "Organization",
      name: "豆豆课程组",
      alternateName: "豆豆课程组",
      url: `${siteUrl()}/about`,
      knowsAbout: ["Java", "命令行", "工程实践", "分布式系统", "JVM", "系统设计"],
    },
  };

  return (
    <div className="page-shell narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(personJsonLd) }} />

      <div className="page-title">
        <p className="eyebrow">About · 关于</p>
        <h1>豆豆课程组</h1>
        <p>
          面向初学者的工程课程与漫画连载,把抽象概念变成可执行、可验证的练习。
        </p>
      </div>

      {/* 实时数据条:让「关于」有可信的重量,数字全部由内容算出 */}
      <div className="about-stats">
        <span><strong>{posts.length}</strong> 篇文章</span>
        <span><strong>{total.lines}</strong> 条连载线</span>
        <span><strong>{total.done}</strong> 话已上线</span>
        <span><strong>{PROJECTS.length}</strong> 个项目</span>
      </div>

      <section className="about-block">
        <p>
          课程的标准只有一条:<strong>删掉所有技术名词之后,它仍然值得读</strong>。
          所以这个站上的教程都长成了漫画——阿零和豆豆在一家咖啡站里,把一行 Hello World
          一路建设成能扛住大促的分布式系统。技术是人物解决问题、承担后果、成长的方式,不是主题本身。
        </p>
        <p>
          正经的部分同样不含糊:代码要能跑、命令要可复现、结论要有验证。
          每一课都优先给出最小实验、边界测试和明确的下一步。
        </p>
      </section>

      <section className="about-section">
        <h2>技术栈</h2>
        <div className="about-stack">
          {STACK.map((row) => (
            <div key={row.group} className="about-stack-row">
              <span className="about-stack-group">{row.group}</span>
              <div className="about-stack-items">
                {row.items.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section">
        <h2>在做的事</h2>
        <ul className="about-projects">
          {activeProjects.map((project) => (
            <li key={project.name}>
              <span className="about-project-status">{STATUS_LABEL[project.status]}</span>
              <div>
                <strong>{project.name}</strong>
                <p>{project.lead}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="about-more">
          完整项目集见 <Link href="/projects">/projects</Link>,
          现在的状态见 <Link href="/now">/now</Link>,
          全站数据见 <Link href="/stats">/stats</Link>。
        </p>
      </section>

      <section className="about-section">
        <h2>从哪读起</h2>
        <div className="about-links">
          <Link href="/java" className="card">
            <strong>从零开始学 Java →</strong>
            <span>主线 56 话完结,阿零与豆豆的咖啡站</span>
          </Link>
          <Link href="/series" className="card">
            <strong>全部连载 →</strong>
            <span>{total.lines} 条线,覆盖 Java 工程师的整个知识面</span>
          </Link>
          <Link href="/cheatsheets" className="card">
            <strong>速查手册 →</strong>
            <span>命令与语法,按生命周期编排</span>
          </Link>
        </div>
      </section>

      <section className="about-section">
        <h2>订阅</h2>
        <ul className="about-contact">
          <li>订阅 · <a href="/rss.xml">RSS</a></li>
        </ul>
      </section>
    </div>
  );
}
