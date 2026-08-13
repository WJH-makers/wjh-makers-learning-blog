---
title: "Maven 与 Gradle 速查 · Java 构建全周期"
date: 2026-07-26
summary: "覆盖 Maven 3.9+ 与 Gradle 9.x 在 Java 25 项目里的全生命周期命令：从建项目、依赖冲突排查、编译测试打包，到多模块、版本发布与构建提速。同一件事两边命令并列对照，版本敏感处均已标注。"
tags: [命令速查, Java, Maven, Gradle]
---

# Maven 与 Gradle 速查 · Java 构建全周期

![Maven 与 Gradle 漫画：从依赖图到可复现构建](/comics/java/maven-gradle-build-pipeline.png)

> 基线：Java 25 LTS · Maven 3.9+ · Gradle 9.x。按「从建项目到发布清理」的完整生命周期分节，同一件事两边命令并列；命令、参数、路径保留原文。

## 快速导航

| 阶段 | 一句话 |
|------|--------|
| 一、选型与心智模型 | Maven 是固定生命周期，Gradle 是任务有向图 |
| 二、创建项目 | 脚手架生成 + 为什么必须用 wrapper |
| 三、依赖管理与冲突排查 | 全篇最高频：谁把这个版本带进来了 |
| 四、编译与资源 | 只编译、设 release 25、处理资源 |
| 五、测试 | 跑指定用例、skip 的两种含义 |
| 六、打包 | 普通 jar / fat jar / 可执行 jar / OCI 镜像 |
| 七、运行与调试 | 起 main、远程调试到底调的是谁 |
| 八、多模块 | 只构建一个模块 + 它的上下游 |
| 九、版本与发布 | 改版本号、发本地/远程仓库 |
| 十、构建提速 | 并行、缓存、守护进程 |
| 十一、排障 | 拉不下来、改了不生效、构建卡住 |

## 一、选型与心智模型（生命周期 vs 任务图）

心智模型一句话：**Maven 脑子里想「我处在生命周期的哪一步」；Gradle 脑子里想「我要哪个产物，倒推需要跑哪些 task」。** 这是两套工具一切命令差异的根。

| 维度 | Maven | Gradle |
|------|-------|--------|
| 核心模型 | 固定**生命周期**（phase 绑定 goal） | **任务有向无环图**（DAG，task 声明依赖） |
| 执行语义 | 跑某 phase = 跑它**之前所有** phase | 只跑目标 task 及其依赖 task |
| 主生命周期 | `validate→compile→test→package→verify→install→deploy` | 无固定序，`build`=`assemble`+`check` |
| 配置载体 | `pom.xml`（声明式 XML） | `build.gradle(.kts)`（Groovy/Kotlin DSL，可编程） |
| 增量/缓存 | 弱（仅依赖缓存） | 强（增量构建 + 构建缓存 + 配置缓存） |
| 取舍 | 可预测、约定强、样板多 | 灵活、快、学习曲线陡、易写出玄学脚本 |

## 二、创建项目

