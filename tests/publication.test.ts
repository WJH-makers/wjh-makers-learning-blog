import { test } from "node:test";
import assert from "node:assert/strict";
import {
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
  assert.equal(isReleasedSlug("2026-05-07-java-s01e05-switch", noonInShanghai), true);
  // 虚构话号：这里要的是「日期尚未到达」这一条件本身，不能挂真实 slug，
  // 否则日后一次排期平移就会把断言意图改掉。
  assert.equal(isReleasedSlug("2026-08-01-java-s99e99-not-yet", noonInShanghai), false);
  assert.equal(isReleasedSlug("not-a-dated-slug", noonInShanghai), false);
});

test("倒推排期后，两条完结连载靠日期本身公开，未完结的仍受闸门约束", () => {
  // 末话锚定在倒推终点当天：当天即可见，不再需要按 slug 前缀开特例。
  const finaleDay = new Date("2026-07-31T04:00:00.000Z");
  assert.equal(isPublicEpisode("2026-07-31-java-s10e11-interview-night", finaleDay), true);
  assert.equal(isPublicEpisode("2026-07-31-cli-s05e04-deploy-day", finaleDay), true);
  assert.equal(isPublicEpisode("2026-05-03-java-s01e01-hello", finaleDay), true);
  assert.equal(isPublicEpisode("2026-12-02-cafe-s07e04-open-forever", finaleDay), false);
});
