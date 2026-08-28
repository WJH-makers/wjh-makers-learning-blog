import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import type { Route } from "next";
import Link from "next/link";
import { siteUrl } from "@/lib/site-config";
import { RSS_ALTERNATE_TYPES } from "@/lib/og-base";
import { getAllPublishedPosts } from "@/lib/posts";
import { SERIES_META, publishedEpisodes } from "@/lib/series";
import { seriesByRoute, seriesProgress } from "@/lib/series-registry";
import { availabilityOf } from "@/lib/universe";
import SkillMapPhysics from "@/app/_components/SkillMapPhysics";


// title/description/OG 沿用 layout 默认;首页只需补 canonical 这一环。
// 但 alternates 是**整体替换**不是深合并:只写 canonical 会把 layout:85 声明的
// types 顶掉,首页的 RSS autodiscovery <link> 就没了(订阅者最先看的就是首页)。
// 所以必须把 RSS_ALTERNATE_TYPES 一起展开进来。
export const metadata: Metadata = {
  alternates: { canonical: siteUrl(), ...RSS_ALTERNATE_TYPES },
};

type SkillMapTile = {
  code: string;
  title: string;
  detail: string;
  tone: string;
  /**
   * 该能力域对应的连载线。是否「已点亮」由 availabilityOf 从注册表推导 ——
   * 早先这里手写 href,类型还锁成 "/java" | "/career",于是 /spring、/db、/jvm
   * 任何一条开更都得回来改代码,和宇宙地图当初把已完结的 /cli 画成雾区是同一个病。
   */
  route: Route;
};

const JAVA_SKILL_MAP: SkillMapTile[] = [
  { code: "01", title: "语言地基", detail: "变量、分支、方法、对象与集合", tone: "foundation", route: "/java" },
  { code: "02", title: "工程习惯", detail: "异常、文件、Maven、JUnit 与 Git", tone: "craft", route: "/java" },
  { code: "03", title: "后端请求", detail: "HTTP、Spring、接口与数据校验", tone: "service", route: "/spring" },
  { code: "04", title: "数据与并发", detail: "MySQL、Redis、事务、线程与锁", tone: "runtime", route: "/db" },
  { code: "05", title: "系统运行", detail: "JVM、容器、观测、部署与回滚", tone: "systems", route: "/jvm" },
  { code: "06", title: "工程证据", detail: "项目叙事、复现记录与真实取舍", tone: "evidence", route: "/career" },
];

export default async function HomePage() {
  "use cache";
  cacheLife("content");

  const posts = await getAllPublishedPosts();

  const latestPosts = posts.slice(0, 3);
  const seriesDone = publishedEpisodes().length;
  const cli = seriesByRoute("/cli");
  const cliProgress = seriesProgress(cli);
  const cafe = seriesByRoute("/cafe");
  const cafeProgress = seriesProgress(cafe);

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
          <SkillMapPhysics>
            {JAVA_SKILL_MAP.map((item) => {
              const open = availabilityOf(item.route) === "open";
              const content = <>
                <span className="skill-map-code">{item.code}</span>
                <h2>{item.title}</h2>
                <p>{item.detail}</p>
                <span className="skill-map-state">{open ? "已点亮 · 可进入" : "能力域 · 逐步点亮"}</span>
              </>;
              return open ? (
                <Link href={item.route} key={item.code} className={`skill-map-tile is-${item.tone}`}>{content}</Link>
              ) : (
                <article key={item.code} className={`skill-map-tile is-${item.tone} is-horizon`}>{content}</article>
              );
            })}
          </SkillMapPhysics>
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
          <p className="eyebrow">Second Series · 命令行主线</p>
          <h2>{cli.title}</h2>
        </div>
        <Link href="/cli">查看全卷地图 →</Link>
      </section>
      <Link href="/cli" className="card series-hero-card">
        <p className="series-hero-lead">{cli.tagline}</p>
        <p className="muted">
          已连载 {cliProgress.done} 话{cliProgress.done >= cliProgress.total ? " · 已完结" : ""} · 每话附 🪟 双系统对照(Linux ↔ PowerShell)
        </p>
      </Link>

      <section className="section-head">
        <div>
          <p className="eyebrow">Story Line · 故事本传</p>
          <h2>{cafe.title}</h2>
        </div>
        <Link href="/cafe">查看全卷地图 →</Link>
      </section>
      <Link href="/cafe" className="card series-hero-card">
        <p className="series-hero-lead">{cafe.tagline}</p>
        <p className="muted">
          已连载 {cafeProgress.done} 话{cafeProgress.done >= cafeProgress.total ? " · 七卷完结" : ""} · 不讲语法,只讲技术决定落到人身上是什么样
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
