import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isAlwaysPublicCurriculum,
  isPublicEpisode,
  isReleasedDate,
  isReleasedSlug,
  shanghaiDate,
} from "../lib/publication.ts";

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

test("明确开放的 Java 与命令行课程不受原排期限制", () => {
  assert.equal(isAlwaysPublicCurriculum("2026-11-16-java-s10e11-interview-night"), true);
  assert.equal(isPublicEpisode("2026-10-13-cli-s05e04-deploy-day", noonInShanghai), true);
  assert.equal(isAlwaysPublicCurriculum("2026-12-02-cafe-s07e04-open-forever"), false);
});
