import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeMongoUri, resolveMongoUri } from "../lib/database-config.ts";

test("示例 MongoDB URI 不会被误判为可连接配置", () => {
  assert.equal(normalizeMongoUri("mongodb+srv://<user>:<password>@<cluster-host>/learning_blog"), "");
  assert.equal(normalizeMongoUri("postgresql://localhost/blog"), "");
  assert.equal(normalizeMongoUri("  "), "");
});

test("有效 MongoDB URI 保持原值，并允许回退到 DATABASE_URL", () => {
  const atlas = "mongodb+srv://user:secret@cluster.example.net/learning_blog";
  const local = "mongodb://127.0.0.1:27017/learning_blog";

  assert.equal(normalizeMongoUri(atlas), atlas);
  assert.equal(resolveMongoUri("mongodb://<host>/db", local), local);
});
