/**
 * 评论反垃圾里**不碰 I/O 的那几层**:slug 形状、蜜罐、长度、链接数、敏感词。
 *
 * 单独成模块的原因是可测性:lib/comments.ts 经 `@/lib/db` → mongodb 一路把整个
 * 数据库依赖链拉进来,而 Node `--test` 不解析 tsconfig 的 `paths` 别名
 * (实测 `Cannot find package '@/lib'`),于是那七层防线一行行为测试都没有,
 * 守护只剩两条源码文本 grep。把纯判定摘出来后,它们可以被直接 import 断言,
 * 而 submitComment 的编排顺序与错误文案一字不改。
 *
 * 本模块**不得**引入任何 import —— 一旦引入别名依赖,上面这个可测性就没了。
 */

/** 与 lib/db.ts 的 assertPostSlug 同一条正则:字母数字段,用单个连字符相连。 */
const SLUG_SHAPE = /^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u;
const MAX_SLUG_LENGTH = 180;

export const NAME_MIN = 1;
export const NAME_MAX = 24;
export const BODY_MIN = 2;
export const BODY_MAX = 1000;
export const MAX_LINKS = 2;

export const BANNED_WORDS = [
  "加微信", "加qq", "加v信", "代开", "发票", "菠菜", "博彩", "赌博", "色情",
  "澳门", "威客", "刷单", "兼职日结", "t.me/", "vx：", "薇：",
] as const;

export function isValidCommentSlug(slug: string): boolean {
  return SLUG_SHAPE.test(slug) && slug.length <= MAX_SLUG_LENGTH;
}

/** 蜜罐:隐藏字段本该为空,填了就是机器人。 */
export function isHoneypotTripped(honeypot: string): boolean {
  return Boolean(honeypot.trim());
}

export function countLinks(body: string): number {
  return (body.match(/https?:\/\//gi) ?? []).length;
}

export function containsBannedWord(name: string, body: string): boolean {
  // 昵称与正文一起查:把敏感词拆到昵称里同样是投放手法。
  const haystack = `${name}\n${body}`.toLowerCase();
  return BANNED_WORDS.some((word) => haystack.includes(word.toLowerCase()));
}

/**
 * 内容层判定。返回 undefined 表示通过,否则返回给用户看的原因。
 * 顺序与文案必须与 submitComment 中原有实现一致 —— 它们是对外契约。
 */
export function contentRejection(name: string, body: string): string | undefined {
  if (name.length < NAME_MIN || name.length > NAME_MAX) return "昵称需 1–24 个字符。";
  if (body.length < BODY_MIN || body.length > BODY_MAX) return "评论需 2–1000 个字符。";
  if (countLinks(body) > MAX_LINKS) return "链接过多,疑似广告。";
  if (containsBannedWord(name, body)) return "内容包含不被允许的词汇。";
  return undefined;
}
