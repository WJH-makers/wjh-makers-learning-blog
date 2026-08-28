"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { submitComment, type SubmitResult } from "@/lib/comments";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/request-origin";

// 免登录评论提交。IP 从 Cloudflare/代理头取(生产经 Cloudflare Tunnel),仅用于 salted hash 限流。
export async function postComment(_prev: SubmitResult | null, formData: FormData): Promise<SubmitResult> {
  const h = await headers();
  if (!isSameOriginRequest(h)) {
    return { ok: false, error: "请求来源不受信任。" };
  }

  const ip = clientIp(h);

  // 限流必须在 submitComment 之前,不能只靠 lib/comments.ts 里那三层:
  // 那三层排在 Turnstile 出网校验之后,token 是垃圾时永远走不到 —— 于是每个带非空
  // 垃圾 token 的请求都先向 challenges.cloudflare.com 发一次 3s 超时的出网 POST,
  // 高频打过来就是 768m 容器上一堆挂起的 socket,应用层刹车一次都不生效。
  // 同理蜜罐分支也在 Turnstile 之前就返回 ok:true,不前置拦一道就等于把下面的
  // revalidatePath 白送给攻击者反复触发文章页重渲染。
  // 这里是全站唯一的匿名写入入口,用独立 scope 走默认档(5 次/分钟):既不跟 login
  // 抢桶,也给正常读者留出「改错重发」的余量。
  if (!checkRateLimit(ip, "comment").allowed) {
    return { ok: false, error: "操作太频繁,请稍后再试。" };
  }

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
