import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/posts";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    // robots.txt 不是访问控制边界。受保护入口由 Cloudflare Access 与应用鉴权控制，
    // 因此不在此列举后台或接口路径，避免把路由清单主动公开给所有抓取方。
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
