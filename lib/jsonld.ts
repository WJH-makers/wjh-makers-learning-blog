// 把对象序列化为可安全内联进 <script type="application/ld+json"> 的字符串。
// JSON.stringify 不转义 < > &,直接内联会被 </script> 提前闭合 → XSS。
// 转成 JSON 字符串里等价的 \uXXXX,语义不变、无法逃逸标签(浏览器不 eval JSON-LD,无需处理行分隔符)。
export function jsonLdSafe(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

// 全站实体图的规范 @id:各页面此前各发一个匿名 Person 节点(约 145 个),
// 搜索引擎无法把它们识别为同一个人。统一成固定 @id 后,layout 发一次完整定义,
// 其余页面(文章 author/publisher、about、系列 author)全部用 {"@id": ...} 引用,串成一张图。
export function personId(base: string): string {
  return `${base}/#person`;
}
export function websiteId(base: string): string {
  return `${base}/#website`;
}

/** layout 发一次的完整 Organization 节点。其余页面用 personRef(base) 引用。 */
export function personNode(base: string) {
  return {
    "@type": "Organization",
    "@id": personId(base),
    name: "豆豆课程组",
    alternateName: "豆豆课程组",
    url: `${base}/about`,
  };
}

/** 轻量引用,指向 personNode 定义的同一实体。 */
export function personRef(base: string) {
  return { "@id": personId(base) };
}
