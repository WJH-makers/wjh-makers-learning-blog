import assert from "node:assert/strict";
import test from "node:test";
import { isAlwaysPublicCurriculum, isPublicEpisode, isPublicOn, publicFacingEpisodes } from "../lib/publication.ts";

const noonOnReleaseDay = new Date("2026-07-29T12:00:00+08:00");

test("发布日期以中国时区为准，今天与过去内容可以公开", () => {
  assert.equal(isPublicOn("2026-07-28", noonOnReleaseDay), true);
  assert.equal(isPublicOn("2026-07-29", noonOnReleaseDay), true);
});

test("未来内容及不合法日期不会进入公开出口", () => {
  assert.equal(isPublicOn("2026-07-30", noonOnReleaseDay), false);
  assert.equal(isPublicOn("not-a-date", noonOnReleaseDay), false);
  assert.equal(isPublicEpisode("2026-07-30-cafe-s01e06-loops", noonOnReleaseDay), false);
});

test("Java 与命令行完整课程由编辑决定公开，不受原排期限制", () => {
  assert.equal(isAlwaysPublicCurriculum("2026-11-16-java-s10e11-interview-night"), true);
  assert.equal(isPublicEpisode("2026-10-13-cli-s05e04-deploy-day", noonOnReleaseDay), true);
  assert.equal(isAlwaysPublicCurriculum("2026-12-02-cafe-s07e04-open-forever"), false);
});

test("尚未发布的咖啡站章节在目录和地图中必须是不可点击的预告", () => {
  const [firstEpisode] = publicFacingEpisodes([
    { status: "published", slug: "2026-11-01-cafe-s01e01-remember" },
  ]);

  assert.equal(firstEpisode?.status, "planned");
  assert.equal(firstEpisode?.slug, "2026-11-01-cafe-s01e01-remember");
});
