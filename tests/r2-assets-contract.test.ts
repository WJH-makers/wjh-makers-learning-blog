import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

test("R2 public asset delivery is documented and build-configured", () => {
  const example = read(".env.example");
  const compose = read("docker-compose.yml");
  const dockerfile = read("Dockerfile");
  const next = read("next.config.ts");

  for (const key of ["R2_PUBLIC_URL", "R2_ENDPOINT", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]) {
    assert.match(example, new RegExp(`^${key}=`, "m"), `${key} missing from .env.example`);
  }
  assert.match(compose, /R2_PUBLIC_URL: \$\{R2_PUBLIC_URL:-\}/);
  for (const key of ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_API_TOKEN"]) {
    assert.match(compose, new RegExp(`${key}: ""`), `${key} must not enter the web container`);
  }
  assert.match(dockerfile, /ARG R2_PUBLIC_URL/);
  assert.match(dockerfile, /rm -rf \/app\/public\/comics \/app\/public\/images/);
  assert.match(next, /source: "\/images\/:path\*"/);
});

test("R2 sync is upload/check-only and sets immutable image metadata", () => {
  const sync = read("ops/sync-r2-assets.py");

  assert.match(sync, /CACHE_CONTROL = "public, max-age=31536000, immutable"/);
  assert.match(sync, /"Content-Type"|content_type\(/);
  assert.match(sync, /--check/);
  assert.match(sync, /--force/);
  assert.doesNotMatch(sync, /delete_object|delete_objects|DELETE/);
});

// 2026-08-20:cafe/career/cli 三个系列封面的 12 个变体从未上传到 R2,3 个系列首页
// 与约 85 篇文章的正文顶部长期破图;另有 13 个重新生成过的漫画在边缘停留旧字节。
// 两个根因各对应下面一条断言 —— 同步不在部署链里(没人会记得手工跑),
// 以及 --check 只判 HTTP 200(存在 ≠ 内容还是对的)。
test("资产同步在部署链里,不是需要人记得的手工步骤", () => {
  const deploy = read("scripts/deploy-from-origin.sh");

  assert.match(deploy, /sync_r2_assets\(\)/, "部署脚本必须定义 R2 同步函数");
  // 定义之外还必须真的被调用:只定义不调用是这次故障的等价形态。
  const calls = [...deploy.matchAll(/^\s*sync_r2_assets\s*$/gm)];
  assert.ok(calls.length >= 1, "sync_r2_assets 必须在主流程里被调用");
  // 必须在容器启动之前 —— 镜像里没有图片副本,晚于 compose 就等于先上线破图。
  const syncAt = deploy.search(/^\s*sync_r2_assets\s*$/m);
  const composeAt = deploy.indexOf("docker compose up");
  assert.ok(syncAt > 0 && composeAt > 0, "同步调用与 compose 启动都应存在");
  assert.ok(syncAt < composeAt, "资产同步必须早于容器启动");
});

test("--check 能发现内容过期,而不只是对象不存在", () => {
  const sync = read("ops/sync-r2-assets.py");

  // HEAD 必须能取回 Content-Length,否则无法判断远端字节是否仍与本地一致。
  assert.match(sync, /want_length/, "HEAD 请求必须能返回 Content-Length");
  assert.match(sync, /stale/, "--check 必须能报出 stale 状态");
  // 跳过逻辑必须带尺寸条件:size-blind 的 skip 正是旧字节留在边缘的原因。
  assert.match(
    sync,
    /existing == 200 and \(remote_size < 0 or remote_size == local_size\)/,
    "跳过已存在对象时必须同时校验字节数",
  );
});
