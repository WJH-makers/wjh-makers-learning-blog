import { test } from "node:test";
import assert from "node:assert/strict";
import { JAVA_LABS, validateJavaLabs } from "../lib/java-labs.ts";
import { validateCourseMirrors } from "../lib/course-mirrors.ts";
import { LEARNING_EVIDENCE_FIELDS } from "../lib/learning-record.ts";

test("first twelve Java labs have a valid, versioned Java 17 contract", () => {
  assert.equal(JAVA_LABS.length, 12);
  assert.deepEqual(validateJavaLabs(), []);
  assert.equal(new Set(JAVA_LABS.map((lab) => lab.contentId)).size, 12);
  for (const lab of JAVA_LABS) {
    assert.equal(lab.environment.javaVersion, 17);
    assert.equal(lab.files[0]?.path, "Main.java");
    assert.ok(lab.environment.excluded.includes("Java 25"));
    assert.ok(lab.reviewAfterDays.length > 0);
  }
});

test("manifest validation rejects a public lab that escapes the one-file Java 17 boundary", () => {
  const invalid = {
    ...JAVA_LABS[0],
    files: [{ path: "Other.java" as "Main.java", content: "class Other {}" }],
    environment: { ...JAVA_LABS[0].environment, javaVersion: 25 as 17 },
  };
  const errors = validateJavaLabs([invalid]);
  assert.ok(errors.some((error) => error.includes("Java 17")));
  assert.ok(errors.some((error) => error.includes("Main.java")));
});

test("bilingual mirrors keep labs, code and knowledge nodes shared", () => {
  const common = { contentId: "java.s01.e01", terminologyVersion: "java-terms-v1", technicalVersion: "java17-v1", labId: "java-s01e01", knowledgePointIds: ["java.main"], codeFingerprint: "sha256:demo" };
  assert.deepEqual(validateCourseMirrors([{ ...common, locale: "zh-CN" }, { ...common, locale: "en" }]), []);
  assert.ok(validateCourseMirrors([{ ...common, locale: "zh-CN" }, { ...common, locale: "en", codeFingerprint: "sha256:changed" }]).some((error) => error.includes("代码块")));
});

test("learning evidence is allow-listed and cannot contain code or identifying telemetry fields", () => {
  const forbidden = ["source", "stdout", "stderr", "console", "path", "email", "name", "ip", "fingerprint"];
  for (const field of forbidden) {
    assert.ok(!LEARNING_EVIDENCE_FIELDS.some((allowed) => allowed.toLowerCase().includes(field)), field);
  }
});
