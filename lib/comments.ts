import { createHash, randomBytes } from "node:crypto";
import type { Collection } from "mongodb";
import { getDb, hasDatabaseConfig } from "@/lib/db";
import { getPublishedPost } from "@/lib/posts";
import { turnstileSiteKey } from "@/lib/turnstile-config";
import { contentRejection, isHoneypotTripped, isValidCommentSlug } from "@/lib/comment-guards";

// 免登录评论:昵称 + 内容,不收集邮箱,不存原始 IP(仅存 salted hash 用于限流)。
// 反垃圾多层防线:蜜罐 → 内容校验/敏感词 → Cloudflare Turnstile 人机验证 → 同 IP 限流。

export type Comment = {
  id: string;
  slug: string;
  name: string;
  body: string;
  createdAt: string; // ISO 字符串
};

type CommentDoc = {
  slug: string;
  name: string;
  body: string;
  ipHash: string;
  status: "visible" | "pending" | "spam";
  createdAt: Date;
};

/** 单文章评论上限:落库门槛(submitComment 4d)与渲染取数(getComments 默认 limit)共用,
 *  两处若不一致会出现「被受理却永不渲染」的缝隙。 */
const MAX_COMMENTS_PER_POST = 500;

async function commentsCollection(): Promise<Collection<CommentDoc>> {
  const db = await getDb();
  return db.collection<CommentDoc>(process.env.MONGODB_COMMENTS_COLLECTION?.trim() || "comments");
}

let indexReady = false;
async function ensureIndex(): Promise<void> {
  if (indexReady) return;
  const col = await commentsCollection();
  await Promise.all([
    col.createIndex({ slug: 1, createdAt: -1 }, { name: "idx_comments_slug_time" }),
    col.createIndex({ ipHash: 1, createdAt: -1 }, { name: "idx_comments_ip_time" }),
  ]);
  indexReady = true;
}

/** Date 与「可解析的日期字符串」都接受,其余(含 Invalid Date)返回 undefined。 */
function toIsoString(value: unknown): string | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }
  return undefined;
}

export async function getComments(slug: string, limit = MAX_COMMENTS_PER_POST): Promise<Comment[]> {
  if (!hasDatabaseConfig()) return [];
  try {
    await ensureIndex();
    const col = await commentsCollection();
    const docs = await col.find({ slug, status: "visible" }).sort({ createdAt: 1 }).limit(limit).toArray();
    // `CommentDoc` 把 createdAt 声明成 Date,但那只是编译期断言。库里若有一条
    // createdAt 是字符串(手工插入、迁移脚本、早期 schema),`.toISOString()` 就抛,
    // 而它抛在 map 里 —— 整个 map 中断,被外层 catch 接住返回 [],
    // 于是**这篇文章的全部评论一起消失**,只因为一条记录格式不对。
    // 逐条窄化:能用的用,不能用的只丢那一条。
    return docs.flatMap((d) => {
      const createdAt = toIsoString(d.createdAt);
      if (!createdAt || typeof d.name !== "string" || typeof d.body !== "string") {
        console.error(`[comments] 跳过形状不合法的评论 _id=${String(d._id)} slug=${slug}`);
        return [];
      }
      return [{ id: d._id.toString(), slug: d.slug, name: d.name, body: d.body, createdAt }];
    });
  } catch (error) {
    // 仍然返回空数组(评论区不该让整篇文章 500),但必须留痕:
    // 唯一调用点在 "use cache" + cacheLife("article") 的文章页里,一次 Atlas 抖动
    // 会把「零评论」烤进最长 7 天的缓存窗口。没有这行日志,现象就是「评论凭空消失
    // 一周」且服务端查不到任何原因。
    console.error(`[comments] 读取失败,本次按零评论渲染 slug=${slug}:`, error);
    return [];
  }
}

// ---------- 反垃圾 ----------

// 未配置 COMMENT_IP_SALT 时的兜底盐:进程启动时随机生成,永不落盘。
// 不能像原来那样在仓库里写死默认值 —— IPv4 空间只有 2^32,盐一旦公开就能穷举反解,
// 等于明文存 IP,与前端「仅加密存储」的承诺不符。
// 也不能返回 undefined:{ipHash: undefined} 在 Mongo 里会匹配所有缺该字段的文档,
// 一个人发言就会把全站限流卡死。随机盐同时守住隐私与限流,代价只是重启后限流窗口重置。
const FALLBACK_IP_SALT = randomBytes(32).toString("hex");

/** 不存原始 IP,只存 salted sha256 前 16 位,用于同 IP 限流。 */
function hashIp(ip: string): string {
  const salt = process.env.COMMENT_IP_SALT?.trim() || FALLBACK_IP_SALT;
  return createHash("sha256").update(salt + ip).digest("hex").slice(0, 16);
}

/**
 * 评论属于写入能力，默认关闭；只有三个配置同时具备才开放。
 * 不能在生产环境为了“先能用”而悄悄跳过验证码，否则机器人只需绕开前端即可写库。
 */
