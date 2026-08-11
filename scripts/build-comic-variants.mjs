import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(process.cwd(), "public", "comics");
const MANIFEST_PATH = path.join(process.cwd(), "lib", "comic-manifest.json");
const CHECK_ONLY = process.argv.includes("--check");
const SAMPLE_SIZE = 64;
const MAX_AVERAGE_PIXEL_DIFF = 12;

function discoverSources() {
  const stems = new Map();
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
  return [...stems.entries()].sort(([left], [right]) => left.localeCompare(right));
}

async function samplePixels(imagePath) {
  return sharp(imagePath)
    .flatten({ background: "#fff" })
    .resize({ width: SAMPLE_SIZE, height: SAMPLE_SIZE, fit: "fill" })
    .toColourspace("srgb")
    .removeAlpha()
    .raw()
    .toBuffer();
}

function averagePixelDiff(left, right) {
  if (left.length !== right.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let index = 0; index < left.length; index++) sum += Math.abs(left[index] - right[index]);
  return sum / left.length;
}

function expectedDimensions(sourceMeta, width) {
  if (!sourceMeta.width || !sourceMeta.height) throw new Error("漫画源图缺少尺寸信息");
  if (!width || sourceMeta.width <= width) return { width: sourceMeta.width, height: sourceMeta.height };
  return { width, height: Math.round(sourceMeta.height * width / sourceMeta.width) };
}

async function inspectVariant(sourcePixels, sourceMeta, outPath, options) {
  if (!fs.existsSync(outPath)) return "文件缺失";
  try {
    const outputMeta = await sharp(outPath).metadata();
    const dimensions = expectedDimensions(sourceMeta, options.width);
    if (outputMeta.width !== dimensions.width || outputMeta.height !== dimensions.height) {
      return `尺寸 ${outputMeta.width}x${outputMeta.height}，应为 ${dimensions.width}x${dimensions.height}`;
    }
    const actualFormat = outputMeta.format;
    const expectedFormat = options.format === "avif" ? "heif" : "webp";
    if (actualFormat !== expectedFormat) return `格式 ${actualFormat ?? "未知"}，应为 ${options.format}`;
    const outputPixels = await samplePixels(outPath);
    const diff = averagePixelDiff(sourcePixels, outputPixels);
    if (diff > MAX_AVERAGE_PIXEL_DIFF) return `内容差异 ${diff.toFixed(2)}，阈值 ${MAX_AVERAGE_PIXEL_DIFF}`;
    return null;
  } catch (error) {
    return `无法解码：${error instanceof Error ? error.message : String(error)}`;
  }
}

async function buildVariant(srcPath, outPath, options) {
  let image = sharp(srcPath);
  if (options.width) image = image.resize({ width: options.width, withoutEnlargement: true });
  image = options.format === "avif" ? image.avif({ quality: 50 }) : image.webp({ quality: 78 });
  fs.writeFileSync(outPath, await image.toBuffer());
}

const sources = discoverSources();
const manifest = {};
const findings = [];
let built = 0;

for (const [key, src] of sources) {
  const sourceMeta = await sharp(src).metadata();
  if (!sourceMeta.width || !sourceMeta.height) throw new Error(`${key} 缺少尺寸信息`);
  manifest[key] = { w: sourceMeta.width, h: sourceMeta.height };
  const sourcePixels = await samplePixels(src);
  const dir = path.dirname(src);
  const stem = path.basename(src, path.extname(src));
  const jobs = [
    [path.join(dir, `${stem}.webp`), { format: "webp" }],
    [path.join(dir, `${stem}.avif`), { format: "avif" }],
    [path.join(dir, `${stem}-512.webp`), { format: "webp", width: 512 }],
    [path.join(dir, `${stem}-512.avif`), { format: "avif", width: 512 }],
  ];

  for (const [outPath, options] of jobs) {
    const issue = await inspectVariant(sourcePixels, sourceMeta, outPath, options);
    if (!issue) continue;
    const relative = path.relative(ROOT, outPath).split(path.sep).join("/");
    if (CHECK_ONLY) {
      findings.push(`${relative}: ${issue}`);
      continue;
    }
    await buildVariant(src, outPath, options);
    built++;
    console.log(`built ${relative} (${issue})`);
  }
}

const expectedManifest = `${JSON.stringify(manifest, null, 2)}\n`;
if (CHECK_ONLY) {
  const actualManifest = fs.existsSync(MANIFEST_PATH) ? fs.readFileSync(MANIFEST_PATH, "utf8") : "";
  if (actualManifest !== expectedManifest) findings.push("lib/comic-manifest.json: 清单与源图尺寸不一致");
  if (findings.length > 0) {
    for (const finding of findings) console.error(finding);
    console.error(`failed: ${findings.length} 个漫画派生问题`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${sources.length} 张源图，${sources.length * 4} 个派生文件`);
  }
} else {
  const actualManifest = fs.existsSync(MANIFEST_PATH) ? fs.readFileSync(MANIFEST_PATH, "utf8") : "";
  if (actualManifest !== expectedManifest) fs.writeFileSync(MANIFEST_PATH, expectedManifest);
  console.log(`done: ${sources.length} 张源图，新生成 ${built} 个变体，manifest → lib/comic-manifest.json`);
}
