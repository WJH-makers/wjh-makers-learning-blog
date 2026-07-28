import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/posts";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /agent 是给 agent 的 markdown 镜像(与 HTML 页同源内容,重复抓取纯浪费预算);
        // /random 是每次重定向的动态路由,不该被当内容页收录。
        disallow: ["/write", "/monitor", "/api", "/agent", "/random"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