export function isCommentingEnabled(): boolean {
  return hasDatabaseConfig()
    && process.env.COMMENTS_ENABLED === "true"
    && Boolean(process.env.TURNSTILE_SECRET_KEY?.trim())
    && Boolean(turnstileSiteKey());
}

/** Cloudflare Turnstile 服务端校验。未配置或无 token 一律拒绝。 */
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return false;
  if (!token) {
    // secret 配了、site key 没配 = 典型的半截配置:前端压根不渲染 widget,于是每条评论
    // 都缺 token 被拒,而用户只看到「请重试」——重试一万次也没用。这里把根因写进日志,
    // 免得下次又从前端一路查到 CF。仍然拒绝(fail-closed),但要让运维一眼看见为什么。
    if (!turnstileSiteKey()) {
      console.error(
        "[comments] 配置不一致:TURNSTILE_SECRET_KEY 已设,但 NEXT_PUBLIC_TURNSTILE_SITE_KEY 缺失。" +
        "后者是构建期内联的前端变量,须通过 docker compose build args 传入,否则评论会被全部拒绝。",
      );
    }
    return false;
  }
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      // 无超时的话,CF 一次慢响应就把整个评论 Server Action 挂住;
      // 1cpu/512m 上会放大成全站卡顿。超时按校验失败处理(fail-closed)。
      signal: AbortSignal.timeout(3000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

// 敏感词表与内容层判定已移到 lib/comment-guards.ts —— 那里没有任何 import,
// 因此可以被 node --test 直接断言(本文件经 @/lib/db 拉入 mongodb,测试进程解析不了别名)。

export type SubmitInput = {
  slug: string;
  name: string;
  body: string;
  honeypot: string; // 隐藏字段,正常用户为空
  turnstileToken: string;
  ip: string;
};

export type SubmitResult = { ok: true; comment: Comment } | { ok: false; error: string };

export async function submitComment(input: SubmitInput): Promise<SubmitResult> {
  if (!isCommentingEnabled()) return { ok: false, error: "评论功能暂未开放。" };
  if (!hasDatabaseConfig()) return { ok: false, error: "评论功能暂未启用。" };
  if (!isValidCommentSlug(input.slug)) {
    return { ok: false, error: "非法的文章标识。" };
  }

  // 1) 蜜罐:机器人往往会填满所有字段,填了就静默丢弃、伪装成功
  if (isHoneypotTripped(input.honeypot)) {
    return { ok: true, comment: { id: "0", slug: input.slug, name: input.name.trim(), body: "", createdAt: new Date().toISOString() } };
  }

  const name = input.name.trim();
  const body = input.body.trim();

  // 2) 内容校验 + 敏感词(判定顺序与文案在 lib/comment-guards.ts 里,有专门测试钉住)
  const rejection = contentRejection(name, body);
  if (rejection) return { ok: false, error: rejection };

  // 3) 人机验证
  if (!(await verifyTurnstile(input.turnstileToken, input.ip))) {
    return { ok: false, error: "人机验证未通过,请重试。" };
  }

  // 4)–5) 数据库整段收口:Mongo 掉线/超时不再向上 throw(server action rejection 会
  // 触发 Next 默认错误页整页替换),降级为可重试的表单错误,评论内容仍留在输入框里。
  try {
    // 4) 限流:三层
    const ipHash = hashIp(input.ip);
    await ensureIndex();
    const col = await commentsCollection();
    // 4a) 60 秒内最多 1 条
    const recent = await col.findOne({ ipHash, createdAt: { $gte: new Date(Date.now() - 60_000) } });
    if (recent) return { ok: false, error: "评论太频繁,请稍后再试。" };
    // 4b) 1 小时内最多 10 条
    const hourCount = await col.countDocuments({ ipHash, createdAt: { $gte: new Date(Date.now() - 3_600_000) } });
    if (hourCount >= 10) return { ok: false, error: "发言太多啦,休息一下再来。" };
    // 4c) 5 分钟内不允许相同内容(防刷屏)
    const dup = await col.findOne({ ipHash, body, createdAt: { $gte: new Date(Date.now() - 300_000) } });
    if (dup) return { ok: false, error: "请勿重复发送相同内容。" };
    // 4d) 仅允许公开文章接收评论，避免垃圾数据占用任意不存在或未到发布日期的 slug。
    if (!(await getPublishedPost(input.slug))) {
      return { ok: false, error: "文章不存在或暂不可评论。" };
    }
    // 4e) 每篇文章评论上限,防止单页无限膨胀占用存储
    const perPost = await col.countDocuments({ slug: input.slug });
    if (perPost >= MAX_COMMENTS_PER_POST) return { ok: false, error: "本文评论已达上限。" };

    // 5) 落库(status: visible;如需先审后发,改成 "pending")
    const doc: CommentDoc = { slug: input.slug, name, body, ipHash, status: "visible", createdAt: new Date() };
    const { insertedId } = await col.insertOne(doc);
    return {
      ok: true,
      comment: { id: insertedId.toString(), slug: input.slug, name, body, createdAt: doc.createdAt.toISOString() },
    };
  } catch {
    return { ok: false, error: "服务暂时不可用,请稍后重试。" };
  }
}
