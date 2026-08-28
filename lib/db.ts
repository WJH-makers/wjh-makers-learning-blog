import { attachDatabasePool } from "@vercel/functions";
import { MongoClient, ServerApiVersion, type Collection, type MongoClientOptions, type WithId } from "mongodb";
import { resolveMongoUri } from "@/lib/database-config";
import type { Post } from "@/lib/posts";
import type { PostIndexEntry } from "@/lib/post-index";
import { estimateReadingMinutes } from "@/lib/text";
import { shanghaiDate } from "@/lib/publication";

type NewDatabasePost = {
  title: string;
  summary: string;
  tags: string[];
  content: string;
  date: string;
};

type DatabasePostEdit = {
  title: string;
  summary: string;
  tags: string[];
  content: string;
};

type MongoPostDocument = {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  content: string;
  publishedAt: string;
  createdAt: Date;
  updatedAt: Date;
};

let clientPromise: Promise<MongoClient> | undefined;
let indexesReady = false;

function mongoUri(): string {
  return resolveMongoUri(process.env.MONGODB_URI, process.env.DATABASE_URL);
}

export function hasDatabaseConfig(): boolean {
  return Boolean(mongoUri());
}

export function databaseProviderLabel(): string {
  return hasDatabaseConfig() ? "MongoDB Atlas" : "未配置数据库";
}

function databaseName(): string {
  return process.env.MONGODB_DB_NAME?.trim() || "learning_blog";
}

function collectionName(): string {
  return process.env.MONGODB_COLLECTION?.trim() || "learning_posts";
}

function publicErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Unknown MongoDB connection error";
  return raw
    .replace(/mongodb(\+srv)?:\/\/[^@\s]+@/gi, "mongodb$1://<redacted>@")
    .replace(/(password=)[^&\s]+/gi, "$1<redacted>")
    .slice(0, 260);
}

function getClient(): Promise<MongoClient> {
  const uri = mongoUri();
  if (!uri) {
    throw new Error("缺少 MongoDB 配置：请设置 MONGODB_URI（或 DATABASE_URL）。");
  }

  if (!clientPromise) {
    const options: MongoClientOptions = {
      appName: "coffee-station-blog",
      maxPoolSize: 10,
      // 自有长驻服务器(非 serverless):留热连接,免得稀疏查询每次都重做 Atlas TLS 握手
      minPoolSize: 1,
      maxIdleTimeMS: 60000,
      serverSelectionTimeoutMS: 5000,
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    };
    const client = new MongoClient(uri, options);
    attachDatabasePool(client);
    // 首连失败必须把 promise 丢掉:否则这个 rejected promise 会被缓存到容器生命周期结束,
    // Atlas 一次抖动 = 评论/写作台/DB 文章在本次进程里永久静默失效。
    clientPromise = client.connect().catch((error) => {
      clientPromise = undefined;
      throw error;
    });
  }

  return clientPromise;
}

async function postsCollection(): Promise<Collection<MongoPostDocument>> {
  const client = await getClient();
  return client.db(databaseName()).collection<MongoPostDocument>(collectionName());
}

/** 供评论等其它集合复用同一个连接池(不新建连接)。 */
export async function getDb() {
  const client = await getClient();
  return client.db(databaseName());
}

export async function ensureSchema(): Promise<void> {
  if (indexesReady) return;
  const collection = await postsCollection();
  await Promise.all([
    collection.createIndex({ slug: 1 }, { unique: true, name: "uq_learning_posts_slug" }),
    collection.createIndex({ publishedAt: -1, createdAt: -1 }, { name: "idx_learning_posts_published_at" }),
    collection.createIndex({ tags: 1 }, { name: "idx_learning_posts_tags" }),
  ]);
  indexesReady = true;
}

export async function checkDatabaseConnection(): Promise<{ ok: boolean; message: string }> {
  if (!hasDatabaseConfig()) {
    return { ok: false, message: "Missing MONGODB_URI or DATABASE_URL" };
  }

  try {
    const client = await getClient();
    await client.db(databaseName()).command({ ping: 1 });
    await ensureSchema();
    return { ok: true, message: `${databaseName()}.${collectionName()} ready` };
  } catch (error) {
    return { ok: false, message: publicErrorMessage(error) };
  }
}

