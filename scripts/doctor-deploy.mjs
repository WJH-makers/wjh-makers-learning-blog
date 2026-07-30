import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient, ServerApiVersion } from "mongodb";

const root = process.cwd();
const envFiles = [".env.local", ".env", ".env.example"];
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
const failures = [];
const deploymentFiles = [
  ".github/workflows/ci.yml",
  "Dockerfile",
  "docker-compose.yml",
  "scripts/deploy-from-origin.sh",
  "ops/txcloud-blog-pull.service",
  "ops/txcloud-blog-pull.timer",
];

console.log("Coffee Station deployment doctor");
console.log("================================");
const missingDeploymentFiles = deploymentFiles.filter((file) => !existsSync(resolve(root, file)));
console.log(`${status(missingDeploymentFiles.length === 0)} Pull deployment files: ${missingDeploymentFiles.length === 0 ? "complete" : `missing ${missingDeploymentFiles.join(", ")}`}`);
if (missingDeploymentFiles.length > 0) failures.push("pull deployment files");

const hasLocalEnv = existsSync(resolve(root, ".env.local")) || existsSync(resolve(root, ".env"));
console.log(`${status(hasLocalEnv)} Local env file: ${hasLocalEnv ? "found" : "missing"}`);
if (!hasLocalEnv) failures.push("local env file");

const hasSiteUrl = !isPlaceholder(env.NEXT_PUBLIC_SITE_URL);
console.log(`${status(hasSiteUrl)} NEXT_PUBLIC_SITE_URL: ${hasSiteUrl ? "set" : "missing or placeholder"}`);
if (!hasSiteUrl) failures.push("NEXT_PUBLIC_SITE_URL");

const databaseUrl = env.MONGODB_URI || env.DATABASE_URL;
const hasDatabaseUrl = !isPlaceholder(databaseUrl);
const hasAdminToken = !isPlaceholder(env.BLOG_ADMIN_TOKEN);

if (hasDatabaseUrl !== hasAdminToken) {
  console.log("ERR Publishing configuration: MONGODB_URI/DATABASE_URL and BLOG_ADMIN_TOKEN must be configured together");
  failures.push("publishing configuration");
} else if (!hasDatabaseUrl) {
  console.log("WARN Publishing configuration: disabled; public Markdown content remains available");
} else {
  console.log("OK  Publishing configuration: MongoDB and admin token set");
  const result = await checkMongo(databaseUrl, env.MONGODB_DB_NAME);
  console.log(`${status(result.ok)} MongoDB Atlas: ${result.message}`);
  if (!result.ok) failures.push("MongoDB Atlas");
}

const hasRunnerUrl = !isPlaceholder(env.JAVA_JUDGE0_URL);
const hasRunnerLanguage = !isPlaceholder(env.JAVA_JUDGE0_LANGUAGE_ID);
if (hasRunnerUrl !== hasRunnerLanguage) {
  console.log("ERR Java Playground: JAVA_JUDGE0_URL and JAVA_JUDGE0_LANGUAGE_ID must be configured together");
  failures.push("Java Playground configuration");
} else {
  console.log(`${hasRunnerUrl ? "OK " : "WARN"} Java Playground: ${hasRunnerUrl ? "runner configured" : "safe execution disabled"}`);
}

const hasCloudflareToken = !isPlaceholder(env.CLOUDFLARE_TOKEN);
const hasCloudflareZone = !isPlaceholder(env.CLOUDFLARE_ZONE_ID);
if (hasCloudflareToken !== hasCloudflareZone) {
  console.log("ERR Cloudflare purge: CLOUDFLARE_TOKEN and CLOUDFLARE_ZONE_ID must be configured together");
  failures.push("Cloudflare purge configuration");
} else {
  console.log(`${hasCloudflareToken ? "OK " : "WARN"} Cloudflare purge: ${hasCloudflareToken ? "configured" : "not configured locally"}`);
}

console.log("");
if (failures.length > 0) {
  console.log(`Deployment doctor found ${failures.length} blocking issue(s): ${failures.join(", ")}.`);
  process.exitCode = 1;
} else {
  console.log("Local deployment contract is ready. Production still requires the systemd timer and container health checks documented in docs/txcloud-pull-deploy.md.");
}
