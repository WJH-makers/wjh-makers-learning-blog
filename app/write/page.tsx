import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkDatabaseConnection, createDatabasePost, databaseProviderLabel, hasDatabaseConfig } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "写今日心得",
  description: "从网页直接写入每日学习心得到 MongoDB Atlas 云数据库。",
};

type Props = {
  searchParams: Promise<{ error?: string }>;
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

async function publishPost(formData: FormData) {
  "use server";

  const expectedToken = process.env.BLOG_ADMIN_TOKEN?.trim();
  const token = String(formData.get("token") ?? "").trim();

  if (!expectedToken) {
    redirect("/write?error=missing-token-env" as Route);
  }

  if (token !== expectedToken) {
    redirect("/write?error=bad-token" as Route);
  }

  let slug: string;
  try {
    const post = await createDatabasePost({
      title: String(formData.get("title") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      tags: parseTags(formData.get("tags")),
      content: String(formData.get("content") ?? ""),
      date: String(formData.get("date") ?? ""),
    });
    slug = post.slug;
  } catch (error) {
    redirect(`/write?error=${encodeURIComponent(safeErrorForUrl(error))}` as Route);
  }

  revalidatePath("/");
  revalidatePath("/posts");
  revalidatePath("/tags");
  revalidatePath("/rss.xml");
  revalidatePath("/sitemap.xml");
  redirect(`/posts/${slug}` as Route);
}

function errorMessage(code?: string): string | undefined {
  if (!code) return undefined;
  if (code === "missing-token-env") return "缺少 BLOG_ADMIN_TOKEN：为了安全，网页写入必须先配置写入密钥。";
  if (code === "bad-token") return "写入密钥不正确。";
  return decodeURIComponent(code);
}

export default async function WritePage({ searchParams }: Props) {
  const { error } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const dbReady = hasDatabaseConfig();
  const dbStatus = dbReady ? await checkDatabaseConnection() : { ok: false, message: "Missing MONGODB_URI or DATABASE_URL" };
  const message = errorMessage(error);

  return (
    <div className="page-shell editor-shell">
      <div className="page-title">
        <p className="eyebrow">Editorial Desk</p>
        <h1>写今日头条</h1>
        <p>
          这里是部署在 Vercel 上的每日经验写作台。提交后文章会直连写入 MongoDB Atlas 的 <code>learning_posts</code> collection，并立即出现在首页、文章列表、标签页和 RSS 中。
        </p>
      </div>

      <section className={dbStatus.ok ? "db-status ok" : "db-status warn"}>
        <strong>{dbStatus.ok ? `Publishing Desk Ready：${databaseProviderLabel()}` : "MongoDB Atlas 尚未就绪"}</strong>
        <span>
          {dbStatus.ok
            ? `可以提交。连接检查：${dbStatus.message}`
            : `当前只能显示静态 Markdown。请检查 MONGODB_URI（或 DATABASE_URL）、Atlas 用户、Network Access 白名单和 Vercel 环境变量。错误：${dbStatus.message}`}
        </span>
      </section>

      {message ? <p className="form-error">E42: {message}</p> : null}

      <div className="editor-layout">
        <form className="editor-form" action={publishPost}>
          <label>
            <span>写入密钥 BLOG_ADMIN_TOKEN</span>
            <input name="token" type="password" autoComplete="off" required />
          </label>

          <div className="form-grid">
            <label>
              <span>日期</span>
              <input name="date" type="date" defaultValue={today} required />
            </label>
            <label>
              <span>标签（英文逗号分隔）</span>
              <input name="tags" defaultValue="Java, Git, MySQL, 复盘" />
            </label>
          </div>

          <label>
            <span>标题</span>
            <input name="title" placeholder="例如：今天把 Vercel 博客写作入口打通了" required />
          </label>

          <label>
            <span>摘要</span>
            <input name="summary" placeholder="一句话说明今天沉淀了什么" />
          </label>

          <label>
            <span>正文 Markdown</span>
            <textarea
              name="content"
              rows={18}
              required
              defaultValue={`## 今天学了什么\n\n- \n\n## 关键命令\n\n\`\`\`bash\n\n\`\`\`\n\n## 遇到的问题\n\n> \n\n## 验证证据\n\n- \n\n## 明天继续\n\n- `}
            />
          </label>

          <div className="hero-actions">
            <button className="button primary" type="submit">发布今日心得</button>
            <a className="button" href="/posts">查看归档</a>
          </div>
        </form>

        <aside className="editor-note" aria-label="写作发布清单">
          <p className="eyebrow">Publishing Checklist</p>
          <h2>写博客时只抓四件事</h2>
          <ul>
            <li><strong>目标</strong><span>今天要解决的真实问题是什么？</span></li>
            <li><strong>过程</strong><span>记录关键命令、链接、报错和取舍。</span></li>
            <li><strong>证据</strong><span>写清楚如何验证：构建、截图、日志或结论。</span></li>
            <li><strong>复盘</strong><span>留下下次可复用的模板或避坑规则。</span></li>
          </ul>
          <p>
            这个入口没有 CMS、ORM 或额外后台，只用 Next.js Server Action + MongoDB 官方 Driver。按钮保持 44px 以上触控尺寸、清晰主次和强焦点态，方便以后每天快速打开、写完、发布。
          </p>
        </aside>
      </div>
    </div>
  );
}