/**
 * `collection<MongoPostDocument>()` 只是**编译期**断言 —— 它不校验一个字节。
 *
 * 库里的文档可能来自手工 mongosh、早期 schema、或迁移脚本,缺字段和错类型都真会出现。
 * 而这三个字段一旦是坏值,故障点离源头很远:
 *  - `tags` 缺失 → `undefined`,在 /tags 聚合、文章页 `tags.join`、sitemap 三处抛 TypeError;
 *  - `publishedAt` 不是 YYYY-MM-DD → 过不了发布闸门的正则,文章「库里有、站上永远查不到」;
 *  - `slug` 非法 → 页面渲染出来但编辑/删除/评论全部拒绝(那三条路走 assertPostSlug)。
 *
 * 所以在读出侧逐字段窄化。**坏文档丢弃 + 留日志,而不是整批失败** ——
 * 一条脏记录不该让首页空白;日志保证它不是静默消失。
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function narrowPostIndexFields(
  doc: unknown,
): { slug: string; title: string; summary: string; tags: string[]; publishedAt: string } | undefined {
  if (typeof doc !== "object" || doc === null) return undefined;
  const d = doc as Record<string, unknown>;

  if (!isNonEmptyString(d.slug) || !isNonEmptyString(d.title)) return undefined;
  // summary 允许空串(validatePostFields 会用正文前 120 字兜底,但历史数据可能真是空的),
  // 只要求它是字符串 —— 它会直接进 meta description。
  if (typeof d.summary !== "string") return undefined;
  if (!Array.isArray(d.tags) || !d.tags.every((tag) => typeof tag === "string")) return undefined;
  if (!isNonEmptyString(d.publishedAt) || !/^\d{4}-\d{2}-\d{2}$/.test(d.publishedAt)) return undefined;

  return { slug: d.slug, title: d.title, summary: d.summary, tags: d.tags as string[], publishedAt: d.publishedAt };
}

function docToPost(doc: WithId<MongoPostDocument>): Post | undefined {
  const fields = narrowPostIndexFields(doc);
  if (!fields || typeof doc.content !== "string") {
    console.error(`[learning-blog] 跳过形状不合法的文章文档 _id=${String(doc?._id)}`);
    return undefined;
  }
  return {
    slug: fields.slug,
    title: fields.title,
    date: fields.publishedAt,
    summary: fields.summary,
    tags: fields.tags,
    readingMinutes: estimateReadingMinutes(doc.content),
    content: doc.content,
  };
}

function docToPostIndex(
  doc: WithId<Pick<MongoPostDocument, "slug" | "title" | "summary" | "tags" | "publishedAt">>,
): PostIndexEntry | undefined {
  const fields = narrowPostIndexFields(doc);
  if (!fields) {
    console.error(`[learning-blog] 跳过形状不合法的索引文档 _id=${String(doc?._id)}`);
    return undefined;
  }
  return {
    slug: fields.slug,
    title: fields.title,
    date: fields.publishedAt,
    summary: fields.summary,
    tags: fields.tags,
  };
}

export async function getDatabasePosts(limit?: number): Promise<Post[]> {
  if (!hasDatabaseConfig()) return [];
  await ensureSchema();
  const collection = await postsCollection();
  let cursor = collection
    .find({})
    .sort({ publishedAt: -1, createdAt: -1 });
  if (limit && limit > 0) cursor = cursor.limit(limit);
  const docs = await cursor.toArray();
  // flatMap 而非 map:窄化失败的文档被丢弃(已在 docToPost 里记日志),
  // 一条脏记录不该让整个列表变成含 undefined 的数组往下游流。
  return docs.flatMap((doc) => {
    const post = docToPost(doc);
    return post ? [post] : [];
  });
}

export async function getDatabasePostIndex(): Promise<PostIndexEntry[]> {
  if (!hasDatabaseConfig()) return [];
  await ensureSchema();
  const collection = await postsCollection();
  const docs = await collection.find({}, {
    projection: { slug: 1, title: 1, summary: 1, tags: 1, publishedAt: 1 },
  }).sort({ publishedAt: -1, createdAt: -1 }).toArray();
  return docs.flatMap((doc) => {
    const entry = docToPostIndex(doc);
    return entry ? [entry] : [];
  });
}

export async function getDatabasePost(slug: string): Promise<Post | undefined> {
  if (!hasDatabaseConfig()) return undefined;
  await ensureSchema();
  const collection = await postsCollection();
  const doc = await collection.findOne({ slug });
  return doc ? docToPost(doc) : undefined;
}

function slugify(input: string): string {
  // 先截断再剥分隔符:顺序反过来的话,slice(0,120) 的切点落在分隔符后就留下尾部 "-",
  // 而 assertPostSlug 的正则不接受尾部连字符 —— 文章能入库并公开渲染,却永远
  // 编辑不了、删不掉、评论不了(编辑/删除/评论三条路径都过 assertPostSlug)。
  return input
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .slice(0, 120)
    .replace(/^-+|-+$/g, "");
}

const MAX_POST_TITLE_LENGTH = 200;
const MAX_POST_SUMMARY_LENGTH = 1_000;
const MAX_POST_CONTENT_LENGTH = 200_000;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 64;
const MAX_POST_SLUG_LENGTH = 180;

/**
 * 「作者自己能改」的校验失败,区别于数据库/配置/网络故障。
 *
 * 写作台需要区分这两类:前者的文案必须原样透给作者(否则他看到「请检查输入」
 * 却不知道是标题太长还是日期非法,原样重试必然再失败),后者可能带连接串、
 * 驱动异常和拓扑信息,只能泛化。
 *
 * 用类型而不是让调用方按文案前缀匹配:前缀表会与这里的措辞静默耦合 ——
 * 改一句提示语或新增一条校验,写作台那边不同步就退化成泛化文案,而且没有任何报错。
 */
