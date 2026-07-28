---
title: "《从零开始学 Java》32 · 多模块订单系统(第三季大结局)"
date: 2026-08-25
summary: "领域逻辑和程序入口挤在一个模块里,想复用很别扭。这一话把咖啡站拆成 coffee-core 与 coffee-app 两个 Maven 模块,整合第三季全部能力,交付多模块工程 v3,收束工程时代。"
tags: [Java, Java漫画, 多模块, Maven, 项目实战, 阿零与豆豆]
---

# 《从零开始学 Java》32 · 多模块订单系统(第三季大结局)

> 连载特刊 · 第三季「工程时代」第 8 话 · 基线 Java 25(最新 LTS)· 项目检查点:多模块工程 v3。
> 承接:第三季一路学的异常、文件、Stream、Maven、JUnit、Git,这一话全部收拢进一个结构清晰的工程。

---

## 一、需求:把"核心"和"入口"分家

咖啡站的代码现在什么都堆在一个模块:领域对象(`Coffee`、`Order`、`CoffeeShop`)、业务异常、Stream 统计,和 `main` 入口、文件读写全缠在一起。想把"核心业务"单独给另一个程序(比如将来的 Web 后端)复用,却拎不出来。

豆豆:「一个模块装所有东西,就像把中央厨房和门店挤在一间屋。**拆开**——核心业务是『中央厨房』,谁都能来取货;程序入口是『门店』,负责对外营业。」

---

## 二、漫画 · 中央厨房与门店

> **〔1〕** 阿零把一大团缠成麻花的代码摊在桌上:「想复用 `CoffeeShop`,结果它拽着 `main`、拽着文件读写,一扯一大串。」

> **〔2〕** 豆豆一刀把它切成两块:`coffee-core`(中央厨房:领域逻辑、异常、统计)和 `coffee-app`(门店:入口、文件持久化)。
> 豆豆:「`core` 不认识任何入口,只管业务;`app` **依赖** `core`,负责对外。依赖是**单向**的——门店找厨房,厨房绝不反过来依赖门店。」

> **〔3〕** 阿零在 `app` 里直接用 `core` 的 `CoffeeShop`,却忘了在 `app` 的 pom 里声明这份依赖,编译当场报「找不到包」。
> 豆豆(叼豆子):「模块之间不会自动串门。要用 `core`,就得在 `app/pom.xml` 里**明写**这条依赖。」

> **〔4〕** 补上依赖,父模块一声 `mvn package`,两个子模块依次编译、测试、打包,咖啡站 v3 落地。
> 豆豆:「这就是**多模块工程**——第三季学的一切,今天各归其位。」

---

## 三、本话目标

- 用 Maven **父 POM + 子模块**把项目拆成 `coffee-core` 与 `coffee-app`;
- 理清模块间**单向依赖**(app → core);
- 把第三季能力各归其位:异常、文件、Stream、测试;
- 踩一次"用了别的模块却没声明依赖"的坑;
- 一条 `mvn package` 完成整个工程的编译 + 测试 + 打包。

---

## 四、原理图:多模块结构

```text
coffee-shop/                 父工程(packaging=pom,只管聚合与统一版本)
├── pom.xml                  <modules> 列出子模块
├── coffee-core/             中央厨房:领域 + 业务规则,不依赖任何人
│   ├── pom.xml
│   └── src/main/java/cafe/core/
│         Coffee  Order  CoffeeShop  OutOfStockException  SalesReport
│   └── src/test/java/...    JUnit 测试(第 6 话)
└── coffee-app/              门店:入口 + IO,依赖 core
    ├── pom.xml              <dependency> 声明依赖 coffee-core
    └── src/main/java/cafe/app/
          Main  MenuStore

依赖方向:app ──▶ core   (单向,core 绝不反向依赖 app)
```

---

## 五、配置:父 POM 与子模块

父 `pom.xml`:

