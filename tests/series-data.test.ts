// 27 个 series 模块共 924 个话次此前无任何测试覆盖。这里锁住数据骨架:
// 话次编号不重号/不断号、必填字段齐备、已发布话次必须有对应文章、
// slug 不被两个连载同时声明、同一连载内已发布话次的日期不倒挂。
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const LIB = path.join(ROOT, "lib");
const POSTS = path.join(ROOT, "content", "posts");

const postSlugs = new Set(
  (await fs.readdir(POSTS)).filter((name) => name.endsWith(".md")).map((name) => name.replace(/\.md$/, "")),
);

const seriesFiles = (await fs.readdir(LIB)).filter(
  (name) =>
    (name === "series.ts" || name.startsWith("series-")) && name.endsWith(".ts") && name !== "series-registry.ts",
);

type Episode = {
  season: number;
  episode: number;
  title?: string;
  summary?: string;
  status?: string;
  slug?: string;
};

/** 取双引号字段值。摘要/标题里常含中文单引号或 'use server',不能用 ["'] 当界符。 */
function field(body: string, key: string): string | undefined {
  return body.match(new RegExp(`${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`))?.[1];
}

function extractEpisodes(content: string): Episode[] {
  const re = /\{\s*season:\s*(\d+),\s*episode:\s*(\d+),([\s\S]*?)\},?\s*(?=\{\s*season:|\]\s*,?\s*\}|\]\s*,?\s*$)/g;
  return [...content.matchAll(re)].map((match) => ({
    season: Number(match[1]),
    episode: Number(match[2]),
    title: field(match[3], "title"),
    summary: field(match[3], "summary"),
    status: field(match[3], "status"),
    slug: field(match[3], "slug"),
  }));
}

const parsed = new Map<string, Episode[]>();
for (const file of seriesFiles) {
  parsed.set(file, extractEpisodes(await fs.readFile(path.join(LIB, file), "utf8")));
}

test("每个 series 模块都能解析出话次", () => {
  const empty = [...parsed].filter(([, episodes]) => episodes.length === 0).map(([file]) => file);
  assert.deepEqual(empty, [], `解析不出话次(结构可能变了):\n${empty.join("\n")}`);

  const total = [...parsed.values()].reduce((sum, list) => sum + list.length, 0);
  assert.ok(total > 900, `应解析出 900+ 话次，实际 ${total}`);
});

test("话次编号在季内不重号、不断号", () => {
  const bad: string[] = [];
  for (const [file, episodes] of parsed) {
    const bySeason = new Map<number, number[]>();
    for (const ep of episodes) {
      if (!bySeason.has(ep.season)) bySeason.set(ep.season, []);
      bySeason.get(ep.season)!.push(ep.episode);
    }
    for (const [season, nums] of bySeason) {
      const seen = new Set<number>();
      for (const n of nums) {
        if (seen.has(n)) bad.push(`${file} S${season}E${n} 重号`);
        seen.add(n);
      }
      // 不要求季从 E1 起:series-web 等用跨季连续编号(S2 从 E7 接 S1 的 E6)。
      const sorted = [...seen].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i += 1) {
        if (sorted[i] !== sorted[i - 1] + 1) {
          bad.push(`${file} S${season} 在 E${sorted[i - 1]} 与 E${sorted[i]} 之间断号`);
        }
      }
    }
  }
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("每个话次都有 title、summary 与合法 status", () => {
  const valid = new Set(["published", "planned", "draft", "writing"]);
  const bad: string[] = [];
  for (const [file, episodes] of parsed) {
    for (const ep of episodes) {
      const at = `${file} S${ep.season}E${ep.episode}`;
      if (!ep.title) bad.push(`${at} 缺 title`);
      if (!ep.summary) bad.push(`${at} 缺 summary`);
      if (!ep.status) bad.push(`${at} 缺 status`);
      else if (!valid.has(ep.status)) bad.push(`${at} status 非法: ${ep.status}`);
    }
  }
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("已发布话次都有带日期前缀的 slug 且文章文件存在", () => {
  const bad: string[] = [];
  for (const [file, episodes] of parsed) {
    for (const ep of episodes) {
      if (ep.status !== "published") continue;
      const at = `${file} S${ep.season}E${ep.episode}`;
      if (!ep.slug) { bad.push(`${at} 已发布但无 slug`); continue; }
      if (!/^\d{4}-\d{2}-\d{2}-/.test(ep.slug)) bad.push(`${at} slug 缺日期前缀: ${ep.slug}`);
      if (!postSlugs.has(ep.slug)) bad.push(`${at} 无对应文章: ${ep.slug}`);
    }
  }
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("同一个 slug 不被两个连载同时声明", () => {
  const owner = new Map<string, string>();
  const clashes: string[] = [];
  for (const [file, episodes] of parsed) {
    for (const ep of episodes) {
      if (!ep.slug) continue;
      const prev = owner.get(ep.slug);
      if (prev && prev !== file) clashes.push(`${ep.slug}: ${prev} 与 ${file}`);
      else owner.set(ep.slug, file);
    }
  }
  assert.deepEqual(clashes, [], clashes.join("\n"));
});

test("同一连载内已发布话次的日期不倒挂", () => {
  // 日期是公开闸门,倒挂会让后面的话先于前面的话公开。
  const bad: string[] = [];
  for (const [file, episodes] of parsed) {
    const published = episodes
      .filter((ep) => ep.status === "published" && ep.slug && /^\d{4}-\d{2}-\d{2}/.test(ep.slug))
      .sort((a, b) => a.season - b.season || a.episode - b.episode);
    for (let i = 1; i < published.length; i += 1) {
      const prev = published[i - 1];
      const cur = published[i];
      if (cur.slug!.slice(0, 10) < prev.slug!.slice(0, 10)) {
        bad.push(
          `${file}: S${prev.season}E${prev.episode}(${prev.slug!.slice(0, 10)}) 晚于 S${cur.season}E${cur.episode}(${cur.slug!.slice(0, 10)})`,
        );
      }
    }
  }
  assert.deepEqual(bad, [], bad.join("\n"));
});
