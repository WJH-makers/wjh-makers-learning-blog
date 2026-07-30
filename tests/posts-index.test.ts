import assert from "node:assert/strict";
import { test } from "node:test";
import { mergePublishedPostIndex, type PostIndexEntry } from "../lib/post-index.ts";

function entry(slug: string, date: string, summary = slug): PostIndexEntry {
  return { slug, title: slug, date, summary, tags: ["Java"] };
}

test("published post index stays content-free, sorted and database-overridable", () => {
  const markdown = [entry("older", "2020-01-01"), entry("same", "2020-01-02", "markdown")];
  const database = [entry("newer", "2020-01-03"), entry("same", "2020-01-02", "database")];
  const merged = mergePublishedPostIndex(markdown, database);

  assert.deepEqual(merged.map((post) => post.slug), ["newer", "same", "older"]);
  assert.equal(merged.find((post) => post.slug === "same")?.summary, "database");
  assert.ok(merged.every((post) => !("content" in post)));
});
