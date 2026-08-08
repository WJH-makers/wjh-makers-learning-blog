// 内容完整性契约：注册话次↔文章文件、漫画引用↔清单、站内链接↔存在的 slug。
// 现有 content-audit 管 frontmatter 与格式；这里补的是「跨文件引用」这一层。
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const POSTS_DIR = path.join(ROOT, "content", "posts");
const LIB_DIR = path.join(ROOT, "lib");

const postFiles = (await fs.readdir(POSTS_DIR)).filter((name) => name.endsWith(".md"));
const slugs = new Set(postFiles.map((name) => name.replace(/\.md$/, "")));

async function readPost(file: string): Promise<string> {
  return fs.readFile(path.join(POSTS_DIR, file), "utf8");
}

test("每个注册话次都有对应的文章文件", async () => {
  // Java 主线在 lib/series.ts，分线在 lib/series-<topic>.ts。
  const libFiles = await fs.readdir(LIB_DIR);
  const seriesFiles = libFiles.filter(
    (name) => (name === "series.ts" || name.startsWith("series-")) && name.endsWith(".ts") && name !== "series-registry.ts",
  );

  const missing: string[] = [];
  let registered = 0;
  for (const file of seriesFiles) {
    const content = await fs.readFile(path.join(LIB_DIR, file), "utf8");
    // 话次 slug 必带 YYYY-MM-DD 前缀；栏目元数据的 slug（jvm-academy 等）不带，据此区分。
    for (const match of content.matchAll(/slug:\s*["'](\d{4}-\d{2}-\d{2}-[^"']+)["']/g)) {
      registered += 1;
      if (!slugs.has(match[1])) missing.push(`${file} -> ${match[1]}`);
    }
  }

  assert.ok(registered > 150, `应扫到 150+ 个注册话次，实际 ${registered}（正则或目录结构可能变了）`);
  assert.deepEqual(missing, [], `注册了但没有文章文件:\n${missing.join("\n")}`);
});

test("文章引用的漫画都在 comic-manifest 里", async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(LIB_DIR, "comic-manifest.json"), "utf8"));
  const known = new Set<string>();
  for (const key of Object.keys(manifest)) {
    known.add(`/comics/${key}.png`);
    known.add(`/comics/${key}.webp`);
  }

  const missing: string[] = [];
  for (const file of postFiles) {
    const raw = await readPost(file);
    for (const match of raw.matchAll(/!\[[^\]]*\]\((\/comics\/[^)]+)\)/g)) {
      if (!known.has(match[1])) missing.push(`${file} -> ${match[1]}`);
    }
  }

  assert.deepEqual(missing, [], `引用了清单外的漫画资源:\n${missing.join("\n")}`);
});

test("站内文章链接都指向存在的 slug", async () => {
  const broken: string[] = [];
  for (const file of postFiles) {
    const raw = await readPost(file);
    for (const match of raw.matchAll(/\[[^\]]*\]\(\/posts\/([^)#\s]+)(?:#[^)]*)?\)/g)) {
      if (!slugs.has(match[1])) broken.push(`${file} -> /posts/${match[1]}`);
    }
  }

  assert.deepEqual(broken, [], `指向不存在文章的站内链接:\n${broken.join("\n")}`);
});
