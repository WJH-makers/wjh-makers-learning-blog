import type { Metadata } from "next";
import { siteUrl } from "@/lib/posts";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "关于",
  description: "WJH-makers 的技术学习与工程实践。",
  openGraph: {
    title: "关于 | WJH-makers",
    description: "WJH-makers 的技术学习与工程实践",
    url: `${siteUrl()}/about`,
  },
};

export default function AboutPage() {
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "关于 WJH-makers",
    description: "WJH-makers 的技术学习与工程实践",
    mainEntity: {
      "@type": "Person",
      name: "WJH-makers",
      alternateName: "WJH-makers",
      url: "https://github.com/WJH-makers",
      knowsAbout: ["Java", "Spring", "全栈开发", "遥感视觉问答", "MoE", "系统设计"],
    },
  };

  return (
    <div className="page-shell narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      <div className="page-title">
        <p className="eyebrow">About</p>
        <h1>关于</h1>
      </div>

      <section style={{ marginTop: 32, borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "clamp(20px, 4vw, 40px)" }}>
        <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", marginBottom: 20 }}>WJH-makers</h2>
        <p style={{ fontSize: "1.03rem", lineHeight: 1.75, color: "var(--neutral-600)", textAlign: "justify" }}>
          我是 WJH-makers，CS 科班毕业、目前已在业界工作，专注于 Java 全栈开发、系统实践和遥感视觉问答研究。
        </p>
        <p style={{ fontSize: "1.03rem", lineHeight: 1.75, color: "var(--neutral-600)", textAlign: "justify", marginTop: 16 }}>
          这个博客记录我的技术学习路径：从 Java 基础到 Spring 工程实践，从 Linux 运维到 AI 系统调优。
          我的目标是写出真正能解决问题的内容——不只是命令的堆砌，而是有上下文、有思路、有验证的方法。
        </p>

        <h3 style={{ fontSize: "clamp(1.1rem, 2vw, 1.5rem)", marginTop: 32, marginBottom: 12 }}>内容方向</h3>
        <ul style={{ paddingLeft: 24, lineHeight: 1.8, color: "var(--neutral-600)" }}>
          <li><strong>Java 从零到项目</strong> —— 原创漫画教程，从 Hello World 到 Spring 项目实战</li>
          <li><strong>工程排障与速查</strong> —— Docker、Git、MySQL、Redis、JVM 实战排查</li>
          <li><strong>求职数据与技能地图</strong> —— Java 招聘市场分析，城市与技能趋势</li>
          <li><strong>AI 与系统项目</strong> —— 遥感 VQA、MoE、编译器、操作系统实践</li>
        </ul>

        <h3 style={{ fontSize: "clamp(1.1rem, 2vw, 1.5rem)", marginTop: 32, marginBottom: 12 }}>联系</h3>
        <ul style={{ paddingLeft: 24, lineHeight: 1.8, color: "var(--neutral-600)" }}>
          <li>GitHub：<a href="https://github.com/WJH-makers" target="_blank" rel="noreferrer">@WJH-makers</a></li>
          <li>博客：<a href="https://wwjjhh.online" target="_blank" rel="noreferrer">wwjjhh.online</a></li>
          <li>RSS：<a href="/rss.xml" target="_blank" rel="noreferrer">订阅更新</a></li>
        </ul>
      </section>
    </div>
  );
}
