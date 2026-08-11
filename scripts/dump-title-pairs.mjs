// 比对 java 线 frontmatter 标题与注册表 title 的对应关系，判断差异是惯例还是疏漏。
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const body = await fs.readFile(path.join(root, "lib", "series.ts"), "utf8");
const re = /\{\s*season:\s*(\d+),\s*episode:\s*(\d+),([\s\S]*?)\},?\s*(?=\{\s*season:|\]\s*,?\s*\}|\]\s*,?\s*$)/g;
const field = (b, k) => b.match(new RegExp(`${k}:\\s*"((?:[^"\\\\]|\\\\.)*)"`))?.[1] ?? "";

const rows = [];
for (const m of body.matchAll(re)) {
  const b = m[3];
  const slug = field(b, "slug");
  if (!slug) continue;
  const regTitle = field(b, "title");
  let fmTitle = "";
  try {
    const raw = await fs.readFile(path.join(root, "content", "posts", `${slug}.md`), "utf8");
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
    fmTitle = fm.match(/^title:\s*"?(.+?)"?\s*$/m)?.[1]?.trim() ?? "";
  } catch { fmTitle = "(文件缺失)"; }

  // 取出 frontmatter 标题里 " · " 之后的本话名部分
  const after = fmTitle.split(" · ").slice(1).join(" · ");
  const contains = after.includes(regTitle);
  rows.push({ slug, regTitle, fmTail: after, contains });
}

const mismatched = rows.filter((r) => !r.contains);
console.log(JSON.stringify({
  total: rows.length,
  matched: rows.length - mismatched.length,
  mismatched: mismatched.length,
  detail: mismatched,
}, null, 1));
