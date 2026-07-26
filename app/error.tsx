"use client";

// 全局错误边界:报纸风「印刷机卡纸了」。保持极简,不引入任何依赖。
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page-shell narrow">
      <div className="page-title">
        <p className="eyebrow">Error · 出了点问题</p>
        <h1>印刷机卡纸了</h1>
        <p>这一页没能正常排出来。稍等片刻重试,或者先去别的版面逛逛。</p>
      </div>
      <div className="hero-actions">
        <button type="button" className="button primary" onClick={() => reset()}>重新排版</button>
        <a className="button" href="/">回到头版</a>
      </div>
    </div>
  );
}
