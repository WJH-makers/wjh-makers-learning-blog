import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteUrl } from "@/lib/site-config";
import { getAllPublishedTags, getPublishedPostIndex, getPublishedPostsByTag } from "@/lib/posts";
import { jsonLdSafe } from "@/lib/jsonld";
import { staticPageMetadata } from "@/lib/og-base";

type Props = {
  params: Promise<{ tag: string }>;
};

export async function generateStaticParams() {
  return (await getAllPublishedTags())
    // Next encodes the segment when it writes the URL. Returning the raw
    // value is required for dynamicParams=false to recognize the same tag.
    .map(({ tag }) => ({ tag }));
}

/**
 * 路由段解码不能裸调 decodeURIComponent:`/tags/%zz` 这类畸形百分号会抛 URIError,
 * 而它抛在 Server Component 渲染期 —— 结果是 500,不是 404。
 * 解不开就退回原字面量:它匹配不到任何真实标签,自然走下面的 notFound() 得到 404。
 */
function decodeTagSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}


/**
 * generateMetadata 跑在页面组件的 'use cache' 之外,直接读 getPublishedPostsByTag 会把
 * lib/posts.ts 那层 unstable_cache 的 revalidate(300s)按 min 语义上浮到路由,
 * 把下面的 cacheLife('content')(3600s)顶掉 —— 实测 333 个 /tags/<tag> 预渲染条目的
 * initialRevalidateSeconds 全是 300(expire 仍是 content 档的 86400),再生频次是设计意图的 12 倍。
 * 包进同档位的 'use cache' 后,那 300s 只作用于本缓存作用域,不再外泄。
 * 顺带走索引而非全文集合:metadata 只要条数。两者的公开口径同源
 * (都过 isReleasedDate 后合并 Markdown 与库),计数不会与页面正文分叉。
 */
async function getTagPostCount(tag: string): Promise<number> {
  "use cache";
  cacheLife("content");

  return (await getPublishedPostIndex()).filter((post) => post.tags.includes(tag)).length;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeTagSegment(tag);
  const count = await getTagPostCount(decoded);
  return staticPageMetadata({
    title: `标签：${decoded}`,
    description: `${decoded} 主题，共 ${count} 篇文章。`,
    path: `/tags/${encodeURIComponent(decoded)}`,
    robots: count < 2 ? { index: false, follow: true } : undefined,
    socialTitle: `标签：${decoded} | 咖啡站技术志`,
    socialDescription: `${decoded} 主题下的学习记录集合`,
  });
}

export default async function TagPage({ params }: Props) {
  "use cache";
  cacheLife("content");

  const { tag } = await params;
  const decoded = decodeTagSegment(tag);
  const posts = await getPublishedPostsByTag(decoded);

  // 替代原先的 dynamicParams = false（cacheComponents 不支持该配置）。
  // 那条配置的用途写在原注释里：拒绝任意参数，免得扫描器让 Next 建出无界 ISR 缓存路径。
  // 官方给的等价做法就是「参数解析不到真实数据时调 notFound()」——
  // 空标签一律 404，不落缓存条目，安全属性与删除前一致。
  if (posts.length === 0) notFound();

  const url = `${siteUrl()}/tags/${encodeURIComponent(decoded)}`;

  // 收集本标签下所有文章中出现频率最高的关联标签
  const relatedCounts = new Map<string, number>();
  for (const post of posts) {
    for (const t of post.tags) {
      if (t !== decoded) relatedCounts.set(t, (relatedCounts.get(t) ?? 0) + 1);
    }
  }
  const relatedTags = [...relatedCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `标签：${decoded}`,
    description: `${decoded} 相关学习记录`,
    url,
    inLanguage: "zh-CN",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((post, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteUrl()}/posts/${post.slug}`,
        name: post.title,
        description: post.summary,
      })),
    },
  };

  return (
    <div className="page-shell narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(collectionJsonLd) }} />
      <Link className="back-link" href="/tags">← 返回标签</Link>
      <div className="page-title">
        <p className="eyebrow">Topic Desk · {posts.length} 篇</p>
        <h1>{decoded}</h1>
        <p>{posts.length} 篇相关学习记录。</p>
      </div>

      {relatedTags.length > 0 && (
        <aside className="related-tags">
          <span className="eyebrow">关联标签</span>
          <div className="tag-cloud">
            {relatedTags.map(([t, c]) => (
              <Link key={t} href={`/tags/${encodeURIComponent(t)}`}>
                {t}<span>{c}</span>
              </Link>
            ))}
          </div>
        </aside>
      )}

      <div className="post-list">
        {posts.length > 0 ? posts.map((post) => (
          <article className="list-item" key={post.slug}>
            <time>{post.date}</time>
            <div>
              <h2><Link href={`/posts/${post.slug}`}>{post.title}</Link></h2>
              <p>{post.summary}</p>
              <div className="tags">
                {post.tags.filter((t) => t !== decoded).slice(0, 5).map((t) => (
                  <Link key={t} href={`/tags/${encodeURIComponent(t)}`}>{t}</Link>
                ))}
              </div>
            </div>
          </article>
        )) : (
          <div className="empty-state">
            <p className="eyebrow">Empty Topic</p>
            <h3>这个主题暂时没有文章。</h3>
            <Link className="button primary" href="/posts">去看全部文章</Link>
            <Link className="button" href="/tags">换个主题</Link>
          </div>
        )}
      </div>
    </div>
  );
}
