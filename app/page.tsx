import Link from "next/link";
import { getAllPosts, getAllTags } from "@/lib/posts";

export default function HomePage() {
  const posts = getAllPosts();
  const tags = getAllTags();
  const latest = posts.slice(0, 4);
  const tracks = [
    { name: "Java 全栈", desc: "Java · Maven · Gradle · Spring · MySQL", count: posts.filter((post) => post.tags.some((tag) => ["Java", "MySQL"].includes(tag))).length },
    { name: "工程工具", desc: "Git · GitHub · Vercel · Neovim · Terminal", count: posts.filter((post) => post.tags.some((tag) => ["Git", "环境配置", "博客"].includes(tag))).length },
    { name: "AI 与系统", desc: "PyTorch · 遥感 VQA · OS · Compiler", count: posts.filter((post) => post.tags.some((tag) => ["AI", "系统", "复盘"].includes(tag))).length },
  ];

  return (
    <div className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Daily Learning Journal</p>
          <h1>把每天学到的东西沉淀成可复用的工程资产。</h1>
          <p className="hero-text">
            这里记录 Java 全栈、Git、数据库、AI、系统与工程化配置。每篇文章都尽量包含目标、过程、命令、坑点和复盘。
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/posts">开始阅读</Link>
            <Link className="button" href="/tags">按标签查找</Link>
          </div>
        </div>
        <div className="hero-panel" aria-label="今日学习记录模板">
          <span>Today</span>
          <strong>学习记录模板</strong>
          <ol>
            <li>目标：今天要解决什么？</li>
            <li>过程：用了哪些命令/资料？</li>
            <li>结果：验证证据是什么？</li>
            <li>复盘：下次如何更快？</li>
          </ol>
        </div>
      </section>

      <section className="stats-grid" aria-label="博客统计">
        <div><strong>{posts.length}</strong><span>篇学习记录</span></div>
        <div><strong>{tags.length}</strong><span>个知识标签</span></div>
        <div><strong>∞</strong><span>持续迭代</span></div>
      </section>

      <section className="section-head">
        <div>
          <p className="eyebrow">Tracks</p>
          <h2>学习轨道</h2>
        </div>
        <span className="muted">把零散学习变成长期路线图</span>
      </section>

      <div className="track-grid">
        {tracks.map((track) => (
          <article className="track-card" key={track.name}>
            <div className="track-count">{track.count}</div>
            <h3>{track.name}</h3>
            <p>{track.desc}</p>
          </article>
        ))}
      </div>

      <section className="section-head">
        <div>
          <p className="eyebrow">Latest</p>
          <h2>最新学习成果</h2>
        </div>
        <Link href="/posts">查看全部 →</Link>
      </section>

      <div className="post-grid">
        {latest.map((post) => (
          <article className="card" key={post.slug}>
            <p className="date">{post.date} · {post.readingMinutes} min</p>
            <h3><Link href={`/posts/${post.slug}`}>{post.title}</Link></h3>
            <p>{post.summary}</p>
            <div className="tags">
              {post.tags.map((tag) => <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>)}
            </div>
          </article>
        ))}
      </div>

      <section className="review-panel">
        <p className="eyebrow">Review Loop</p>
        <h2>我的每日复盘闭环</h2>
        <div className="review-steps">
          <div><strong>01</strong><span>写下问题</span></div>
          <div><strong>02</strong><span>记录命令</span></div>
          <div><strong>03</strong><span>保存证据</span></div>
          <div><strong>04</strong><span>沉淀模板</span></div>
        </div>
      </section>
    </div>
  );
}
