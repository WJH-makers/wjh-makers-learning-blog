"use client";

import { useEffect, useState } from "react";

function readCompleted(storageKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeCompleted(storageKey: string, slugs: string[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...new Set(slugs)]));
  } catch {
    /* localStorage 不可用时静默降级 */
  }
}

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
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    setCompleted(readCompleted(storageKey));
  }, [storageKey]);

  const done = completed.includes(slug);
  const seasonDone = seasonSlugs.filter((s) => completed.includes(s)).length;

  function toggle() {
    const next = done ? completed.filter((s) => s !== slug) : [...completed, slug];
    setCompleted(next);
    writeCompleted(storageKey, next);
  }

  const pct = seasonSlugs.length > 0 ? Math.round((seasonDone / seasonSlugs.length) * 100) : 0;

  return (
    <div className="episode-progress">
      <button type="button" className={`button${done ? " ghost" : " primary"}`} onClick={toggle}>
        {done ? "✓ 本话已完成(点击取消)" : "标记本话完成"}
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
