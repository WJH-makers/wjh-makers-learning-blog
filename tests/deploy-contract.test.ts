import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("tested production ref is verified against the deployed commit", () => {
  const workflow = read(".github/workflows/ci.yml");
  const deploy = read("scripts/deploy-from-origin.sh");
  const compose = read("docker-compose.yml");
  const dockerfile = read("Dockerfile");

  assert.ok(workflow.indexOf("npm test") < workflow.indexOf("refs/heads/production"));
  assert.match(workflow, /api\/version/);
  assert.match(workflow, /EXPECTED_SHA/);
  assert.match(deploy, /APP_GIT_SHA="\$TARGET_COMMIT" docker compose/);
  assert.match(compose, /APP_GIT_SHA: \$\{APP_GIT_SHA:-unknown\}/);
  assert.match(dockerfile, /ARG APP_GIT_SHA/);
  assert.match(dockerfile, /APP_GIT_SHA=\$\{APP_GIT_SHA\}/);
});

test("IndexNow submission is best-effort and only fires after the deploy is accepted", () => {
  const deploy = read("scripts/deploy-from-origin.sh");
  const key = /INDEXNOW_KEY=([0-9a-f]{8,128})/.exec(deploy)?.[1];

  assert.ok(key, "部署脚本必须声明 INDEXNOW_KEY");

  // IndexNow 的校验方式就是取 https://<host>/<key>.txt 比对内容,
  // 所以这个文件必须真的随站点发布出去,且内容与 key 一致 —— 少一个就静默失效。
  const keyFile = path.join(root, "public", `${key}.txt`);
  assert.ok(fs.existsSync(keyFile), `public/${key}.txt 必须存在`);
  assert.equal(fs.readFileSync(keyFile, "utf8").trim(), key);

  // 必须在「容器 commit 校验通过并写入成功状态」之后才推,
  // 否则会把一次失败的部署广播给搜索引擎。
  assert.ok(deploy.indexOf('> "$STATE_FILE"') < deploy.lastIndexOf("submit_indexnow"));

  // 推送失败不能把一次健康的部署判成失败。
  assert.match(deploy, /submit_indexnow[\s\S]{0,120}\|\| echo/);
});

test("the authoritative deploy check runs on the server, not through the public edge", () => {
  const workflow = read(".github/workflows/ci.yml");
  const deploy = read("scripts/deploy-from-origin.sh");

  // 权威验证必须在服务器上直接问容器 —— 它是唯一不受边缘策略影响的来源。
  assert.match(deploy, /127\.0\.0\.1:3001\/api\/version/);
  assert.match(deploy, /Container commit mismatch/);

  // Cloudflare 对 runner 数据中心 IP 的人机挑战不是部署故障,不能让 CI 假红;
  // 但拿到真 JSON 而 commit 不符时仍必须失败,否则这一步就退化成了摆设。
  assert.match(workflow, /challenge-platform/);
  assert.match(workflow, /Production did not reach/);
});

test("successful deploys bound old build cache without touching active images or volumes", () => {
  const deploy = read("scripts/deploy-from-origin.sh");

  assert.match(deploy, /docker buildx prune --force/);
  assert.match(deploy, /--filter "until=\$\{PRUNE_OLDER_THAN\}"/);
  assert.match(deploy, /--max-used-space "\$BUILD_CACHE_LIMIT"/);
  assert.match(deploy, /docker image prune --force/);
  assert.doesNotMatch(deploy, /docker (?:system|volume) prune/);
  assert.doesNotMatch(deploy, /docker image prune[^\n]*--all/);
});

test("production ref fetches cannot hold the deploy lock indefinitely", () => {
  const workflow = read(".github/workflows/ci.yml");
  const deploy = read("scripts/deploy-from-origin.sh");

  assert.match(deploy, /DEPLOY_FETCH_URLS=\(/);
  assert.match(deploy, /https:\/\/github\.com\/WJH-makers\/wjh-makers-learning-blog\.git/);
  assert.match(deploy, /git@github\.com:WJH-makers\/wjh-makers-learning-blog\.git/);
  assert.match(deploy, /timeout --signal=TERM --kill-after=10s "\$FETCH_TIMEOUT"/);
  assert.match(deploy, /FETCH_ATTEMPTS=2/);
  assert.match(deploy, /refs\/heads\/production:refs\/remotes\/origin\/production/);
  assert.match(workflow, /for attempt in \$\(seq 1 96\)/);
  assert.match(workflow, /within 16 minutes/);
});
