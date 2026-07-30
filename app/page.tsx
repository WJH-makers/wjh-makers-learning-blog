import type { Metadata } from "next";
import Link from "next/link";
import { getAllPublishedPosts, siteUrl } from "@/lib/posts";
import { SERIES_META, publishedEpisodes } from "@/lib/series";

export const revalidate = 3600;
export const runtime = "nodejs";

// title/description/OG 沿用 layout 默认;首页只需补 canonical 这一环。
export const metadata: Metadata = {
  alternates: { canonical: siteUrl() },
};

type SkillMapTile = {
  code: string;
  title: string;
  detail: string;
  tone: string;
  href?: "/java" | "/career";
};

const JAVA_SKILL_MAP: SkillMapTile[] = [
  { code: "01", title: "语言地基", detail: "变量、分支、方法、对象与集合", tone: "foundation", href: "/java" },
  { code: "02", title: "工程习惯", detail: "异常、文件、Maven、JUnit 与 Git", tone: "craft", href: "/java" },
  { code: "03", title: "后端请求", detail: "HTTP、Spring、接口与数据校验", tone: "service" },
  { code: "04", title: "数据与并发", detail: "MySQL、Redis、事务、线程与锁", tone: "runtime" },
  { code: "05", title: "系统运行", detail: "JVM、容器、观测、部署与回滚", tone: "systems" },
  { code: "06", title: "工程证据", detail: "项目叙事、复现记录与真实取舍", tone: "evidence", href: "/career" },
];

export default async function HomePage() {
  const posts = await getAllPublishedPosts();

  const latestPosts = posts.slice(0, 3);
  const seriesDone = publishedEpisodes().length;

  return (
    <div className="page-shell">
      <section className="home-command-center">
        <div className="home-command-copy">
          <p className="eyebrow">Java Growth Atlas · 咖啡站技术志</p>
          <h1>不是背知识点，<br />是点亮工程能力。</h1>
          <p>一张给 Java 工程师的成长地图：从写下第一行代码，到让一个真实系统稳定运行。每一格都回到同一间咖啡站，成为能被验证的能力。</p>
          <div className="hero-actions">
            <Link className="button primary" href="/start">从第一格开始</Link>
            <Link className="button" href="/universe">进入宇宙地图</Link>
          </div>
          <div className="home-signal" aria-label="当前公开内容状态">
            <span>● 已发布内容</span>
            <span>○ 后续能力域</span>
            <span>只展示已经正式开更的章节</span>
          </div>
        </div>
        <div className="java-skill-map" aria-label="Java 工程师成长能力地图">
          <div className="java-skill-map-topline"><span>JAVA ENGINEER / GROWTH MAP</span><span>01—06</span></div>
          <div className="java-skill-map-grid">
            {JAVA_SKILL_MAP.map((item) => {
              const content = <>
                <span className="skill-map-code">{item.code}</span>
                <h2>{item.title}</h2>
                <p>{item.detail}</p>
                <span className="skill-map-state">{item.href ? "已点亮 · 可进入" : "能力域 · 逐步点亮"}</span>
              </>;
              return item.href ? (
                <Link href={item.href} key={item.code} className={`skill-map-tile is-${item.tone}`}>{content}</Link>
              ) : (
                <article key={item.code} className={`skill-map-tile is-${item.tone} is-horizon`}>{content}</article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-head">
        <div>
          <p className="eyebrow">Flagship Series · Java 主线</p>
          <h2>从零开始学 Java</h2>
        </div>
        <Link href="/java">查看全卷地图 →</Link>
      </section>
      <Link href="/java" className="card series-hero-card">
        <p className="series-hero-lead">{SERIES_META.tagline}</p>
        <p className="muted">
          已连载 {seriesDone} 话 · 跟着阿零和豆豆,把「豆豆咖啡站」从一行输出建成完整系统
        </p>
      </Link>

      <section className="section-head">
        <div>
          <p className="eyebrow">Engineer Evidence · 现实主线</p>
          <h2>把能力变成证据</h2>
        </div>
        <Link href="/career">进入工程师航线 →</Link>
      </section>
      <Link href="/career" className="card series-hero-card">
        <p className="series-hero-lead">项目不是简历上一行名词，而是一份让陌生人能看懂、复现并追问的工程证据。</p>
        <p className="muted">从项目证据包到秒杀系统与遥感 VQA：只记录真实做过、能被验证的工作。</p>
      </Link>

      {latestPosts.length > 0 && (
        <>
          <section className="section-head">
            <div>
              <p className="eyebrow">Latest Dispatches</p>
              <h2>最新博客</h2>
            </div>
            <Link href="/posts">查看全部 →</Link>
          </section>
          <div className="post-grid">
            {latestPosts.map((post) => (
              <article className="card" key={post.slug}>
                <p className="date">{post.date} · {post.readingMinutes} min</p>
                <h3><Link href={`/posts/${post.slug}`}>{post.title}</Link></h3>
                <p>{post.summary}</p>
                <div className="tags">
                  {post.tags.map((tag) => (
                    <Link key={tag} href={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
