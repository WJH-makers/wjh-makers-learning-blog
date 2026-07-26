"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readCompleted } from "@/lib/progress-client";

type Ep = {
  season: number;
  episode: number;
  title: string;
  summary: string;
  chapterType: string;
  projectStage: string;
  technologies: string[];
  status: string;
  slug?: string;
};
type Season = { season: number; code: string; title: string; subtitle: string; episodes: Ep[] };

const TYPE_MARK: Record<string, { label: string; cls: string }> = {
  comic: { label: "漫画", cls: "m-comic" },
  incident: { label: "事故", cls: "m-incident" },
  lab: { label: "实验", cls: "m-lab" },
  project: { label: "项目", cls: "m-project" },
  reference: { label: "速查", cls: "m-ref" },
};

// 知识大陆版图:主干道(项目演进)+ 逐卷大陆 + 可点击知识节点 + 已读足迹。
export default function SeriesMap({
  seasons,
  storageKey,
  stages,
}: {
  seasons: Season[];
  storageKey: string;
  stages?: { season: number; stage: string }[];
}) {
  const [done, setDone] = useState<Set<string>>(new Set());
  useEffect(() => {
    setDone(readCompleted(storageKey));
  }, [storageKey]);

  return (
    <div className="series-map">
      {stages && stages.length > 0 && (
        <div className="map-highway" aria-hidden="true">
          {stages.map((s, i) => (
            <div key={s.season} className="map-milestone">
              <span className="map-dot" />
              <span className="map-stage">{s.stage}</span>
              {i < stages.length - 1 && <span className="map-road" />}
            </div>
          ))}
        </div>
      )}

      {seasons.map((season) => {
        const readCount = season.episodes.filter((e) => e.slug && done.has(e.slug)).length;
        return (
          <section key={season.season} className="map-continent">
            <div className="map-continent-head">
              <div>
                <p className="eyebrow">{season.code} · {season.subtitle}</p>
                <h3>第{season.season}卷 · {season.title}</h3>
              </div>
              <span className="map-progress"><span className="sr-only">本卷已读 </span>{readCount} / {season.episodes.length}</span>
            </div>
            <div className="map-nodes">
              {season.episodes.map((ep) => {
                const isRead = ep.slug ? done.has(ep.slug) : false;
                const clickable = ep.status === "published" && ep.slug;
                const mark = TYPE_MARK[ep.chapterType] ?? { label: ep.chapterType, cls: "" };
                const inner = (
                  <>
                    <div className="map-node-top">
                      <span className="map-node-no">{String(ep.episode).padStart(2, "0")}</span>
                      <span className={`map-node-mark ${mark.cls}`}>{mark.label}</span>
                      {isRead && (
                        <>
                          <span className="map-node-check" aria-hidden="true">✓</span>
                          <span className="sr-only">已读</span>
                        </>
                      )}
                    </div>
                    <p className="map-node-title">{ep.title}</p>
                    <div className="map-node-techs">
                      {ep.technologies.slice(0, 3).map((t) => <span key={t}>{t}</span>)}
                    </div>
                  </>
                );
                return clickable ? (
                  <Link
                    key={ep.episode}
                    href={`/posts/${ep.slug}`}
                    className={`map-node${isRead ? " read" : ""}`}
                    title={ep.summary}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={ep.episode} className="map-node planned" title={ep.summary} aria-disabled="true">
                    {inner}
                    <span className="sr-only">(规划中,未发布)</span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
