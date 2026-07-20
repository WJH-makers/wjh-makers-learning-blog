import { attachDatabasePool } from "@vercel/functions";
import { MongoClient, ServerApiVersion, type Collection, type MongoClientOptions, type WithId } from "mongodb";
import type { Post } from "@/lib/posts";

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
      appName: "wjh-makers-learning-blog.vercel",
      maxPoolSize: 10,
      maxIdleTimeMS: 5000,
      serverSelectionTimeoutMS: 5000,
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    };
    const client = new MongoClient(uri, options);
    attachDatabasePool(client);
    clientPromise = client.connect();
  }

  return clientPromise;
}

async function postsCollection(): Promise<Collection<MongoPostDocument>> {
  const client = await getClient();
  return client.db(databaseName()).collection<MongoPostDocument>(collectionName());
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

function estimateReadingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const cjk = (content.match(/[\u4e00-\u9fff]/g) ?? []).length;
  return Math.max(1, Math.ceil((words + cjk / 2) / 220));
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

export async function getDatabasePosts(): Promise<Post[]> {
  if (!hasDatabaseConfig()) return [];
  await ensureSchema();
  const collection = await postsCollection();
  const docs = await collection
    .find({})
    .sort({ publishedAt: -1, createdAt: -1 })
    .toArray();
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

async function uniqueSlug(base: string): Promise<string> {
  const safeBase = base || "daily-note";
  let slug = safeBase;
  for (let i = 2; i < 1000; i += 1) {
    const existing = await getDatabasePost(slug);
    if (!existing) return slug;
    slug = `${safeBase}-${i}`;
  }
  throw new Error("无法生成唯一 slug，请换一个标题。");
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
  const slug = await uniqueSlug(`${date}-${slugify(title)}`);
  const now = new Date();

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
