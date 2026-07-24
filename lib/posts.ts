import fs from "node:fs";
import path from "node:path";
import { getDatabasePost, getDatabasePosts } from "@/lib/db";
import { codeToHtml } from "shiki";

export type Post = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  readingMinutes: number;
  content: string;
};

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

function readingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const cjk = (content.match(/[\u4e00-\u9fff]/g) ?? []).length;
  return Math.max(1, Math.ceil((words + cjk / 2) / 220));
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
    readingMinutes: readingMinutes(content),
    content,
  };
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(postsDirectory)) return [];
  return fs
    .readdirSync(postsDirectory)
    .filter((file) => file.endsWith(".md"))
    .map(postFromFile)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): Post | undefined {
  return getAllPosts().find((post) => post.slug === slug);
}

export async function getAllPublishedPosts(): Promise<Post[]> {
  const markdownPosts = getAllPosts();
  let databasePosts: Post[] = [];

  try {
    databasePosts = await getDatabasePosts();
  } catch (error) {
    console.warn("[learning-blog] database read failed, falling back to Markdown only:", error);
  }

  const merged = new Map<string, Post>();
  for (const post of markdownPosts) merged.set(post.slug, post);
  for (const post of databasePosts) merged.set(post.slug, post);

  return [...merged.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPublishedPost(slug: string): Promise<Post | undefined> {
  try {
    const databasePost = await getDatabasePost(slug);
    if (databasePost) return databasePost;
  } catch (error) {
    console.warn("[learning-blog] database post read failed, falling back to Markdown:", error);
  }
  return getPost(slug);
}

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
  for (const post of await getAllPublishedPosts()) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag, "zh-Hans-CN"));
}

export function getPostsByTag(tag: string): Post[] {
  const decoded = decodeURIComponent(tag);
  return getAllPosts().filter((post) => post.tags.includes(decoded));
}

export async function getPublishedPostsByTag(tag: string): Promise<Post[]> {
  const decoded = decodeURIComponent(tag);
  return (await getAllPublishedPosts()).filter((post) => post.tags.includes(decoded));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function inlineMarkdown(value: string): string {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\[([^\]]+)\]\((?!https?:)([^\s)]+)\)/g, '<a href="$2" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

const highlightCache = new Map<string, string>();
const MAX_CACHE = 200;

async function highlightCode(code: string, lang: string): Promise<string> {
  const cacheKey = `${lang}:${code}`;
  const cached = highlightCache.get(cacheKey);
  if (cached) return cached;
  const language = lang.trim() || "text";
  const opts = { themes: { light: "github-light", dark: "github-dark" }, defaultColor: false } as const;
  try {
    const result = await codeToHtml(code, { lang: language, ...opts });
    if (highlightCache.size >= MAX_CACHE) {
      const firstKey = highlightCache.keys().next().value;
      if (firstKey) highlightCache.delete(firstKey);
    }
    highlightCache.set(cacheKey, result);
    return result;
  } catch {
    const fallbackResult = await codeToHtml(code, { lang: "text", ...opts });
    if (highlightCache.size >= MAX_CACHE) {
      const firstKey = highlightCache.keys().next().value;
      if (firstKey) highlightCache.delete(firstKey);
    }
    highlightCache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }
}

function parseTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function tableAligns(sep: string): string[] {
  return parseTableRow(sep).map((c) => {
    const l = c.startsWith(":");
    const r = c.endsWith(":");
    return l && r ? "center" : r ? "right" : l ? "left" : "";
  });
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes("-") && line.includes("|");
}

function renderTable(header: string[], aligns: string[], rows: string[][]): string {
  const cell = (tag: string, text: string, i: number) => {
    const a = aligns[i] ? ` style="text-align:${aligns[i]}"` : "";
    return `<${tag}${a}>${inlineMarkdown(text)}</${tag}>`;
  };
  const thead = `<thead><tr>${header.map((h, i) => cell("th", h, i)).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows
    .map((r) => `<tr>${header.map((_, i) => cell("td", r[i] ?? "", i)).join("")}</tr>`)
    .join("")}</tbody>`;
  return `<div class="table-scroll"><table>${thead}${tbody}</table></div>`;
}

