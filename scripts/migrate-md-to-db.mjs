// 把 content/posts/*.md 导入 MongoDB 的 learning_posts。
// 默认:DB 为准 —— 已存在的 slug 跳过(保护写作台改过的版本);
//       只导入 DB 里还没有的 md(初始种子)。
// 加 --force:用 md 覆盖 DB 里的同名文章。
// 用法:node scripts/migrate-md-to-db.mjs [--force]
// 需要能连 Atlas 的网络 + .env 里的 MONGODB_URI。

import { MongoClient } from "mongodb";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// 独立脚本不会自动加载 Next 的 .env,手动读一次(不覆盖已注入的环境变量)。
function loadEnv() {
  const p = join(ROOT, ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const URI = process.env.MONGODB_URI || process.env.DATABASE_URL;
const DB = process.env.MONGODB_DB_NAME || "learning_blog";
const COL = process.env.MONGODB_COLLECTION || "learning_posts";
const FORCE = process.argv.includes("--force");

function parseFrontMatter(raw) {
  if (!raw.startsWith("---")) return { data: {}, content: raw.trim() };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, content: raw.trim() };
  const fm = raw.slice(3, end).trim();
  const content = raw.slice(end + 4).trim();
  const data = {};
  for (const line of fm.split(/\r?\n/)) {
    const at = line.indexOf(":");
    if (at === -1) continue;
    const k = line.slice(0, at).trim();
    const v = line.slice(at + 1).trim().replace(/^["']|["']$/g, "");
    data[k] = v;
  }
  return { data, content };
}

function parseTags(v) {
  if (!v) return [];
  return v
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((t) => t.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

async function main() {
  if (!URI) {
    console.error("✗ 缺少 MONGODB_URI(或 DATABASE_URL);检查 .env 或环境变量。");
    process.exit(1);
  }
  const dir = join(ROOT, "content", "posts");
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")) : [];
  if (files.length === 0) {
    console.log("没有找到 content/posts/*.md,无事可做。");
    return;
  }

  const client = new MongoClient(URI, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const col = client.db(DB).collection(COL);
  await col.createIndex({ slug: 1 }, { unique: true, name: "uq_learning_posts_slug" });

  let ins = 0;
  let upd = 0;
  let skip = 0;

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const raw = readFileSync(join(dir, file), "utf8");
    const { data, content } = parseFrontMatter(raw);
    const exists = await col.findOne({ slug }, { projection: { _id: 1 } });

    if (exists && !FORCE) {
      skip++;
      console.log(`  skip  ${slug}(DB 已存在,未加 --force)`);
      continue;
    }

    const now = new Date();
    await col.updateOne(
      { slug },
      {
        $set: {
          slug,
          title: data.title || slug,
          summary: data.summary || content.slice(0, 120),
          tags: parseTags(data.tags),
          content,
          publishedAt: data.date || new Date().toISOString().slice(0, 10),
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    if (exists) {
      upd++;
      console.log(`  force ${slug}(已覆盖)`);
    } else {
      ins++;
      console.log(`  add   ${slug}`);
    }
  }

  console.log(`\n✓ 完成 ${DB}.${COL}:新增 ${ins},覆盖 ${upd},跳过 ${skip}(共扫描 ${files.length} 个 md)。`);
  await client.close();
}

main().catch((e) => {
  console.error("✗ 迁移失败:", e.message);
  process.exit(1);
});
