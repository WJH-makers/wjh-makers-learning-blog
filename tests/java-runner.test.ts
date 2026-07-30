import assert from "node:assert/strict";
import { test } from "node:test";
import {
  judge0SubmissionUrl,
  mapJudge0Result,
  parseCompilerDiagnostics,
  readJudge0Result,
  parseJavaRunRequest,
} from "../lib/java-runner.ts";

test("Java runner only accepts the bounded public request shape", () => {
  assert.deepEqual(parseJavaRunRequest({ source: "class Main {}", stdin: "", labId: "java-s01e01" }), {
    source: "class Main {}",
    stdin: "",
    labId: "java-s01e01",
  });
  assert.equal(parseJavaRunRequest({ source: "x".repeat(20_001), stdin: "", labId: "lab" }), undefined);
  assert.equal(parseJavaRunRequest({ source: "class Main {}", stdin: 1, labId: "lab" }), undefined);
});

test("compiler output becomes line and column diagnostics", () => {
  const output = "Main.java:3: error: ';' expected\n    System.out.println(\"x\")\n                           ^\n1 error";
  assert.deepEqual(parseCompilerDiagnostics(output), [{
    severity: "error",
    message: "';' expected",
    line: 3,
    column: 28,
  }]);
});

test("Judge0 results map to a stable browser contract and truncate output", () => {
  const result = mapJudge0Result({
    stdout: "abcdef",
    status: { id: 3, description: "Accepted" },
    time: "0.125",
    memory: 2048,
  }, 4);
  assert.equal(result.status, "success");
  assert.equal(result.timeMs, 125);
  assert.equal(result.memoryKb, 2048);
  assert.equal(result.truncated, true);
  assert.match(result.stdout, /输出已截断/);
});

test("runner endpoint is derived from trusted configuration", () => {
  assert.equal(judge0SubmissionUrl("file:///tmp/runner"), undefined);
  assert.equal(
    judge0SubmissionUrl("https://runner.example.test/api")?.toString(),
    "https://runner.example.test/api/submissions?base64_encoded=false&wait=true",
  );
});

test("runner rejects malformed and oversized upstream responses", async () => {
  await assert.rejects(
    () => readJudge0Result(new Response(JSON.stringify({ status: "Accepted" }))),
    /响应结构无效/,
  );
  await assert.rejects(
    () => readJudge0Result(new Response("x".repeat(65_537))),
    /响应超过/,
  );
});

test("runner reads a bounded valid upstream response", async () => {
  const result = await readJudge0Result(new Response(JSON.stringify({
    stdout: "ok\n",
    stderr: null,
    compile_output: null,
    time: "0.01",
    memory: 1024,
    status: { id: 3, description: "Accepted" },
  })));
  assert.equal(result.status, "success");
  assert.equal(result.stdout, "ok\n");
});
