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

test("successful deploys bound old build cache without touching active images or volumes", () => {
  const deploy = read("scripts/deploy-from-origin.sh");

  assert.match(deploy, /docker buildx prune --force/);
  assert.match(deploy, /--filter "until=\$\{PRUNE_OLDER_THAN\}"/);
  assert.match(deploy, /--max-used-space "\$BUILD_CACHE_LIMIT"/);
  assert.match(deploy, /docker image prune --force/);
  assert.doesNotMatch(deploy, /docker (?:system|volume) prune/);
  assert.doesNotMatch(deploy, /docker image prune[^\n]*--all/);
});
