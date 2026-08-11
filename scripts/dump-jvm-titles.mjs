// 一次性取数：比对 jvm 线的 frontmatter title 与注册表 title，找格式不一致。
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const postsDir = path.join(root, "content", "posts");

const libBody = await fs.readFile(path.join(root, "lib", "series-jvm.ts"), "utf8");
const reg = new Map();
const pattern = /\{\s*season:\s*(\d+),\s*episode:\s*(\d+),([\s\S]*?)\},?\s*(?=\{\s*season:|\]\s*,?\s*\}|\]\s*,?\s*$)/g;
for (const m of libBody.matchAll(pattern)) {
  const body = m[3];
  const slug = body.match(/slug:\s*"([^"]+)"/)?.[1];
  const title = body.match(/title:\s*"((?:[^"\\]|\\.)*)"/)?.[1];
  if (slug) reg.set(slug, { s: Number(m[1]), e: Number(m[2]), title });
}

const files = (await fs.readdir(postsDir)).filter((f) => /jvm-f\d{2}e\d{2}/.test(f)).sort();
const rows = [];
for (const f of files) {
  const raw = await fs.readFile(path.join(postsDir, f), "utf8");
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const fmTitle = fm.match(/^title:\s*"?([^"\n]+)"?/m)?.[1]?.trim() ?? "";
  const hasH1 = /^# /m.test(raw);
  const extraKeys = ["series", "season", "episode"].filter((k) => new RegExp(`^${k}:`, "m").test(fm));
  const slug = f.replace(/\.md$/, "");
  const r = reg.get(slug);
  rows.push({
    slug,
    fmTitle,
    regTitle: r?.title ?? "(未注册)",
    hasH1,
    extraKeys: extraKeys.join(","),
    styleOld: /^《/.test(fmTitle),
  });
}

console.log(JSON.stringify({
  total: rows.length,
  oldStyle: rows.filter((r) => r.styleOld).length,
  newStyle: rows.filter((r) => !r.styleOld).length,
  withH1: rows.filter((r) => r.hasH1).length,
  rows,
}, null, 2));
