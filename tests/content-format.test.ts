import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function postFiles(): string[] {
  return readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
}

/** 逐行扫描,跳过代码围栏内的内容(围栏里的 `- A)` 是示例,不参与渲染)。 */
function scan(file: string, hit: (lineNo: number, line: string, prev: string) => boolean): string[] {
  const lines = readFileSync(path.join(POSTS_DIR, file), "utf8").split("\n");
  const found: string[] = [];
  let inFence = false;

  for (let i = 1; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (hit(i + 1, lines[i], lines[i - 1])) found.push(`${file}:${i + 1}`);
  }
  return found;
}

/**
 * 渲染器按缩进栈判定嵌套(lib/markdown.ts 的 renderListBlock:子项缩进要比栈顶多 ≥2 空格)。
 * 顶格的 `- A) …` 与顶格的 `1. …` 属于同一层、类型又不同,于是当前 <ol> 被关掉、另起一个;
 * 新起的 <ol> 没有 start 属性 —— 浏览器从 1 重新编号,整篇选择题的题号全变成「1.」,
 * 选项还会脱离题干单独成列。
 *
 * 2026-07-29 一次性修掉 47 篇文章共 773 行(46 篇整篇顶格 + 1 篇混合式)。
 * 这条测试守住它不再长回来:写新话时选项必须缩进(3 空格即可,与题号位数无关)。
 */
test("选择题选项必须缩进 —— 顶格会劈断 <ol>,题号重置成「1.」", () => {
  const offenders = postFiles().flatMap((file) =>
    scan(file, (_no, line, prev) => /^\s*\d+\.\s/.test(prev) && /^[-*]\s/.test(line)),
  );

  assert.deepEqual(
    offenders,
    [],
    `以下选项行顶格,会让所在文章的题号重置为「1.」,请补 3 空格缩进:\n${offenders.join("\n")}`,
  );
});

/**
 * 站内中文标点基线:直角引号「」、半角逗号/分号/冒号(全站比例约 2942:4、12207:32)。
 * 外部工具生成的段落常带全角「,;:()」和弯引号 —— 混进正文后同一行里两种标点并存,
 * 视觉上很扎眼。代码围栏内不管(示例代码里的中文注释按原样保留)。
 */
test("连载正文的中文标点保持站内基线(半角逗号/分号 + 直角引号)", () => {
  const offenders = postFiles()
    .filter((f) => /java-s\d\d/.test(f))
    .flatMap((file) => scan(file, (_no, line) => /[，；“”]/.test(line)));

  assert.deepEqual(
    offenders,
    [],
    `以下行混入了全角逗号/分号或弯引号,请改为 , ; 与「」:\n${offenders.join("\n")}`,
  );
});
