// 一次性取数：把各连载线的真实进度打出来，供写导航文时引用，避免手写数字对不上。
// 用文本解析而不是 import，因为 lib/*.ts 里的 `@/` 别名 Node 直跑不认（同 audit-series-data.mjs）。
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const LIB = path.join(ROOT, "lib");

// 从 series-registry.ts 取 route 与 META 变量名的对应
const registry = await fs.readFile(path.join(LIB, "series-registry.ts"), "utf8");
const order = [...registry.matchAll(/defineSeries\((\w+),\s*"([^"]+)"/g)].map((m) => ({
  metaVar: m[1],
  route: m[2],
}));

// META 变量名 -> 文件
const files = (await fs.readdir(LIB)).filter(
  (f) => (f === "series.ts" || f.startsWith("series-")) && f.endsWith(".ts") && f !== "series-registry.ts",
);

const byMetaVar = new Map();
for (const f of files) {
  const body = await fs.readFile(path.join(LIB, f), "utf8");
  for (const m of body.matchAll(/export const (\w*SERIES_META)\s*=/g)) {
    byMetaVar.set(m[1], { file: f, body });
  }
}

const rows = [];
let doneAll = 0;
let totalAll = 0;

for (const { metaVar, route } of order) {
  const entry = byMetaVar.get(metaVar);
  if (!entry) {
    rows.push({ route, error: `未找到 ${metaVar}` });
    continue;
  }
  const { body } = entry;
  const title = body.match(/title:\s*"([^"]+)"/)?.[1] ?? "";
  const episodes = [...body.matchAll(/\{\s*season:\s*\d+,\s*episode:\s*\d+[\s\S]*?\}/g)];
  const total = episodes.length;
  const done = episodes.filter((e) => /status:\s*"published"/.test(e[0])).length;
  doneAll += done;
  totalAll += total;
  rows.push({ route, title, done, total });
}

console.log(JSON.stringify({ total: { done: doneAll, total: totalAll, lines: order.length }, rows }, null, 2));
