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
