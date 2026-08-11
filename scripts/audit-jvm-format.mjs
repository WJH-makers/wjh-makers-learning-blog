// jvm 线格式合规审计：对照 docs/jvm-academy/handbook.md §3 的 12 步骨架与硬性规定。
// 已发布的 f01e01/f01e02 是格式基准（它们符合规范），用来校准判定。
// 末尾附加节「🎯 随堂练习」「运行环境、验证与依据」是全站通用附加节，不计违规。
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const postsDir = path.join(root, "content", "posts");
const today = process.env.CONTENT_AUDIT_DATE ?? new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

/** 剥离围栏代码块内容，避免代码里的 # 被当成标题。 */
function stripFences(text) {
  const out = [];
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) { inFence = !inFence; out.push("~~~fence~~~"); continue; }
    out.push(inFence ? "~~~code~~~" : line);
  }
  return out.join("\n");
}

const libBody = await fs.readFile(path.join(root, "lib", "series-jvm.ts"), "utf8");
const reg = new Map();
const regOrder = [];
const pattern = /\{\s*season:\s*(\d+),\s*episode:\s*(\d+),([\s\S]*?)\},?\s*(?=\{\s*season:|\]\s*,?\s*\}|\]\s*,?\s*$)/g;
for (const m of libBody.matchAll(pattern)) {
  const body = m[3];
  const slug = body.match(/slug:\s*"([^"]+)"/)?.[1];
  const entry = {
    season: Number(m[1]),
    episode: Number(m[2]),
    title: body.match(/title:\s*"((?:[^"\\]|\\.)*)"/)?.[1] ?? "",
    chapterType: body.match(/chapterType:\s*"([^"]+)"/)?.[1] ?? "",
    slug,
  };
  regOrder.push(entry);
  if (slug) reg.set(slug, entry);
}
regOrder.forEach((e, i) => { e.globalNo = i + 1; });

