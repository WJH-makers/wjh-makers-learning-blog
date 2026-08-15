import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const postsDir = path.join(root, "content", "posts");
const manifestPath = path.join(root, "lib", "comic-manifest.json");
const details = process.argv.includes("--details");

function shanghaiDate() {
  if (process.env.CONTENT_AUDIT_DATE) return process.env.CONTENT_AUDIT_DATE;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

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
      status: field(body, "status") ?? "",
      chapterType: field(body, "chapterType") ?? "",
      slug: field(body, "slug"),
    });
  }
  return episodes;
}

function normalizeComicReference(reference) {
  return reference
    .replace(/^.*?\/comics\//, "")
    .replace(/[?#].*$/, "")
    .replace(/\.(?:png|webp|avif)$/i, "")
    .replace(/-512$/, "");
}

async function walkTextFiles(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkTextFiles(target));
    else if (/\.(?:ts|tsx|md|json)$/i.test(entry.name)) files.push(target);
  }
  return files;
}

const boundaryDate = shanghaiDate();
const postFiles = (await fs.readdir(postsDir)).filter((name) => name.endsWith(".md")).sort();
const postSlugs = new Set(postFiles.map((name) => name.replace(/\.md$/, "")));
const postVisuals = new Map();

for (const file of postFiles) {
  const content = await fs.readFile(path.join(postsDir, file), "utf8");
  const slug = file.replace(/\.md$/, "");
  const visuals = [...content.matchAll(/!\[[^\]]*\]\((\/(?:comics|images)\/[^)\s]+)(?:\s+["'][^)]*)?\)/g)]
    .map((match) => match[1]);
  postVisuals.set(slug, visuals);
}

const libFiles = await fs.readdir(path.join(root, "lib"));
const seriesFiles = libFiles
  .filter((name) => (name === "series.ts" || name.startsWith("series-")) && name.endsWith(".ts") && name !== "series-registry.ts")
  .sort();
const episodes = [];

for (const file of seriesFiles) {
  const content = await fs.readFile(path.join(root, "lib", file), "utf8");
  const seriesVisual = content.match(/comicCast:\s*\{[\s\S]*?image:\s*"([^"]+)"/)?.[1];
  episodes.push(...extractEpisodes(content, file).map((episode) => ({ ...episode, seriesVisual })));
}

const registeredBySlug = new Map(episodes.filter(({ slug }) => slug).map((episode) => [episode.slug, episode]));
const published = episodes.filter(({ status, slug }) => status === "published" && slug);
const currentPublic = published.filter(({ slug }) => slug.slice(0, 10) <= boundaryDate);
const scheduled = published.filter(({ slug }) => slug.slice(0, 10) > boundaryDate);
const planned = episodes.filter(({ status }) => status !== "published");

const currentWithoutVisual = currentPublic
  .filter(({ slug, seriesVisual }) => postSlugs.has(slug)
    && (postVisuals.get(slug)?.length ?? 0) === 0
    && !seriesVisual);
const comicChaptersWithoutVisual = currentWithoutVisual.filter(({ chapterType }) => chapterType === "comic");
const registeredWithoutPost = published.filter(({ slug }) => !postSlugs.has(slug));
const standalonePosts = [...postSlugs].filter((slug) => !registeredBySlug.has(slug));

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const referencedComics = new Set();
for (const directory of [path.join(root, "app"), path.join(root, "lib"), path.join(root, "content")]) {
  for (const file of await walkTextFiles(directory)) {
    const content = await fs.readFile(file, "utf8");
    for (const match of content.matchAll(/\/comics\/([^\s"'`)<]+)/g)) {
      referencedComics.add(normalizeComicReference(match[0]));
    }
  }
}
const orphanComics = Object.keys(manifest).filter((key) => !referencedComics.has(key)).sort();

const perSeries = seriesFiles.map((file) => {
  const list = episodes.filter((episode) => episode.file === file);
  const visible = currentPublic.filter((episode) => episode.file === file);
  const future = scheduled.filter((episode) => episode.file === file);
  const backlog = planned.filter((episode) => episode.file === file);
  const missingVisuals = currentWithoutVisual.filter((episode) => episode.file === file);
  return {
    file,
    total: list.length,
    currentPublic: visible.length,
    scheduled: future.length,
    planned: backlog.length,
    currentWithoutVisual: missingVisuals.length,
    comicChaptersWithoutVisual: missingVisuals.filter(({ chapterType }) => chapterType === "comic").length,
  };
});

const compactEpisode = ({ file, season, episode, title, chapterType, slug }) => ({
  file,
  season,
  episode,
  title,
  chapterType,
  slug,
});

const report = {
  boundaryDate,
  summary: {
    totalPosts: postSlugs.size,
    standalonePosts: standalonePosts.length,
    seriesFiles: seriesFiles.length,
    registeredEpisodes: episodes.length,
    currentPublicEpisodes: currentPublic.length,
    scheduledEpisodes: scheduled.length,
    plannedEpisodes: planned.length,
    comicSources: Object.keys(manifest).length,
    currentPublicWithoutVisual: currentWithoutVisual.length,
    comicChaptersWithoutVisual: comicChaptersWithoutVisual.length,
    registeredWithoutPost: registeredWithoutPost.length,
    orphanComics: orphanComics.length,
  },
  perSeries,
};

if (details) {
  Object.assign(report, {
    currentPublicWithoutVisual: currentWithoutVisual.map(compactEpisode),
    comicChaptersWithoutVisual: comicChaptersWithoutVisual.map(compactEpisode),
    registeredWithoutPost: registeredWithoutPost.map(compactEpisode),
    standalonePosts,
    orphanComics,
  });
}

console.log(JSON.stringify(report, null, 2));
