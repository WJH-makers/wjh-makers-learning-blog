import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Playfair_Display, Lora, Inter, JetBrains_Mono, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import { jsonLdSafe, personNode, personId, websiteId } from "@/lib/jsonld";
import { SERIES_LIST, seriesProgress } from "@/lib/series-registry";

// 斜体全站仅 2 处且均为装饰性(blockquote/署名),浏览器合成斜体足够——
// 去掉 italic 变体省 2 个 woff2 preload,首屏字体请求 6→4。
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap", preload: false });
// 中文衬线:报纸风的核心识别在中文(全站 95% 字符)。next/font 按 unicode-range 自动切片自托管,
// 页面只下载用到的切片;Windows 无思源宋体/Android 无衬线中文的读者从此不再退化成宋体/黑体。
const notoSerif = Noto_Serif_SC({ weight: ["400", "700", "900"], subsets: [], variable: "--font-noto-serif", display: "swap", preload: false });

const fontVars = `${playfair.variable} ${lora.variable} ${inter.variable} ${jetbrainsMono.variable} ${notoSerif.variable}`;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wwjjhh.online";
const SITE_NAME = "豆豆课程组";
const SITE_TAGLINE = "技术学习与工程实践";
const SITE_DESC = "原创编程漫画连载与可验证的工程学习课程。";
const SITE_AUTHOR = "豆豆课程组";

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
      alternateName: "豆豆课程组 的技术学习与工程实践",
      url: SITE,
      inLanguage: "zh-CN",
      publisher: { "@id": personId(SITE) },
    },
    personNode(SITE),
  ],
};

// footer 只列已开更的线,规划中的统一收在 /series 后面,免得三列变成一堵墙。
const FOOTER_SERIES = SERIES_LIST.filter((s) => seriesProgress(s).done > 0);

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={fontVars}>
      <body>
        <a className="skip-link" href="#main">跳到正文</a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(identityGraph) }} />
        <header className="site-header">
          <div className="edition-bar">
            <span>豆豆课程组</span>
            <span>豆豆课程组 的技术学习与工程实践</span>
            <Link className="edition-status" href="/stats"><span aria-hidden="true">●</span> 站点观察中</Link>
          </div>
          <nav className="nav" aria-label="主导航">
            <Link className="brand" href="/">豆豆课程组</Link>
            <div className="nav-links">
              <Link href="/learning">学习档案</Link>
              <Link href="/series">连载</Link>
              <Link href="/cheatsheets">速查</Link>
              <Link href="/archive">归档</Link>
            </div>
          </nav>
        </header>
        <main id="main" tabIndex={-1}>{children}</main>
        <footer className="footer">
          <div className="footer-col">
            <p className="footer-head">内容</p>
            <Link href="/learning">学习档案与复习</Link>
            <Link href="/archive">全量归档</Link>
            <Link href="/posts">文章精选</Link>
            <Link href="/cheatsheets">速查手册</Link>
          </div>
          <div className="footer-col">
            <p className="footer-head">连载</p>
            <Link href="/series">连载总台</Link>
            {FOOTER_SERIES.map((s) => (
              <Link key={s.route} href={s.route}>{s.title}</Link>
            ))}
          </div>
          <div className="footer-col">
            <p className="footer-head">更多与订阅</p>
            <Link href="/projects">项目集</Link>
            <Link href="/now">现在在做</Link>
            <Link href="/stats">站点数据</Link>
            <a href="/rss.xml">RSS 订阅</a>
            <a href="/llms.txt">llms.txt</a>
          </div>
          <div className="footer-bar">
            <span>豆豆课程组</span>
            <span>&copy; {new Date().getFullYear()} All Rights Reserved</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
