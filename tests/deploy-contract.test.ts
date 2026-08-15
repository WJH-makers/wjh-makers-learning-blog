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

  // Cloudflare 对 runner 数据中心 IP 的人机挑战不是部署故障,不能让 CI 假红。
  assert.match(workflow, /challenge-platform/);
  assert.match(workflow, /Production did not reach/);

  // 公网探针只能验存活:commit 只对回环返回,拿它当 SHA 门禁会空转到超时假红。
  assert.match(workflow, /\.healthy \/\/ empty/);
  assert.doesNotMatch(workflow, /jq -r '\.commit \/\/ empty'/);
});

test("the version endpoint only reveals the commit to loopback callers", () => {
  const route = read("app/api/version/route.ts");

  // 公网必须只看到存活状态;commit 泄漏会暴露部署时间线与可检索的源码版本。
  assert.match(route, /APP_GIT_SHA/);
  assert.match(route, /127\.0\.0\.1/);
  assert.match(route, /cf-connecting-ip/);
  assert.match(route, /x-forwarded-for/);

  // 同一 URL 对回环与公网返回不同内容,必须按 Host 分缓存。
  assert.match(route, /Vary/);
  assert.match(route, /no-store/);

  // 构建未注入 SHA 时不能伪造字段,否则校验方会把 `unknown` 当成通过。
  assert.match(route, /\[0-9a-f\]\{40\}/);
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
  // production 是 CI 强推的发布引用；服务器必须显式接受引用回退，
  // 否则第一次 force-push 后 git fetch 会 non-fast-forward 拒绝，timer 永远卡在旧提交。
  assert.match(deploy, /\+refs\/heads\/production:refs\/remotes\/origin\/production/);
  assert.doesNotMatch(deploy, /\n\s+refs\/heads\/production:refs\/remotes\/origin\/production; then/);

  // 同理，对齐工作树也不能用 ff-only：强推后服务器 HEAD 会与发布引用分叉，
  // ff-only 直接 fatal 退出，发布永久卡死。必须精确对齐已测试的发布指针。
  assert.match(deploy, /git reset --hard "\$DEPLOY_REF"/);
  // 只禁真实调用，不禁注释里的字面量（说明为什么不用它，本身是有价值的注释）。
  assert.doesNotMatch(deploy, /^[^#\n]*\bgit\b[^\n]*merge --ff-only/m);

  // 但对齐前必须先确认工作树干净，否则 reset 会吃掉服务器上的人工改动。
  assert.ok(
    deploy.indexOf("Refusing deployment") < deploy.indexOf('git reset --hard "$DEPLOY_REF"'),
    "必须先拒绝脏工作树，再对齐发布引用",
  );
  assert.match(workflow, /for attempt in \$\(seq 1 96\)/);
  assert.match(workflow, /within 16 minutes/);
});