```xml
<project ...>
    <modelVersion>4.0.0</modelVersion>
    <groupId>cafe.doudou</groupId>
    <artifactId>coffee-shop</artifactId>
    <version>3.0.0</version>
    <packaging>pom</packaging>            <!-- 聚合工程,自身不产出 jar -->

    <modules>
        <module>coffee-core</module>
        <module>coffee-app</module>
    </modules>

    <properties>
        <maven.compiler.release>25</maven.compiler.release>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>
</project>
```

`coffee-app/pom.xml` 里声明对 core 的依赖:

```xml
<project ...>
    <parent>
        <groupId>cafe.doudou</groupId>
        <artifactId>coffee-shop</artifactId>
        <version>3.0.0</version>
    </parent>
    <artifactId>coffee-app</artifactId>

    <dependencies>
        <dependency>                      <!-- ★ 门店依赖中央厨房 -->
            <groupId>cafe.doudou</groupId>
            <artifactId>coffee-core</artifactId>
            <version>3.0.0</version>
        </dependency>
    </dependencies>
</project>
```

在父工程目录一条命令跑全套:

```bash
mvn package
# Reactor 会按依赖顺序:先 core(编译+测试+装本地仓库),再 app
```

---

## 六、故意制造一个 Bug:用了却没声明依赖

把 `coffee-app/pom.xml` 里那段对 `coffee-core` 的 `<dependency>` 删掉,但 `Main.java` 仍 `import cafe.core.CoffeeShop;`:

```java
// coffee-app/src/main/java/cafe/app/Main.java
import cafe.core.CoffeeShop;   // app 没声明依赖 core,这里够不着
```

---

## 七、读懂真实报错:模块之间不会自动串门

```text
[ERROR] .../coffee-app/src/main/java/cafe/app/Main.java:[3,17]
        package cafe.core does not exist
[ERROR] ... cannot find symbol: class CoffeeShop
```

Maven 各模块的 classpath 是**隔离**的:`app` 想用 `core` 的类,**必须在 `app/pom.xml` 里显式声明依赖**,Reactor 才会把 core 放进 app 的编译 classpath,并保证**先构建 core 再构建 app**。补回 `<dependency>` 即解决。

> **豆豆锐评 · 依赖单向,是架构的第一条纪律**
> 永远让 `app` 依赖 `core`,绝不反过来。一旦 core 又反向依赖 app,就成了**循环依赖**——Maven 会直接报 `The projects ... form a cycle` 拒绝构建。保持"核心不认识外壳",core 才能被任意入口(控制台、Web、定时任务)复用。这也是第四季 Spring 分层的思想雏形。

> **🎯 面试直击**:为什么要拆多模块?
> ① **复用**:core 可被多个入口(app、web、job)共享;② **边界清晰**:依赖单向,防止业务逻辑和 IO/框架搅在一起;③ **构建与测试可独立**:改 app 不必重测 core;④ **团队协作**:不同模块可分给不同人。追问:Maven 的 **Reactor** 会根据模块间依赖自动拓扑排序决定构建顺序。

---

## 八、验证:一条命令,全绿交付

```text
[INFO] Reactor Summary:
[INFO] coffee-shop ........................ SUCCESS
[INFO] coffee-core ........................ SUCCESS
[INFO] coffee-app ......................... SUCCESS
[INFO] BUILD SUCCESS
```

core 的测试(第 6 话那套)先跑、全过,app 再打包。第三季的每一样能力,现在都在这张结构里各就各位。

---

## 九、项目检查点 · 豆豆咖啡站 v3 🎉

