"use client";

import { useEffect } from "react";

// 代码块复制按钮:向 .article-content 内每个 pre 注入 <button class="code-copy">。
// 剪贴板范式与 ShareBar 一致(成功 ✓ 1500ms 回弹,失败静默);样式在 globals.css 的 .code-copy。
// 幂等:已注入的 pre 跳过;cleanup 只移除监听,按钮保留(重挂载时复用)。
export default function CodeCopy() {
  useEffect(() => {
    const cleanups: (() => void)[] = [];
    document.querySelectorAll<HTMLPreElement>(".article-content pre").forEach((pre) => {
      const existing = pre.querySelector<HTMLButtonElement>(":scope > .code-copy");
      const btn = existing ?? document.createElement("button");
      if (!existing) {
        btn.type = "button";
        btn.className = "code-copy";
        btn.textContent = "复制";
        pre.appendChild(btn);
      }
      const onClick = async () => {
        try {
          await navigator.clipboard.writeText(pre.querySelector("code")?.textContent ?? "");
          btn.textContent = "✓ 已复制";
          setTimeout(() => { btn.textContent = "复制"; }, 1500);
        } catch {
          /* 剪贴板不可用时静默 */
        }
      };
      btn.addEventListener("click", onClick);
      cleanups.push(() => btn.removeEventListener("click", onClick));
    });
    return () => cleanups.forEach((fn) => fn());
  }, []);
  return null;
}
