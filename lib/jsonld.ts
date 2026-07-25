// 把对象序列化为可安全内联进 <script type="application/ld+json"> 的字符串。
// JSON.stringify 不转义 < > &,直接内联会被 </script> 提前闭合 → XSS。
// 转成 JSON 字符串里等价的 \uXXXX,语义不变、无法逃逸标签(浏览器不 eval JSON-LD,无需处理行分隔符)。
export function jsonLdSafe(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
