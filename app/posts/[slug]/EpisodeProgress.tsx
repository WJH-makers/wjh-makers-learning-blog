"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "java-academy:completed";

function readCompleted(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeCompleted(slugs: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(slugs)]));
  } catch {
    /* localStorage 不可用时静默降级 */
  }
}

type Props = {
  slug: string;
  seasonLabel: string;
  /** 本季全部已发布话次的 slug,用于算进度 */
  seasonSlugs: string[];
};

export default function EpisodeProgress({ slug, seasonLabel, seasonSlugs }: Props) {
  // 初始空(SSR 与首渲一致,消除布局跳动),挂载后读 localStorage 平滑更新。
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    setCompleted(readCompleted());
  }, []);

  const done = completed.includes(slug);
  const seasonDone = seasonSlugs.filter((s) => completed.includes(s)).length;

  function toggle() {
    const next = done ? completed.filter((s) => s !== slug) : [...completed, slug];
    setCompleted(next);
    writeCompleted(next);
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
