import assert from "node:assert/strict";
import { test } from "node:test";
import { JAVA_LABS, preflightJava17SingleFile, validateJavaLabs } from "../lib/java-labs.ts";

test("the first Java season has twelve bounded Java 17 labs", () => {
  assert.equal(JAVA_LABS.length, 12);
  assert.deepEqual(validateJavaLabs(), []);
  assert.equal(new Set(JAVA_LABS.map((lab) => lab.id)).size, 12);
});

test("local preflight blocks unsupported source without pretending to compile", () => {
  const packageResult = preflightJava17SingleFile("package demo;\nclass Main {}");
  assert.equal(packageResult.passed, false);
  assert.ok(packageResult.diagnostics.some((item) => item.message.includes("默认包")));

  const valid = preflightJava17SingleFile(
    "public class Main { public static void main(String[] args) { System.out.println(1); } }",
  );
  assert.deepEqual(valid, { passed: true, diagnostics: [] });
});
