"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { submitComment, type SubmitResult } from "@/lib/comments";

// 免登录评论提交。IP 从 Cloudflare/代理头取(生产经 Cloudflare Tunnel),仅用于 salted hash 限流。
export async function postComment(_prev: SubmitResult | null, formData: FormData): Promise<SubmitResult> {
  const h = await headers();
  const ip =
    (h.get("cf-connecting-ip") || h.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const slug = String(formData.get("slug") ?? "");

  const result = await submitComment({
    slug,
    name: String(formData.get("name") ?? ""),
    body: String(formData.get("body") ?? ""),
    honeypot: String(formData.get("website") ?? ""), // 蜜罐字段
    turnstileToken: String(formData.get("cf-turnstile-response") ?? ""),
    ip,
  });

  if (result.ok) revalidatePath(`/posts/${slug}`);
  return result;
}
