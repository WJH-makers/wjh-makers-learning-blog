import assert from "node:assert/strict";
import { test } from "node:test";
import { JAVA_LABS, findJavaLab, preflightJava17SingleFile, validateJavaLabs } from "../lib/java-labs.ts";
import { validateCourseMirrors } from "../lib/course-mirrors.ts";
import { LEARNING_EVIDENCE_FIELDS } from "../lib/learning-record.ts";

test("the first Java season has twelve bounded Java 17 labs", () => {
  assert.equal(JAVA_LABS.length, 12);
  assert.deepEqual(validateJavaLabs(), []);
  assert.equal(new Set(JAVA_LABS.map((lab) => lab.id)).size, 12);
});

test("Java labs resolve by both article slug and public lab id", () => {
  const first = JAVA_LABS[0];
  assert.ok(first);
  assert.equal(findJavaLab(first.slug), first);
  assert.equal(findJavaLab(first.id), first);
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

test("bilingual mirrors keep labs, code and knowledge nodes shared", () => {
  const common = {
    contentId: "java.s01.e01",
    terminologyVersion: "java-terms-v1",
    technicalVersion: "java17-v1",
    labId: "java-s01e01",
    knowledgePointIds: ["java.main"],
    codeFingerprint: "sha256:demo",
  };
  assert.deepEqual(validateCourseMirrors([{ ...common, locale: "zh-CN" }, { ...common, locale: "en" }]), []);
  assert.ok(validateCourseMirrors([
    { ...common, locale: "zh-CN" },
    { ...common, locale: "en", codeFingerprint: "sha256:changed" },
  ]).some((error) => error.includes("代码块")));
});

test("learning evidence excludes source code and identifying telemetry", () => {
  const forbidden = ["source", "stdout", "stderr", "console", "path", "email", "name", "ip", "fingerprint"];
  for (const field of forbidden) {
    assert.ok(!LEARNING_EVIDENCE_FIELDS.some((allowed) => allowed.toLowerCase().includes(field)), field);
  }
});
