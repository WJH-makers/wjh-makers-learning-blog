import assert from "node:assert/strict";
import { test } from "node:test";
import { blogSessionToken } from "../lib/blog-auth-token.ts";

test("blog session is deterministic but does not contain the raw secret", () => {
  const secret = "a-long-admin-secret-that-is-not-a-cookie";
  const token = blogSessionToken(secret);

  assert.match(token, /^v2\.[A-Za-z0-9_-]{43}$/);
  assert.equal(token, blogSessionToken(secret));
  assert.ok(!token.includes(secret));
  assert.notEqual(token, blogSessionToken(`${secret}-rotated`));
});
