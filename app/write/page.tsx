import "./write.css";
import type { Route } from "next";
import { blogAdminSecret } from "@/lib/auth-secrets";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { BLOG_COOKIE, blogSessionToken, isBlogAuthed, isBlogSessionToken } from "@/lib/blog-auth";
import { createDatabasePost, databaseProviderLabel, deleteDatabasePost, hasDatabaseConfig, updateDatabasePost } from "@/lib/db";
import { getPublishedPost, PUBLIC_POSTS_CACHE_TAG } from "@/lib/posts";
import WriteEditorClient from "./WriteEditorClient";
import { isSameOriginRequest } from "@/lib/request-origin";
import { safeCompare } from "@/lib/safe-compare";
import { adminSessionCookieOptions } from "@/lib/session-cookie";
import { shanghaiDate } from "@/lib/publication";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "写今日心得",
  description: "从网页直接写入每日学习心得到 MongoDB Atlas 云数据库。",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ error?: string; slug?: string }>;
};

function parseTags(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function safeErrorForUrl(error: unknown): string {
  const raw = error instanceof Error ? error.message : "unknown-error";
  const sanitized = raw
    .replace(/mongodb(\+srv)?:\/\/[^@\s]+@/gi, "mongodb$1://<redacted>@")
    .replace(/(password=)[^&\s]+/gi, "$1<redacted>")
    .slice(0, 180);
  // 不把数据库驱动、网络拓扑或实现异常回显到地址栏；其余明确的校验错误仍可提示作者修正输入。
  return /^(标题不能为空|正文不能为空|找不到要(?:更新|删除)的文章)/.test(sanitized)
    ? sanitized
    : "保存失败，请检查输入或稍后重试。";
}

function revalidateBlog(slug?: string) {
  // 写作台是 Server Action；updateTag 提供 read-your-own-writes 语义，避免发布后
  // 被五分钟的 MongoDB 读取缓存遮住。公开读者仍由 Nginx/Cloudflare 承接。
  updateTag(PUBLIC_POSTS_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/posts");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/posts/${slug}`);
}

// Exact same admin gate the create flow has always used: form token OR a
// derived httpOnly session cookie. The raw BLOG_ADMIN_TOKEN is never stored in
// the browser; on the first successful token submit the derived cookie is set.
async function requireAdminOrRedirect(formData: FormData): Promise<void> {
  if (!isSameOriginRequest(await headers())) {
    redirect("/write?error=bad-origin" as Route);
  }

  const expectedToken = blogAdminSecret();
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(BLOG_COOKIE)?.value ?? "";
  const formToken = String(formData.get("token") ?? "").trim();

  if (!expectedToken) {
    redirect("/write?error=missing-token-env" as Route);
  }

  const cookieAuthed = isBlogSessionToken(cookieToken, expectedToken);
  const formAuthed = Boolean(formToken) && safeCompare(formToken, expectedToken);
  if (!cookieAuthed && !formAuthed) {
    redirect("/write?error=bad-token" as Route);
  }

  if (!cookieAuthed) {
    cookieStore.set(BLOG_COOKIE, blogSessionToken(expectedToken), adminSessionCookieOptions());
  }
}

async function publishPost(formData: FormData) {
  "use server";

  await requireAdminOrRedirect(formData);

  const editingSlug = String(formData.get("slug") ?? "").trim();

  let slug: string;
  try {
    const fields = {
      title: String(formData.get("title") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      tags: parseTags(formData.get("tags")),
      content: String(formData.get("content") ?? ""),
    };
    if (editingSlug) {
      const post = await updateDatabasePost(editingSlug, fields);
      slug = post.slug;
    } else {
      const post = await createDatabasePost({
        ...fields,
        date: String(formData.get("date") ?? ""),
      });
      slug = post.slug;
    }
  } catch (error) {
    const message = encodeURIComponent(safeErrorForUrl(error));
    const target = editingSlug
      ? `/write?slug=${encodeURIComponent(editingSlug)}&error=${message}`
      : `/write?error=${message}`;
    redirect(target as Route);
  }

  revalidateBlog(slug);
  redirect(`/posts/${slug}` as Route);
}

async function deletePost(formData: FormData) {
  "use server";

  await requireAdminOrRedirect(formData);

  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) {
    redirect("/write?error=missing-slug" as Route);
  }

  try {
    await deleteDatabasePost(slug);
  } catch (error) {
    redirect(`/write?slug=${encodeURIComponent(slug)}&error=${encodeURIComponent(safeErrorForUrl(error))}` as Route);
  }

  revalidateBlog(slug);
  redirect("/posts" as Route);
}

function errorMessage(code?: string): string | undefined {
  if (!code) return undefined;
  if (code === "missing-token-env") return "缺少 BLOG_ADMIN_TOKEN：为了安全，网页写入必须先配置写入密钥。";
  if (code === "bad-token") return "写入密钥不正确。";
  if (code === "bad-origin") return "请求来源不受信任，请从本站写作台提交。";
  if (code === "missing-slug") return "缺少要操作的文章标识（slug）。";
  return decodeURIComponent(code);
}

async function checkAuth(): Promise<boolean> {
  return isBlogAuthed();
}

export default async function WritePage({ searchParams }: Props) {
  const { error, slug } = await searchParams;
  const today = shanghaiDate();
  const dbReady = hasDatabaseConfig();
  const tokenReady = Boolean(blogAdminSecret());
  const publishingReady = dbReady && tokenReady;
  const message = errorMessage(error);
  const isAuthenticated = await checkAuth();

  // Only load an existing post for editing when the visitor is admin-authed.
  const editingPost = slug && isAuthenticated ? await getPublishedPost(slug) : undefined;

  return (
    <div className="page-shell editor-shell">
      <div className="page-title">
        <p className="eyebrow">{editingPost ? "Editing Desk" : "Editorial Desk"}</p>
        <h1>{editingPost ? "编辑已发布文章" : "知识卡片写作台"}</h1>
        <p>
          {editingPost
            ? "修改标题、正文或标签后保存，会覆盖 MongoDB 中的这篇文章，并刷新首页、文章、标签和 RSS。"
            : "聚焦标题、证据和下一步。发布后会写入 MongoDB Atlas，并同步出现在首页、文章、标签和 RSS。"}
        </p>
      </div>

      <section className={publishingReady ? "db-status ok" : "db-status warn"}>
        <strong>{publishingReady ? `Publishing Desk Ready：${databaseProviderLabel()}` : "写作发布尚未就绪"}</strong>
        <span>
          {publishingReady
            ? "数据库和密钥均已配置，可以提交。"
            : `数据库：${dbReady ? "已配置" : "未配置 MONGODB_URI"}；密钥：${tokenReady ? "BLOG_ADMIN_TOKEN 已配置" : "缺少 BLOG_ADMIN_TOKEN"}。`}
        </span>
      </section>

      {message ? <p className="form-error">E42: {message}</p> : null}

      <WriteEditorClient
        initialDate={editingPost ? editingPost.date : today}
        publishAction={publishPost}
        deleteAction={deletePost}
        isAuthenticated={isAuthenticated}
        editingSlug={editingPost?.slug}
        initialTitle={editingPost?.title}
        initialSummary={editingPost?.summary}
        initialTags={editingPost ? editingPost.tags.join(", ") : undefined}
        initialContent={editingPost?.content}
      />
    </div>
  );
}
