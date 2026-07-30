import { test } from "node:test";
import assert from "node:assert/strict";
import { isReleasedDate, isReleasedSlug, shanghaiDate } from "../lib/publication.ts";

const noonInShanghai = new Date("2026-07-29T04:00:00.000Z");

test("上海日期作为发布边界，发布日期当天可见、未来日期不可见", () => {
  assert.equal(shanghaiDate(noonInShanghai), "2026-07-29");
  assert.equal(isReleasedDate("2026-07-29", noonInShanghai), true);
  assert.equal(isReleasedDate("2026-07-30", noonInShanghai), false);
});

test("连载 slug 必须具有已到达的 YYYY-MM-DD 前缀才可公开", () => {
  assert.equal(isReleasedSlug("2026-07-29-java-s01e05-switch", noonInShanghai), true);
  assert.equal(isReleasedSlug("2026-08-01-java-s01e08-methods", noonInShanghai), false);
  assert.equal(isReleasedSlug("not-a-dated-slug", noonInShanghai), false);
});
