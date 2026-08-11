// 章节级错误审计：查现有 audit 不覆盖的内容错误。
// 关注点：H1 与注册表标题/话号是否一致、正文话号自指、frontmatter 与 slug 日期、
// 分格编号连续性、承上启下咬合、便利贴语法合法性、表格列数一致、裸链与死锚点。
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const postsDir = path.join(root, "content", "posts");
const libDir = path.join(root, "lib");

function field(body, key) {
  return body.match(new RegExp(`${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`))?.[1];
}

function extractEpisodes(content, file) {
  const episodes = [];
  const pattern = /\{\s*season:\s*(\d+),\s*episode:\s*(\d+),([\s\S]*?)\},?\s*(?=\{\s*season:|\]\s*,?\s*\}|\]\s*,?\s*$)/g;
  for (const match of content.matchAll(pattern)) {
    const body = match[3];
    episodes.push({
      file,
      season: Number(match[1]),
      episode: Number(match[2]),
      title: field(body, "title") ?? "",
      summary: field(body, "summary") ?? "",
      status: field(body, "status") ?? "",
      chapterType: field(body, "chapterType") ?? "",
      slug: field(body, "slug"),
    });
  }
  return episodes;
}

// ---------- 载入 ----------
const postFiles = (await fs.readdir(postsDir)).filter((n) => n.endsWith(".md")).sort();
const posts = new Map();
for (const file of postFiles) {
  const raw = await fs.readFile(path.join(postsDir, file), "utf8");
  posts.set(file.replace(/\.md$/, ""), raw);
}

const libFiles = await fs.readdir(libDir);
const seriesFiles = libFiles
  .filter((n) => (n === "series.ts" || n.startsWith("series-")) && n.endsWith(".ts") && n !== "series-registry.ts")
  .sort();
const episodes = [];
for (const file of seriesFiles) {
  episodes.push(...extractEpisodes(await fs.readFile(path.join(libDir, file), "utf8"), file));
}
const bySlug = new Map(episodes.filter((e) => e.slug).map((e) => [e.slug, e]));

const findings = [];
const add = (kind, slug, detail) => findings.push({ kind, slug, detail });

