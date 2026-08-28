/**
 * SeriesMap 的输入契约。
 *
 * app/java/SeriesMap.tsx:43-49 把发布过滤整体外移给调用方（「发布判定已由调用方在服务端
 * 完成」），组件自己只收拢空季。这个决定是对的 —— 组件内再判一遍 isReleasedSlug 会把
 * lib/publication.ts 的发布口径复制进浏览器 bundle，且在 cacheComponents 下是硬错误
 * （客户端组件读当前时间且上方无 Suspense）。
 *
 * 但外移之后，「未发布话次不进公开知识地图」这件事就完全依赖每个调用方自觉过滤，
 * 而这条契约 4 天前刚破过一次：be2d4bb 的提交信息原文「附带修一处发布泄漏：
 * app/cli/page.tsx 此前把未过滤的 CLI_SEASONS 直接传给 SeriesMap」——那次修复没补任何测试。
 *
 * 破坏形态很具体：SeriesMap.tsx:84 的 `const clickable = true` 让 :104 的三元恒取 Link
 * 分支，于是未发布话次的 title/summary 会渲染进公开页面，并生成 /posts/<未发布slug> 的
 * 可点链接（点进去 404）；slug 缺失时直接生成 /posts/undefined。tsc 与全部测试都不会红。
 *
 * 本文件两条腿：
 *   1) 源码契约 —— 遍历所有 import SeriesMap 的文件，断言传给 seasons 的实参不是裸常量，
 *      且确实由一次带发布谓词的过滤派生。这条才是拦住「新连载页照抄错写法」的闸。
 *   2) 行为断言 —— 调用方普遍依赖的 publishedEpisodesOf / publishedEpisodes 必须真的把
 *      未到日期的话次剔除。用合成数据，不靠真实排期（真实数据 90/90 全已发布，
 *      拿它做负例是空转）。
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..");

// lib/series*.ts 内部全走 `@/lib/...` 别名，node --test 不解析 tsconfig 的 paths。
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const base = path.join(ROOT, specifier.slice(2));
      for (const candidate of [`${base}.ts`, `${base}.tsx`]) {
        if (fs.existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});

const { publishedEpisodesOf, SERIES_LIST } = await import("../lib/series-registry.ts");
const { publishedEpisodes, seasonPublishedSlugs } = await import("../lib/series.ts");
const { isPublicEpisode } = await import("../lib/publication.ts");

// ── 源码契约 ───────────────────────────────────────────────────────────────

/** 剥注释后再匹配。本仓库注释里就写着 `CLI_SEASONS` 这类反面例子，不剥必然假阳性。 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(path.relative(ROOT, full).replaceAll("\\", "/"));
      }
    }
  };
  walk(path.join(ROOT, dir));
  return out;
}

/** 所有渲染 SeriesMap 的文件（组件自身除外）。 */
const callSites = sourceFiles("app").filter((file) => {
  if (file === "app/java/SeriesMap.tsx") return false;
  return /<SeriesMap[\s/>]/.test(stripComments(fs.readFileSync(path.join(ROOT, file), "utf8")));
});

test("能找到全部 SeriesMap 调用点（找不到说明本文件的匹配已失效）", () => {
  // 这条是给下面几条兜底的：JSX 写法一变、匹配失配，下面的遍历就会空转全绿。
  // 空转的契约测试比没有测试更糟 —— 它让「已被钉住」这个印象继续成立。
  assert.ok(callSites.length >= 4, `应至少找到 4 个调用点，实际 ${callSites.length}：${callSites.join(", ")}`);
  for (const expected of ["app/java/page.tsx", "app/cli/page.tsx", "app/cafe/page.tsx", "app/_components/SeriesLanding.tsx"]) {
    assert.ok(callSites.includes(expected), `${expected} 应被识别为 SeriesMap 调用点`);
  }
});

/** 取 `<SeriesMap ... seasons={X} ...>` 里的 X。支持单行与多行 JSX。 */
function seasonsArgument(source: string): string | undefined {
  const tag = source.match(/<SeriesMap\b[\s\S]*?\/>/)?.[0];
  return tag?.match(/seasons=\{([^}]+)\}/)?.[1].trim();
}

