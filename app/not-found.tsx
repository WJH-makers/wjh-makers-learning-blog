import Link from "next/link";

// 404:报纸风「这一版没排上」。
export default function NotFound() {
  return (
    <div className="page-shell narrow">
      <div className="page-title">
        <p className="eyebrow">404 · Page Not Found</p>
        <h1>这一版没排上</h1>
        <p>你要找的页面不在今天的版面上——可能被撤稿了,也可能地址敲错了一个字。</p>
      </div>
      <div className="hero-actions">
        <Link className="button primary" href="/">回到头版</Link>
        <Link className="button" href="/posts">翻翻全部文章</Link>
      </div>
    </div>
  );
}
