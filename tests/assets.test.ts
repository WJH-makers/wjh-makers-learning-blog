import assert from "node:assert/strict";
import { test } from "node:test";
import { publicAssetUrl } from "../lib/assets.ts";
import { markdownToHtml } from "../lib/markdown.ts";

const original = process.env.R2_PUBLIC_URL;

function restoreEnv(): void {
  if (original === undefined) delete process.env.R2_PUBLIC_URL;
  else process.env.R2_PUBLIC_URL = original;
}

test.afterEach(restoreEnv);

test("R2 public origin rewrites only site-owned asset paths", () => {
  process.env.R2_PUBLIC_URL = "https://assets.example.com/";

  assert.equal(
    publicAssetUrl("/comics/java/lesson.avif"),
    "https://assets.example.com/comics/java/lesson.avif",
  );
  assert.equal(
    publicAssetUrl("/images/readiness.png"),
    "https://assets.example.com/images/readiness.png",
  );
  assert.equal(publicAssetUrl("/posts/lesson"), "/posts/lesson");
  assert.equal(publicAssetUrl("https://cdn.example.com/a.png"), "https://cdn.example.com/a.png");
});

test("invalid or missing R2 public origin keeps local fallback", () => {
  delete process.env.R2_PUBLIC_URL;
  assert.equal(publicAssetUrl("/comics/java/lesson.webp"), "/comics/java/lesson.webp");

  process.env.R2_PUBLIC_URL = "javascript:alert(1)";
  assert.equal(publicAssetUrl("/images/readiness.png"), "/images/readiness.png");

  process.env.R2_PUBLIC_URL = "https://assets.example.com/?token=should-not-be-a-base";
  assert.equal(publicAssetUrl("/images/readiness.png"), "/images/readiness.png");
});

test("Markdown comic and map images use the R2 origin while preserving variants", async () => {
  process.env.R2_PUBLIC_URL = "https://assets.example.com";
  const html = await markdownToHtml(
    "![comic](/comics/java/s01e01-first-program-speaks.png)\n\n![map](/images/readiness.png)",
  );

  assert.match(html, /https:\/\/assets\.example\.com\/comics\/java\/s01e01-first-program-speaks\.avif/);
  assert.match(html, /https:\/\/assets\.example\.com\/comics\/java\/s01e01-first-program-speaks-512\.webp/);
  assert.match(html, /https:\/\/assets\.example\.com\/images\/readiness\.png/);
});
