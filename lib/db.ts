import { MongoClient, ServerApiVersion, type Collection, type MongoClientOptions, type WithId } from "mongodb";
import type { Post } from "@/lib/posts";
import { estimateReadingMinutes } from "@/lib/text";

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
  return process.env.MONGODB_URI?.trim() || process.env.DATABASE_URL?.trim() || "";
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
      appName: "doudou-learning-blog",
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

function docToPost(doc: WithId<MongoPostDocument>): Post {
  return {
    slug: doc.slug,
    title: doc.title,
    date: doc.publishedAt,
    summary: doc.summary,
    tags: doc.tags,
    readingMinutes: estimateReadingMinutes(doc.content),
    content: doc.content,
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
  return docs.map(docToPost);
}

export async function getDatabasePost(slug: string): Promise<Post | undefined> {
  if (!hasDatabaseConfig()) return undefined;
  await ensureSchema();
  const collection = await postsCollection();
  const doc = await collection.findOne({ slug });
  return doc ? docToPost(doc) : undefined;
}

function slugify(input: string): string {
  return input
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
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

  const title = input.title.trim();
  const content = input.content.trim();
  const summary = input.summary.trim() || content.slice(0, 120);
  const date = input.date.trim() || new Date().toISOString().slice(0, 10);
  const tags = input.tags.map((tag) => tag.trim()).filter(Boolean);

  if (!title) throw new Error("标题不能为空。");
  if (!content) throw new Error("正文不能为空。");

  await ensureSchema();
  const collection = await postsCollection();
  const base = `${date}-${slugify(title)}`;
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

  const title = input.title.trim();
  const content = input.content.trim();
  const summary = input.summary.trim() || content.slice(0, 120);
  const tags = input.tags.map((tag) => tag.trim()).filter(Boolean);

  if (!title) throw new Error("标题不能为空。");
  if (!content) throw new Error("正文不能为空。");

  await ensureSchema();
  const collection = await postsCollection();
  const now = new Date();

  const result = await collection.updateOne(
    { slug },
    { $set: { title, summary, tags, content, updatedAt: now } },
  );

  if (result.matchedCount === 0) {
    throw new Error("找不到要更新的文章，可能已被删除，或它是内置 Markdown 文章而不在数据库中。");
  }

  const updated = await getDatabasePost(slug);
  if (!updated) {
    throw new Error("更新成功但无法读取最新文章内容。");
  }
  return updated;
}

export async function deleteDatabasePost(slug: string): Promise<void> {
  if (!hasDatabaseConfig()) {
    throw new Error("当前博客没有 MongoDB Atlas 配置，不能从网页删除。请先设置 MONGODB_URI（或 DATABASE_URL）。");
  }

  await ensureSchema();
  const collection = await postsCollection();
  const result = await collection.deleteOne({ slug });

  if (result.deletedCount === 0) {
    throw new Error("找不到要删除的文章，可能已被删除，或它是内置 Markdown 文章而不在数据库中。");
  }
}
