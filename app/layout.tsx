import type { Metadata, Route } from "next";
import Link from "next/link";
import { Playfair_Display, Lora, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ClarityAnalytics from "./ClarityAnalytics";

const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-playfair", display: "swap" });
const lora = Lora({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-lora", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

const fontVars = `${playfair.variable} ${lora.variable} ${inter.variable} ${jetbrainsMono.variable}`;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wwjjhh.online";
const SITE_NAME = "WJH-makers";
const SITE_TAGLINE = "WJH-makers 的技术学习与工程实践";
const SITE_DESC = "Java 全栈、系统实践、遥感 VQA 与 MoE 研究记录";
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
    images: [{
      url: "https://avatars.githubusercontent.com/u/136443811?v=4",
      width: 460,
      height: 460,
      alt: SITE_NAME,
    }],
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
    description: SITE_DESC,
    locale: "zh_CN",
    url: SITE,
  },
  twitter: {
    images: ["https://avatars.githubusercontent.com/u/136443811?v=4"],
    card: "summary_large_image",
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
    description: SITE_DESC,
  },
  other: {
    "google-site-verification": process.env.GOOGLE_SITE_VERIFICATION ?? "",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

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

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "首页", item: SITE },
    { "@type": "ListItem", position: 2, name: "博客", item: `${SITE}/posts` },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={fontVars}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
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
              <Link href={"/about" as Route}>关于</Link>
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <span>Crafted with ♥ by WJH-makers</span>
          <span>&copy; {new Date().getFullYear()} All Rights Reserved</span>
          <span>
            <a className="beian" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">鄂ICP备2026036494号-1</a>
          </span>
        </footer>
      </body>
    </html>
  );
}
