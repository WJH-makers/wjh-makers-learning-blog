"use client";

import { useEffect, useState } from "react";
import { readCompleted, writeCompleted } from "@/lib/progress-client";

type Props = {
  slug: string;
  seasonLabel: string;
  /** 本季全部已发布话次的 slug,用于算进度 */
  seasonSlugs: string[];
  /** 各连载独立的进度 key(注册表提供) */
  storageKey: string;
};

/** 集合等值。回读校验用:只比 slug 集合,顺序无关。 */
function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export default function EpisodeProgress({ slug, seasonLabel, seasonSlugs, storageKey }: Props) {
  // 初始空(SSR 与首渲一致,消除布局跳动),挂载后读 localStorage 平滑更新。
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [storageFailed, setStorageFailed] = useState(false);

  useEffect(() => {
    setCompleted(readCompleted(storageKey));
  }, [storageKey]);

  const done = completed.has(slug);
  const seasonDone = seasonSlugs.filter((s) => completed.has(s)).length;

  function toggle() {
    const next = new Set(completed);
    if (done) next.delete(slug);
    else next.add(slug);

    // 不做乐观更新:writeCompleted 静默吞异常(存储被禁用/配额满),先改 state 会让按钮
    // 变「✓ 已完成」、进度条推进,而刷新后全归零。localStorage 是同步的,先写再回读
    // 零感知延迟,还能顺带抓住「不抛错但也没写进去」的浏览器(某些无痕实现)。
    writeCompleted(storageKey, next);
    if (!sameSet(readCompleted(storageKey), next)) {
      setStorageFailed(true);
      return;
    }
    setStorageFailed(false);
    setCompleted(next);
  }

  const pct = seasonSlugs.length > 0 ? Math.round((seasonDone / seasonSlugs.length) * 100) : 0;

  return (
    <div className="episode-progress">
      {/* done 态用带边框的默认 .button(ghost 边框透明,可撤销的交互暗示会随完成一起消失) */}
      <button type="button" className={`button${done ? "" : " primary"}`} onClick={toggle}>
        {done ? "✓ 已完成 · 点击撤销" : "标记本话完成"}
      </button>
      <div className="progress-track">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
        <span className="muted">
          {seasonLabel}进度 {seasonDone} / {seasonSlugs.length}（{pct}%）
        </span>
      </div>
      {/* 常驻 live region:写入失败要让读屏也听见,容器始终在 DOM 中 */}
      <span role="status">
        {storageFailed ? (
          <span className="comment-error">进度保存失败：浏览器可能禁用了 localStorage。</span>
        ) : null}
      </span>
    </div>
  );
}
