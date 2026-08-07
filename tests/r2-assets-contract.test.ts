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
