/** 估算阅读分钟数:英文按空白分词,CJK 每 2 字折 1 词,220 词/分钟,至少 1 分钟。 */
export function estimateReadingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const cjk = (content.match(/[\u4e00-\u9fff]/g) ?? []).length;
  return Math.max(1, Math.ceil((words + cjk / 2) / 220));
}
