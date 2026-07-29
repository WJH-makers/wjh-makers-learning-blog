/**
 * 为《从零开始学 Java》每一话生成含中文标题的可访问漫画配图。
 *
 * 已有原始漫画保留其分镜，只叠加不依赖模型文字识别的中文标题卡；尚未绘制分镜的
 * 话数则使用同一张由 ImageGen 产出的学院主视觉，配合每话不同的标题、场景名和季色。
 * 输出是 WebP 源图，随后交给 build-comic-variants.mjs 生成 AVIF 和移动端变体。
 *
 * 用法：node scripts/build-java-comic-covers.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const postsDir = path.join(root, "content", "posts");
const comicsDir = path.join(root, "public", "comics", "java");
const background = path.join(comicsDir, "java-academy-cover-background.png");

function frontMatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(raw);
  if (!match) return {};
  return Object.fromEntries(match[1]
    .split(/\r?\n/)
    .map((line) => {
      const colon = line.indexOf(":");
      return colon < 0 ? ["", ""] : [line.slice(0, colon).trim(), line.slice(colon + 1).trim().replace(/^['\"]|['\"]$/g, "")];
    })
    .filter(([key]) => key));
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function displayTitle(value) {
  const lines = [];
  let line = "";
  let units = 0;
  const maxUnits = 18;
  for (const char of value) {
    const charUnits = /[\x00-\x7f]/.test(char) ? 0.58 : 1;
    if (line && units + charUnits > maxUnits) {
      lines.push(line);
      line = "";
      units = 0;
    }
    line += char;
    units += charUnits;
  }
  if (line) lines.push(line);
  return lines.slice(0, 2).map((line, index) => ({ text: line, index }));
}

function cleanDialogue(value) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*|\*/g, "")
    .replace(/[「」]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDialogue(raw) {
  const lines = [];
  const quotes = [];
  const quotePattern = /(?:(阿零|豆豆|编译官|顾客|质检员)[^「\n]{0,18})?「([^」]{4,80})」/g;
  for (const quote of raw.matchAll(quotePattern)) {
    quotes.push(`${quote[1] ?? "旁白"}：${cleanDialogue(quote[2])}`);
  }
  if (quotes.length > 0) {
    const selected = [quotes[0], quotes[Math.min(1, quotes.length - 1)], quotes[Math.min(2, quotes.length - 1)]];
    return [...new Set(selected)].map(shortenDialogue);
  }
  const blocks = raw.matchAll(/^>\s*\*\*〔\d+〕\*\*\s*(.+)$/gm);
  for (const block of blocks) {
    const text = cleanDialogue(block[1]);
    const spoken = /((?:阿零|豆豆|编译官|顾客|质检员)[：:]?)([^。！？]{4,48})/.exec(text);
    lines.push(spoken ? `${spoken[1]}${spoken[2]}` : text);
  }
  if (lines.length === 0) return [];
  const selected = [lines[0], lines[Math.min(2, lines.length - 1)], lines[Math.min(4, lines.length - 1)]];
  return [...new Set(selected)].map(shortenDialogue);
}

function shortenDialogue(line) {
  if (line.length <= 42) return line;
  const breakpoint = Math.max(line.lastIndexOf("。", 42), line.lastIndexOf("！", 42), line.lastIndexOf("，", 36));
  return breakpoint >= 12 ? line.slice(0, breakpoint + 1) : `${line.slice(0, 41)}…`;
}

function lessonLabels({ season, episode, dialogue, shortTitle, scene }) {
  // 第 03 话是用户点名的“整数除法”坑，使用故事里的实际中文对白。
  if (season === 1 && episode === 3) {
    return [
      ["阿零：45 / 4 = 11，人均 11，收钱！"],
      ["豆豆：不对，45 ÷ 4 是 11.25。"],
      ["豆豆：要在除号前就让它带小数。"],
    ];
  }
  if (dialogue.length > 0) return dialogue.map((line) => [line]);
  return [[`阿零：这一话我们学 ${shortTitle}。`], [`豆豆：${scene}。`]];
}

function renderLabel({ x, y, width, lines, accent }) {
  const maxUnits = Math.max(12, Math.floor((width - 40) / 18));
  const wrapped = lines.flatMap((line) => {
    const result = [];
    let current = "";
    let units = 0;
    for (const char of line) {
      const charUnits = /[\x00-\x7f]/.test(char) ? 0.58 : 1;
      if (current && units + charUnits > maxUnits) {
        result.push(current);
        current = "";
        units = 0;
      }
      current += char;
      units += charUnits;
    }
    if (current) result.push(current);
    return result;
  }).slice(0, 2);
  if (wrapped.length === 2 && lines.join("").length > wrapped.join("").length) wrapped[1] += "…";
  const lineHeight = 25;
  const height = 28 + wrapped.length * lineHeight;
  return `<g>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="16" fill="#fff6df" fill-opacity=".95" stroke="${accent}" stroke-opacity=".95" stroke-width="2"/>
    <path d="M ${x + 28} ${y + height} l 13 16 l 8 -16" fill="#fff6df" fill-opacity=".95" stroke="${accent}" stroke-width="2" stroke-linejoin="round"/>
    ${wrapped.map((line, index) => `<text x="${x + 20}" y="${y + 26 + index * lineHeight}" fill="#32170c" font-family="Noto Sans SC, Microsoft YaHei, sans-serif" font-size="${index === 0 ? 18 : 17}" font-weight="700">${escapeXml(line)}</text>`).join("")}
  </g>`;
}

function episodeInfo(fileName, raw) {
  const match = /^\d{4}-\d{2}-\d{2}-java-s(\d{2})e(\d{2})-(.+)\.md$/.exec(fileName);
  if (!match) return null;
  const [, season, episode, identifier] = match;
  const title = frontMatter(raw).title ?? identifier;
  const shortTitle = title.replace(/^《从零开始学 Java》\d+\s*[·.]\s*/, "");
  const scene = /^##\s+二、漫画\s*[·.]?\s*(.+)$/m.exec(raw)?.[1]?.trim() ?? "阿零与豆豆的咖啡站";
  const current = /\/comics\/java\/([^/\s)]+)\.png/.exec(raw)?.[1];
  return { season: Number(season), episode: Number(episode), identifier, title, shortTitle, scene, dialogue: extractDialogue(raw), current };
}

