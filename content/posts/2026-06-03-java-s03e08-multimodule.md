---
title: "《从零开始学 Java》32 · 多模块订单系统(第三季大结局)"
date: 2026-06-03
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

![《从零开始学 Java》32 · 多模块点餐系统 —— 阿零与豆豆分镜漫画](/comics/java/s03e08-multimodule.png)

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

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. 聚合工程的父 POM 里,`<packaging>` 应该写?
   - A) `jar`　B) `pom` —— 只管聚合与统一版本,自身不产出 jar　C) `war`　D) 不写,用默认
2. 本话确定的模块依赖方向是?
   - A) core → app　B) app → core,单向　C) 双向依赖　D) 互不依赖
3. `app` 用了 `core` 的类却没在 `pom.xml` 声明依赖,会?
   - A) 自动串门,能编译　B) 编译报错 `package cafe.core does not exist`　C) 运行时才报错　D) Maven 自动补上依赖
4. 上题的根本原因是?
   - A) Maven 版本问题　B) 各模块的 classpath 是**隔离**的,必须显式声明才会进编译 classpath　C) 包名写错了　D) 需要先 install
5. 如果让 core 反过来依赖 app,Maven 会?
   - A) 正常构建　B) 报 `The projects ... form a cycle` 拒绝构建　C) 随机选一个先构建　D) 只警告
6. 决定「先构建 core 再构建 app」的是?
   - A) 模块在 `<modules>` 里的书写顺序　B) Maven 的 **Reactor**,按依赖关系自动拓扑排序　C) 字母顺序　D) 手动指定
7. 「core 绝不认识 app」带来的最大好处是?
   - A) 编译更快　B) core 能被任意入口(控制台、Web、定时任务)复用　C) 打包更小　D) 测试更容易写
8. 拆多模块的理由**不包括**?
   - A) 复用　B) 边界清晰、依赖单向　C) 构建与测试可独立　D) 让程序运行更快
9. 在父工程目录执行 `mvn package`,会?
   - A) 只打包父工程　B) 按依赖顺序构建所有子模块:先 core(编译+测试),再 app　C) 报错,必须进子目录　D) 只编译不测试
10. v3 明确的局限(也是第四季的入口)是?
    - A) 没有测试　B) 没有版本控制　C) 它还只是个本地控制台程序,别人的手机/浏览器访问不到　D) 依赖管理混乱

> [!答案]
> **1-B**　聚合工程自身不产出制品。**举一反三**:父 POM 里的 `<properties>` 和 `<dependencyManagement>` 会被子模块继承,是统一版本的好地方。
> **2-B**　单向依赖是架构第一条纪律。**举一反三**:这也是第四季 Spring 分层(Controller→Service→Repository)的思想雏形。
> **3-B**　模块之间不会自动串门。**举一反三**:这个「报错」其实是好事 —— 它逼你把依赖关系写明白,而不是隐式耦合。
> **4-B**　classpath 隔离是模块化的基础。**举一反三**:同理 `scope=test` 的依赖也不会进主代码 classpath,道理一样。
> **5-B**　循环依赖直接被拒。**举一反三**:Spring 容器里的循环依赖虽然能被特殊处理,但同样是设计有问题的信号。
> **6-B**　Reactor 自动排序。**举一反三**:所以 `<modules>` 的书写顺序不重要,真正决定顺序的是依赖关系。
> **7-B**　核心不认识外壳,才能被任意外壳复用。**举一反三**:这条原则推到极致就是六边形架构/整洁架构 —— 业务在中心,IO 在外圈。
> **8-D**　拆模块不会让程序跑得更快。**举一反三**:模块化解决的是**人的问题**(维护、协作、复用),不是性能问题。
> **9-B**　Reactor 一次跑完全套。**举一反三**:这也是多模块相比「手动 install 每个模块」的最大便利。
> **10-C**　它还不能被网络访问。**举一反三**:每季结尾都点明下一季要解决什么 —— 这种「知道边界在哪」的意识,比多背一个 API 值钱。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*
