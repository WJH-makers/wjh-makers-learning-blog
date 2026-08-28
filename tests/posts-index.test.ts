import assert from "node:assert/strict";
import { test } from "node:test";
import { mergePublishedPostIndex, type PostIndexEntry } from "../lib/post-index.ts";

function entry(slug: string, date: string, summary = slug): PostIndexEntry {
  return { slug, title: slug, date, summary, tags: ["Java"] };
}

test("published post index stays content-free, sorted and database-overridable", () => {
  const markdown = [entry("older", "2020-01-01"), entry("same", "2020-01-02", "markdown")];
  const database = [entry("newer", "2020-01-03"), entry("same", "2020-01-02", "database")];
  const merged = mergePublishedPostIndex(markdown, database);

  assert.deepEqual(merged.map((post) => post.slug), ["newer", "same", "older"]);
  assert.equal(merged.find((post) => post.slug === "same")?.summary, "database");
  assert.ok(merged.every((post) => !("content" in post)));
});

test("未到发布日期的条目不进公开索引", () => {
  // 上面那条测试的三个 fixture 全是 2020 年,发布闸门对它们是空操作 ——
  // 实测把 lib/post-index.ts:19 的 .filter(isReleasedDate) 整行删掉,它照样全绿。
  // 这里必须有一个「日期未到」的样本,否则闸门被误删时没有任何测试会报红,
  // 后果是排期中的稿子和写作台刚存的未来日期文章直接出现在首页与 RSS 上。
  //
  // 用 2999 而不是「今天+1」:后者依赖测试运行时刻,而 isReleasedDate 的默认基准是
  // 模块加载时刻的 BUILD_TIME_NOW,跨午夜跑会闪烁。2999 在任何时候都未到。
  const scheduled = [entry("released", "2020-01-01"), entry("scheduled", "2999-12-31")];
  const merged = mergePublishedPostIndex(scheduled, []);

  assert.deepEqual(merged.map((post) => post.slug), ["released"]);

  // 数据库侧覆盖同样要过闸门 —— 写作台是唯一能写出未来日期的入口,
  // 它走的正是 databasePosts 这一路。
  const fromDatabase = mergePublishedPostIndex([], [entry("db-scheduled", "2999-12-31")]);
  assert.deepEqual(fromDatabase, []);

  // 形状不合法的日期也不能放行(闸门的正则同时管形状)。
  const malformed = mergePublishedPostIndex([], [entry("no-date", ""), entry("bad-date", "2026/08/24")]);
  assert.deepEqual(malformed, []);
});
