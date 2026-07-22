import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/posts";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/write", "/monitor", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