```text
交付:多模块 Maven 工程,core/app 分家、依赖单向、一条命令编译+测试+打包
整合:异常兜底(E1-2)· 文件持久化(E3)· Stream 统计(E4)
     · Maven 构建(E5)· JUnit 测试(E6)· Git 版本管理(E7)· 多模块架构(E8)
局限:它还只是个"本地控制台程序" —— 别人的手机/浏览器访问不到它
     这正是第四季要解决的:把 core 搬到一个能被网络调用的 Spring Boot 后端里
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| Maven 多模块 / 父子 POM | 中大型项目标配,JD 常见 |
| 模块单向依赖 / 防循环 | 架构基本功,面试聊分层必问 |
| 工程整合能力 | 简历里"独立完成一个带测试、可构建的工程" |

---

## 十一、第三季完 · 下一季预告

第三季,阿零把一个"能跑的控制台程序",养成了一个**异常兜得住、数据存得下、构建自动化、有测试、进了 Git、结构清晰**的工程。他从"只会写能跑的代码",长成了"会交付可维护软件"的人——这一段,正是很多人跳过、结果只会写 Controller 的地方。

可无论多工整,`coffee-app` 终究只是一台**本地机器**:你同学的手机、老板的浏览器,都访问不到它。

> 第四季《咖啡帝国》:阿零把 `coffee-core` 搬进 **Spring Boot**,做成一个手机前端就能下单、带登录鉴权、数据落 MySQL 的 **REST 咖啡店 API**——咖啡站第一次真正"上网营业"。

---

## 🎯 随堂练习
先自己做，再对答案。选择难度递进，解答从概念到综合，代码含边界验证。

### 一、选择题（10 道）

1. [基础] Maven 多模块项目的父 POM 打包类型必须设置为？
- A) `jar`　B) `war`　C) `pom`　D) `ear`

2. [基础] 父 POM 中用什么标签声明子模块列表？
- A) `<dependencies>`　B) `<modules>`　C) `<children>`　D) `<subprojects>`

3. [基础] 子模块的 POM 中通过什么标签指定父 POM？
- A) `<modules>`　B) `<dependency>`　C) `<parent>`　D) `<inherits>`

4. [进阶] 多模块项目中，模块间的依赖方向应该是？
- A) 双向引用　B) **单向**，底层模块不依赖上层　C) 所有模块互相依赖　D) 只允许父模块依赖子模块

5. [进阶] `coffee-app` 使用了 `coffee-core` 的类却忘了声明依赖，会看到什么错误？
- A) 运行时 ClassNotFound　B) 编译期 `package does not exist`　C) 测试失败　D) 警告但可运行

6. [进阶] 在父工程根目录执行 `mvn package`，子模块的构建顺序由什么决定？
- A) 字母序　B) 随机　C) **Reactor 根据模块间依赖自动拓扑排序**　D) `<modules>` 声明顺序

7. [进阶] `<dependencyManagement>` 的作用是？
- A) 直接引入所有依赖　B) **统一声明版本号**，子模块引用时不写 version　C) 管理插件版本　D) 排除依赖

8. [综合] 如果 `coffee-core` 反向依赖了 `coffee-app`，会导致？
- A) 正常运行　B) **循环依赖**：Maven 拒绝构建 `The projects ... form a cycle`　C) 编译警告但可忽略　D) 运行时 StackOverflowError

9. [综合] 拆多模块的核心收益**不包括**哪一项？
- A) 核心业务可被多个入口复用　B) 模块边界清晰防止耦合　C) 构建和测试可独立　D) **代码行数自动减少**

10. [综合] 多模块项目的版本管理最佳实践是？
- A) 每个模块各自定版本　B) 父 POM 统一声明版本，子模块用父版本或 `${project.version}`　C) 不使用版本号　D) 每次发布手动逐个模块改版本

> [!答案] **1-C** 父 POM 的 `packaging` 必须是 `pom`——它只做聚合和版本管理，自身不产出 jar/war。**举一反三**：子模块的 packaging 默认是 `jar`。
> [!答案] **2-B** `<modules>` 标签列出所有子模块的目录名。**举一反三**：父 POM 必须放在子模块目录的**上级目录**。
> [!答案] **3-C** `<parent>` 标签声明 GAV 坐标，子模块继承父 POM 的属性和依赖管理。**举一反三**：子模块的 `version` 如果和父模块相同，可以省略——由父模块统一管理。
> [!答案] **4-B** 依赖单向——app → core。core 绝不反向依赖 app，否则形成循环。**举一反三**：这是分层架构的基本纪律，也是第四季 Spring 分层思想的前身。
> [!答案] **5-B** Maven 各模块 classpath 隔离——不声明依赖就编译不过，报 `package ... does not exist`。**举一反三**：这是安全机制——不让你无意中用其他模块的类。
> [!答案] **6-C** Reactor（反应堆）分析模块间依赖关系，自动决定构建顺序，保证被依赖的模块先构建。**举一反三**：`mvn package -pl coffee-core` 可以只构建指定模块。
> [!答案] **7-B** `<dependencyManagement>` 只声明版本不引入依赖；子模块在 `<dependencies>` 中引用时不写 `<version>`，版本由父 POM 统一控制。**举一反三**：这解决了"多个模块用同一个库但版本不一致"的经典问题。
> [!答案] **8-B** Maven 会检测循环依赖并直接报错终止构建。**举一反三**：如果两模块确实需要互相感知，抽取公共接口到第三个模块（如 `coffee-api`）。
> [!答案] **9-D** 多模块不会自动减少代码——反而会增加配置文件数量。它的价值在于架构清晰（复用、解耦、独立构建），而非代码量。**举一反三**：单模块项目代码足够简单时不急着拆——过度拆分反而增加维护成本。
> [!答案] **10-B** 父 POM 中通过 `properties` 或 `<dependencyManagement>` 统一声明版本，子模块用 `${project.version}` 引用。发布时只需改父 POM 一处。**举一反三**：`maven-release-plugin` 可以自动化版本升级和发布流程。

### 二、解答题（3 道）

1. [概念] 多模块项目的三个核心配置文件各管什么？父 POM（packaging=pom）管聚合和版本，子模块 POM 管自身依赖，`<dependencyManagement>` 管版本统一。画出一个典型的两层多模块结构。

2. [场景] 咖啡站 v3 拆成了 `coffee-core`（领域）和 `coffee-app`（入口）。现在要加一个 `coffee-admin` 后台管理模块，也需要引用领域对象。请设计模块结构：①写出新的父 POM `<modules>`；②写出 `coffee-admin` 的 POM 如何声明依赖；③依赖关系图中 `core` 是否应该知道 `admin` 的存在。

3. [综合] 比较"单模块一把梭"和"多模块拆分"的优劣，给出分模块的决策条件：①什么时候应该拆；②什么时候不应该拆；③如果核心域被多个入口引用但入口数量还不确定，应该怎么设计模块边界。

> [!答案] **1** 三层结构：父 POM——`<modules>` 聚合子模块 + `<properties>` 统一版本 + `<dependencyManagement>` 统一依赖版本；core 子模块 POM——`<parent>` 指向父 POM + 自己的 `<dependencies>`（如无外部依赖可不写）；app 子模块 POM——`<parent>` 指向父 POM + `<dependencies>` 中包含 `coffee-core`。**举一反三**：父 POM 的 `<dependencyManagement>` 中声明 core 的版本，app 引用时就不写 `<version>`，换版本只需改父 POM。
> [!答案] **2** ①父 POM `<modules>` 新增：`<module>coffee-core</module>`、`<module>coffee-app</module>`、`<module>coffee-admin</module>`；②`coffee-admin` 的 `<dependencies>` 中加 `<dependency><groupId>cafe.doudou</groupId><artifactId>coffee-core</artifactId></dependency>`（版本可省略，由父 POM `<dependencyManagement>` 统一控制）；③core **不应该**知道 admin 的存在——依赖方向始终单向：admin → core。**举一反三**：如果把 core、app、admin 都依赖的公共工具抽出到 `coffee-common` 模块，层次关系为 common ← core ← app/admin。
> [!答案] **3** 该拆的信号：①同一套领域模型被多个入口（控制台、Web、定时任务）使用；②不同模块由不同人/团队维护；③构建耗时过长，希望只重测改动的模块。不该拆：①项目还很小（<10 个类）；②团队只有 1-2 人且不预期扩展入口；③模块边界还不清晰。入口不确定时的设计：先抽 `coffee-core`（纯领域 + 接口）和 `coffee-common`（工具/常量），新增入口只需建新模块并依赖 core——这就是"核心不认识外壳"的威力。**举一反三**：不要在一开始就过度拆分——3 个模块是合理的起点，10 个模块大概率过度设计。

### 三、代码题（2 道）

1. [基础] 设计一个两模块 Maven 项目：①父工程 `coffee-parent`（groupId: `cafe.doudou`，packaging: pom，module: `coffee-core` 和 `coffee-app`）；②`coffee-core` 模块中创建一个 `Coffee` 类（name、price 字段 + 构造器）；③`coffee-app` 模块的 main 方法中创建 `Coffee` 实例并打印。写出：目录结构、父 POM 关键内容、`coffee-app` 的 POM 依赖声明、`App.java` 代码。

2. [综合] 在一个已存在的多模块项目中，`coffee-app` 编译报 `package cafe.core does not exist`。请写出排查清单（至少 3 项）和修复步骤。若确认依赖已声明但仍报错，可能原因是什么？如何用 `mvn install` 解决？

> [!答案] **1 验收**：
> 目录结构：
> ```
> coffee-parent/
> ├── pom.xml                    (packaging=pom, modules=[core, app])
> ├── coffee-core/
> │   ├── pom.xml                (parent=coffee-parent)
> │   └── src/main/java/cafe/core/Coffee.java
> └── coffee-app/
>     ├── pom.xml                (parent=coffee-parent, 依赖 coffee-core)
>     └── src/main/java/cafe/app/App.java
> ```
> 父 POM 关键片段：
> ```xml
> <groupId>cafe.doudou</groupId>
> <artifactId>coffee-parent</artifactId>
> <version>1.0.0</version>
> <packaging>pom</packaging>
> <modules><module>coffee-core</module><module>coffee-app</module></modules>
> ```
> `coffee-app/pom.xml` 依赖声明：
> ```xml
> <parent>
>     <groupId>cafe.doudou</groupId>
>     <artifactId>coffee-parent</artifactId>
>     <version>1.0.0</version>
> </parent>
> <artifactId>coffee-app</artifactId>
> <dependencies>
>     <dependency>
>         <groupId>cafe.doudou</groupId>
>         <artifactId>coffee-core</artifactId>
>         <version>1.0.0</version>
>     </dependency>
> </dependencies>
> ```
> `App.java`：
> ```java
> package cafe.app;
> import cafe.core.Coffee;
> public class App {
>     public static void main(String[] args) {
>         Coffee c = new Coffee("美式", 20);
>         System.out.println(c.name() + ": ¥" + c.price());
>     }
> }
> ```
> **举一反三**：用 `<parent>` 继承版本管理时，子模块的 `groupId` 如果与父相同可以省略。
> [!答案] **2 验收**：排查清单——①确认 `coffee-app/pom.xml` 中 `<dependencies>` 包含 `coffee-core` 且 GAV 正确；②确认父 POM 的 `<modules>` 中列出了 `coffee-core` 且在 `coffee-app` 之前；③确认 `coffee-core` 的类在 `src/main/java/cafe/core/` 目录下（包名对应）。修复步骤：在项目根目录执行 `mvn clean install`——这会把 core 先编译并安装到本地仓库 `~/.m2`，然后 app 才能从本地仓库引用到它。如果依赖已声明但仍报错，可能原因：①`coffee-core` 从未 `install` 过（本地仓库里没有）；②版本号不匹配；③IDE 缓存未刷新。`mvn install` 解决：先编译 core → 安装到 `~/.m2` → 再编译 app（此时 app 从本地仓库找到 core）。**举一反三**：日常开发中用 `mvn install`（而非 `package`）是多模块项目的标准操作——确保被依赖的模块在本地仓库中可用。

---

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
