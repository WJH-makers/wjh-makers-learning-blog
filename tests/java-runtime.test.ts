import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { JAVA_LABS } from "../lib/java-labs.ts";

type RunResult = { stdout: string; stderr: string };

function run(command: string, args: string[], cwd: string, input = ""): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}: ${stderr}`));
    });
    child.stdin.end(input);
  });
}

test("every public Java lab compiles and starts on the Java 17 baseline", { timeout: 60_000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), "doudou-java17-"));
  try {
    for (const lab of JAVA_LABS) {
      const directory = join(root, lab.id);
      await mkdir(directory);
      await writeFile(join(directory, "Main.java"), lab.files[0]!.content, "utf8");

      // --release 17 prevents the host JDK from accepting newer APIs by accident.
      await run("javac", ["--release", "17", "-encoding", "UTF-8", "Main.java"], directory);
      // stdout.encoding 必须显式钉成 UTF-8。JVM 默认按平台字符集写 stdout：
      // Linux CI 上是 UTF-8 所以一直通过，但中文 Windows 上 native.encoding=GBK，
      // 实验里的中文输出会被写成 GBK 字节、再被 Node 按 UTF-8 读成乱码 ——
      // 表现为「did not produce its primary expected output」这种指向错误的假红。
      // 被测对象是实验代码本身，不该由开发机的控制台字符集决定成败。
      const result = await run("java", ["-Dstdout.encoding=UTF-8", "Main"], directory, lab.stdin);
      const expected = lab.assertions[0]?.expectedOutput;
      if (expected) {
        assert.ok(
          result.stdout.replaceAll("\r\n", "\n").includes(expected),
          `${lab.id} did not produce its primary expected output`,
        );
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