export class PostValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostValidationError";
  }
}

/**
 * 发布日期必须是真实存在的 YYYY-MM-DD。
 *
 * 这个值同时进 publishedAt(发布闸门按字符串比较)和 slug 前缀,两处都容不下自由文本:
 * 形状不对会造出「库里有、站上永远查不到」的记录(isReleasedDate 的正则直接判否),
 * 含斜杠还会把 slug 拆成多级路径。round-trip 比对挡掉 2026-02-31 这类越界日期 ——
 * 单靠正则只能证明形状,证不了这一天存在。
 */
function assertPostDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new PostValidationError("发布日期必须是 YYYY-MM-DD 格式。");
  }
  const parsed = new Date(`${date}T00:00:00+08:00`);
  if (Number.isNaN(parsed.getTime()) || shanghaiDate(parsed) !== date) {
    throw new PostValidationError("发布日期不是一个真实存在的日期。");
  }
  return date;
}

function assertPostSlug(slug: string): string {
  const normalized = slug.normalize("NFKC").trim();
  if (!/^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u.test(normalized) || normalized.length > MAX_POST_SLUG_LENGTH) {
    throw new PostValidationError("文章标识无效。");
  }
  return normalized;
}

function validatePostFields(input: NewDatabasePost | DatabasePostEdit): {
  title: string;
  content: string;
  summary: string;
  tags: string[];
} {
  const title = input.title.normalize("NFKC").trim();
  const content = input.content.trim();
  const summary = input.summary.trim() || content.slice(0, 120);
  const tags = [...new Set(input.tags.map((tag) => tag.normalize("NFKC").trim()).filter(Boolean))];

  if (!title) throw new PostValidationError("标题不能为空。");
  if (!content) throw new PostValidationError("正文不能为空。");
  if (title.length > MAX_POST_TITLE_LENGTH) throw new PostValidationError("标题不能超过 200 个字符。");
  if (summary.length > MAX_POST_SUMMARY_LENGTH) throw new PostValidationError("摘要不能超过 1000 个字符。");
  if (content.length > MAX_POST_CONTENT_LENGTH) throw new PostValidationError("正文不能超过 200000 个字符。");
  if (tags.length > MAX_TAGS || tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    throw new PostValidationError("标签数量或长度超出限制。");
  }

  return { title, content, summary, tags };
}