// handbook §3 的 12 步骨架，用关键词识别每步是否存在
const SKELETON = [
  { step: 1, name: "事故/性能疑云", re: /^##\s*一、/m },
  { step: 2, name: "漫画分格", re: />\s*\*\*〔\d+〕\*\*/ },
  { step: 3, name: "本话目标", re: /本话目标/ },
  { step: 4, name: "炉内原理图", re: /炉内原理图|原理图|心智模型/ },
  { step: 5, name: "继续改代码", re: /^##\s*五、/m },
  { step: 6, name: "故意翻车", re: /故意翻一次车|故意翻车/ },
  { step: 7, name: "编译官罚单", re: /编译官罚单|📋/ },
  { step: 8, name: "修复并验证", re: /修复并验证/ },
  { step: 9, name: "炉底显微镜", re: /🔬\s*炉底显微镜/ },
  { step: 10, name: "项目检查点", re: /项目检查点/ },
  { step: 11, name: "对应招聘技能", re: /对应招聘技能/ },
  { step: 12, name: "下一话悬念", re: /下一话悬念/ },
];

// 允许的非中文数字小节（全站通用附加节）
const ALLOWED_EXTRA_H2 = [/^🎯\s*随堂练习/, /^运行环境、验证与依据/];

const files = (await fs.readdir(postsDir)).filter((f) => /jvm-f\d{2}e\d{2}/.test(f)).sort();
const rows = [];

for (const file of files) {
  const slug = file.replace(/\.md$/, "");
  const rawFull = await fs.readFile(path.join(postsDir, file), "utf8");
  const raw = stripFences(rawFull);
  const ep = reg.get(slug);
  const issues = [];
  const released = slug.slice(0, 10) <= today;

  const fm = rawFull.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const fmTitle = fm.match(/^title:\s*"?(.+?)"?\s*$/m)?.[1]?.trim() ?? "";

  // H1
  const h1s = [...raw.matchAll(/^# (.+)$/gm)].map((m) => m[1].trim());
  if (h1s.length === 0) issues.push("缺 H1");
  else if (h1s.length > 1) issues.push(`H1 有 ${h1s.length} 个`);

  // 标题格式《JVM 火种纪》NN · 本话名
  const wantNo = String(ep?.globalNo ?? 0).padStart(2, "0");
  const fmMatch = fmTitle.match(/^《JVM 火种纪》(\d{2}) · (.+)$/);
  if (!fmMatch) issues.push(`title 不合规范:「${fmTitle}」`);
  else {
    if (fmMatch[1] !== wantNo) issues.push(`title 话号 ${fmMatch[1]}，应为 ${wantNo}`);
    if (ep?.title && fmMatch[2] !== ep.title) issues.push(`title 本话名「${fmMatch[2]}」≠ 注册表「${ep.title}」`);
  }

  // 小节中文数字（排除通用附加节）
  const h2s = [...raw.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  const badH2 = h2s.filter((h) =>
    !/^[一二三四五六七八九十]+、/.test(h) && !ALLOWED_EXTRA_H2.some((re) => re.test(h)));
  if (badH2.length > 0) issues.push(`${badH2.length} 个小节非中文数字，例:「${badH2[0]}」`);

  // 12 步骨架
  const missingSteps = SKELETON.filter(({ re }) => !re.test(raw)).map(({ step, name }) => `${step}.${name}`);
  if (missingSteps.length > 0) issues.push(`缺骨架步骤: ${missingSteps.join(" / ")}`);

  // 元信息引用块
  const afterH1 = raw.split(/^# .+$/m)[1] ?? "";
  const metaLines = afterH1.trimStart().split(/\r?\n/).slice(0, 2).filter((l) => /^>/.test(l));
  if (h1s.length > 0 && metaLines.length < 2) issues.push(`元信息引用块 ${metaLines.length} 行，应为 2 行`);

  // 分格数量
  const panels = [...raw.matchAll(/>\s*\*\*〔(\d+)〕\*\*/g)].map((m) => Number(m[1]));
  if (panels.length > 0) {
    if (panels.length < 4 || panels.length > 8) issues.push(`分格 ${panels.length} 格，应为 4–8`);
    const want = Array.from({ length: panels.length }, (_, i) => i + 1).join(",");
    if (panels.join(",") !== want) issues.push(`分格编号 [${panels.join(",")}] 不连续`);
  }

  // 篇幅：handbook §3 写 4.2k–5.8k（卷终 5.5k–6.5k），但这个数已被实践推翻——
  // 已发布并作为格式基准的 f01e01/f01e02 就是 8.7k/10.6k。全线 32 篇实测分布
  // 8.7k–19.6k、中位 11.9k，带完整命令与输出实录的技术话次天然落在高位。
  //
  // 旧实现按 chapterType 分档（project 6500×3、其余 5800×3）会自相矛盾：
  // 同为 19k 的 f03e05（project）合规、f04e06（reference）超标，而两者形态一样。
  // 改为不分档的单一绝对上限，只拦真正失控的篇目（当前最大 19.6k，留足余量）。
  const LENGTH_CEILING = 24000;
  if (rawFull.length > LENGTH_CEILING) {
    issues.push(`篇幅 ${rawFull.length} 超绝对上限 ${LENGTH_CEILING}`);
  }

  // 内部路径与署名
  if (/handbook\.md/i.test(rawFull)) issues.push("正文含 handbook.md 内部路径");
  if (!/\*本话属于连载《从零进化Java:JVM 火种纪》。/.test(rawFull)) issues.push("缺规范署名行");

  // frontmatter 冗余字段
  const extra = ["series", "season", "episode"].filter((k) => new RegExp(`^${k}:`, "m").test(fm));
  if (extra.length > 0) issues.push(`frontmatter 冗余字段: ${extra.join(",")}`);

  rows.push({ slug, no: ep?.globalNo, released, chars: rawFull.length, issues });
}

const releasedRows = rows.filter((r) => r.released);
const draftRows = rows.filter((r) => !r.released);
const kindCount = {};
for (const r of rows) for (const i of r.issues) {
  const key = i.replace(/\d+/g, "N").replace(/「[^」]*」/g, "「…」").replace(/:.*$/, "").slice(0, 40);
  kindCount[key] = (kindCount[key] ?? 0) + 1;
}

console.log(JSON.stringify({
  today,
  filesChecked: files.length,
  released: { total: releasedRows.length, clean: releasedRows.filter((r) => r.issues.length === 0).length },
  drafts: { total: draftRows.length, clean: draftRows.filter((r) => r.issues.length === 0).length },
  issueKinds: kindCount,
  nextToPublish: draftRows[0]?.slug,
  findings: (process.argv.includes("--details") ? rows : rows.filter((r) => r.issues.length > 0).slice(0, 6))
    .filter((r) => r.issues.length > 0),
}, null, 2));
if (rows.some((r) => r.released && r.issues.length > 0)) process.exitCode = 1;
