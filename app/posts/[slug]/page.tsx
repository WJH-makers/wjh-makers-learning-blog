import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPublishedPosts, getPublishedPost, getRelatedPosts, markdownToHtml, siteUrl, splitSections } from "@/lib/posts";
import { CHAPTER_TYPE_LABEL } from "@/lib/series";
import { findEpisodeInfo } from "@/lib/series-registry";
import AdminEditLink from "./AdminEditLink";
import EpisodeProgress from "./EpisodeProgress";
import EpisodeExercises from "./EpisodeExercises";
import Comments from "./Comments";
import ShareBar from "./ShareBar";
import { getComments } from "@/lib/comments";
import { jsonLdSafe } from "@/lib/jsonld";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const posts = await getAllPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export const revalidate = 604800;
export const runtime = "nodejs";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return {};

  const url = `${siteUrl()}/posts/${post.slug}`;

  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.summary,
      url,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.date,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
    },
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  // 若本文属于任一连载,从注册表拿系列信息(banner + 上一话/下一话 + 进度)
  const info = findEpisodeInfo(post.slug);
  const episode = info?.episode;
  const season = info?.season;

  const url = `${siteUrl()}/posts/${post.slug}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: siteUrl() },
      { "@type": "ListItem", position: 2, name: "博客", item: `${siteUrl()}/posts` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    url,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: "WJH-makers",
      alternateName: "WJH-makers",
      url: "https://github.com/WJH-makers",
    },
    keywords: post.tags.join(", "),
    inLanguage: "zh-CN",
    articleSection: season ? `第${season.season}卷 · ${season.title}` : undefined,
    isPartOf: info
      ? {
          "@type": "CreativeWorkSeries",
          name: info.series.title,
          url: `${siteUrl()}${info.series.route}`,
        }
      : undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  // 去除文章首行 H1（如果与标题重复）
  const contentLines = post.content.split("\n");
  if (contentLines[0]?.replace(/^#\s+/, "").trim() === post.title.trim()) {
    contentLines.shift();
  }
  const fullHtml = await markdownToHtml(contentLines.join("\n").replace(/^\s+/, ""));

  // 提取章节标题用于 TOC（仅 h2）
  const sections = splitSections(post.content);
  const tocItems = sections
    .map((s, i) => ({ title: s.title, index: i, id: slugify(s.title) }))
    .filter((s) => s.title);

  // 为 h2 标签注入 id 用于锚点
  // 为 h2 注入锚点 id：用转义后的标题匹配与回填(不撤销渲染器的转义),
  // 并对正则源做转义,防止标题里的特殊字符构造畸形正则或 $ 反向引用。
  const htmlWithIds = tocItems.reduce((html, item) => {
    const escTitle = escapeHtml(item.title);
    const pattern = escTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return html.replace(new RegExp(`<h2>${pattern}</h2>`), () => `<h2 id="${item.id}">${escTitle}</h2>`);
  }, fullHtml);

  const related = await getRelatedPosts(post.slug, post.tags);
  const comments = await getComments(post.slug);

  return (
    <article className="page-shell article-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumbJsonLd) }} />
      <Link className="back-link" href="/posts">← 返回文章列表</Link>
      <header className="article-header">
        <p className="date">{post.date} · {post.readingMinutes} min read</p>
        <h1>{post.title}</h1>
        <p>{post.summary}</p>
        <div className="tags">
          {post.tags.map((tag) => <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>)}
        </div>
      </header>

      {info && episode && season && (
        <aside className="series-banner">
          <p className="eyebrow">
            <Link href={info.series.route as Route}>{info.series.title}</Link> · 第{season.season}卷「{season.title}」
          </p>
          <p>
            第 {episode.episode} 话 · {CHAPTER_TYPE_LABEL[episode.chapterType]} · 项目阶段:{episode.projectStage}
          </p>
        </aside>
      )}

      {info?.series.route === "/java" && episode && episode.season < 3 && (
        <aside className="learning-prerequisite" aria-label="测试代码前置说明">
          <p className="eyebrow">课程约定 · 测试代码</p>
          <p>
            本页的 JUnit 片段用于提前建立“用测试留证据”的习惯；它们不是独立的 <code>javac</code> 文件。
            第 29 话会完整配置 Maven、JUnit 依赖和 <code>src/test/java</code> 目录；在那之前，可先阅读断言的含义，或在已配置 JUnit 的 IDE 项目中运行。
          </p>
        </aside>
      )}

      {tocItems.length > 1 && (
        <nav className="section-toc" aria-label="目录">
          <p className="eyebrow">目录</p>
          <ol>
            {tocItems.map((item) => (
              <li key={item.index}>
                <a href={`#${item.id}`}>{item.title}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="article-content" dangerouslySetInnerHTML={{ __html: htmlWithIds }} />

      <ShareBar url={url} title={post.title} />

      {info && season && (
        <section className="series-footer">
          <EpisodeProgress
            slug={post.slug}
            seasonLabel={`第${season.season}卷`}
            seasonSlugs={info.seasonSlugs}
            storageKey={info.series.storageKey}
          />
          <nav className="series-pager" aria-label="连载导航">
            {info.prev?.slug ? (
              <Link className="series-pager-link prev" href={`/posts/${info.prev.slug}`}>
                <span className="eyebrow">上一话</span>
                <span>{info.prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            <Link className="series-pager-link map" href={info.series.route as Route}>
              <span className="eyebrow">目录</span>
              <span>全卷地图</span>
            </Link>
            {info.next?.slug ? (
              <Link className="series-pager-link next" href={`/posts/${info.next.slug}`}>
                <span className="eyebrow">下一话</span>
                <span>{info.next.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </section>
      )}

      {info?.series.route === "/java" && episode && (
        <EpisodeExercises
          title={episode.title}
          summary={episode.summary}
          technologies={episode.technologies}
          episode={episode.episode}
        />
      )}

      {related.length > 0 && (
        <section className="related-posts">
          <p className="eyebrow">相关阅读</p>
          <ul>
            {related.map((p) => (
              <li key={p.slug}>
                <Link href={`/posts/${p.slug}`}>{p.title}</Link>
                <span>{p.tags.filter((t) => !["Java", "Java漫画", "阿零与豆豆"].includes(t)).slice(0, 3).join(" · ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="article-actions" aria-label="文章操作">
        <AdminEditLink slug={post.slug} />
        <Link className="button" href="/posts">更多文章 →</Link>
        <Link className="button ghost" href="/tags">按标签检索</Link>
      </nav>

      <aside className="follow-card">
        <p className="eyebrow">觉得有用?</p>
        <p className="follow-text">关注更新、源码在 GitHub,或用 RSS 订阅《从零开始学 Java》连载。</p>
        <div className="follow-links">
          <a href="https://github.com/WJH-makers" target="_blank" rel="noreferrer" className="button">GitHub @WJH-makers</a>
          <a href="/rss.xml" className="button ghost">RSS 订阅</a>
        </div>
      </aside>

      <Comments slug={post.slug} initial={comments} />
    </article>
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
