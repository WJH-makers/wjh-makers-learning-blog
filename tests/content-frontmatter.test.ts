// frontmatter 键名约定。起因:30 篇 JVM 连载写成 excerpt 而非 summary,
// 解析器只认 summary,于是 meta description / OG 卡片 / JSON-LD / 页面导语
// 全部静默退化成兜底文案「学习记录」——没有任何测试或构建会报错。
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const POSTS_DIR = path.resolve(import.meta.dirname, "..", "content", "posts");
const files = (await fs.readdir(POSTS_DIR)).filter((name) => name.endsWith(".md"));

/** 取 frontmatter 区(首个 --- 到第二个 ---),避免把正文里的 `key:` 误当字段。 */
async function frontmatterOf(file: string): Promise<string> {
  const raw = await fs.readFile(path.join(POSTS_DIR, file), "utf8");
  if (!raw.startsWith("---")) return "";
  const end = raw.indexOf("\n---", 3);
  return end === -1 ? "" : raw.slice(3, end);
}

test("每篇文章都有非空 summary", async () => {
  const missing: string[] = [];
  for (const file of files) {
    const head = await frontmatterOf(file);
    const match = head.match(/^summary:\s*(.*)$/m);
    const value = match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
    if (!value) missing.push(file);
  }
  assert.deepEqual(missing, [], `缺少 summary(会退化成兜底文案「学习记录」):\n${missing.join("\n")}`);
});

test("summary 不是兜底文案，也不是过短的占位", async () => {
  const bad: string[] = [];
  for (const file of files) {
    const head = await frontmatterOf(file);
    const match = head.match(/^summary:\s*(.*)$/m);
    const value = match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
    if (value === "学习记录") bad.push(`${file}: 与兜底文案相同`);
    else if (value && value.length < 10) bad.push(`${file}: 仅 ${value.length} 字 -> ${value}`);
  }
  assert.deepEqual(bad, [], `summary 无效:\n${bad.join("\n")}`);
});

test("frontmatter 不再使用 excerpt 键", async () => {
  // 解析器保留 excerpt 回落只作安全网;正式约定是 summary,新文章不许再引入分叉。
  const offenders: string[] = [];
  for (const file of files) {
    const head = await frontmatterOf(file);
    if (/^excerpt:/m.test(head)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `请改用 summary:\n${offenders.join("\n")}`);
});

test("每篇文章都有 title 与 YYYY-MM-DD 形式的 date", async () => {
  const bad: string[] = [];
  for (const file of files) {
    const head = await frontmatterOf(file);
    const title = head.match(/^title:\s*(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
    const date = head.match(/^date:\s*(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
    if (!title) bad.push(`${file}: 缺 title`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) bad.push(`${file}: date 形式非法 -> ${date || "(空)"}`);
  }
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("文件名日期前缀与 frontmatter date 一致", async () => {
  // 日期是公开闸门(lib/publication.ts):两者不一致会让文章在预期外的日子出现或消失。
  const mismatched: string[] = [];
  for (const file of files) {
    const filePrefix = file.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
    if (!filePrefix) continue;
    const head = await frontmatterOf(file);
    const date = head.match(/^date:\s*(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
    if (date !== filePrefix) mismatched.push(`${file}: 文件名 ${filePrefix} vs date ${date}`);
  }
  assert.deepEqual(mismatched, [], `日期闸门不一致:\n${mismatched.join("\n")}`);
});
