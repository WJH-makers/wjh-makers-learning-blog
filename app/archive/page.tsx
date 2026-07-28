import type { Metadata } from "next";
import Link from "next/link";
import { getAllPublishedPosts, siteUrl, type Post } from "@/lib/posts";
import { findEpisodeInfo } from "@/lib/series-registry";
import { jsonLdSafe } from "@/lib/jsonld";
import { OG_BASE } from "@/lib/og-base";

export const revalidate = 3600;
export const runtime = "nodejs";

const TITLE = "全量归档";
const DESC = "站内每一篇文章的完整时间线 —— 连载话次、速查手册、学习笔记,按年月倒序,一页看尽。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: `${siteUrl()}/archive` },
  openGraph: {
    ...OG_BASE,
    title: TITLE,
    description: DESC,
    url: `${siteUrl()}/archive`,
    type: "website",
  },
};

type Group = { key: string; year: string; month: string; posts: Post[] };

function groupByMonth(posts: Post[]): Group[] {
  const map = new Map<string, Post[]>();
  for (const post of posts) {
    const key = post.date.slice(0, 7); // YYYY-MM
    const bucket = map.get(key);
    if (bucket) bucket.push(post);
    else map.set(key, [post]);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, list]) => ({
      key,
      year: key.slice(0, 4),
      month: key.slice(5, 7),
      posts: list,
    }));
}

export default async function ArchivePage() {
  const posts = await getAllPublishedPosts();
  const groups = groupByMonth(posts);
  const years = [...new Set(groups.map((g) => g.year))];

  return (
    <div className="page-shell narrow">
      <div className="page-title">
        <p className="eyebrow">Full Archive · 全量归档</p>
        <h1>{TITLE}</h1>
        <p>
          共 <strong>{posts.length}</strong> 篇,跨 {years.length} 个年份。
          连载话次带系列徽标;想按主题找请去 <Link href="/tags">标签</Link>,想按连载找请去{" "}
          <Link href="/series">连载总台</Link>。
        </p>
      </div>

      <nav className="archive-jump" aria-label="按年份跳转">
        {years.map((year) => (
          <a key={year} href={`#y${year}`}>
            {year}
          </a>
        ))}
      </nav>

      {groups.map((group, index) => {
        const isYearStart = index === 0 || groups[index - 1].year !== group.year;
        return (
          <section key={group.key} className="archive-month">
            {isYearStart && (
              <h2 id={`y${group.year}`} className="archive-year">
                {group.year}
              </h2>
            )}
            <h3 className="archive-month-head">
              {group.month} 月 <span className="muted">· {group.posts.length} 篇</span>
            </h3>
            <ul className="archive-list">
              {group.posts.map((post) => {
                const info = findEpisodeInfo(post.slug);
                return (
                  <li key={post.slug}>
                    <time dateTime={post.date}>{post.date.slice(5)}</time>
                    <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                    {info && <span className="archive-badge">{info.series.title}</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
