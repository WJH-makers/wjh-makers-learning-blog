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

      // 按钮跟着横滚漂走的补偿。
      //
      // pre 是 overflow-x: auto 的滚动容器,绝对定位的子元素属于它的可滚动溢出区域,
      // 所以右滑看长命令时按钮会一起左移出视野(实测滚到底后距右缘 7px → 646px),
      // 偏偏长命令最需要复制。纯 CSS 的两条路都试过且都不成立(理由写在
      // globals.css 的 .code-copy 注释里,含 sticky 不触发、以及把 overflow 挪到 code
      // 会废掉 Shiki 的 tabindex 键盘滚动),所以在这里按 scrollLeft 反向补偿。
      //
      // 用 translate 而不是改 right/left:translate 走合成器、不触发重排;
      // 且 .code-copy 自身没有别的 transform,不会互相覆盖。
      const syncButtonOffset = () => {
        btn.style.translate = pre.scrollLeft ? `${pre.scrollLeft}px 0` : "";
      };
      syncButtonOffset();
      pre.addEventListener("scroll", syncButtonOffset, { passive: true });
      cleanups.push(() => pre.removeEventListener("scroll", syncButtonOffset));
      const onClick = async () => {
        try {
          await navigator.clipboard.writeText(pre.querySelector("code")?.textContent ?? "");
          btn.textContent = "✓ 已复制";
          // globals.css 早就有 `.code-copy.copied` 的成功配色,但这里从来没加过这个类 ——
          // 脚本与样式各留一半,于是那条规则从上线起一次都没生效过。
          btn.classList.add("copied");
          setTimeout(() => {
            btn.textContent = "复制";
            btn.classList.remove("copied");
          }, 1500);
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
