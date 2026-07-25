"use client";

import { useState } from "react";

// 文章分享栏:微博 / X / 复制链接(免第三方 SDK,纯 URL intent)。
export default function ShareBar({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const weibo = `https://service.weibo.com/share/share.php?url=${enc(url)}&title=${enc(title)}`;
  const x = `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时静默 */
    }
  };

  return (
    <div className="share-bar">
      <span className="share-label">分享</span>
      <a href={weibo} target="_blank" rel="noreferrer" className="share-btn">微博</a>
      <a href={x} target="_blank" rel="noreferrer" className="share-btn">X</a>
      <button type="button" onClick={copy} className="share-btn">{copied ? "已复制 ✓" : "复制链接"}</button>
    </div>
  );
}
