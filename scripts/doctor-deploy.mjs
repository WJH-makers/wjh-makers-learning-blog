import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient, ServerApiVersion } from "mongodb";

const root = process.cwd();
const envFiles = [".env.local", ".env", ".env.example"];
const requiredKeys = [
  "NEXT_PUBLIC_SITE_URL",
  "MONGODB_DB_NAME",
  "MONGODB_COLLECTION",
  "BLOG_ADMIN_TOKEN",
];

function parseEnvFile(file) {
  if (!existsSync(file)) return {};
  const entries = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    entries[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return entries;
}

function loadLocalEnv() {
  const merged = {};
  for (const file of envFiles.toReversed()) {
    Object.assign(merged, parseEnvFile(resolve(root, file)));
  }
  return { ...merged, ...process.env };
}

function isPlaceholder(value) {
  return !value || /<.*>|你的|set-a-long-random-secret/i.test(value);
}

async function checkMongo(uri, dbName) {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    await client.db(dbName || "learning_blog").command({ ping: 1 });
    return { ok: true, message: "MongoDB ping ok" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message.slice(0, 240) : "Unknown MongoDB error",
    };
  } finally {
    await client.close().catch(() => {});
  }
}

function status(ok) {
  return ok ? "OK " : "ERR";
}

const env = loadLocalEnv();
const projectFile = resolve(root, ".vercel", "project.json");

console.log("Learning Blog deployment doctor");
console.log("================================");
console.log(`${status(existsSync(projectFile))} Vercel project link: ${existsSync(projectFile) ? ".vercel/project.json found" : "not linked yet"}`);
console.log(`${status(existsSync(resolve(root, ".env.local")))} Local env file: ${existsSync(resolve(root, ".env.local")) ? ".env.local found" : "missing .env.local"}`);

for (const key of requiredKeys) {
  const ok = !isPlaceholder(env[key]);
  console.log(`${status(ok)} ${key}: ${ok ? "set" : "missing or placeholder"}`);
}

const databaseUrl = env.MONGODB_URI || env.DATABASE_URL;
const hasDatabaseUrl = !isPlaceholder(databaseUrl);
console.log(`${status(hasDatabaseUrl)} MONGODB_URI or DATABASE_URL: ${hasDatabaseUrl ? "set" : "missing or placeholder"}`);

if (hasDatabaseUrl) {
  const result = await checkMongo(databaseUrl, env.MONGODB_DB_NAME);
  console.log(`${status(result.ok)} MongoDB Atlas: ${result.message}`);
} else {
  console.log("ERR MongoDB Atlas: skip ping because database URL is missing or placeholder");
}

console.log("");
console.log("When all items are OK, /write can publish daily notes on Vercel.");
