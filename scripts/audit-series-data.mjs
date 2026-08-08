// 深度审计 29 个 series 模块的数据一致性(约 4000 行连载定义,此前无任何测试覆盖)。
// 查:季/话编号连续性、话次重号、status 取值合法性、slug 与 date 的对应、
// 跨 series 的 slug 抢占、必填字段缺失。
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const LIB = path.join(ROOT, "lib");
const POSTS = path.join(ROOT, "content", "posts");

const postSlugs = new Set(
  (await fs.readdir(POSTS)).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")),
);

const seriesFiles = (await fs.readdir(LIB)).filter(
  (f) => (f === "series.ts" || f.startsWith("series-")) && f.endsWith(".ts") && f !== "series-registry.ts",
);

const findings = [];
const slugOwner = new Map();   // slug -> 首个声明它的文件
let episodeTotal = 0;

/** 取双引号字段值,允许值内出现转义引号。 */
function field(body, key) {
  const re = new RegExp(`${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  return body.match(re)?.[1];
}

/** 逐条抽取 episode 对象字面量。episodes 是单行一条的写法,按 `{ season:` 起头切。 */
function extractEpisodes(content) {
  const out = [];
  const re = /\{\s*season:\s*(\d+),\s*episode:\s*(\d+),([\s\S]*?)\},?\s*(?=\{\s*season:|\]\s*,?\s*\}|\]\s*,?\s*$)/g;
  for (const m of content.matchAll(re)) {
    const body = m[3];
    out.push({
      season: Number(m[1]),
      episode: Number(m[2]),
      // 只按双引号取值:摘要/标题内部常含中文单引号或英文 'use server',
      // 用 ["'] 当界符会把值截断成空,虚报「缺字段」。
      title: field(body, "title"),
      summary: field(body, "summary"),
      status: field(body, "status"),
      slug: field(body, "slug"),
      chapterType: field(body, "chapterType"),
    });
  }
  return out;
}

const VALID_STATUS = new Set(["published", "planned", "draft", "writing"]);

for (const file of seriesFiles) {
  const content = await fs.readFile(path.join(LIB, file), "utf8");
  const episodes = extractEpisodes(content);
  episodeTotal += episodes.length;

  if (episodes.length === 0) {
    findings.push({ file, kind: "no-episodes-parsed", detail: "未解析出任何话次(结构可能变了)" });
    continue;
  }

  // 按季分组查编号连续性与重号
  const bySeason = new Map();
  for (const ep of episodes) {
    if (!bySeason.has(ep.season)) bySeason.set(ep.season, []);
    bySeason.get(ep.season).push(ep);
  }

  for (const [season, list] of [...bySeason].sort((a, b) => a[0] - b[0])) {
    const nums = list.map((e) => e.episode);
    const seen = new Set();
    for (const n of nums) {
      if (seen.has(n)) findings.push({ file, kind: "duplicate-episode", detail: `S${season}E${n} 重复` });
      seen.add(n);
    }
    const sorted = [...seen].sort((a, b) => a - b);
    // 不校验「季必须从 E1 开始」:series-web 等用全局连续编号(S2 从 E7 接 S1 的 E6)。
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        findings.push({ file, kind: "episode-gap", detail: `S${season} 在 E${sorted[i - 1]} 与 E${sorted[i]} 之间断号` });
      }
    }
  }

  for (const ep of episodes) {
    const at = `S${ep.season}E${ep.episode}`;

    if (!ep.title) findings.push({ file, kind: "missing-title", detail: at });
    if (!ep.summary) findings.push({ file, kind: "missing-summary", detail: `${at} ${ep.title ?? ""}` });
    if (!ep.status) findings.push({ file, kind: "missing-status", detail: at });
    else if (!VALID_STATUS.has(ep.status)) {
      findings.push({ file, kind: "invalid-status", detail: `${at} status=${ep.status}` });
    }

    // published 必须有 slug 且文章文件存在
    if (ep.status === "published") {
      if (!ep.slug) {
        findings.push({ file, kind: "published-without-slug", detail: `${at} ${ep.title ?? ""}` });
      } else {
        if (!postSlugs.has(ep.slug)) {
          findings.push({ file, kind: "published-slug-missing-post", detail: `${at} -> ${ep.slug}` });
        }
        // slug 的日期前缀应存在
        if (!/^\d{4}-\d{2}-\d{2}-/.test(ep.slug)) {
          findings.push({ file, kind: "slug-without-date-prefix", detail: `${at} -> ${ep.slug}` });
        }
      }
    }

    // 跨文件 slug 抢占
    if (ep.slug) {
      const prev = slugOwner.get(ep.slug);
      if (prev && prev !== file) {
        findings.push({ file, kind: "slug-claimed-twice", detail: `${ep.slug} 也被 ${prev} 声明` });
      } else {
        slugOwner.set(ep.slug, file);
      }
    }
  }

  // 同一 series 内,已发布话次的日期应随 季/话 递增(排期倒推的前提)
  const published = episodes
    .filter((e) => e.status === "published" && e.slug && /^\d{4}-\d{2}-\d{2}/.test(e.slug))
    .sort((a, b) => (a.season - b.season) || (a.episode - b.episode));
  for (let i = 1; i < published.length; i += 1) {
    const prev = published[i - 1];
    const cur = published[i];
    if (cur.slug.slice(0, 10) < prev.slug.slice(0, 10)) {
      findings.push({
        file,
        kind: "date-order-inverted",
        detail: `S${prev.season}E${prev.episode}(${prev.slug.slice(0, 10)}) 晚于 S${cur.season}E${cur.episode}(${cur.slug.slice(0, 10)})`,
      });
    }
  }
}

const byKind = findings.reduce((acc, f) => {
  acc[f.kind] = (acc[f.kind] ?? 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({
  seriesFiles: seriesFiles.length,
  episodeTotal,
  uniqueSlugs: slugOwner.size,
  findingCount: findings.length,
  byKind,
  findings: findings.slice(0, 60),
}, null, 2));

if (findings.length > 0) process.exitCode = 1;
