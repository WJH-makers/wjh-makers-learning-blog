import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BANNED_WORDS,
  containsBannedWord,
  contentRejection,
  countLinks,
  isHoneypotTripped,
  isValidCommentSlug,
} from "../lib/comment-guards.ts";

// 评论是全站唯一的匿名写库路径,而这几层此前零行为测试 —— 守护只有
// tests/content-audit.test.ts 里两条源码文本 grep,任何一层被改宽都不会有测试报红。

test("slug 形状与 db 层的 assertPostSlug 同口径，畸形标识一律拒绝", () => {
  assert.equal(isValidCommentSlug("2026-08-24-hello-world"), true);
  assert.equal(isValidCommentSlug("中文标识-也可以"), true);

  // 下面这些如果放行,就能往任意不存在的 slug 底下堆垃圾数据。
  assert.equal(isValidCommentSlug(""), false);
  assert.equal(isValidCommentSlug("-leading"), false);
  assert.equal(isValidCommentSlug("trailing-"), false);
  assert.equal(isValidCommentSlug("double--hyphen"), false);
  assert.equal(isValidCommentSlug("has space"), false);
  assert.equal(isValidCommentSlug("has/slash"), false);
  assert.equal(isValidCommentSlug("has.dot"), false);
  assert.equal(isValidCommentSlug("a".repeat(181)), false);
  assert.equal(isValidCommentSlug("a".repeat(180)), true);
});

test("蜜罐只认非空白，纯空格不算机器人", () => {
  assert.equal(isHoneypotTripped(""), false);
  assert.equal(isHoneypotTripped("   "), false);
  assert.equal(isHoneypotTripped("\t\n"), false);
  assert.equal(isHoneypotTripped("bot"), true);
  assert.equal(isHoneypotTripped("  x  "), true);
});

test("昵称与正文长度边界，两端都要卡住", () => {
  assert.equal(contentRejection("a", "ok 的正文"), undefined);
  assert.equal(contentRejection("", "ok 的正文"), "昵称需 1–24 个字符。");
  assert.equal(contentRejection("a".repeat(24), "ok 的正文"), undefined);
  assert.equal(contentRejection("a".repeat(25), "ok 的正文"), "昵称需 1–24 个字符。");

  assert.equal(contentRejection("名字", "a"), "评论需 2–1000 个字符。");
  assert.equal(contentRejection("名字", "ab"), undefined);
  assert.equal(contentRejection("名字", "a".repeat(1000)), undefined);
  assert.equal(contentRejection("名字", "a".repeat(1001)), "评论需 2–1000 个字符。");
});

test("链接数上限是 2，第三条起判广告", () => {
  assert.equal(countLinks("没有链接"), 0);
  assert.equal(countLinks("看 https://a.com 和 http://b.com"), 2);
  assert.equal(countLinks("HTTPS://A.com https://b.com https://c.com"), 3);

  assert.equal(contentRejection("名字", "https://a.com https://b.com"), undefined);
  assert.equal(contentRejection("名字", "https://a.com https://b.com https://c.com"), "链接过多,疑似广告。");
});

test("敏感词在昵称与正文里都要命中，且不区分大小写", () => {
  assert.equal(containsBannedWord("正常昵称", "正常内容"), false);

  // 拆到昵称里同样是投放手法,不能只查正文。
  assert.equal(containsBannedWord("加微信123", "正常内容"), true);
  assert.equal(containsBannedWord("正常昵称", "私聊 加微信"), true);

  // 表里的英文/半角词必须大小写不敏感,否则 T.ME/ 这种写法直接绕过。
  assert.equal(containsBannedWord("正常昵称", "来 T.ME/spam 看看"), true);
  assert.equal(containsBannedWord("正常昵称", "加QQ 好友"), true);

  // 表里每一条都必须真的能被命中 —— 防止有人往表里加了词却写错形式(例如带了空格)。
  for (const word of BANNED_WORDS) {
    assert.equal(containsBannedWord("昵称", `前缀 ${word} 后缀`), true, `敏感词未命中: ${word}`);
  }
});

test("判定顺序是长度 → 链接 → 敏感词，先命中的先返回", () => {
  // 一条同时违反长度与敏感词的输入,必须报长度 —— 顺序是对外契约,
  // 调换会改变用户看到的提示,也会让「超长广告」被归错类。
  assert.equal(contentRejection("", "加微信"), "昵称需 1–24 个字符。");
  // 同时超链接数与含敏感词时报链接过多。
  assert.equal(
    contentRejection("名字", "https://a.com https://b.com https://c.com 加微信"),
    "链接过多,疑似广告。",
  );
});
