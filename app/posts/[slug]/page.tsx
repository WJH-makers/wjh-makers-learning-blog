import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPublishedPosts, getPublishedPost, getRelatedPosts, outboundDate, renderMarkdown, siteUrl } from "@/lib/posts";
import { CHAPTER_TYPE_LABEL } from "@/lib/series";
import { findEpisodeInfo } from "@/lib/series-registry";
import { findJavaLab } from "@/lib/java-labs";
import AdminEditLink from "./AdminEditLink";
import EpisodeProgress from "./EpisodeProgress";
import EpisodeExercises from "./EpisodeExercises";
import JavaLab from "./JavaLab";
import Comments from "./Comments";
import ShareBar from "./ShareBar";
import CodeCopy from "./CodeCopy";
import BookReader from "./BookReader";
import { getComments } from "@/lib/comments";
import { hasDatabaseConfig } from "@/lib/db";
import { jsonLdSafe, personRef } from "@/lib/jsonld";

type Props = {
  params: Promise<{ slug: string }>;
};

// JSON-LD wordCount 用:与 lib/text.ts estimateReadingMinutes 同源的统计口径
// (英文按空白分词 + CJK 每字计 1 词),但输出词数本身而非折算分钟。
function countWords(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const cjk = (content.match(/[一-鿿]/g) ?? []).length;
  return words + cjk;
}

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
  // 内容日历排到未来是有意为之,但对外声明未来的 publishedTime 会让搜索引擎拒绝索引,
  // 部分阅读器也会丢弃 —— 统一钳到「最晚是现在」。
  const isoDate = outboundDate(post.date).toISOString();

  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: url },
    openGraph: {
      // Next 对 openGraph 是整体替换而非深合并:siteName/locale 需在页面级补齐,否则丢失
      siteName: "豆豆课程组",
      locale: "zh_CN",
      title: post.title,
      description: post.summary,
      url,
      type: "article",
      publishedTime: isoDate,
      modifiedTime: isoDate,
      authors: ["豆豆课程组"],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  // 若本文属于任一连载,从注册表拿系列信息(banner + 上一话/下一话 + 进度)
  const info = findEpisodeInfo(post.slug);
  const javaLab = findJavaLab(post.slug);
  const episode = info?.episode;
  const season = info?.season;
  // Turnstile 是可选的反机器人增强；未配置时服务端仍会使用蜜罐与限流。
  // 因此不能把它作为渲染评论表单的前置条件，否则现有 MongoDB 部署会被误下线。
  const commentsEnabled = hasDatabaseConfig();

  const url = `${siteUrl()}/posts/${post.slug}`;
  const isoDate = outboundDate(post.date).toISOString();

  // 面包屑要走文章真实所在的路径:连载话次不在 /posts 列表里(那里被过滤掉了),
  // 声明「首页 > 博客 > 标题」是条不存在的路径。有系列信息就用系列层。
  const breadcrumbItems = info
    ? [
        { name: "首页", path: "/", item: siteUrl() },
        { name: "连载", path: "/series", item: `${siteUrl()}/series` },
        { name: info.series.title, path: info.series.route, item: `${siteUrl()}${info.series.route}` },
        { name: post.title, path: `/posts/${post.slug}`, item: url },
      ]
    : [
        { name: "首页", path: "/", item: siteUrl() },
        { name: "文章", path: "/posts", item: `${siteUrl()}/posts` },
        { name: post.title, path: `/posts/${post.slug}`, item: url },
      ];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: b.item,
    })),
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    url,
    image: `${url}/opengraph-image`,
    wordCount: countWords(post.content),
    datePublished: isoDate,
    dateModified: isoDate,
    author: personRef(siteUrl()),
    publisher: personRef(siteUrl()),
    keywords: post.tags.join(", "),
    inLanguage: "zh-CN",
    isAccessibleForFree: true,
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
  // 渲染器直出标题锚点 id 并返回结构化 headings —— TOC 与正文锚点天然一致,
  // 不再用正则反解析渲染后的 HTML 回填(含行内语法/重名标题时会静默失效)。
  // 渲染 / 相关文章 / 评论三者互不依赖,并行取(冷渲染与 ISR 再生约省 1/3 延迟)
  const [{ html: fullHtml, headings }, related, comments, allPosts] = await Promise.all([
    renderMarkdown(contentLines.join("\n").replace(/^\s+/, "")),
    getRelatedPosts(post.slug, post.tags),
    getComments(post.slug),
    getAllPublishedPosts(),
  ]);
  const tocItems = headings.filter((h) => h.level === 2);

  // 非连载文章(速查/笔记)按时间线取相邻文章；连载则按话次翻页。
  let chronoPrev: (typeof allPosts)[number] | undefined;
  let chronoNext: (typeof allPosts)[number] | undefined;
  if (!info) {
    const idx = allPosts.findIndex((p) => p.slug === post.slug);
    if (idx !== -1) {
      // allPosts 按日期倒序:下标更小 = 更新,更大 = 更旧
      chronoNext = allPosts[idx - 1]; // 更新的一篇
      chronoPrev = allPosts[idx + 1]; // 更旧的一篇
    }
  }

  const previous = info?.prev?.slug
    ? { href: `/posts/${info.prev.slug}` as Route, title: info.prev.title }
    : chronoPrev
      ? { href: `/posts/${chronoPrev.slug}` as Route, title: chronoPrev.title }
      : undefined;
  const next = info?.next?.slug
    ? { href: `/posts/${info.next.slug}` as Route, title: info.next.title }
    : chronoNext
      ? { href: `/posts/${chronoNext.slug}` as Route, title: chronoNext.title }
      : undefined;

  return (
    <BookReader previous={previous} next={next}>
      <article className="page-shell article-shell">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(articleJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumbJsonLd) }} />
      <Link className="back-link" href={info ? info.series.route : "/posts"}>
        ← {info ? `返回${info.series.title}` : "返回文章列表"}
      </Link>
      <nav className="crumbs" aria-label="面包屑">
        {breadcrumbItems.map((b, i) => (
          <span key={b.item}>
            {i < breadcrumbItems.length - 1 ? (
              <Link href={b.item.replace(siteUrl(), "") as never}>{b.name}</Link>
            ) : (
              <span aria-current="page">{b.name}</span>
            )}
            {i < breadcrumbItems.length - 1 && <span className="crumbs-sep">/</span>}
          </span>
        ))}
      </nav>
      <header className="article-header">
        <p className="date">{post.date} · {post.readingMinutes} min read</p>
        <h1>{post.title}</h1>
        <p>{post.summary}</p>
        <div className="tags">
          {post.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </header>

      {info && episode && season && (
        <aside className="series-banner">
          <p className="eyebrow">
            <Link href={info.series.route}>{info.series.title}</Link> · 第{season.season}卷「{season.title}」
          </p>
          <p>
            第 {episode.episode} 话 · {CHAPTER_TYPE_LABEL[episode.chapterType]} · 项目阶段:{episode.projectStage}
          </p>
        </aside>
      )}

      {info && episode && (
        <aside className="learning-outcome" aria-label="本话学习产出">
          <p className="eyebrow">本话学习产出 · 可复现，不是认证</p>
          <div className="learning-outcome-grid">
            <div><span>知识点</span><strong>{episode.technologies.join(" · ")}</strong></div>
            <div><span>项目增量</span><strong>{episode.projectStage}</strong></div>
            <div><span>完成动作</span><strong>{info.series.route === "/java" ? "本机 JDK 17 复现，再标记完成" : "在自己的终端复现，再标记完成"}</strong></div>
          </div>
          <p className="muted">完成标记和 Java 实验记录只保存在当前浏览器。<Link href="/learning">查看学习档案与复习提示 →</Link></p>
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
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.text}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="article-content" dangerouslySetInnerHTML={{ __html: fullHtml }} />
      <CodeCopy />

      <ShareBar url={url} title={post.title} />

      {info && season && (
        <section className="series-footer">
          <EpisodeProgress
            slug={post.slug}
            seasonLabel={`第${season.season}卷`}
            seasonSlugs={info.seasonSlugs}
            storageKey={info.series.storageKey}
          />
        </section>
      )}

      {/* 模板练习只做兜底:正文里已有手写「随堂练习」的话不再重复渲染 */}
      {info?.series.route === "/java" && episode && !post.content.includes("随堂练习") && (
        <EpisodeExercises
          title={episode.title}
          summary={episode.summary}
          technologies={episode.technologies}
          episode={episode.episode}
        />
      )}

      {javaLab && <JavaLab lab={javaLab} />}

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
        <Link className="button ghost" href="/archive">查看全量归档</Link>
        {/* 零 JS 返回顶部:fragment "top" 无对应元素时按 HTML 规范滚到文档顶,吃全站 scroll-behavior: smooth */}
        <a className="button ghost" href="#top">↑ 回到顶部</a>
      </nav>

      <aside className="follow-card">
        <p className="eyebrow">觉得有用?</p>
        <p className="follow-text">关注更新，或用 RSS 订阅{info ? `《${info.series.title}》` : "本站"}。</p>
        <div className="follow-links">
          <a href="/rss.xml" className="button ghost">RSS 订阅</a>
        </div>
      </aside>

        <Comments slug={post.slug} initial={comments} enabled={commentsEnabled} />
      </article>
    </BookReader>
  );
}
