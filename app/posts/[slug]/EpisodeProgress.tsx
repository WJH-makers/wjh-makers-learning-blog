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

export default function EpisodeProgress({ slug, seasonLabel, seasonSlugs, storageKey }: Props) {
  // 初始空(SSR 与首渲一致,消除布局跳动),挂载后读 localStorage 平滑更新。
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCompleted(readCompleted(storageKey));
  }, [storageKey]);

  const done = completed.has(slug);
  const seasonDone = seasonSlugs.filter((s) => completed.has(s)).length;

  function toggle() {
    const next = new Set(completed);
    if (done) next.delete(slug);
    else next.add(slug);
    setCompleted(next);
    writeCompleted(storageKey, next);
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
    </div>
  );
}
