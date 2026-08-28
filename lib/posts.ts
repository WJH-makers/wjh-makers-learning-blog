import fs from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { PUBLIC_POSTS_REVALIDATE_SECONDS } from "@/lib/cache-policy";
import { getDatabasePost, getDatabasePostIndex, getDatabasePosts } from "@/lib/db";
import { estimateReadingMinutes } from "@/lib/text";
import { isReleasedDate, shanghaiDate } from "@/lib/publication";
import { mergePublishedPostIndex, type PostIndexEntry } from "@/lib/post-index";

export { mergePublishedPostIndex, type PostIndexEntry } from "@/lib/post-index";
export { outboundDate } from "@/lib/publication";

export const PUBLIC_POSTS_CACHE_TAG = "public-posts-v1";

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

export function isPublicPost(post: Pick<Post, "date" | "slug">): boolean {
  return isReleasedDate(post.date);
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
    date: data.date ?? shanghaiDate(),
    // excerpt 是安全网:曾有 30 篇 JVM 连载写成 excerpt,静默退化成兜底文案,
    // 把 meta description / OG 卡片 / JSON-LD / 页面导语一起拖成"学习记录"。
    // 正式约定仍是 summary —— tests/content-frontmatter.test.ts 禁止新增 excerpt。
    summary: data.summary ?? data.excerpt ?? "学习记录",
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

const getCachedDatabasePosts = unstable_cache(
  async (): Promise<Post[]> => getDatabasePosts(),
  ["published-database-posts-v1"],
  { revalidate: PUBLIC_POSTS_REVALIDATE_SECONDS, tags: [PUBLIC_POSTS_CACHE_TAG] },
);

const getCachedDatabasePostIndex = unstable_cache(
  async (): Promise<PostIndexEntry[]> => getDatabasePostIndex(),
  ["published-database-post-index-v1"],
  { revalidate: PUBLIC_POSTS_REVALIDATE_SECONDS, tags: [PUBLIC_POSTS_CACHE_TAG] },
);

const getCachedDatabasePost = unstable_cache(
  async (slug: string): Promise<Post | undefined> => getDatabasePost(slug),
  ["published-database-post-by-slug-v1"],
  { revalidate: PUBLIC_POSTS_REVALIDATE_SECONDS, tags: [PUBLIC_POSTS_CACHE_TAG] },
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
    .filter(isPublicPost)
    .sort((a, b) => b.date.localeCompare(a.date));
});

/** Content-free index for navigation, sitemap, tags and recommendations. */
export const getPublishedPostIndex = cache(async (): Promise<PostIndexEntry[]> => {
  const markdownIndex = getAllPosts().map(({ slug, title, date, summary, tags }) => ({ slug, title, date, summary, tags }));
  let databaseIndex: PostIndexEntry[] = [];
  try {
    databaseIndex = await getCachedDatabasePostIndex();
  } catch (error) {
    console.warn("[learning-blog] database index read failed, falling back to Markdown only:", error);
  }
  return mergePublishedPostIndex(markdownIndex, databaseIndex);
});

export const getPublishedPost = cache(async (slug: string): Promise<Post | undefined> => {
  try {
    const databasePost = await getCachedDatabasePost(slug);
    if (databasePost) return isPublicPost(databasePost) ? databasePost : undefined;
  } catch (error) {
    console.warn("[learning-blog] database post read failed, falling back to Markdown:", error);
  }
  const markdownPost = getPost(slug);
  return markdownPost && isPublicPost(markdownPost) ? markdownPost : undefined;
});

export function getAllTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of getAllPosts()) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag, "zh-Hans-CN"));
}

export async function getAllPublishedTags(): Promise<{ tag: string; count: number }[]> {
  const counts = new Map<string, number>();
  for (const post of await getPublishedPostIndex()) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag, "zh-Hans-CN"));
}

/**
 * 调用方传进来的 tag 已经是解码后的字面量(app/tags/[tag]/page.tsx 在 :24/:41
 * 各自 decodeURIComponent 过一次),这里**不能再解一次**:
 *  - 含字面 `%` 的标签会让第二次解码抛 URIError,标签页变 500;
 *  - 形如 `%xx` 的标签会被静默改写成别的字符串,于是页面查不到文章、静默 404。
 * 需要解码的责任留在路由层(那里才拿到原始 URL 段),lib 侧只按字面匹配。
 */
export function getPostsByTag(tag: string): Post[] {
  return getAllPosts().filter((post) => post.tags.includes(tag));
}

export async function getPublishedPostsByTag(tag: string): Promise<Post[]> {
  return (await getAllPublishedPosts()).filter((post) => post.tags.includes(tag));
}

/** 按共享的「具体主题标签」推荐相关文章(忽略 Java/Java漫画 等泛标签,避免连载话彼此刷屏)。 */
const RELATED_STOP_TAGS = new Set(["Java", "Java漫画", "阿零与豆豆", "命令速查", "豆豆咖啡站", "治愈", "编程漫画"]);

export async function getRelatedPosts(slug: string, tags: string[], limit = 4): Promise<PostIndexEntry[]> {
  const topical = tags.filter((t) => !RELATED_STOP_TAGS.has(t));
  if (topical.length === 0) return [];
  const all = await getPublishedPostIndex();
  return all
    .filter((p) => p.slug !== slug)
    .map((p) => ({ post: p, score: p.tags.filter((t) => topical.includes(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
    .slice(0, limit)
    .map((x) => x.post);
}

