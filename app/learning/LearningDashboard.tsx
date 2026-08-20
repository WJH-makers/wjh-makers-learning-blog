"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  clearLocalLearningData,
  exportLearningEvidence,
  readLearningEvidence,
  summarizeLearning,
  type LearningEvidence,
  type ReviewableLab,
} from "@/lib/learning-record";

type Props = { labs: ReviewableLab[] };

function download(name: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function dateLabel(iso: string): string {
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(new Date(iso));
}

/**
 * 预渲染期的占位时刻。
 *
 * 本页数据全在 localStorage:预渲染时 events 必为空,summarizeLearning 里
 * 「判断复习到期」的循环一次都不进,now 读不到 —— 面板上显示的也都是 loaded=false
 * 时的破折号占位。所以这里需要的只是一个**不读当前时间**的合法 Date。
 * 用 epoch 而不是 new Date():后者会让 cacheComponents 在预渲染阶段直接报错。
 * 真实时刻在挂载后由 useEffect 一并写入,与 events 同一批。
 */
const PRERENDER_PLACEHOLDER_NOW = new Date(0);

export default function LearningDashboard({ labs }: Props) {
  const [events, setEvents] = useState<LearningEvidence[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const summary = useMemo(
    () => summarizeLearning(labs, events, now ?? PRERENDER_PLACEHOLDER_NOW),
    [labs, events, now],
  );

  useEffect(() => {
    setEvents(readLearningEvidence());
    // 时间与事件同一批写入:到期判定必须基于「读取这批事件的那一刻」,
    // 分两次 setState 会让首帧用 epoch 判定已加载的事件,把全部复习标成 due。
    setNow(new Date());
    setLoaded(true);
  }, []);

  function clear() {
    clearLocalLearningData();
    setEvents([]);
  }

  return (
    <div className="page-shell learning-page">
      <section className="hero learning-hero">
        <div>
          <p className="eyebrow">Private Learning Loop · 本机学习闭环</p>
          <h1>学习档案，不是考试档案</h1>
          <p className="hero-text">把做过的 Java 实验、下一次复习和容易卡住的点留在当前浏览器。它帮助你决定下一步，不替你发证，也不会上传源码、控制台内容、路径或身份信息。</p>
          <div className="hero-actions">
            <Link className="button primary" href="/java">开始 Java 实验 →</Link>
            <Link className="button" href="/cli">继续命令行连载</Link>
          </div>
        </div>
        <div className="hero-panel">
          <p className="eyebrow">当前浏览器</p>
          <p><strong>{loaded ? summary.passedLabCount : "—"}</strong> / {labs.length} 个实验已自报本地运行</p>
          <p className="muted">“已自报”表示你点击了本地运行确认；站点不执行或验证你的代码。</p>
        </div>
      </section>

      <section className="learning-summary" aria-label="学习概览">
        <article><span>记录过实验</span><strong>{loaded ? summary.recordedLabCount : "—"}</strong><small>含未完成或取消的尝试</small></article>
        <article><span>待复习</span><strong>{loaded ? summary.dueReviews.length : "—"}</strong><small>基于最近一次自报本地运行</small></article>
        <article><span>下一次提示</span><strong>{loaded && summary.upcomingReviews[0] ? dateLabel(summary.upcomingReviews[0].dueAt) : "—"}</strong><small>没有记录时不会生成提醒</small></article>
      </section>

      <section className="learning-section" aria-labelledby="review-title">
        <div className="section-head">
          <div><p className="eyebrow">Next action</p><h2 id="review-title">今天可以复习什么</h2></div>
          <span className="muted">复习节奏：本地运行后第 1 / 7 / 21 天</span>
        </div>
        {!loaded ? <p className="learning-empty">正在读取当前浏览器的本机记录…</p> : summary.dueReviews.length > 0 ? (
          <div className="learning-review-grid">
            {summary.dueReviews.map((review) => (
              <article className="learning-review-card" key={`${review.lab.id}-${review.afterDays}`}>
                <p className="eyebrow">第 {review.afterDays} 天复习 · {dateLabel(review.dueAt)} 起</p>
                <h3>{review.lab.title}</h3>
                <p>{review.lab.projectIncrement}</p>
                <p className="muted">回到实验，重新在自己的 JDK 17 中运行，并检查：{review.lab.knowledgePoints.join(" · ")}。</p>
                <Link className="button" href={`/posts/${review.lab.slug}`}>打开实验 →</Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="learning-empty">
            <p>{summary.passedLabCount > 0 ? "暂时没有到期复习。下一次提示会显示在上方。" : "还没有本机实验记录。先从第一话的最小实验开始，完成后再回来查看复习提示。"}</p>
            <Link className="button primary" href="/posts/2026-05-03-java-s01e01-hello">第一次让程序开口 →</Link>
          </div>
        )}
      </section>

      <section className="learning-section" aria-labelledby="friction-title">
        <div className="section-head">
          <div><p className="eyebrow">Learning signals</p><h2 id="friction-title">容易卡住的点</h2></div>
          <span className="muted">仅由本机实验记录中的错因标签汇总</span>
        </div>
        {loaded && summary.misconceptionTags.length > 0 ? (
          <div className="learning-tags">
            {summary.misconceptionTags.map(({ tag, count }) => <span key={tag}><code>{tag}</code> · {count}</span>)}
          </div>
        ) : <p className="learning-empty">完成一次实验后，这里会提示可以优先回看的概念；不会分析或上传你的源码。</p>}
      </section>

      <aside className="learning-privacy" aria-label="本机数据管理">
        <div>
          <p className="eyebrow">Local only</p>
          <h2>数据始终由你控制</h2>
          <p>导出的 JSON 也只在你的设备生成。清除会删除此浏览器里的学习记录和本机匿名标识，无法撤销。</p>
        </div>
        <div className="hero-actions">
          <button type="button" className="button" onClick={() => download("doudou-learning-record.json", exportLearningEvidence())}>导出本机记录</button>
          <button type="button" className="button ghost" onClick={clear}>清除本机记录</button>
        </div>
      </aside>
    </div>
  );
}
