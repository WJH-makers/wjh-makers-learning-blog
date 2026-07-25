import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPublishedPosts, getPublishedPost, getRelatedPosts, markdownToHtml, siteUrl, splitSections } from "@/lib/posts";
import { episodeBySlug, neighborsOf, SEASONS, SERIES_META, CHAPTER_TYPE_LABEL } from "@/lib/series";
import AdminEditLink from "./AdminEditLink";
import EpisodeProgress from "./EpisodeProgress";
import Comments from "./Comments";
import { getComments } from "@/lib/comments";

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

  // 若本文是 Java 连载的某一话,准备系列信息(顶部 banner + 上一话/下一话 + 进度)
  const episode = episodeBySlug(post.slug);
  const season = episode ? SEASONS.find((s) => s.season === episode.season) : undefined;
  const seriesNav = episode ? neighborsOf(post.slug) : {};
  const seasonSlugs = season
    ? season.episodes.filter((e) => e.status === "published" && e.slug).map((e) => e.slug as string)
    : [];

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
    isPartOf: episode
      ? {
          "@type": "CreativeWorkSeries",
          name: SERIES_META.title,
          url: `${siteUrl()}/java`,
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
  const htmlWithIds = tocItems.reduce((html, item) => {
    const h2Regex = new RegExp(`<h2>${escapeHtml(item.title)}</h2>`);
    return html.replace(h2Regex, `<h2 id="${item.id}">${item.title}</h2>`);
  }, fullHtml);

  const related = await getRelatedPosts(post.slug, post.tags);
  const comments = await getComments(post.slug);

  return (
    <article className="page-shell article-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Link className="back-link" href="/posts">← 返回文章列表</Link>
      <header className="article-header">
        <p className="date">{post.date} · {post.readingMinutes} min read</p>
        <h1>{post.title}</h1>
        <p>{post.summary}</p>
        <div className="tags">
          {post.tags.map((tag) => <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>)}
        </div>
      </header>

      {episode && season && (
        <aside className="series-banner">
          <p className="eyebrow">
            <Link href={"/java" as Route}>{SERIES_META.title}</Link> · 第{season.season}卷「{season.title}」
          </p>
          <p>
            第 {episode.episode} 话 · {CHAPTER_TYPE_LABEL[episode.chapterType]} · 项目阶段:{episode.projectStage}
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

      {episode && season && (
        <section className="series-footer">
          <EpisodeProgress
            slug={post.slug}
            seasonLabel={`第${season.season}卷`}
            seasonSlugs={seasonSlugs}
          />
          <nav className="series-pager" aria-label="连载导航">
            {seriesNav.prev?.slug ? (
              <Link className="series-pager-link prev" href={`/posts/${seriesNav.prev.slug}`}>
                <span className="eyebrow">上一话</span>
                <span>{seriesNav.prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            <Link className="series-pager-link map" href={"/java" as Route}>
              <span className="eyebrow">目录</span>
              <span>全卷地图</span>
            </Link>
            {seriesNav.next?.slug ? (
              <Link className="series-pager-link next" href={`/posts/${seriesNav.next.slug}`}>
                <span className="eyebrow">下一话</span>
                <span>{seriesNav.next.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </section>
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
