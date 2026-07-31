import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * ASCII 框线图对齐校验。
 *
 * 框线图靠空格手工对齐,而「对齐」只在特定字体度量下成立。渲染端已把
 * .ascii-diagram 锁定为 Sarasa Term SC 子集(见 public/fonts/SARASA-LICENSE.txt),
 * 其实测度量为:汉字与全角标点 = 2 格,拉丁/数字/空格/框线/箭头/几何符 = 1 格。
 * 本测试用同一套度量复算每个框的边界,防止新写的图再次歪掉 —— 这类破相
 * 肉眼要放到浏览器里才看得见,靠人工 review 是拦不住的。
 */

const POSTS = path.join(process.cwd(), "content", "posts");

/**
 * 该字符占几个半角格。
 *
 * Sarasa Term SC 的规则很干净:**East Asian Ambiguous 一律按窄**,只有真正的
 * 表意文字、假名、CJK 标点与全角形式才是 2 格。所以框线 ─│、箭头 →、几何符 ■、
 * 破折号 —、省略号 …、带圈数字 ① 全部是 1 格(已逐个读 advance width 核对)。
 * 不要在这里为「看起来很宽」的符号开特例 —— 那会和真实渲染对不上。
 */
function cells(cp: number): number {
  const wide =
    (cp >= 0x1100 && cp <= 0x115f) ||   // Hangul Jamo
    (cp >= 0x2e80 && cp <= 0x303e) ||   // CJK 部首 ~ CJK 标点(、。「」《》)
    (cp >= 0x3041 && cp <= 0x33ff) ||   // 假名 ~ CJK 兼容
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||   // 全角形式（）：，
    (cp >= 0xffe0 && cp <= 0xffe6);
  return wide ? 2 : 1;
}

function width(s: string): number {
  let w = 0;
  for (const ch of s) w += cells(ch.codePointAt(0)!);
  return w;
}

const OPENERS = "┌└├│";
const CLOSERS = "┐┘┤│";

function isFrameLine(line: string): boolean {
  const s = line.trim();
  return s.length >= 2 && OPENERS.includes(s[0]) && CLOSERS.includes(s[s.length - 1]);
}

/** 一行首尾之间还出现 ┌ 或 ┐ = 并排框,其宽度关系跨组,不在本测试范围 */
function isParallel(line: string): boolean {
  const s = line.trim();
  return [...s.slice(1, -1)].some((ch) => ch === "┌" || ch === "┐");
}

type Group = { file: string; line: number; widths: number[] };

function collectFrameGroups(): { groups: Group[]; parallel: Group[] } {
  const groups: Group[] = [];
  const parallel: Group[] = [];
  for (const file of fs.readdirSync(POSTS).filter((n) => n.endsWith(".md"))) {
    const lines = fs.readFileSync(path.join(POSTS, file), "utf8").split("\n");
    let inFence = false;
    let i = 0;
    while (i < lines.length) {
      const bare = lines[i].replace(/^\s*>\s?/, "");
      if (bare.startsWith("```")) { inFence = !inFence; i++; continue; }
      if (!inFence || !isFrameLine(bare)) { i++; continue; }
      const start = i;
      const buf: string[] = [];
      while (i < lines.length) {
        const b = lines[i].replace(/^\s*>\s?/, "");
        if (b.startsWith("```") || !isFrameLine(b)) break;
        buf.push(b.trimEnd());
        i++;
      }
      if (buf.length >= 2) {
        const g = { file, line: start + 1, widths: buf.map(width) };
        (buf.some(isParallel) ? parallel : groups).push(g);
      }
    }
  }
  return { groups, parallel };
}

test("ASCII 框线图:同一个框的各行宽度必须一致(按 Sarasa Term SC 度量)", () => {
  const { groups } = collectFrameGroups();
  assert.ok(groups.length > 0, "没扫到任何框线图,检测逻辑可能失效了");
  const broken = groups
    .filter((g) => new Set(g.widths).size > 1)
    .map((g) => `${g.file}:${g.line} 宽度=${[...new Set(g.widths)].sort((a, b) => a - b).join(",")}`);
  assert.deepEqual(
    broken,
    [],
    `以下框线图的边框宽度不一致,渲染出来竖线会歪(补齐行尾即可,勿动中间连接点):\n  ${broken.join("\n  ")}`,
  );
});

test("ASCII 框线图:并排框的已知欠账不允许增加", () => {
  const { parallel } = collectFrameGroups();
  const broken = parallel.filter((g) => new Set(g.widths).size > 1);
  // 并排框的宽度关系跨越多个框与其间隙,自动补齐会平移后续段、错开 ┬/┴ 连接点,
  // 只能人工修。这里锁死数量,防止新增。修掉一个就把基线调小一个。
  assert.ok(
    broken.length <= 8,
    `并排框未对齐数量从 8 涨到 ${broken.length}:\n  ${broken.map((g) => `${g.file}:${g.line}`).join("\n  ")}`,
  );
});
