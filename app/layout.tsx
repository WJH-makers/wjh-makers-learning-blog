import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Playfair_Display, Lora, Inter, JetBrains_Mono, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import ClarityAnalytics from "./ClarityAnalytics";
import { jsonLdSafe } from "@/lib/jsonld";

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
const SITE_NAME = "WJH-makers";
const SITE_TAGLINE = "技术学习与工程实践";
const SITE_DESC = "原创编程漫画连载《从零开始学 Java》《从零开始玩命令行》《豆豆咖啡站》——以及 Java 全栈、系统实践、遥感 VQA 与 MoE 研究记录。";
const SITE_AUTHOR = "WJH-makers";
const GITHUB_URL = "https://github.com/WJH-makers";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: `${SITE_NAME} · ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  robots: { index: true, follow: true },
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

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: "WJH-makers 的技术学习与工程实践",
  url: SITE,
  inLanguage: "zh-CN",
  author: {
    "@type": "Person",
    name: SITE_AUTHOR,
    url: GITHUB_URL,
    sameAs: [GITHUB_URL],
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: SITE_AUTHOR,
  alternateName: "WJH-makers",
  url: `${SITE}/about`,
  sameAs: [GITHUB_URL],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={fontVars}>
      <body>
        <a className="skip-link" href="#main">跳到正文</a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(websiteJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(personJsonLd) }} />
        <header className="site-header">
          <div className="edition-bar">
            <span>WJH-makers</span>
            <span>WJH-makers 的技术学习与工程实践</span>
            <span>Java · 系统 · AI</span>
          </div>
          <nav className="nav">
            <Link className="brand" href="/">WJH-makers</Link>
            <div className="nav-links">
              <a href="https://github.com/WJH-makers" target="_blank" rel="noreferrer">GitHub</a>
              <Link href="/posts">博客</Link>
              <Link href="/tags">标签</Link>
              <Link href="/about">关于</Link>
            </div>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="footer">
          <span>Crafted with ♥ by WJH-makers</span>
          <span>&copy; {new Date().getFullYear()} All Rights Reserved · <a href="/rss.xml">RSS</a></span>
          <span>
            <a className="beian" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">鄂ICP备2026036494号-1</a>
          </span>
        </footer>
        <ClarityAnalytics />
      </body>
    </html>
  );
}
