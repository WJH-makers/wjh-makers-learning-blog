import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Playfair_Display, Lora, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-playfair", display: "swap" });
const lora = Lora({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-lora", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

const fontVars = `${playfair.variable} ${lora.variable} ${inter.variable} ${jetbrainsMono.variable}`;

const writeRoute = "/write" as Route;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wwjjhh.online";
const SITE_NAME = "WJH-makers · 学习博客";
const SITE_DESC = "CS本科 · 遥感视觉问答 · MoE · 全栈学习记录";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: SITE_NAME,
    template: "%s | WJH-makers",
  },
  description: SITE_DESC,
  robots: { index: true, follow: true },
  alternates: { types: { "application/rss+xml": "/rss.xml" } },
  openGraph: {
    images: [{ url: "https://avatars.githubusercontent.com/u/136443811?v=4", width: 460, height: 460 }],
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESC,
    locale: "zh_CN",
    url: "/",
  },
  twitter: {
    images: ["https://avatars.githubusercontent.com/u/136443811?v=4"],
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESC,
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
  url: SITE,
  inLanguage: "zh-CN",
  author: {
    "@type": "Person",
    name: "WJH-makers",
    alternateName: "WJH-makers",
    url: "https://github.com/WJH-makers",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const date = new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "long",
    timeZone: "Asia/Shanghai",
  }).format(new Date());

  return (
    <html lang="zh-CN" className={fontVars}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <header className="site-header">
          <div className="edition-bar">
            <span>Vol. 1</span>
            <span>{date}</span>
            <span>UTC+8 Edition</span>
          </div>
          <nav className="nav">
            <Link className="brand" href="/">WJH-makers</Link>
            <div className="nav-links">
              <a href="https://github.com/WJH-makers" target="_blank" rel="noreferrer">GitHub</a>
              <Link href="/posts">博客</Link>
              <Link href="/tags">标签</Link>
              <Link href="/monitor">瞭望台</Link>              <Link href={writeRoute}>写心得</Link>
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <span>Edition: Vol 1.0 · Printed in UTC+8</span>
          <span>&copy; {new Date().getFullYear()} WJH-makers</span>
          <span>
            <a className="beian" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">鄂ICP备2026036494号-1</a>
          </span>
        </footer>
      </body>
    </html>
  );
}
