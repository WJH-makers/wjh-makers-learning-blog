import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteUrl } from "@/lib/site-config";
import { getPublishedPost, getPublishedPostIndex, getRelatedPosts, outboundDate, renderMarkdown } from "@/lib/posts";
import { CHAPTER_TYPE_LABEL } from "@/lib/series";
import { findEpisodeInfo } from "@/lib/series-registry";
import { findJavaLab } from "@/lib/java-labs";
import AdminEditLink from "./AdminEditLink";
import EpisodeProgress from "./EpisodeProgress";
import EpisodeExercises from "./EpisodeExercises";
import Comments from "./Comments";
import ShareBar from "./ShareBar";
import CodeCopy from "./CodeCopy";
import BookReader from "./BookReader";
import JavaLab from "./JavaLab";
import { getComments, isCommentingEnabled } from "@/lib/comments";
import { jsonLdSafe, publisherRef } from "@/lib/jsonld";
import { OG_BASE } from "@/lib/og-base";
import { publicAssetUrl } from "@/lib/assets";

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
  const posts = await getPublishedPostIndex();
  return posts.map((post) => ({ slug: post.slug }));
}


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
      // Next 对 openGraph 是整体替换而非深合并:siteName/locale 需在页面级补齐,否则丢失。
      // OG_BASE 就是为此存在的（见 lib/og-base.ts 注释），这里原先内联了一份同值副本。
      ...OG_BASE,
      title: post.title,
      description: post.summary,
      url,
      type: "article",
      publishedTime: isoDate,
      modifiedTime: isoDate,
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
  "use cache";
  cacheLife("article");

  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  // 若本文属于任一连载,从注册表拿系列信息(banner + 上一话/下一话 + 进度)
  const info = findEpisodeInfo(post.slug);
  const javaLab = findJavaLab(post.slug);
  const episode = info?.episode;
  const season = info?.season;
  const commentsEnabled = isCommentingEnabled();
  // 正文已有逐话漫画时保持原样；尚未制作逐话位图的连载使用明确标注的系列共用封面，
  // 页面不会再出现“chapterType=comic 但实际零视觉”的断层，也不冒充逐话漫画。
  const seriesLeadVisual = info?.series.comicCast
    && !/!\[[^\]]*\]\(\/(?:comics|images)\//.test(post.content)
    ? info.series.comicCast
    : undefined;

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
    author: publisherRef(siteUrl()),
    publisher: publisherRef(siteUrl()),
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
    getPublishedPostIndex(),
  ]);
  const tocItems = headings.filter((h) => h.level === 2);

  // 命令行/部署类教学文章会大量出现 /etc、/var 这类系统绝对路径。它们是发行版通用的
  // 标准目录（Ubuntu 官方文档同样这么写），不是本站环境泄漏；但自动化漏洞扫描器只按
  // 「像绝对路径」的字面形态判定，会一律归为「文件路径泄漏」。
  // 与其把路径占位化（读者照抄即失败，教学价值归零），不如在同一页面内声明示例性质，
  // 让人工复核环节能直接看到判据。判定放在渲染后的 HTML 上，避免漏掉正文之外的片段。
  const hasSystemPathExamples = /\/(etc|var|usr|opt|srv)\/[A-Za-z0-9_.@-]/.test(fullHtml);

  // 非连载文章(速查/笔记)按时间线取上下篇,让它们也有前进/后退的路径。
  // 连载话次已有专属的 series-pager,这里只服务其余文章。
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
          {post.tags.map((tag) => <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>)}
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

      {info?.series.route === "/java" && episode && episode.season < 3 && (
        <aside className="learning-prerequisite" aria-label="测试代码前置说明">
          <p className="eyebrow">课程约定 · 测试代码</p>
          <p>
            本页的 JUnit 片段用于提前建立“用测试留证据”的习惯；它们不是独立的 <code>javac</code> 文件。
            第 29 话会完整配置 Maven、JUnit 依赖和 <code>src/test/java</code> 目录；在那之前，可先阅读断言的含义，或在已配置 JUnit 的 IDE 项目中运行。
          </p>
        </aside>
      )}

      {seriesLeadVisual && (
        <figure className="article-series-visual">
          <picture>
            <source
              type="image/avif"
              srcSet={`${publicAssetUrl(`${seriesLeadVisual.image}-512.avif`)} 512w, ${publicAssetUrl(`${seriesLeadVisual.image}.avif`)} 1024w`}
              sizes="(max-width: 760px) calc(100vw - 32px), 720px"
            />
            <source
              type="image/webp"
              srcSet={`${publicAssetUrl(`${seriesLeadVisual.image}-512.webp`)} 512w, ${publicAssetUrl(`${seriesLeadVisual.image}.webp`)} 1024w`}
              sizes="(max-width: 760px) calc(100vw - 32px), 720px"
            />
            <img
              src={publicAssetUrl(`${seriesLeadVisual.image}.webp`)}
              alt={seriesLeadVisual.alt}
              width={1024}
              height={1536}
              loading="eager"
              decoding="async"
            />
          </picture>
          <figcaption>系列共用视觉 · {seriesLeadVisual.title}</figcaption>
        </figure>
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

      {hasSystemPathExamples && (
        <aside className="article-demo-notice" aria-label="示例环境说明">
          <p className="eyebrow">Demo Environment · 示例环境说明</p>
          <p>
            本文含 Linux 系统路径、主机名与账户名的命令示例。其中
            <code>/etc</code>、<code>/var</code>、<code>/usr</code> 等为各发行版通用的标准目录，
            属公开技术常识；其余项目名、域名与用户名（如「豆豆咖啡站」、<code>coffee</code>、
            <code>azero</code>）均为本连载虚构的教学演示环境，与本站及作者实际运行环境无关，
            照抄不会指向任何真实主机或凭据。
          </p>
        </aside>
      )}

      <div className="article-content" dangerouslySetInnerHTML={{ __html: fullHtml }} />
      <CodeCopy />

      <aside className="article-rights" aria-label="版权与转载说明">
        <p className="eyebrow">Original Work · 版权说明</p>
        <p>本文为原创技术内容。欢迎引用标题、链接与必要短摘录；禁止批量抓取、镜像全文、去署名转载或未经授权的商业使用。</p>
      </aside>

      <ShareBar url={url} title={post.title} />

      {info && season && (
        <section className="series-footer">
          <EpisodeProgress
            slug={post.slug}
            seasonLabel={`第${season.season}卷`}
            seasonSlugs={info.seasonSlugs}
            storageKey={info.series.storageKey}
          />
          <Link className="button" href={info.series.route}>返回全卷地图</Link>
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
        <Link className="button ghost" href="/tags">按标签检索</Link>
        {/* 零 JS 返回顶部:RootLayout 在 body 上提供稳定的 top 锚点。 */}
        <a className="button ghost" href="#top">↑ 回到顶部</a>
      </nav>

      <aside className="follow-card">
        <p className="eyebrow">觉得有用?</p>
        <p className="follow-text">用 RSS 订阅本站更新，或从下一话继续点亮你的学习地图。</p>
        <div className="follow-links">
          <Link href="/start" className="button">继续阅读</Link>
          <a href="/rss.xml" className="button ghost">RSS 订阅</a>
        </div>
      </aside>

      <Comments slug={post.slug} initial={comments} enabled={commentsEnabled} />
    </article>
    </BookReader>
  );
}