| 目标 | Maven | Gradle | 备注 / 坑 |
|------|-------|--------|-----------|
| 交互式脚手架 | `mvn archetype:generate` | `gradle init` | Gradle init 会问项目类型/DSL/测试框架 |
| 非交互建库 | `mvn archetype:generate -DgroupId=com.x -DartifactId=demo -DarchetypeArtifactId=maven-archetype-quickstart -DinteractiveMode=false` | `gradle init --type java-library --dsl kotlin` | 脚本化建项目必用非交互 |
| 生成 wrapper | `mvn wrapper:wrapper -Dmaven=3.9.9` | `gradle wrapper --gradle-version 9.0` | 见下方「为什么必须用 wrapper」 |
| Spring Boot 起项目 | 用 [start.spring.io](https://start.spring.io) 或 `spring init` | 同左 | Spring Boot CLI 的 `spring init` 两边都能生成 |

> **为什么必须用 wrapper（本篇重点）**：`./mvnw` / `./gradlew`（Windows 上 `mvnw.cmd` / `gradlew.bat`）把**构建工具自身的版本**钉进仓库。任何人 clone 下来**无需预装** Maven/Gradle，脚本按 wrapper 记录的版本自动下载对应发行版 → 本机与 CI 用的工具版本**完全一致**，从根上消灭「我这能跑你那不行」。规矩：wrapper 全部文件**提交进 VCS**；日常一律敲 `./gradlew` / `./mvnw`，不用全局 `gradle` / `mvn`（全局版本因人而异，正是不可复现的源头）。

## 三、依赖管理与冲突排查

> 全篇最高频。90% 的「编译通过但运行期报错」都是传递依赖版本冲突，核心动作只有一个：**先定位是谁把这个版本带进来的**。

| 目标 | Maven | Gradle | 备注 / 坑 |
|------|-------|--------|-----------|
| 看完整依赖树 | `mvn dependency:tree` | `gradle dependencies` | Gradle 按 configuration 分组，树更大；先锁定 configuration |
| **只看某依赖来路（第一命令）** | `mvn dependency:tree -Dincludes=g:a` | `gradle dependencyInsight --dependency a --configuration runtimeClasspath` | 排冲突从这条开始；`-Dincludes` 支持 `g:a`、`:a`、`org.slf4j:*` 通配 |
| 看被省略/冲突的版本 | `mvn dependency:tree -Dverbose` | dependencyInsight 输出自带 reason | `-Dverbose` 在 dependency-plugin **3.2+ 才修复**，会标 `omitted for conflict` |
| 锁定单模块单配置 | `mvn dependency:tree -pl :app` | `gradle :app:dependencies --configuration runtimeClasspath` | Gradle 不指定 configuration 会打印全部，噪音大 |
| 声明了没用 / 用了没声明 | `mvn dependency:analyze` | 无直接对应（看 `--scan`） | Maven 独有利器，清理无用依赖靠它 |
| 排除某条传递依赖 | pom 里 `<exclusions>` | `exclude(group="", module="")` | 排冲突的收口手段 |
| 统一/强制版本 | `<dependencyManagement>` | `constraints { }` 或 `resolutionStrategy.force` | 只声明版本、不引入依赖 |
| 导入 BOM | 依赖块加 `<scope>import</scope>` | `implementation(platform("g:a:v"))` | Spring/JUnit 全家桶版本对齐靠它 |
| **默认冲突解决策略** | **最近者胜**（nearest-wins，路径最短） | **最高版本胜**（highest-wins） | ⚠ 策略相反，**同一堆依赖两边可能解析出不同版本** |
| 预取到本地（离线备料） | `mvn dependency:go-offline` | `gradle build --offline`（须先联网缓存过） | Docker 构建分层缓存常用 |
| 清损坏缓存 | `mvn dependency:purge-local-repository` | `gradle --refresh-dependencies` | 下载中断导致 jar 损坏时用 |

**Maven scope ↔ Gradle configuration 对照**（写依赖前先选对「作用域」）：

| 语义 | Maven scope | Gradle configuration |
|------|-------------|----------------------|
| 编译+运行都需要，且传递给下游 | `compile`（默认） | `api` |
| 编译+运行需要，但不传递 | —（Maven 无此粒度） | `implementation` |
| 仅编译期（如 Lombok、注解） | `provided` | `compileOnly` |
| 仅运行期（如 JDBC 驱动） | `runtime` | `runtimeOnly` |
| 仅测试 | `test` | `testImplementation` |
| 注解处理器 | 配 compiler-plugin | `annotationProcessor` |

**读树 / 定位冲突示例**（`-Dverbose` 会标出被冲突省略的版本，这是排错关键）：

```bash
# Maven：只看 guava，并暴露被规则压掉的版本
mvn dependency:tree -Dverbose -Dincludes=com.google.guava:guava
#   \- c:d:2.0 -> guava:33.0.0-jre (omitted for conflict with 32.0.0-jre)
#   → d 想要 33，却被“最近者胜”压成 32

# Gradle：为什么最终选它、谁在请求它（反向列出所有请求方）
gradle dependencyInsight --dependency guava --configuration runtimeClasspath
```

收口统一版本：Maven 用 `<dependencyManagement>` 声明版本、子模块引用时不写 `<version>`；Gradle 用 `constraints { implementation("g:a:v") }` 或 `resolutionStrategy.force("g:a:v")`。

## 四、编译与资源

| 目标 | Maven | Gradle | 备注 / 坑 |
|------|-------|--------|-----------|
| 只编译主代码 | `mvn compile` | `gradle compileJava` | Maven 会连跑前置 phase，Gradle 只跑该 task |
| 编译+处理资源 | `mvn compile`（含 resources） | `gradle classes` | `classes` = compileJava + processResources |
| 指定 Java 版本 | `<release>25</release>`（compiler-plugin 或属性 `maven.compiler.release`） | `java { toolchain { languageVersion = JavaLanguageVersion.of(25) } }` | ⚠ 优先用 `release`/toolchain，别用旧的 `source`/`target`——它挡不住误用新 API |
| 只处理资源 | `mvn resources:resources` | `gradle processResources` | 资源过滤/占位符替换在这一步 |
| 清理产物 | `mvn clean` | `gradle clean` | 清 `target/` / `build/` |

> **release vs source/target**：`--release 25` 是交叉编译，确保只用 JDK 25 及以下 API；`source/target` 用当前 JDK 类库，可能悄悄用上更高 API 而运行期炸。Gradle 的 **toolchain** 更进一步：本机用别的 JDK 跑 Gradle 也会自动定位/下载 JDK 25 来编译。

## 五、测试

| 目标 | Maven | Gradle | 备注 / 坑 |
|------|-------|--------|-----------|
| 跑单元测试 | `mvn test`（surefire） | `gradle test` | Gradle 的 test 结果会 up-to-date 缓存，见下 |
| 跑集成测试 | `mvn verify`（failsafe） | `gradle integrationTest`（需自建 task） | Maven 用 `*IT` 命名走 failsafe |
| 跑指定类/方法 | `mvn -Dtest=UserServiceTest#login test` | `gradle test --tests "*.UserServiceTest.login"` | Gradle 用通配更灵活 |
| 跳过测试（仍编译） | `mvn -DskipTests package` | `gradle build -x test` | `-x` = exclude task |
| 跳过测试（连编译都跳） | `mvn -Dmaven.test.skip=true package` | 无直接等价（`-x test -x compileTestJava`） | ⚠ 两者不同！CI 里手滑用错会漏跑测试 |
| 强制重跑（不吃缓存） | `mvn clean test` | `gradle test --rerun-tasks` | ⚠ Gradle 认为「输入没变」就跳过，改了外部数据要 `--rerun-tasks` |
| 看测试报告 | `target/surefire-reports/` | `build/reports/tests/test/index.html` | 失败先看这里的 html/txt |

## 六、打包（jar / fat jar / 分层镜像）

| 目标 | Maven | Gradle | 备注 / 坑 |
|------|-------|--------|-----------|
| 普通 jar | `mvn package`（jar-plugin） | `gradle jar` | ⚠ **不含依赖**，`java -jar` 直接跑会 `NoClassDefFound` |
| fat / uber jar | `mvn package` + `maven-shade-plugin` | `gradle shadowJar` | Shadow 需 `com.gradleup.shadow` 插件（旧坐标 `com.github.johnrengelman.shadow` 已停更）；shade/shadow 均可 `relocate` 包名解决同名依赖冲突 |
| Spring Boot 可执行 jar | `mvn package` + `spring-boot:repackage` | `gradle bootJar` | 内嵌启动器，分层结构，`java -jar` 直接跑 |
| 构建 OCI 镜像（免 Dockerfile） | `mvn spring-boot:build-image` | `gradle bootBuildImage` | 用 Buildpacks/Paketo，⚠ 需本机有 Docker daemon |
| 分层 jar 解包（优化镜像缓存） | `java -Djarmode=layertools -jar app.jar extract` | 同左（对 bootJar 产物） | ⚠ 版本差异：Spring Boot 3.3+ 改用 `-Djarmode=tools extract --layers`，`layertools` 已弃用 |

> 打完包跑不起来，先查 **Main-Class 有没有进 manifest**：普通 `jar`/`shadowJar` 要显式配主类，Spring Boot 的 `bootJar`/`repackage` 会自动写。

## 七、运行与调试

| 目标 | Maven | Gradle | 备注 / 坑 |
|------|-------|--------|-----------|
| 跑 main 方法 | `mvn exec:java -Dexec.mainClass=com.x.Main` | `gradle run`（application 插件） | Gradle 需 apply `application` 并设 `mainClass` |
| 跑 Spring Boot | `mvn spring-boot:run` | `gradle bootRun` | 开发期热启动；传 JVM 参数用 `-Dspring-boot.run.jvmArguments="..."` / `bootRun { jvmArgs(...) }` |
| 远程调试**被运行/测试的**进程 | `mvnDebug`（监听 8000，调 forked 进程/插件） | `gradle bootRun --debug-jvm`（挂起等调试器，5005） | 这是最常被搞混的：调的是**你的应用** |
| 调试**构建工具本身** | `mvnDebug` 调 Maven 进程 | `-Dorg.gradle.debug=true`（调 Gradle **daemon**） | ⚠ `--debug-jvm` 调应用，`org.gradle.debug` 调 Gradle，别用反 |
| 出错看堆栈/详情 | `-e`（简短栈）、`-X`（全 debug 日志） | `-s`（栈）、`-i`（info）、`-d`（全 debug） | 排障第一步就加这些 |

## 八、多模块

| 目标 | Maven | Gradle | 备注 / 坑 |
|------|-------|--------|-----------|
| 声明子模块 | 父 pom `<packaging>pom</packaging>` + `<modules>` | `settings.gradle(.kts)` 里 `include("app")` | Gradle 的 `settings` 文件是模块清单的唯一真相 |
| 构建全部模块 | `mvn install`（reactor 排序） | `gradle build` | Maven 按依赖自动排 reactor 顺序 |
| 只构建某模块 + 其依赖 | `mvn -pl :app -am` | `gradle :app:build` | `-am` = also make（带上游依赖），Gradle 天然带 |
| 构建某模块 + 依赖它的下游 | `mvn -pl :core -amd` | 改下游 task 自然触发 | `-amd` = also make dependents |
| 失败后断点续构 | `mvn -rf :app`（resume from） | 增量/缓存天然续，重跑即可 | 大工程排错省时间 |
| 跨仓库聚合 | 需聚合父 pom | `includeBuild("../lib")`（composite build） | ⚠ 跨仓库开发调试是 Gradle 强项，Maven 较弱 |

## 九、版本与发布

| 目标 | Maven | Gradle | 备注 / 坑 |
|------|-------|--------|-----------|
| 改版本号 | `mvn versions:set -DnewVersion=2.0.0` | 改 `gradle.properties` 的 `version` | Gradle 无内置改版命令，手改或用插件 |
| 查可升级的依赖 | `mvn versions:display-dependency-updates` | `gradle dependencyUpdates`（需 ben-manes 插件） | 定期体检依赖 |
| 发到本地仓库 | `mvn install` | `gradle publishToMavenLocal` | 供本机其他项目引用 `~/.m2` |
| 发到远程仓库 | `mvn deploy` | `gradle publish`（maven-publish 插件） | ⚠ 凭据放 `settings.xml` / `gradle.properties`（用户级），**绝不进 VCS** |
| 正式 release 流程 | `mvn release:prepare` + `release:perform` | 手动打 tag + `publish` | Maven release 插件会打 tag、去掉 `-SNAPSHOT`、递增下一版；制品签名用 `maven-gpg-plugin` / `signing` 插件 |

> ⚠ **SNAPSHOT 坑**：带 `-SNAPSHOT` 的版本无法 deploy 到 release 仓库，发正式版前先 `versions:set` 去掉。

## 十、构建提速（并行 · 缓存 · 守护进程）

| 手段 | Maven | Gradle | 备注 / 坑 |
|------|-------|--------|-----------|
| 并行构建 | `mvn -T 1C`（每核 1 线程）或 `-T 4` | `--parallel` 或 `org.gradle.parallel=true` | 多模块提速最直接 |
| 守护进程 | 用 `mvnd`（Maven Daemon，独立分发） | Gradle daemon **默认开启** | ⚠ 原生 `mvn` 每次冷启 JVM，`mvnd` 才补上常驻 |
| 任务级构建缓存 | ~/.m2 仅缓存**依赖**，无任务缓存 | `--build-cache` / `org.gradle.caching=true` | ⚠ Gradle 可跨机共享远程缓存，这是它最大提速优势 |
| 配置缓存 | 无 | `--configuration-cache`（Gradle 9 已稳定） | 跳过配置阶段，冷构建显著提速 |
| 跳测试提速 | `-DskipTests`（编译不跑）/ `-Dmaven.test.skip`（连编译都跳） | `-x test` | 见第五节，两个 Maven 参数含义不同 |
| 离线构建 / 构建剖析 | `mvn -o` / `mvn -X` 粗看耗时 | `gradle --offline` / `--profile` / `--scan` | `--scan` 生成在线报告，看每个 task 耗时 |

> 提速优先级：**统一 wrapper → Gradle 开 build-cache + configuration-cache / Maven 上 `-T` 或换 mvnd → 最后才考虑跳测试**。跳测试是拿正确性换速度，别当常规手段。

## 十一、排障

| 症状场景 | Maven | Gradle | 备注 / 坑 |
|----------|-------|--------|-----------|
| 依赖拉不下来/损坏 | `mvn -U`（强刷 SNAPSHOT）、`dependency:purge-local-repository` | `gradle --refresh-dependencies` | 实在不行删 `~/.m2` 或 `~/.gradle/caches` 对应目录重下 |
| 看真实生效的配置 | `mvn help:effective-pom` / `help:effective-settings` | `gradle properties` / `--scan` | 「继承的父 pom 到底给了啥」看这个 |
| 改了代码不生效 | `mvn clean` 再构建 | `gradle --rerun-tasks` 或 `clean` | ⚠ Gradle up-to-date 误判是高频坑 |
| daemon 状态异常/内存泄漏 | `mvnd --status`（mvnd 场景） | `gradle --status` / `gradle --stop` | Gradle daemon 抽风先 `--stop` 全杀 |
| 报错信息太少 | `-e`（栈）/ `-X`（全 debug） | `-s`（栈）/ `-i`（info）/ `-d`（全 debug） | 提 issue/求助前先加上；多模块加 `mvn -fae` / `gradle --continue` 跑完看全 |
| 跑不动新 JDK | 升 Maven 3.9+ | 升 Gradle 9.x，或用 **toolchain** 隔离 | ⚠ `Unsupported class file major version` = 构建工具太老 |

## 常见错误速判

| 症状 | 多半是 | 先试这条 |
|------|--------|----------|
| 运行期 `NoSuchMethodError` / `NoClassDefFoundError`（编译却通过） | 传递依赖版本冲突（编译用 A 版，运行加载了 B 版） | `mvn dependency:tree -Dverbose -Dincludes=g:a` / `gradle dependencyInsight --dependency a` |
| 跑 jar 报 `ClassNotFoundException: Main` 或找不到主类 | 打的是普通 jar，没打 fat jar / Main-Class 没进 manifest | 用 `spring-boot:repackage` / `bootJar` / `shadowJar` 重打 |
| 编译报「新语法不支持」 | 没设 `release 25` | 配 `<release>25</release>` 或 toolchain 25 |
| Gradle 改了代码不重编 | up-to-date 缓存误判 | `gradle --rerun-tasks` 或 `gradle clean` |
| 依赖 `Could not resolve` / `Cannot find` | 坐标写错 / 缺仓库 / 网络 | `-U` / `--refresh-dependencies`，逐字核对 `groupId:artifactId:version` |
| 两边解析出的依赖版本对不上 | Maven 最近者胜 vs Gradle 最高版本胜 | 用 `<dependencyManagement>` / `platform()` 两边都钉死同一版 |
| 测试被莫名跳过 | CI 里残留 `-Dmaven.test.skip=true` 或 `-x test` | 检查命令行与 CI 环境变量 |
| deploy 到 release 仓库被拒 | 版本还带 `-SNAPSHOT` | `mvn versions:set -DnewVersion=` 去掉 SNAPSHOT |
| 私服 `peer not authenticated` / 证书错 | mirror / repository / 代理配置问题 | 核对 `settings.xml` 的 mirror 与 `repositories` |

## 一页纸口诀

1. Maven 想「生命周期到哪一步」，Gradle 想「要哪个产物、倒推跑哪些 task」——一切命令差异都从这来。
2. 排冲突只认两条：`dependency:tree -Dincludes` 与 `dependencyInsight --dependency`，先查清是谁把这版本带进来的。
3. 默认冲突策略相反：Maven 最近者胜，Gradle 最高版本胜——同一堆依赖两边可能解析出不同版本，别想当然。
4. 版本别散落各处：Maven 用 `<dependencyManagement>` / BOM，Gradle 用 `platform()` / `constraints` 统一钉死。
5. fat jar 三条路：Shade、Spring Boot `repackage`/`bootJar`、Shadow；跑不起来先看 Main-Class 进没进 manifest。
6. `-DskipTests` 只跳执行，`-Dmaven.test.skip` 连编译都跳；CI 里别手滑用错。
7. 一律用 `./mvnw` / `./gradlew` 并提交进仓库，把工具版本钉死，才谈得上可复现构建。
8. 提速顺序：统一 wrapper → 开 Gradle 缓存 / Maven 上 `-T` 或 mvnd → 最后才是跳测试。
9. 改动不生效先想缓存：Gradle `--rerun-tasks` / `clean`，Maven `-U` / `clean`。

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