function textCard({ width, height, season, episode, dialogue, shortTitle, scene, minimal }) {
  const padding = Math.round(width * 0.07);
  const titleLines = displayTitle(shortTitle);
  const titleSize = Math.max(38, Math.round(width * (titleLines.length > 1 ? 0.053 : 0.066)));
  const sceneSize = Math.max(25, Math.round(width * 0.034));
  const topHeight = Math.round(height * (minimal ? 0.18 : 0.29));
  const bottomY = Math.round(height * 0.84);
  const seasonHue = [32, 197, 348, 156, 6, 271, 51, 215, 285, 12][(season - 1) % 10];
  const safeScene = escapeXml(scene.length > 26 ? `${scene.slice(0, 25)}…` : scene);
  const labels = lessonLabels({ season, episode, dialogue, shortTitle, scene });
  const labelWidth = Math.round(width * (minimal ? .42 : .46));
  const labelY = Math.round(height * (minimal ? .39 : .43));
  const labelMarkup = labels.map((lines, index) => renderLabel({
    x: index % 2 === 0 ? padding : width - padding - labelWidth,
    y: labelY + index * Math.round(height * .115),
    width: labelWidth,
    lines,
    accent: index === 0 ? "#e3a13b" : "#55c8b0",
  })).join("");
  return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#120b08" stop-opacity=".96"/><stop offset="1" stop-color="#120b08" stop-opacity=".62"/></linearGradient>
      <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#120b08" stop-opacity="0"/><stop offset=".28" stop-color="#120b08" stop-opacity=".78"/><stop offset="1" stop-color="#120b08" stop-opacity=".97"/></linearGradient>
    </defs>
    <rect width="${width}" height="${topHeight}" fill="url(#top)"/>
    <rect y="${Math.round(height * 0.72)}" width="${width}" height="${Math.round(height * 0.28)}" fill="url(#bottom)"/>
    <rect x="${padding}" y="${Math.round(height * 0.045)}" width="${Math.max(5, Math.round(width * .012))}" height="${Math.round(height * .13)}" rx="3" fill="hsl(${seasonHue} 78% 58%)"/>
    <text x="${padding + Math.round(width * .035)}" y="${Math.round(height * .09)}" fill="#f4d9a6" font-family="Noto Sans SC, Microsoft YaHei, sans-serif" font-size="${Math.round(width * .026)}" font-weight="700" letter-spacing="2">从零开始学 JAVA · 第 ${String(episode).padStart(2, "0")} 话</text>
    ${titleLines.map(({ text, index }) => `<text x="${padding + Math.round(width * .035)}" y="${Math.round(height * (.155 + index * .062))}" fill="#fff4dc" font-family="Noto Sans SC, Microsoft YaHei, sans-serif" font-size="${titleSize}" font-weight="800">${escapeXml(text)}</text>`).join("")}
    <line x1="${padding}" x2="${width - padding}" y1="${bottomY - Math.round(height * .05)}" y2="${bottomY - Math.round(height * .05)}" stroke="#e3ba73" stroke-opacity=".75" stroke-width="2"/>
    <text x="${padding}" y="${bottomY}" fill="#fff4dc" font-family="Noto Sans SC, Microsoft YaHei, sans-serif" font-size="${sceneSize}" font-weight="700">漫画 · ${safeScene}</text>
    <text x="${padding}" y="${bottomY + Math.round(height * .043)}" fill="#dfc397" font-family="Noto Sans SC, Microsoft YaHei, sans-serif" font-size="${Math.round(sceneSize * .73)}">阿零与豆豆 · 豆豆咖啡站</text>
    ${labelMarkup}
  </svg>`);
}

const files = fs.readdirSync(postsDir).filter((name) => /^\d{4}-\d{2}-\d{2}-java-s\d{2}e\d{2}-.+\.md$/.test(name));
if (!fs.existsSync(background)) throw new Error(`缺少主视觉：${background}`);

let made = 0;
for (const file of files) {
  const raw = fs.readFileSync(path.join(postsDir, file), "utf8");
  const episode = episodeInfo(file, raw);
  if (!episode) continue;

  const stem = episode.current ? `${episode.current}-zh` : `java-s${String(episode.season).padStart(2, "0")}e${String(episode.episode).padStart(2, "0")}-${episode.identifier}-zh`;
  const out = path.join(comicsDir, `${stem}.webp`);
  const source = episode.current ? path.join(comicsDir, `${episode.current}.png`) : background;
  if (!fs.existsSync(source)) throw new Error(`缺少漫画源图：${source}`);
  if (!process.argv.includes("--force") && fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(source).mtimeMs) continue;

  const meta = await sharp(source).metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1536;
  let image = sharp(source).rotate();
  if (!episode.current) {
    // 每一季使用不同色相，避免 68 张封面像同一张复制图。
    const hue = [0, 26, -24, 48, -38, 18, 64, -58, 36, -16][episode.season - 1] ?? 0;
    image = image.modulate({ hue, saturation: 1.04, brightness: 0.94 });
  }
  await image
    .composite([{ input: textCard({ ...episode, width, height, minimal: Boolean(episode.current) }) }])
    .webp({ quality: 88, smartSubsample: true })
    .toFile(out);
  made++;
  console.log("built", path.basename(out));
}

console.log(`done: ${files.length} 话, 新生成 ${made} 张中文漫画配图`);
