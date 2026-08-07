/**
 * 漫画图派生变体生成器:为 public/comics 下每张图生成
 *   <stem>.webp        1024w 主档(兼容兜底)
 *   <stem>.avif        1024w 主档(AVIF 比 webp 再省 ~30%)
 *   <stem>-512.webp    移动端半宽变体
 *   <stem>-512.avif
 * 源优先用 .png(无损原档),缺 png 的用 .webp 作源。幂等:目标已存在且比源新则跳过。
 * 用法:node scripts/build-comic-variants.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(process.cwd(), "public", "comics");

async function ensureVariant(srcPath, outPath, opts) {
  if (fs.existsSync(outPath) && fs.statSync(outPath).mtimeMs >= fs.statSync(srcPath).mtimeMs) return false;
  const { width, format } = opts;
  let img = sharp(srcPath);
  if (width) img = img.resize({ width, withoutEnlargement: true });
  if (format === "avif") img = img.avif({ quality: 50 });
  if (format === "webp") img = img.webp({ quality: 78 });
  await img.toFile(outPath);
  return true;
}

const stems = new Map(); // 相对路径 stem(含系列目录) -> 源文件路径(png 优先)
for (const dirent of fs.readdirSync(ROOT, { recursive: true, withFileTypes: true })) {
  if (!dirent.isFile()) continue;
  const ext = path.extname(dirent.name).toLowerCase();
  if (ext !== ".png" && ext !== ".webp") continue;
  const stem = path.basename(dirent.name, ext);
  if (stem.endsWith("-512")) continue;
  const full = path.join(dirent.parentPath ?? dirent.path, dirent.name);
  const key = path.relative(ROOT, path.join(path.dirname(full), stem)).split(path.sep).join("/");
  const existing = stems.get(key);
  if (!existing || ext === ".png") stems.set(key, full);
}

let made = 0;
const manifest = {};
for (const [key, src] of stems) {
  const dir = path.dirname(src);
  const stem = path.basename(src, path.extname(src));
  const meta = await sharp(src).metadata();
  manifest[key] = { w: meta.width, h: meta.height };
  const jobs = [
    [path.join(dir, `${stem}.webp`), { format: "webp" }],
    [path.join(dir, `${stem}.avif`), { format: "avif" }],
    [path.join(dir, `${stem}-512.webp`), { format: "webp", width: 512 }],
    [path.join(dir, `${stem}-512.avif`), { format: "avif", width: 512 }],
  ];
  for (const [out, opts] of jobs) {
    if (await ensureVariant(src, out, opts)) { made++; console.log("built", path.basename(out)); }
  }
}

// 尺寸清单:渲染器构建期据此写准 width/height 与 srcset(源图尺寸不统一,不能写死)。
const manifestPath = path.join(process.cwd(), "lib", "comic-manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`done: ${stems.size} 张源图, 新生成 ${made} 个变体, manifest → lib/comic-manifest.json`);
