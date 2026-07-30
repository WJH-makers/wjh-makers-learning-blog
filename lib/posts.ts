import fs from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getDatabasePost, getDatabasePosts } from "@/lib/db";
import { estimateReadingMinutes } from "@/lib/text";
import { isAlwaysPublicCurriculum, isPublicOn } from "@/lib/publication";

// 渲染引擎已拆到 lib/markdown.ts(纯函数、可单测);此处 re-export 保持既有 import 路径不变。
export { markdownToHtml, renderMarkdown } from "@/lib/markdown";
export type { Heading } from "@/lib/markdown";

export type Post = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  readingMinutes: number;
  content: string;
};

export function isPublicPost(post: Pick<Post, "date" | "slug">, now = new Date()): boolean {
  return isAlwaysPublicCurriculum(post.slug) || isPublicOn(post.date, now);
}

const postsDirectory = path.join(process.cwd(), "content", "posts");

function parseFrontMatter(raw: string): { data: Record<string, string>; content: string } {
  if (!raw.startsWith("---")) return { data: {}, content: raw.trim() };

  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, content: raw.trim() };

  const frontMatter = raw.slice(3, end).trim();
  const content = raw.slice(end + 4).trim();
  const data: Record<string, string> = {};

  for (const line of frontMatter.split(/\r?\n/)) {
    const splitAt = line.indexOf(":");
    if (splitAt === -1) continue;
    const key = line.slice(0, splitAt).trim();
    const value = line.slice(splitAt + 1).trim().replace(/^['\"]|['\"]$/g, "");
    data[key] = value;
  }

  return { data, content };
}

function parseTags(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((tag) => tag.trim().replace(/^['\"]|['\"]$/g, ""))
    .filter(Boolean);
}

function postFromFile(fileName: string): Post {
  const slug = fileName.replace(/\.md$/, "");
  const filePath = path.join(postsDirectory, fileName);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = parseFrontMatter(raw);

  return {
    slug,
    title: data.title ?? slug,
    date: data.date ?? new Date().toISOString().slice(0, 10),
    summary: data.summary ?? "学习记录",
    tags: parseTags(data.tags),
    readingMinutes: estimateReadingMinutes(content),
    content,
  };
}

// 生产环境 md 文件随镜像不可变,进程级缓存一次读取;dev 下每次重读以便热更内容。
// 没有它,每次 getAllPosts 都全量重读 75+ 个文件,文章页一次渲染(metadata/正文/相关阅读)要跑多遍。
let mdPostsCache: Post[] | undefined;

export function getAllPosts(): Post[] {
  if (process.env.NODE_ENV === "production" && mdPostsCache) return mdPostsCache;
  if (!fs.existsSync(postsDirectory)) return [];
  const posts = fs
    .readdirSync(postsDirectory)
    .filter((file) => file.endsWith(".md"))
    .map(postFromFile)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (process.env.NODE_ENV === "production") mdPostsCache = posts;
  return posts;
}

export function getPost(slug: string): Post | undefined {
  return getAllPosts().find((post) => post.slug === slug);
}

// 公共文章会同时被首页、归档、标签、RSS、sitemap 和文章页读取。数据库内容只在
// 发布/编辑时改变，不能让每一次 ISR 再生都重新扫 MongoDB。此标签在写作台保存后
// 由 updateTag 立即失效，兼顾高并发阅读与“发布后马上可见”。
export const PUBLIC_POSTS_CACHE_TAG = "public-posts-v1";

const getCachedDatabasePosts = unstable_cache(
  async (): Promise<Post[]> => getDatabasePosts(),
  ["published-database-posts-v1"],
  { revalidate: 300, tags: [PUBLIC_POSTS_CACHE_TAG] },
);

const getCachedDatabasePost = unstable_cache(
  async (slug: string): Promise<Post | undefined> => getDatabasePost(slug),
  ["published-database-post-by-slug-v1"],
  { revalidate: 300, tags: [PUBLIC_POSTS_CACHE_TAG] },
);

// React cache():同一次请求/再生内去重(generateMetadata 与页面组件各查一次 → 只打一次 DB)。
export const getAllPublishedPosts = cache(async (): Promise<Post[]> => {
  const markdownPosts = getAllPosts();
  let databasePosts: Post[] = [];

  try {
    databasePosts = await getCachedDatabasePosts();
  } catch (error) {
    console.warn("[learning-blog] database read failed, falling back to Markdown only:", error);
  }

  const merged = new Map<string, Post>();
  for (const post of markdownPosts) merged.set(post.slug, post);
  for (const post of databasePosts) merged.set(post.slug, post);

  return [...merged.values()]
    .filter((post) => isPublicPost(post))
    .sort((a, b) => b.date.localeCompare(a.date));
});

export const getPublishedPost = cache(async (slug: string): Promise<Post | undefined> => {
  try {
    const databasePost = await getCachedDatabasePost(slug);
    if (databasePost) return isPublicPost(databasePost) ? databasePost : undefined;
  } catch (error) {
    console.warn("[learning-blog] database post read failed, falling back to Markdown:", error);
  }
  const post = getPost(slug);
  return post && isPublicPost(post) ? post : undefined;
});

export function getAllTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of getAllPosts().filter((post) => isPublicPost(post))) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag, "zh-Hans-CN"));
}

export async function getAllPublishedTags(): Promise<{ tag: string; count: number }[]> {
  const counts = new Map<string, number>();
  for (const post of await getAllPublishedPosts()) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag, "zh-Hans-CN"));
}

export function getPostsByTag(tag: string): Post[] {
  const decoded = decodeURIComponent(tag);
  return getAllPosts().filter((post) => isPublicPost(post) && post.tags.includes(decoded));
}

export async function getPublishedPostsByTag(tag: string): Promise<Post[]> {
  const decoded = decodeURIComponent(tag);
  return (await getAllPublishedPosts()).filter((post) => post.tags.includes(decoded));
}

/** 按共享的「具体主题标签」推荐相关文章(忽略 Java/Java漫画 等泛标签,避免连载话彼此刷屏)。 */
const RELATED_STOP_TAGS = new Set(["Java", "Java漫画", "阿零与豆豆", "命令速查", "豆豆咖啡站", "治愈", "编程漫画"]);

export async function getRelatedPosts(slug: string, tags: string[], limit = 4): Promise<Post[]> {
  const topical = tags.filter((t) => !RELATED_STOP_TAGS.has(t));
  if (topical.length === 0) return [];
  const all = await getAllPublishedPosts();
  return all
    .filter((p) => p.slug !== slug)
    .map((p) => ({ post: p, score: p.tags.filter((t) => topical.includes(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
    .slice(0, limit)
    .map((x) => x.post);
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://wwjjhh.online").replace(/\/$/, "");
}

/**
 * 对外声明日期时的钳制:内容日历排到未来是有意为之(连载按剧情时间线排期),
 * 但 RSS/sitemap/JSON-LD 携带未来时间会被吃掉 —— Search Console 忽略未来 lastmod,
 * 部分阅读器直接丢弃未来条目。站内展示仍用原始 date,只在这些出口钳到"最晚是现在"。
 */
export function outboundDate(date: string): Date {
  const parsed = Date.parse(date);
  const now = Date.now();
  return new Date(Number.isNaN(parsed) ? now : Math.min(parsed, now));
}
