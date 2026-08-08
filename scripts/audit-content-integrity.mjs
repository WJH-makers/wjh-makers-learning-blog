// 全量内容层审计：series 完整性、资源引用、内链有效性
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const POSTS = path.join(ROOT, "content", "posts");
const MANIFEST = path.join(ROOT, "lib", "comic-manifest.json");

// 1. 收集所有文章 slug
const files = (await fs.readdir(POSTS)).filter((f) => f.endsWith(".md"));
const slugs = new Set(files.map((f) => f.replace(/\.md$/, "")));

// 2. 读取漫画资源清单
const comicManifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
const comicPaths = new Set(Object.keys(comicManifest).map((k) => `/comics/${k}.png`));
// 加上 webp 变体
for (const key of Object.keys(comicManifest)) {
  comicPaths.add(`/comics/${key}.webp`);
}

// 3. 扫描所有文章
const findings = [];

for (const file of files) {
  const raw = await fs.readFile(path.join(POSTS, file), "utf8");
  const slug = file.replace(/\.md$/, "");

  // 3.1 漫画引用检查
  const comicRefs = [...raw.matchAll(/!\[.*?\]\((\/comics\/[^)]+)\)/g)].map((m) => m[1]);
  for (const ref of comicRefs) {
    if (!comicPaths.has(ref)) {
      findings.push({ file, kind: "missing-comic", detail: ref });
    }
  }

  // 3.2 内链检查（Markdown 链接指向站内 /posts/slug）
  const internalLinks = [...raw.matchAll(/\[.*?\]\((\/posts\/([^)#]+)(?:#[^)]+)?)\)/g)].map((m) => m[2]);
  for (const targetSlug of internalLinks) {
    if (!slugs.has(targetSlug)) {
      findings.push({ file, kind: "broken-internal-link", detail: `/posts/${targetSlug}` });
    }
  }

  // 3.3 series episode slug 引用检查（文中可能提到其他话次）
  // 模式：series/xxx-s01e01 格式
  const seriesRefs = [...raw.matchAll(/\/series\/[a-z-]+-(s\d{2}e\d{2})/gi)].map((m) => m[1].toLowerCase());
  for (const ep of seriesRefs) {
    // 查找对应的文章文件（文件名包含该 episode 标识）
    const found = files.some((f) => f.toLowerCase().includes(ep));
    if (!found) {
      findings.push({ file, kind: "missing-series-episode", detail: ep });
    }
  }
}

// 4. series 注册完整性：扫描 series.ts 与所有 series-*.ts
// Java 主线在 lib/series.ts，各分线在 lib/series-<topic>.ts —— 两者都要读。
const libFiles = await fs.readdir(path.join(ROOT, "lib"));
const seriesFiles = libFiles.filter(
  (f) => (f === "series.ts" || f.startsWith("series-")) && f.endsWith(".ts") && f !== "series-registry.ts",
);

const registeredSlugs = new Set();
for (const sf of seriesFiles) {
  const content = await fs.readFile(path.join(ROOT, "lib", sf), "utf8");
  // 话次 slug 一律是 YYYY-MM-DD 前缀；series 元数据的 slug（如 jvm-academy）不带日期，
  // 用这个形状区分，避免把栏目 slug 误当文章 slug。
  const slugMatches = [...content.matchAll(/slug:\s*["'](\d{4}-\d{2}-\d{2}-[^"']+)["']/g)].map((m) => m[1]);
  for (const s of slugMatches) registeredSlugs.add(s);
}

// 4.1 注册了但文章不存在
for (const slug of registeredSlugs) {
  if (!slugs.has(slug)) {
    findings.push({ file: "(series registry)", kind: "registered-but-no-post", detail: slug });
  }
}

// 4.2 文章里有 series episode 编号但没注册（检查文件名里含 s\d{2}e\d{2} 的）
for (const file of files) {
  const match = file.match(/(s\d{2}e\d{2})/i);
  if (match) {
    const slug = file.replace(/\.md$/, "");
    if (!registeredSlugs.has(slug)) {
      findings.push({ file, kind: "episode-not-registered", detail: match[1] });
    }
  }
}

const byKind = findings.reduce((acc, f) => {
  acc[f.kind] = (acc[f.kind] ?? 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({
  totalPosts: slugs.size,
  totalComics: comicPaths.size / 2,  // png + webp
  registeredEpisodes: registeredSlugs.size,
  findingCount: findings.length,
  byKind,
  findings: findings.slice(0, 50),  // 只显示前 50 条
}, null, 2));

if (findings.length > 0) process.exitCode = 1;