export type PostSection = { title: string; content: string };

/**
 * 把长文章切成便于翻页的小节:先按 H1 切,单块超 MAX_LINES 行再按 H2 细分,
 * 过短的碎片并入前一节以免翻页零碎。每节附带首个标题,供分页导航/目录显示。
 * 代码围栏内的 # 不当作标题,避免误切。
 */
export function splitSections(markdown: string): PostSection[] {
  const MAX_LINES = 220;
  const MIN_LINES = 6;

  const splitByHeading = (text: string, level: 1 | 2): string[] => {
    const re = level === 1 ? /^# / : /^## /;
    const lines = text.split(/\r?\n/);
    const out: string[] = [];
    let cur: string[] = [];
    let fence = false;
    for (const line of lines) {
      if (line.startsWith("```")) fence = !fence;
      if (!fence && re.test(line) && cur.some((l) => l.trim())) {
        out.push(cur.join("\n"));
        cur = [];
      }
      cur.push(line);
    }
    if (cur.some((l) => l.trim())) out.push(cur.join("\n"));
    return out;
  };

  const expanded: string[] = [];
  for (const block of splitByHeading(markdown, 1)) {
    if (block.split("\n").length <= MAX_LINES) {
      expanded.push(block);
    } else {
      const subs = splitByHeading(block, 2);
      expanded.push(...(subs.length > 1 ? subs : [block]));
    }
  }

  const merged: string[] = [];
  for (const block of expanded) {
    const lineCount = block.split("\n").filter((l) => l.trim()).length;
    if (merged.length > 0 && lineCount < MIN_LINES) {
      merged[merged.length - 1] += "\n\n" + block;
    } else {
      merged.push(block);
    }
  }

  const blocks = merged.length > 0 ? merged : [markdown];
  return blocks.map((content) => ({
    title: content.match(/^#{1,2}\s+(.+)$/m)?.[1]?.trim() ?? "",
    content,
  }));
}

export async function markdownToHtml(markdown: string): Promise<string> {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let codeLang = "";
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCode) {
        html.push(await highlightCode(codeLines.join("\n"), codeLang));
        codeLines = [];
        codeLang = "";
        inCode = false;
      } else {
        closeList();
        codeLang = line.slice(3);
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      closeList();
      continue;
    }

    // GFM 表格:当前行含 | 且下一行是分隔行(|---|---|)
    if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      closeList();
      const header = parseTableRow(line);
      const aligns = tableAligns(lines[i + 1]);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() && !lines[i].startsWith("```")) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      i--;
      html.push(renderTable(header, aligns, rows));
      continue;
    }

    if (/^(---|\*\*\*|___)\s*$/.test(line)) {
      closeList();
      html.push("<hr />");
    } else if (line.startsWith("### ")) {
      closeList();
      html.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      closeList();
      html.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      closeList();
      html.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`);
    } else if (line.startsWith("> ")) {
      closeList();
      html.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
    } else if (/^\d+\.\s+/.test(line)) {
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push(`<li>${inlineMarkdown(line.replace(/^\d+\.\s+/, ""))}</li>`);
    } else if (/^[-*]\s+\[([ xX])\]\s+(.*)$/.test(line)) {
      const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/)!;
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      const checked = taskMatch[1].toLowerCase() === "x";
      html.push(`<li class="task-item"><input type="checkbox" disabled${checked ? " checked" : ""}> ${inlineMarkdown(taskMatch[2])}</li>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${inlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>`);
    } else {
      closeList();
      html.push(`<p>${inlineMarkdown(line)}</p>`);
    }
  }

  closeList();
  if (inCode) html.push(await highlightCode(codeLines.join("\n"), codeLang));
  return html.join("\n");
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://wjh-makers-learning-blog.vercel.app").replace(/\/$/, "");
}
