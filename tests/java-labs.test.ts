import { test } from "node:test";
import assert from "node:assert/strict";
import { JAVA_LABS, preflightJava17SingleFile, validateJavaLabs } from "../lib/java-labs.ts";
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

test("browser preflight accepts the Java 17 lab entrypoint and explains unsupported boundaries", () => {
  const accepted = preflightJava17SingleFile(JAVA_LABS[0].files[0]!.content);
  assert.equal(accepted.passed, true);

  const rejected = preflightJava17SingleFile("package demo;\nvoid main() { IO.println(\"hi\"); }");
  assert.equal(rejected.passed, false);
  assert.ok(rejected.checks.some((check) => check.id === "package" && !check.passed));
  assert.ok(rejected.checks.some((check) => check.id === "java25" && !check.passed));
});

test("coffee price calculator has normal, zero and invalid-input checks", () => {
  const lab = JAVA_LABS.find((item) => item.id === "java-s01e03");
  assert.ok(lab);
  assert.deepEqual(lab.assertions.map((item) => item.id), ["three-cups", "zero-cups", "negative-input"]);
  assert.ok(lab.files[0]?.content.includes("totalCents"));
  assert.ok(lab.files[0]?.content.includes("IllegalArgumentException"));
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
