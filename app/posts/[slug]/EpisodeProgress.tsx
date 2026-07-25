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
  const [completed, setCompleted] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCompleted(readCompleted());
    setMounted(true);
  }, []);

  const done = completed.includes(slug);
  const seasonDone = seasonSlugs.filter((s) => completed.includes(s)).length;

  function toggle() {
    const next = done ? completed.filter((s) => s !== slug) : [...completed, slug];
    setCompleted(next);
    writeCompleted(next);
  }

  // 未挂载前不渲染依赖 localStorage 的状态,避免 hydration 不一致
  if (!mounted) return null;

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