// 合法便利贴标签 = STICKY_CLASS 表里的键 + renderLines 里特判的类型。
// 注意 markdown.ts 对未知标签是静默降级成 sticky-note，不会报错，所以这里必须
// 把两处来源都收齐，否则会把 [!答案]/[!文字版] 这类有专门处理的标签误判成未知。
const markdown = await fs.readFile(path.join(libDir, "markdown.ts"), "utf8");
const validSticky = new Set();
// 来源一：STICKY_CLASS 对象字面量的键
const stickyBlock = markdown.match(/const STICKY_CLASS[^{]*\{([\s\S]*?)\n\};/)?.[1] ?? "";
for (const m of stickyBlock.matchAll(/([A-Za-z一-龥]+):\s*"/g)) validSticky.add(m[1]);
// 来源二：renderLines 里 type === "xxx" 的特判分支
for (const m of markdown.matchAll(/type\s*===\s*"([^"]+)"/g)) validSticky.add(m[1]);

/** 去掉围栏代码块，避免把代码里的 # / | 当成 Markdown 结构。 */
function stripCode(text) {
  const out = [];
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) { inFence = !inFence; out.push(""); continue; }
    out.push(inFence ? "" : line);
  }
  return out.join("\n");
}

for (const [slug, rawFull] of posts) {
  const ep = bySlug.get(slug);
  const raw = stripCode(rawFull);

  // 1. frontmatter date 与 slug 日期一致
  const fmDate = raw.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1];
  const slugDate = slug.slice(0, 10);
  if (fmDate && /^\d{4}-\d{2}-\d{2}$/.test(slugDate) && fmDate !== slugDate) {
    add("date-mismatch", slug, `frontmatter ${fmDate} vs slug ${slugDate}`);
  }

  // 2. H1 唯一
  const h1s = [...raw.matchAll(/^# (.+)$/gm)].map((m) => m[1].trim());
  if (h1s.length !== 1) add("h1-count", slug, `H1 数量 = ${h1s.length}`);

  // 3. 连载文：H1 里的话号与注册表 episode 对齐
  if (ep && h1s.length === 1) {
    const h1 = h1s[0];
    const numInH1 = h1.match(/》\s*(\d{1,3})\s*·/)?.[1];
    if (numInH1 !== undefined) {
      // 计算该话在本线内的全局序号
      const sameFile = episodes.filter((e) => e.file === ep.file);
      const idx = sameFile.findIndex((e) => e.slug === slug);
      const globalNo = idx + 1;
      if (Number(numInH1) !== globalNo) {
        add("h1-episode-number", slug, `H1 写 ${numInH1}，注册表内序号 ${globalNo} (S${ep.season}E${ep.episode})`);
      }
    }
    // H1 应包含注册表 title
    if (ep.title && !h1.includes(ep.title)) {
      add("h1-title-mismatch", slug, `H1「${h1}」不含注册表 title「${ep.title}」`);
    }
  }

  // 4. 分格编号连续性
  const panels = [...raw.matchAll(/>\s*\*\*〔(\d+)〕\*\*/g)].map((m) => Number(m[1]));
  if (panels.length > 0) {
    const expected = Array.from({ length: panels.length }, (_, i) => i + 1);
    if (panels.join(",") !== expected.join(",")) {
      add("panel-sequence", slug, `分格编号 [${panels.join(",")}]，应为 1..${panels.length}`);
    }
  }

  // 5. 便利贴标签合法性
  for (const m of raw.matchAll(/>\s*\[!([^\]]+)\]/g)) {
    if (!validSticky.has(m[1])) add("unknown-sticky", slug, `未知便利贴标签 [!${m[1]}]`);
  }

  // 6. 表格列数一致（同一表格内）
  const lines = raw.split(/\r?\n/);
  let tableStart = -1;
  let expectedCols = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isRow = /^\s*\|/.test(line) && line.includes("|");
    if (isRow) {
      // 统计列数：按未转义竖线切
      const cols = line.trim().replace(/^\|/, "").replace(/\|$/, "")
        .split(/(?<!\\)\|/).length;
      if (tableStart === -1) { tableStart = i; expectedCols = cols; }
      else if (cols !== expectedCols && !/^\s*\|[\s:|-]+\|?\s*$/.test(line)) {
        add("table-columns", slug, `第 ${i + 1} 行 ${cols} 列，表头 ${expectedCols} 列`);
      }
    } else if (tableStart !== -1 && line.trim() === "") {
      tableStart = -1; expectedCols = 0;
    }
  }

  // 7. 站内链接指向存在的 slug（含锚点剥离）
  for (const m of raw.matchAll(/\]\((\/posts\/([^)#\s]+))(?:#[^)\s]*)?\)/g)) {
    if (!posts.has(m[2])) add("dead-internal-link", slug, `/posts/${m[2]}`);
  }

  // 8. 未闭合代码围栏（必须用原文，stripCode 已把围栏行清空）
  const fences = (rawFull.match(/^\s*```/gm) ?? []).length;
  if (fences % 2 !== 0) add("unclosed-fence", slug, `\`\`\` 数量 ${fences}（奇数）`);

  // 9. 分格之间要有分隔：真空行，或引用块内的空引用行（`>` 单独一行）。
  //    引用块内分格用 `>` 分隔是正确写法（见 java s01e01），不能当成缺空行。
  const bodyLines = raw.split(/\r?\n/);
  for (let i = 1; i < bodyLines.length; i++) {
    if (!/>\s*\*\*〔\d+〕\*\*/.test(bodyLines[i])) continue;
    const prev = bodyLines[i - 1].trim();
    const isSeparator = prev === "" || /^>\s*$/.test(prev);
    if (!isSeparator) {
      add("panel-no-separator", slug, `第 ${i + 1} 行分格紧贴「${prev.slice(0, 30)}」，缺格间分隔`);
    }
  }
}

// 10. 连载内 slug 日期递增（同线内不倒挂）
for (const file of seriesFiles) {
  const pub = episodes.filter((e) => e.file === file && e.status === "published" && e.slug);
  for (let i = 1; i < pub.length; i++) {
    if (pub[i].slug.slice(0, 10) < pub[i - 1].slug.slice(0, 10)) {
      add("date-inversion", pub[i].slug, `${file}: 晚于 ${pub[i - 1].slug} 但日期更早`);
    }
  }
}

const byKind = findings.reduce((acc, f) => { acc[f.kind] = (acc[f.kind] ?? 0) + 1; return acc; }, {});
console.log(JSON.stringify({
  postsChecked: posts.size,
  validStickyTags: [...validSticky].sort(),
  findingCount: findings.length,
  byKind,
  findings: process.argv.includes("--details") ? findings : findings.slice(0, 60),
}, null, 2));
if (findings.length > 0) process.exitCode = 1;
