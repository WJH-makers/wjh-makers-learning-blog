import { timingSafeEqual } from "node:crypto";

/**
 * 常数时间字符串比较,避免计时侧信道(鉴权代码统一走这一份)。
 * 先比 UTF-8 字节长度,不等直接 false;等长再 timingSafeEqual 全量比对。
 */
export function safeCompare(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
