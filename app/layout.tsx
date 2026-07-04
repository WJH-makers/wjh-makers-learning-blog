import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import "./globals.css";

const writeRoute = "/write" as Route;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://wjh-makers-learning-blog.vercel.app"),
  title: {
    default: "万佳泓的学习日志",
    template: "%s | 万佳泓的学习日志",
  },
  description: "记录 Java 全栈、Git、AI、系统、算法与每天学习成果的个人博客。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const date = new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "long",
    timeZone: "Asia/Shanghai",
  }).format(new Date());

  return (
    <html lang="zh-CN">
      <body>
        <header className="site-header">
          <div className="edition-bar">
            <span>Vol. 1</span>
            <span>{date}</span>
            <span>Wuhan Edition</span>
          </div>
          <nav className="nav">
            <Link className="brand" href="/">The WJH Learning Gazette</Link>
            <div className="nav-links">
              <Link href="/posts">文章</Link>
              <Link href="/tags">标签</Link>
              <Link href={writeRoute}>写心得</Link>
              <a href="https://github.com/WJH-makers" target="_blank" rel="noreferrer">GitHub</a>
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <span>Edition: Vol 1.0 · Printed in UTC+8</span>
          <span>© {new Date().getFullYear()} WJH-makers · Next.js · MongoDB Atlas · Vercel</span>
        </footer>
      </body>
    </html>
  );
}
