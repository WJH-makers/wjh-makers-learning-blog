"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readCompleted } from "@/lib/progress-client";

type SeasonProg = { code: string; title: string; slugs: string[] };

// 读 localStorage 里的已读话,渲染总进度 + 每卷完成度 + 继续下一话。纯客户端,不涉后端。
// storageKey 由各连载传入(注册表统一管理),组件跨系列复用。
export default function JavaProgress({ seasons, storageKey = "java-academy:completed" }: { seasons: SeasonProg[]; storageKey?: string }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCompleted(readCompleted(storageKey));
  }, [storageKey]);

  const allSlugs = seasons.flatMap((s) => s.slugs);
  const total = allSlugs.length;
  const doneCount = allSlugs.filter((s) => completed.has(s)).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const nextUnread = allSlugs.find((s) => !completed.has(s));

  return (
    <section className="java-progress" aria-label="我的阅读进度">
      <div className="jp-head">
        <div>
          <p className="eyebrow">我的进度</p>
          <p className="jp-big"><strong>{doneCount}</strong> / {total} 话 · {pct}%</p>
        </div>
        {nextUnread ? (
          <Link className="button primary" href={`/posts/${nextUnread}`}>
            {doneCount === 0 ? "开始阅读 →" : "继续下一话 →"}
          </Link>
        ) : (
          total > 0 && <span className="jp-done">🎉 已读完全部已连载!</span>
        )}
      </div>
      <div className="jp-bar"><div className="jp-fill" style={{ width: `${pct}%` }} /></div>
      <div className="jp-seasons">
        {seasons.map((s) => {
          const d = s.slugs.filter((x) => completed.has(x)).length;
          const p = s.slugs.length > 0 ? Math.round((d / s.slugs.length) * 100) : 0;
          return (
            <div key={s.code} className="jp-season" title={`${s.title} ${d}/${s.slugs.length}`}>
              <span className="jp-season-code">{s.code}</span>
              <div className="jp-season-bar"><div className="jp-season-fill" style={{ width: `${p}%` }} /></div>
              <span className="jp-season-num">{d}/{s.slugs.length}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
