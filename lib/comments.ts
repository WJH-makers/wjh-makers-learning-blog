import { createHash, randomBytes } from "node:crypto";
import type { Collection } from "mongodb";
import { getDb, hasDatabaseConfig } from "@/lib/db";

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

export async function getComments(slug: string, limit = MAX_COMMENTS_PER_POST): Promise<Comment[]> {
  if (!hasDatabaseConfig()) return [];
  try {
    await ensureIndex();
    const col = await commentsCollection();
    const docs = await col.find({ slug, status: "visible" }).sort({ createdAt: 1 }).limit(limit).toArray();
    return docs.map((d) => ({
      id: d._id.toString(),
      slug: d.slug,
      name: d.name,
      body: d.body,
      createdAt: d.createdAt.toISOString(),
    }));
  } catch {
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

/** Cloudflare Turnstile 服务端校验。未配置 secret 时跳过(仍受蜜罐/限流/敏感词保护)。 */
async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true;
  if (!token) {
    // secret 配了、site key 没配 = 典型的半截配置:前端压根不渲染 widget,于是每条评论
    // 都缺 token 被拒,而用户只看到「请重试」——重试一万次也没用。这里把根因写进日志,
    // 免得下次又从前端一路查到 CF。仍然拒绝(fail-closed),但要让运维一眼看见为什么。
    if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()) {
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
      // 浏览器已与人机验证服务完成挑战；不再额外转交访问者 IP。
      body: new URLSearchParams({ secret, response: token }),
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

const BANNED_WORDS = [
  "加微信", "加qq", "加v信", "代开", "发票", "菠菜", "博彩", "赌博", "色情",
  "澳门", "威客", "刷单", "兼职日结", "t.me/", "vx：", "薇：",
];

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
  if (!hasDatabaseConfig()) return { ok: false, error: "评论功能暂未启用。" };
  if (!input.slug || input.slug.length > 200) return { ok: false, error: "非法的文章标识。" };

  // 1) 蜜罐:机器人往往会填满所有字段,填了就静默丢弃、伪装成功
  if (input.honeypot.trim()) {
    return { ok: true, comment: { id: "0", slug: input.slug, name: input.name.trim(), body: "", createdAt: new Date().toISOString() } };
  }

  const name = input.name.trim();
  const body = input.body.trim();

  // 2) 内容校验 + 敏感词
  if (name.length < 1 || name.length > 24) return { ok: false, error: "昵称需 1–24 个字符。" };
  if (body.length < 2 || body.length > 1000) return { ok: false, error: "评论需 2–1000 个字符。" };
  if ((body.match(/https?:\/\//gi) ?? []).length > 2) return { ok: false, error: "链接过多,疑似广告。" };
  const haystack = `${name}\n${body}`.toLowerCase();
  if (BANNED_WORDS.some((w) => haystack.includes(w.toLowerCase()))) {
    return { ok: false, error: "内容包含不被允许的词汇。" };
  }

  // 3) 人机验证
  if (!(await verifyTurnstile(input.turnstileToken))) {
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
    // 4d) 每篇文章评论上限,防止单页无限膨胀占用存储
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
