import type { Metadata, Viewport } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import "./globals.css";
import { jsonLdSafe, publisherNode, publisherId, websiteId } from "@/lib/jsonld";
import { SERIES_LIST, seriesProgress } from "@/lib/series-registry";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import SiteNav from "./_components/SiteNav";

// 斜体全站仅 2 处且均为装饰性(blockquote/署名),浏览器合成斜体足够——
// 去掉 italic 变体省 2 个 woff2 preload,首屏字体请求 6→4。
const playfair = localFont({
  src: "./fonts/playfair-display-latin.woff2",
  weight: "400 900",
  style: "normal",
  variable: "--font-playfair",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
const lora = localFont({
  src: "./fonts/lora-latin.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-lora",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: "Arial",
});
const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin.woff2",
  weight: "100 800",
  style: "normal",
  variable: "--font-jetbrains",
  display: "swap",
  adjustFontFallback: "Arial",
  preload: false,
});
const fontVars = `${playfair.variable} ${lora.variable} ${inter.variable} ${jetbrainsMono.variable}`;

/**
 * 页脚版权年，构建期求值。
 *
 * 原本写 `new Date().getFullYear()`。开启 cacheComponents 后它是硬错误：
 * prerender 期读当前时间无法静态化，`instant = false` 也清不掉
 * （Route "/_not-found" used `new Date()` before accessing … Request data）。
 *
 * 官方给三条路：挪进客户端组件、包 <Suspense> 并先调 connection()、或构建期定值。
 * 选第三条 —— 本站刻意不为装饰性内容下发客户端 JS，而版权年既不需要按请求精确，
 * 也不值得为它引一个 Suspense 边界。发布时机由部署决定：每次 push 都会重新构建，
 * 跨年后首次部署即更新。
 */
const COPYRIGHT_YEAR = new Date().getFullYear();

// 站点根地址与出版实体名来自 lib/site-config.ts 的单一事实源。
// SITE_URL 比原先的本地常量多剥一个末尾斜杠，避免 `${SITE}/path` 拼出双斜杠。
// 以下三项只在本文件出现一次，是文案不是配置，留在使用处更好读。
const SITE = SITE_URL;
const SITE_TAGLINE = "把工程知识写成故事";
const SITE_DESC = "原创编程漫画与可验证的工程学习记录：从 Java 基础、工程化到系统实践。";
const SITE_AUTHOR = "咖啡站编辑部";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: `${SITE_NAME} · ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  robots: {
    index: true,
    follow: true,
    // 漫画站不给大图预览等于自弃图片搜索与 Discover 的位置。
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  authors: [{ name: SITE_AUTHOR }],
  creator: SITE_AUTHOR,
  publisher: SITE_AUTHOR,
  alternates: {
    types: { "application/rss+xml": "/rss.xml" },
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
    description: SITE_DESC,
    locale: "zh_CN",
    url: SITE,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
    description: SITE_DESC,
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
} satisfies Viewport;

// 一张 @graph:WebSite 与 Person 各一个规范节点,互相用 @id 引用。
// 全站其余页面只发引用({"@id": ...}),不再各自复制一份匿名 Person。
const identityGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": websiteId(SITE),
      name: SITE_NAME,
      alternateName: "Java 工程知识地图与原创漫画连载",
      url: SITE,
      inLanguage: "zh-CN",
      publisher: { "@id": publisherId(SITE) },
    },
    publisherNode(SITE),
  ],
};

// footer 只列已开更的线,规划中的统一收在 /series 后面,免得三列变成一堵墙。
const FOOTER_SERIES = SERIES_LIST.filter((s) => seriesProgress(s).done > 0);

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={fontVars}>
      <body id="top">
        <a className="skip-link" href="#main">跳到正文</a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(identityGraph) }} />
        <header className="site-header">
          <div className="edition-bar">
            <span>咖啡站技术志</span>
            <span>原创技术漫画与工程知识地图</span>
            <span>Java · 工程 · 系统</span>
          </div>
          <nav className="nav" aria-label="主导航">
            <SiteNav />
          </nav>
        </header>
        <main id="main" tabIndex={-1}>{children}</main>
        <footer className="footer">
          <div className="footer-col">
            <p className="footer-head">内容</p>
            <Link href="/archive">全量归档</Link>
            <Link href="/posts">文章精选</Link>
            <Link href="/cheatsheets">速查手册</Link>
            <Link href="/tags">标签云</Link>
            <Link href={"/start" as never}>从这里开始</Link>
            <Link href={"/universe" as never}>咖啡站宇宙</Link>
          </div>
          <div className="footer-col">
            <p className="footer-head">连载</p>
            <Link href="/series">连载总台</Link>
            {FOOTER_SERIES.map((s) => (
              <Link key={s.route} href={s.route}>{s.title}</Link>
            ))}
          </div>
          <div className="footer-col">
            <p className="footer-head">关于与订阅</p>
            <Link href="/projects">项目集</Link>
            <Link href="/career">工程师航线</Link>
            <Link href="/now">现在在做</Link>
            <Link href="/stats">站点数据</Link>
            <a href="/rss.xml">RSS 订阅</a>
          </div>
          <div className="footer-bar">
            <span>咖啡站技术志 · 原创技术故事</span>
            <span>&copy; {COPYRIGHT_YEAR} All Rights Reserved</span>
            <a className="beian" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">鄂ICP备2026036494号-1</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