test("seasons 实参不是裸的季常量", () => {
  // 这正是 be2d4bb 修掉的那个形态：`seasons={CLI_SEASONS}`。
  // 裸常量含全部话次，未发布的会连标题带摘要一起进公开页面。
  const offenders: string[] = [];
  for (const file of callSites) {
    const argument = seasonsArgument(stripComments(fs.readFileSync(path.join(ROOT, file), "utf8")));
    assert.ok(argument, `${file}: 取不到 seasons 实参，匹配规则可能已失效`);
    // 裸常量的形态：全大写标识符（CLI_SEASONS / SEASONS / CAFE_SEASONS…）或
    // 直接把注册表里的原始集合递进来（series.seasons）。
    if (/^[A-Z][A-Z0-9_]*$/.test(argument) || /^[a-z]\w*\.seasons$/.test(argument)) {
      offenders.push(`${file}: seasons={${argument}}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `SeriesMap 的 seasons 必须先在服务端按发布状态过滤，不能直接传原始集合：\n${offenders.join("\n")}`,
  );
});

test("seasons 实参由一次带发布谓词的过滤派生", () => {
  // 只查「不是裸常量」拦不住 `const visibleSeasons = SEASONS` 这种改名式绕过。
  // 因此再往上追一层：那个局部变量的定义里必须同时出现 .filter( 与一个发布谓词。
  //
  // 认可的发布谓词就这几个，全部最终落到 lib/publication.ts 的日期判定：
  //   isReleasedSlug / isPublicEpisode  —— cli、cafe 的写法
  //   publishedSlugs.has                —— java 的写法（Set 成员测试，避免 O(N²)）
  //   published.some                    —— SeriesLanding 的写法
  // 新写法要么归到这几种之一，要么在这里显式登记一次 —— 登记这个动作本身就是复核。
  const PREDICATES = /isReleasedSlug|isPublicEpisode|publishedSlugs\.has|published\.some|publishedEpisodes/;
  const offenders: string[] = [];
  for (const file of callSites) {
    const source = stripComments(fs.readFileSync(path.join(ROOT, file), "utf8"));
    const argument = seasonsArgument(source);
    if (!argument || !/^[A-Za-z_$][\w$]*$/.test(argument)) continue; // 非简单标识符，上一条已覆盖

    const declaration = source.match(new RegExp(`const\\s+${argument}\\s*=([\\s\\S]*?);\\n`))?.[1];
    assert.ok(declaration, `${file}: 找不到 ${argument} 的定义`);
    if (!declaration.includes(".filter(")) offenders.push(`${file}: ${argument} 的定义里没有 .filter(`);
    else if (!PREDICATES.test(declaration)) {
      offenders.push(`${file}: ${argument} 过滤时未使用任何已登记的发布谓词`);
    }
  }
  assert.deepEqual(offenders, [], `发布过滤必须在服务端做实：\n${offenders.join("\n")}`);
});

test("SeriesMap 自身不引发布判定，也不无条件渲染链接以外的分支", () => {
  const source = fs.readFileSync(path.join(ROOT, "app/java/SeriesMap.tsx"), "utf8");
  assert.match(source, /^"use client"/, "SeriesMap 是客户端组件，这是本契约存在的前提");
  // 组件重新自己判发布，等于把发布口径复制进浏览器 bundle，且在 cacheComponents 下
  // 是硬错误。契约的另一半：外移之后不许悄悄搬回来。
  const code = stripComments(source);
  assert.doesNotMatch(code, /isReleasedSlug|isPublicEpisode|publicFacing/, "发布判定必须留在服务端调用方");
  assert.doesNotMatch(code, /@\/lib\/publication/, "SeriesMap 不得 import lib/publication");
  // 无条件生成 Link 是「未过滤就等于泄漏」的放大器：钉住这个事实，
  // 免得有人以为组件里还有一层兜底。
  assert.match(code, /const clickable = true/, "组件当前无条件可点；若改成有条件，本文件的风险描述需同步更新");
});

// ── 行为断言 ───────────────────────────────────────────────────────────────

const FUTURE = "2099-12-31-fake-s01e01-not-yet";
const PAST = "2020-01-01-fake-s01e02-long-ago";

/** 合成一条线：一话已到日期、一话排在 2099 年、一话没有 slug。 */
function syntheticSeries() {
  return {
    title: "合成连载",
    tagline: "仅供测试",
    route: "/synthetic" as never,
    storageKey: "synthetic:completed",
    seasons: [
      {
        season: 1,
        code: "S01",
        title: "第一卷",
        subtitle: "测试",
        episodes: [
          { season: 1, episode: 1, title: "未来话", summary: "", chapterType: "lab", projectStage: "", technologies: [], status: "published", slug: FUTURE },
          { season: 1, episode: 2, title: "过去话", summary: "", chapterType: "lab", projectStage: "", technologies: [], status: "published", slug: PAST },
          { season: 1, episode: 3, title: "无 slug 话", summary: "", chapterType: "lab", projectStage: "", technologies: [], status: "published" },
          { season: 1, episode: 4, title: "规划话", summary: "", chapterType: "lab", projectStage: "", technologies: [], status: "planned", slug: PAST },
        ],
      },
    ],
  } as unknown as Parameters<typeof publishedEpisodesOf>[0];
}

test("publishedEpisodesOf 剔除未到日期、无 slug 与非 published 的话次", () => {
  // 用合成数据而不是真实排期：真实数据当前 90/90 全部已发布，拿它做负例是空转
  // （这正是本组另一条 finding 的教训 —— 恒真断言看起来和真断言一模一样）。
  const slugs = publishedEpisodesOf(syntheticSeries()).map((episode) => episode.slug);
  assert.deepEqual(slugs, [PAST], "只有「status=published 且日期已到」的话次可对外");
});

test("seasonPublishedSlugs 与 publishedEpisodesOf 口径一致", () => {
  // 两者分别喂给 JavaProgress 与 SeriesMap。口径分叉的表现是「进度条说 5 话，
  // 地图上只有 4 个节点」——数字对不上，但两边各自都不报错。
  const series = syntheticSeries();
  const fromSeasons = series.seasons.flatMap((season) => seasonPublishedSlugs(season));
  assert.deepEqual(fromSeasons, [PAST]);
  assert.deepEqual(fromSeasons, publishedEpisodesOf(series).map((episode) => episode.slug));
});

test("全站真实数据里，对外话次的日期闸门无一例外", () => {
  // 合成数据证明谓词正确，这条证明它真的施加在了全部 27 条线上。
  const leaked: string[] = [];
  for (const series of SERIES_LIST) {
    for (const episode of publishedEpisodesOf(series)) {
      if (episode.status !== "published" || !isPublicEpisode(episode.slug)) {
        leaked.push(`${series.route} S${episode.season}E${episode.episode} ${episode.slug ?? "(无 slug)"}`);
      }
    }
  }
  assert.deepEqual(leaked, [], `以下话次绕过了发布闸门：\n${leaked.join("\n")}`);
  // publishedEpisodes() 是 /java 专用的那条，同口径单独兜一次。
  assert.ok(publishedEpisodes().every((episode) => isPublicEpisode(episode.slug)));
});
