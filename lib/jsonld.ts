// 把对象序列化为可安全内联进 <script type="application/ld+json"> 的字符串。
// JSON.stringify 不转义 < > &,直接内联会被 </script> 提前闭合 → XSS。
// 转成 JSON 字符串里等价的 \uXXXX,语义不变、无法逃逸标签(浏览器不 eval JSON-LD,无需处理行分隔符)。
export function jsonLdSafe(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

// 站点只声明内容出版实体,不把作者个人身份、社交账户或代码仓库写进公开结构化数据。
export function publisherId(base: string): string {
  return `${base}/#publisher`;
}
export function websiteId(base: string): string {
  return `${base}/#website`;
}

/** layout 发一次的完整出版实体。其余页面用 publisherRef(base) 引用。 */
export function publisherNode(base: string) {
  return {
    "@type": "Organization",
    "@id": publisherId(base),
    name: "咖啡站技术志",
    url: base,
  };
}

/** 轻量引用,指向 publisherNode 定义的同一实体。 */
export function publisherRef(base: string) {
  return { "@id": publisherId(base) };
}
