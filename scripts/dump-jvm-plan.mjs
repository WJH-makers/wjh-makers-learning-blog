// 取剩余待改造 jvm 话次的注册表信息，供分派改造任务用。
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const body = await fs.readFile(path.join(root, "lib", "series-jvm.ts"), "utf8");
const seasonTitles = new Map();
for (const m of body.matchAll(/season:\s*(\d+),\s*code:\s*"([^"]+)",\s*title:\s*"([^"]+)"/g)) {
  seasonTitles.set(Number(m[1]), m[3]);
}

const re = /\{\s*season:\s*(\d+),\s*episode:\s*(\d+),([\s\S]*?)\},?\s*(?=\{\s*season:|\]\s*,?\s*\}|\]\s*,?\s*$)/g;
const field = (b, k) => b.match(new RegExp(`${k}:\\s*"((?:[^"\\\\]|\\\\.)*)"`))?.[1] ?? "";

const eps = [];
let i = 0;
for (const m of body.matchAll(re)) {
  i++;
  const b = m[3];
  eps.push({
    no: i,
    season: Number(m[1]),
    episode: Number(m[2]),
    seasonTitle: seasonTitles.get(Number(m[1])) ?? "",
    title: field(b, "title"),
    summary: field(b, "summary"),
    chapterType: field(b, "chapterType"),
    projectStage: field(b, "projectStage"),
    slug: field(b, "slug"),
  });
}

const from = Number(process.argv[2] ?? 5);
const to = Number(process.argv[3] ?? 999);
const rest = eps.filter((e) => e.no >= from && e.no <= to);
console.log(JSON.stringify(rest, null, 1));
