import fs from "node:fs";
import path from "node:path";

const postsDir = path.join(process.cwd(), "content", "posts");

function insertBeforeFooter(content, section) {
  const footer = /\n\*本话属于连载.*?\*\s*$/s;
  return footer.test(content)
    ? content.replace(footer, `\n${section}\n\n$&`)
    : `${content.trimEnd()}\n\n${section}\n`;
}

function cliSafetySection(content) {
  const guards = [
    "- **运行前**：示例以 GNU/Linux 的 Bash 为主；先用 `command --help`、`man command` 或发行版文档确认本机版本和参数。不要把教程中的 IP、域名、用户、路径直接复制到生产机器。",
    "- **先确认作用域**：涉及文件、仓库、容器或远端主机时，先运行 `pwd`、`whoami`、`git status`、`docker context show` 或 `ssh -G 主机别名`，确认当前目标；对重要数据先做可恢复备份。",
    "- **完成后验证**：用只读命令确认结果，例如 `ls -la`、`git status`、`systemctl status 服务名`、`docker ps` 或 `curl -fS URL`；失败时停止扩大操作范围，先读报错。",
  ];

  if (/\brm\b|Remove-Item/.test(content)) guards.push("- **删除边界**：`rm`/`Remove-Item` 不会进入回收站。先用 `ls -- 路径` 或 PowerShell 的 `-WhatIf` 预演；避免对变量、通配符或当前目录直接使用递归强制删除。");
  if (/git reset --hard|\bgit rebase\b|git push --force/.test(content)) guards.push("- **Git 回滚边界**：`reset --hard`、rebase 和强推会改写本地或共享历史。先保存 `git status`/`git log --oneline`，共享分支优先 `git revert`；必须强推时使用 `--force-with-lease` 并与协作者确认。");
  if (/kill -9|SIGKILL|Stop-Process/.test(content)) guards.push("- **进程边界**：先核对 PID、命令行和父进程（`ps -fp PID`）；优先 `kill -TERM PID`，仅在进程无法自行退出时才用 `kill -KILL PID`，并检查数据写入和服务健康状态。");
  if (/\bchmod\b|\bsudo\b/.test(content)) guards.push("- **权限边界**：先用 `stat`/`ls -ld` 查所有者和现有权限；按最小权限原则修改，避免 `chmod -R 777`。`sudo` 仅用于明确的单条命令，不在不理解的脚本前盲加。");
  if (/\bssh\b|\bscp\b|\brsync\b/.test(content)) guards.push("- **远端边界**：首次连接核验主机指纹；传输前先确认目标路径和账号，`rsync` 删除模式必须先加 `--dry-run`。远程改网络或防火墙时保留一个已登录会话和云控制台回退路径。");
  if (/\bdocker\b/.test(content)) guards.push("- **容器边界**：先执行 `docker context show`、`docker ps -a` 和 `docker system df`；清理命令只对确认无用的资源执行，带卷的删除额外确认持久化数据和备份。");
  if (/\bufw\b|\bnginx\b/.test(content)) guards.push("- **网络边界**：远程启用防火墙前先放行当前 SSH 入口；修改 Nginx 后先 `nginx -t`，通过后再 reload，并从外部和本机两侧验证端口与 HTTP 状态。");
  if (/\bcron\b|crontab/.test(content)) guards.push("- **定时任务边界**：cron 环境最小且非交互。先用绝对路径、显式环境变量和可写日志路径；手动执行同一命令并检查日志后再安装任务。");

  return `## 运行前边界、回滚与验证\n\n${guards.join("\n")}`;
}

function javaAuditSection() {
  return `## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 \`java --version\`、\`javac --version\` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。`;
}

function isJavaAuditArticle(name) {
  return name.includes("-java-") || name === "2026-07-04-windows-java-fullstack-env.md" || name === "2026-07-26-maven-gradle-cheatsheet.md";
}

function normalizeJavaSeriesPunctuation(content) {
  let fence;
  return content.split("\n").map((line) => {
    const marker = /^\s*(```|~~~)/.exec(line)?.[1];
    if (marker) {
      fence = fence === marker ? undefined : (fence ?? marker);
      return line;
    }
    if (fence) return line;
    return line.replaceAll("，", ",").replaceAll("；", ";").replaceAll("“", "「").replaceAll("”", "」");
  }).join("\n");
}

function normalizeCliQuizOptions(content) {
  return content.replace(
    /(### 选择题\(10 道\)\r?\n)([\s\S]*?)(\r?\n### 解答题\(5 道\))/g,
    (_match, heading, quiz, nextHeading) => `${heading}${quiz.replace(/^\s*-\s+/gm, "   - ")}${nextHeading}`,
  );
}

let changed = 0;
for (const name of fs.readdirSync(postsDir).filter((file) => file.endsWith(".md"))) {
  const file = path.join(postsDir, name);
  let content = fs.readFileSync(file, "utf8");
  const original = content;

  if (isJavaAuditArticle(name)) {
    content = content.replace(/^\*.*?(?:docs\/java-comic-academy\/)?handbook\.md.*?\*\s*$/gim, "*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*");
    if (content.includes("## 运行环境、验证与依据")) {
      content = content.replace(/## 运行环境、验证与依据[\s\S]*?(?=\n\*本话属于连载|$)/, javaAuditSection());
    } else {
      content = insertBeforeFooter(content, javaAuditSection());
    }
  }

  if (/java-s\d\d/.test(name)) {
    content = normalizeJavaSeriesPunctuation(content);
  }

  if (name.includes("-cli-")) {
    content = normalizeCliQuizOptions(content);
    if (!content.includes("## 运行前边界、回滚与验证")) {
      content = insertBeforeFooter(content, cliSafetySection(content));
    }
  }

  if (content !== original) {
    fs.writeFileSync(file, content, "utf8");
    changed += 1;
  }
}

console.log(`Normalized ${changed} public posts.`);
