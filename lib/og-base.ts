// Next 的 metadata 合并对 openGraph 是整体替换而非深合并:页面一旦自定义 openGraph,
// layout 里的 siteName/locale 就会丢失。凡自定义 openGraph 的页面用 `...OG_BASE` 展开补齐。
export const OG_BASE = {
  siteName: "WJH-makers",
  locale: "zh_CN",
} as const;
