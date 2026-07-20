import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createDatabasePost, databaseProviderLabel, deleteDatabasePost, hasDatabaseConfig, updateDatabasePost } from "@/lib/db";
import { getPublishedPost } from "@/lib/posts";
import WriteEditorClient from "./WriteEditorClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "写今日心得",
  description: "从网页直接写入每日学习心得到 MongoDB Atlas 云数据库。",
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
  return raw
    .replace(/mongodb(\+srv)?:\/\/[^@\s]+@/gi, "mongodb$1://<redacted>@")
    .replace(/(password=)[^&\s]+/gi, "$1<redacted>")
    .slice(0, 180);
}

function revalidateBlog(slug?: string) {
  revalidatePath("/");
  revalidatePath("/posts");
  revalidatePath("/tags");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/posts/${slug}`);
}

// Exact same admin gate the create flow has always used: form token OR the
// httpOnly `blog_admin_token` cookie, checked against BLOG_ADMIN_TOKEN. On the
// first successful token submit it persists the cookie, mirroring /api/auth.
async function requireAdminOrRedirect(formData: FormData): Promise<void> {
  const expectedToken = process.env.BLOG_ADMIN_TOKEN?.trim();
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("blog_admin_token")?.value?.trim();
  const formToken = String(formData.get("token") ?? "").trim();
  const token = formToken || cookieToken || "";

  if (!expectedToken) {
    redirect("/write?error=missing-token-env" as Route);
  }

  if (token !== expectedToken) {
    redirect("/write?error=bad-token" as Route);
  }

  if (!cookieToken) {
    cookieStore.set("blog_admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
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
  if (code === "missing-slug") return "缺少要操作的文章标识（slug）。";
  return decodeURIComponent(code);
}

async function checkAuth(): Promise<boolean> {
  const expected = process.env.BLOG_ADMIN_TOKEN?.trim();
  if (!expected) return false;
  const cookieStore = await cookies();
  return cookieStore.get("blog_admin_token")?.value?.trim() === expected;
}

export default async function WritePage({ searchParams }: Props) {
  const { error, slug } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const dbReady = hasDatabaseConfig();
  const tokenReady = Boolean(process.env.BLOG_ADMIN_TOKEN?.trim());
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
