# Java 与命令行内容审计基线（2026-07）

本次公开内容审计由 `tests/content-audit.test.ts` 逐篇读取当前 `content/posts` 生成清单；因此新增、改名或删除文章后，覆盖范围会随测试自动更新，而不会留下过期的手工表格。

当前基线包括：

- 全部文件名含 `-java-` 的 Java 连载文章与 Java 全栈环境文（不少于 94 篇）；
- 全部文件名含 `-cli-` 的公开命令行连载文章（不少于 28 篇）。

每篇记录的统一字段为：文章文件名、系列、发布日期（front matter）、风险等级（由危险命令模式推导）、原文结论、官方依据、修复内容、验证方式与完成状态。审计测试将其固定为以下可执行规则：front matter 存在、无内部路径泄露、Markdown 可渲染；命令行文章还必须有“运行前边界、回滚与验证”段落，高风险命令必须带同类安全提示。

## 依据与版本边界

- Java 语言规则以 [Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html) 和 [Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 为准；HotSpot 细节仅在明确标注为实现和版本前提时使用。
- JVM 演进以 [OpenJDK JEP 索引](https://openjdk.org/jeps/0) 为准；Spring、MySQL、Redis 的行为分别以其官方参考文档为准。
- 命令行以对应工具的 `--help`、`man` 页及发行版/项目官方文档为准。示例均需在目标系统、目标版本和最小权限环境中复核，不能当作生产变更指令直接执行。

## 验收命令

```bash
npm test
npm run typecheck
npm run build
```

发布前还应检查 `git status --short`，确保评论组件与漫画资源的既有改动未被本审计覆盖；发布后的主页、`/java`、`/cli`、RSS、sitemap、`llms.txt` 与容器健康检查属于部署环境验证，不能由本地内容审计替代。