/**
 * 取一个未被占用的 slug。
 * 不能用 countDocuments 推后缀:库里同时有 base 与 base-3 时 count=2 会推出必然撞唯一索引的 base-3。
 * 这里读回同族已占用集合再找第一个空位;并发下仍可能撞车,由 createDatabasePost 的插入重试兜底。
 */
async function uniqueSlug(base: string): Promise<string> {
  const safeBase = base || "daily-note";
  const collection = await postsCollection();
  const escaped = safeBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const docs = await collection
    .find({ slug: { $regex: `^${escaped}(-\\d+)?$` } }, { projection: { slug: 1 } })
    .toArray();
  const taken = new Set(docs.map((doc) => doc.slug));
  if (!taken.has(safeBase)) return safeBase;
  for (let i = 2; i <= taken.size + 2; i += 1) {
    const candidate = `${safeBase}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${safeBase}-${taken.size + 3}`;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

export async function createDatabasePost(input: NewDatabasePost): Promise<Post> {
  if (!hasDatabaseConfig()) {
    throw new Error("当前博客没有 MongoDB Atlas 配置，不能从网页写入。请先设置 MONGODB_URI（或 DATABASE_URL）。");
  }

  const { title, content, summary, tags } = validatePostFields(input);
  const date = assertPostDate(input.date.trim() || shanghaiDate());

  await ensureSchema();
  const collection = await postsCollection();
  // 纯标点/emoji 标题会 slugify 成空串,直接拼就得到以 "-" 结尾的 base。
  // uniqueSlug 的 `base || "daily-note"` 兜底在这里不生效(`${date}-` 是真值),
  // 于是坏 slug 一路落库。缺标题时退到 date 本身,保证 base 永不以分隔符收尾。
  const titleSlug = slugify(title);
  const base = titleSlug ? `${date}-${titleSlug}` : date;
  const now = new Date();

  // 并发写入下 uniqueSlug 的读-改-写仍有窗口,撞唯一索引就重算一次(最多 5 次)。
  let slug = "";
  for (let attempt = 0; ; attempt += 1) {
    slug = await uniqueSlug(base);
    try {
      await collection.insertOne({
        slug,
        title,
        summary,
        tags,
        content,
        publishedAt: date,
        createdAt: now,
        updatedAt: now,
      });
      break;
    } catch (error) {
      if (!isDuplicateKeyError(error) || attempt >= 4) throw error;
    }
  }

  return {
    slug,
    title,
    summary,
    date,
    tags,
    content,
    readingMinutes: estimateReadingMinutes(content),
  };
}

export async function updateDatabasePost(slug: string, input: DatabasePostEdit): Promise<Post> {
  if (!hasDatabaseConfig()) {
    throw new Error("当前博客没有 MongoDB Atlas 配置，不能从网页写入。请先设置 MONGODB_URI（或 DATABASE_URL）。");
  }

  const safeSlug = assertPostSlug(slug);
  const { title, content, summary, tags } = validatePostFields(input);

  await ensureSchema();
  const collection = await postsCollection();
  const now = new Date();

  const result = await collection.updateOne(
    { slug: safeSlug },
    { $set: { title, summary, tags, content, updatedAt: now } },
  );

  if (result.matchedCount === 0) {
    throw new PostValidationError("找不到要更新的文章，可能已被删除，或它是内置 Markdown 文章而不在数据库中。");
  }

  const updated = await getDatabasePost(safeSlug);
  if (!updated) {
    throw new Error("更新成功但无法读取最新文章内容。");
  }
  return updated;
}

export async function deleteDatabasePost(slug: string): Promise<void> {
  if (!hasDatabaseConfig()) {
    throw new Error("当前博客没有 MongoDB Atlas 配置，不能从网页删除。请先设置 MONGODB_URI（或 DATABASE_URL）。");
  }

  const safeSlug = assertPostSlug(slug);
  await ensureSchema();
  const collection = await postsCollection();
  const result = await collection.deleteOne({ slug: safeSlug });

  if (result.deletedCount === 0) {
    throw new PostValidationError("找不到要删除的文章，可能已被删除，或它是内置 Markdown 文章而不在数据库中。");
  }
}
