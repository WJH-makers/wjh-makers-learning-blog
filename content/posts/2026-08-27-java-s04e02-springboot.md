---
title: "《从零开始学 Java》34 · 第一个 Spring Boot 服务"
date: 2026-08-27
summary: "三行代码起一个内嵌服务器,写第一个 @RestController,让浏览器访问 localhost:8080 就收到咖啡站的问候。并掀开『自动配置』的地下机械图——绝不把它当魔法。"
tags: [Java, Java漫画, Spring Boot, 自动配置, REST, 阿零与豆豆]
---

# 《从零开始学 Java》34 · 第一个 Spring Boot 服务

> 连载特刊 · 第四季「咖啡帝国」第 2 话 · 基线 Java 25(最新 LTS)· Spring Boot 4.x(Jakarta EE 11)
> 承接:上一话搞懂了 HTTP 请求-响应,可咖啡站还只会当客户端,自己不能"被访问"。

---

## 一、需求:起一个一直在线的服务

要让手机能下单,得有个**一直在线、监听 HTTP** 的服务器。放在十几年前,这意味着装 Tomcat、写 `web.xml`、配一堆 XML。豆豆:「现在不用受那份罪了。**Spring Boot** 帮你把服务器内嵌进程序,三行代码就能起来——但它不是魔法,今天我带你看清楚**它到底替你做了什么**。」

---

## 二、漫画 · Spring 管家与地下机械

> **〔1〕** 一位穿燕尾服的 `Spring` 管家推门而入,弹指间一座服务器"嗡"地启动。
> 阿零:「就……就好了?我 Tomcat 都还没装啊。」

> **〔2〕** 管家掀开地板,露出下面一整套运转的机械:内嵌 Tomcat、`DispatcherServlet` 分拣台、一排贴着 `@GetMapping` 的传送轨。
> 豆豆:「别被'三行代码'骗了。**楼下这套机械一直在转**——Spring Boot 只是替你把它们默认组装好了。管家的规矩是:**每一处自动,你都得能说出它是怎么来的。**」

> **〔3〕** 一个浏览器请求 `/hello` 飘进来,落到 `DispatcherServlet` 分拣台。
> 管家:「分拣台按路径查表:`/hello` 该谁处理?——哦,`HelloController` 的 `hello()`。」请求被送上对应传送轨。

> **〔4〕** 阿零手一抖,忘了给 Controller 贴 `@RestController` 标签。分拣台查无此轨,请求"啪"退回 `404`。
> 豆豆(叼豆子):「没贴标签,管家就没把它登记进处理表。没登记,分拣台自然找不到——`404`。」

---

## 三、本话目标

- 用 `spring-boot-starter-parent` + `starter-web` 建一个 Spring Boot 项目;
- 理解 `@SpringBootApplication` 与**内嵌服务器**、**自动配置**;
- 写第一个 `@RestController` + `@GetMapping`;
- 看清一次请求"进门→分拣→处理→返回"的地下机械图;
- 踩一次"忘贴 `@RestController` 得 404"的坑。

---

## 四、原理图:一次请求的地下旅程

```text
浏览器 GET /hello
      │
      ▼
内嵌 Tomcat(Spring Boot 自动起的服务器)
      │
      ▼
DispatcherServlet(总分拣台,所有请求先到它这)
      │  按 URL 查"处理器映射表"
      ▼
HelloController.hello()   ← @GetMapping("/hello") 注册进了表
      │  返回 "豆豆咖啡站 · 营业中 ☕"
      ▼
HttpMessageConverter 把返回值写进响应体 → 浏览器收到
```

一句话:**`DispatcherServlet` 是总台,`@GetMapping` 是登记路径,`@RestController` 是"把我登记进表"的标签。**

---

## 五、配置与代码:三个文件起一个服务

下面是**可直接保存并运行的完整** `pom.xml`（继承 Spring Boot 父 POM，统一依赖版本）：

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>4.0.0</version>   <!-- 基于 Spring Framework 7 / Jakarta EE 11,Java 17+ -->
    </parent>

    <groupId>cafe.doudou</groupId>
    <artifactId>coffee-api</artifactId>
    <version>0.0.1-SNAPSHOT</version>

    <properties>
        <java.version>25</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>   <!-- 带来内嵌 Tomcat + Spring MVC -->
        </dependency>
    </dependencies>
</project>
```

启动类 `CafeApplication.java`:

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CafeApplication {
    public static void main(String[] args) {
        SpringApplication.run(CafeApplication.class, args);   // 起内嵌服务器
    }
}
```

第一个控制器 `HelloController.java`(和启动类放同一个包或其子包,才会被扫到):

```java
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController                                  // ← 把我登记进处理表
public class HelloController {
    @GetMapping("/hello")                        // 路径:GET /hello
    public String hello() {
        return "豆豆咖啡站 · 营业中 ☕";
    }
}
```

跑起来:

```bash
mvn spring-boot:run
# 浏览器访问 http://localhost:8080/hello → 豆豆咖啡站 · 营业中 ☕
```

---

## 六、故意制造一个 Bug:忘贴 @RestController

把 `HelloController` 上的 `@RestController` 删掉:

```java
// @RestController   ← 故意注释掉
public class HelloController {
    @GetMapping("/hello")
    public String hello() { return "豆豆咖啡站 · 营业中 ☕"; }
}
```

---

## 七、读懂现象:404 Not Found

访问 `/hello`,浏览器返回:

```text
{"timestamp":"...","status":404,"error":"Not Found","path":"/hello"}
```

服务器起来了(不是连不上),但 `/hello` 返回 404。根因:没有 `@RestController`,Spring 启动扫描时**不会把这个类当成控制器**,它的 `@GetMapping` 也就没被登记进 `DispatcherServlet` 的处理表。分拣台查表查不到 `/hello`,只能 404。补回 `@RestController` 即恢复——这正是漫画里"没贴标签就没登记"。

> **⏳ 版本时光机 · 起一个 Web 服务,越来越简单**

| 时期 | 做法 | 痛点 |
|---|---|---|
| 传统 Spring MVC | 装外部 Tomcat + `web.xml` 配 DispatcherServlet + 一堆 XML | 配置繁琐、部署重 |
| Spring Boot 1–2 | 内嵌 Tomcat + 自动配置 + starter,包名 `javax.*` | 简单,但绑 javax |
| **Spring Boot 3–4** | 同上,包名迁到 **`jakarta.*`**,基线 Java 17+ | 现代基线,本连载用 Java 25 |

> **🎯 面试直击**:`@SpringBootApplication` 到底是什么?
> 它是三个注解的**组合**:`@SpringBootConfiguration`(本质是 `@Configuration`,声明配置类)+ `@EnableAutoConfiguration`(开启自动配置)+ `@ComponentScan`(扫描本包及子包的 `@Component`/`@RestController`/`@Service` 等)。追问自动配置原理:Spring Boot 按 **classpath 里有什么** 来条件装配——引了 `starter-web`(classpath 有 Tomcat、Spring MVC),`@ConditionalOnClass` 就自动配好内嵌 Tomcat 和 `DispatcherServlet`。**这就是"约定优于配置":不是没配置,是它按约定替你配好了。**

---

## 八、用测试证明:接口真的通

Spring Boot 提供 `MockMvc`,不用真启动服务器就能测接口:

```java
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.junit.jupiter.api.Test;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class HelloControllerTest {
    @Autowired MockMvc mvc;

    @Test
    void hello_returns_greeting() throws Exception {
        mvc.perform(get("/hello"))
           .andExpect(status().isOk())
           .andExpect(content().string("豆豆咖啡站 · 营业中 ☕"));
    }
}
```

---

## 九、项目检查点 · 豆豆咖啡站 · 上网营业 v4.0

```text
新增:一个能启动、能响应 HTTP 的 Spring Boot 服务;第一个 REST 接口 /hello
用到:@SpringBootApplication、内嵌 Tomcat、自动配置、@RestController/@GetMapping、MockMvc
还没有:所有逻辑都堆在 Controller 里 —— 一旦业务变复杂,又会回到"main 里塞一切"的老路
        下一话把它拆成 Controller / Service / Repository 三层
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| Spring Boot 起步 / 自动配置 | 后端 JD 的第一硬技能 |
| @RestController / @GetMapping | 写接口的基本功 |
| @SpringBootApplication 拆解 | 面试必问,答得清区分度高 |
| MockMvc 接口测试 | "会写 Spring 测试"的证据 |

---

## 十一、下一话悬念

`/hello` 能通了,可如果把"查菜单、下单、扣库存"全塞进一个 Controller,它很快会变成第一季那种"什么都往里塞"的巨型方法。

> 下一话《Controller / Service / Repository》:阿零把代码拆成三层——Controller 管收发、Service 管业务、Repository 管数据,并第一次搞懂"这些对象**是谁创建、又怎么被送到一起的**":IoC 容器与依赖注入。

---

## 🎯 随堂练习
先自己做,再对答案。选择难度递进,解答从概念到综合,代码含边界验证。

### 一、选择题(10 道)
1. [基础]`@SpringBootApplication` 是以下哪三个注解的组合?
- A) `@RestController + @Service + @Repository`　B) `@Configuration + @EnableAutoConfiguration + @ComponentScan`　C) `@Entity + @Table + @Id`　D) `@Bean + @Autowired + @Qualifier`
> [!答案] **1-B**　三者合一:声明配置类 + 开启自动配置 + 扫描本包及子包。**举一反三**:`exclude` 属性可关闭特定自动配置,如 `@SpringBootApplication(exclude={DataSourceAutoConfiguration.class})`。

2. [进阶]`@RestController` 和 `@Controller` 的核心区别是什么?
- A) `@RestController` 安全性更高　B) `@RestController` = `@Controller` + `@ResponseBody`,所有方法返回值直接写进响应体　C) `@RestController` 支持异步请求　D) 两者完全相同
> [!答案] **2-B**　`@RestController` 是组合注解,等于 `@Controller` + `@ResponseBody`,每个方法默认返回 JSON/字符串而非视图名。**举一反三**:纯 API 服务用 `@RestController`,需要返回 HTML 模板用 `@Controller`。

3. [深入]Spring Boot 的"自动配置"凭什么"猜到"你需要什么 Bean?
- A) AI 分析你的代码意图　B) 扫描 classpath 里的 jar,用 `@ConditionalOnClass` 等条件注解决定　C) 读取 `pom.xml` 中的所有依赖　D) 每次启动时随机生成
> [!答案] **3-B**　自动配置类通过条件注解(如存在 `DataSource` 类就配连接池、存在 `Thymeleaf` 就配模板引擎)按需装配。**举一反三**:`spring-boot-autoconfigure` jar 里的 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 文件列出了所有自动配置类。

4. [基础]Spring Boot 的**内嵌服务器**指的是?
- A) 必须手动安装外部 Tomcat　B) 应用自带 Tomcat/Jetty/Undertow,`main` 启动即起服务器　C) 通过 SSH 连接远程服务器　D) 在浏览器里运行
> [!答案] **4-B**　`spring-boot-starter-web` 自带内嵌 Tomcat,打成 jar 直接 `java -jar` 就运行,无需装外部应用服务器。**举一反三**:可通过 `spring-boot-starter-undertow` 或 `spring-boot-starter-jetty` 替换 Tomcat。

5. [进阶]Spring Boot 配置文件中,`application.yml` 和 `application.properties` 的关系是?
- A) 不能同时存在　B) yml 优先级高于 properties　C) properties 优先级高于 yml　D) 同时存在时后者覆盖前者
> [!答案] **5-C**　Spring Boot 加载顺序:`application.properties` 优先级高于 `application.yml`,相同 key 后者生效。**举一反三**:命令行参数 `--server.port=9090` 优先级最高,环境变量次之,配置文件最低。

6. [深入]`@ComponentScan` 默认扫描哪些类?
- A) 整个项目所有类　B) 启动类所在包及其子包下标记了 `@Component`/`@Service`/`@Repository`/`@RestController` 的类　C) 只扫描 `@SpringBootApplication` 类　D) JDK 自带的类
> [!答案] **6-B**　默认从 `@SpringBootApplication` 所在包向下扫描,把带组件注解的类注册为 Bean。**举一反三**:如果 Controller 放在启动类的父包或兄弟包里,需要显式 `@ComponentScan(basePackages="...")` 否则 404。

7. [基础]`@GetMapping("/hello")` 等价于以下哪种写法?
- A) `@RequestMapping(value="/hello", method=RequestMethod.GET)`　B) `@PostMapping("/hello")`　C) `@RequestParam("/hello")`　D) `@ResponseBody("/hello")`
> [!答案] **7-A**　`@GetMapping` 是 `@RequestMapping(method=GET)` 的快捷方式,语义更清晰。**举一反三**:Spring 4.3+ 引入 `@GetMapping`/`@PostMapping`/`@PutMapping`/`@DeleteMapping` 等组合注解,提升可读性。

8. [进阶]默认情况下,Spring Boot 内嵌 Tomcat 监听哪个端口?
- A) 80　B) 443　C) 8080　D) 3000
> [!答案] **8-C**　Spring Boot 默认端口 8080,通过 `server.port=9090` 可修改。**举一反三**:设 `server.port=0` 会随机分配可用端口,测试时避免端口冲突。

9. [深入]`application.yml` 中 `server.port: 9090` 如何覆盖默认值?
- A) 编译期替换　B) 启动时自动配置类读取该属性,覆盖 `ServerProperties` 默认值　C) 需要手动写代码读取　D) 无法覆盖,必须改源码
> [!答案] **9-B**　Spring Boot 的 `@ConfigurationProperties` 机制把 yml 属性绑定到 `ServerProperties` 类,自动配置类读取它并设置端口。**举一反三**:**约定优于配置**的体现:不改 yml 就用默认 8080,改了就用你设的值,无需手动 `new ServerConfig()`。

10. [综合]Spring Boot 启动时,`DispatcherServlet` 的作用是?
- A) 连接数据库　B) 作为"总分拣台",按 URL 查找对应的 Controller 方法处理请求　C) 管理 Bean 生命周期　D) 编译 Java 代码
> [!答案] **10-B**　`DispatcherServlet` 是 Spring MVC 的前端控制器,所有 HTTP 请求先到此,它查"处理器映射表"找到 `@GetMapping` 注册的方法,调用后返回响应。**举一反三**:没有 `@RestController` 的类不会被注册进映射表,请求无匹配即 404。

### 二、解答题(3 道)
1. [概念]用自己的话解释 Spring Boot 的"自动配置"机制,并举一个例子说明它如何"按条件装配 Bean"。
> [!答案] **1**　自动配置是通过 `@Conditional` 系列条件注解按 classpath 里有什么来决定创建哪些 Bean。例如 classpath 有 H2 数据库的 jar 时,`DataSourceAutoConfiguration` 发现 `@ConditionalOnClass(EmbeddedDatabaseType.class)` 条件满足,才创建 H2 内存数据源 Bean;若 classpath 没有,这个配置就跳过。**举一反三**:条件注解有 `@ConditionalOnClass`(类存在)、`@ConditionalOnMissingBean`(Bean 不存在)、`@ConditionalOnProperty`(属性值匹配)等,层层叠加形成"智能猜测"——不是魔法,是可追溯的条件逻辑。

2. [场景]假设项目不需要数据源,但引入了 `spring-boot-starter-jdbc` 导致启动报"没有 DataSource URL"。如何优雅地排除这项自动配置?
> [!答案] **2**　两种方式:①用 `@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})` 排除;②在 `application.yml` 设 `spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration`。**举一反三**:排查自动配置冲突时,加启动参数 `--debug` 会打印"哪些自动配置被应用、哪些被跳过",一眼看出根源。

3. [综合]描述一次 HTTP 请求 `GET /hello` 在 Spring Boot 中的完整处理流程,从浏览器发出到收到响应的每一环。
> [!答案] **3**　①浏览器发 `GET /hello` → ②内嵌 Tomcat 的线程池接收连接 → ③Tomcat 解析 HTTP 文本,交给 `DispatcherServlet` → ④`DispatcherServlet` 查 HandlerMapping(处理器映射表),找到 `HelloController.hello()`(@GetMapping("/hello") 注册的) → ⑤调用 `hello()` 返回 `"豆豆咖啡站 · 营业中 ☕"` → ⑥`HttpMessageConverter` 把字符串写入响应体 → ⑦Tomcat 拼好 `HTTP/1.1 200 OK` 响应,发回浏览器。**举一反三**:若 Controller 缺少 `@RestController`,第④步映射表中没有注册项,Dispatcher 返回 404。

### 三、代码题(2 道)
1. [基础]写一个 Spring Boot 启动类和 Controller:`POST /api/greet` 接收 JSON `{"name":"阿零"}`,返回 `{"message":"你好,阿零!欢迎来到咖啡站"}`,name 为空时默认"顾客"。
> [!答案] **1 验收**:
> ```java
> @SpringBootApplication
> @RestController
> public class CafeApplication {
>     public static void main(String[] args) {
>         SpringApplication.run(CafeApplication.class, args);
>     }
> 
>     @PostMapping("/api/greet")
>     public Map<String,String> greet(@RequestBody(required = false) Map<String,String> body) {
>         String name = body != null ? body.getOrDefault("name", "顾客") : "顾客";
>         return Map.of("message", "你好," + name + "!欢迎来到咖啡站");
>     }
> }
> ```
> **举一反三**:`@RequestBody` 接收 JSON 自动反序列化;生产代码应定义 DTO 类替代 `Map` 以获得类型安全和校验。

2. [综合]写一个 `@SpringBootTest` + `MockMvc` 的测试,验证 `GET /api/health` 返回 `{"status":"ok"}`。测试需覆盖:①状态码 200;②响应体 JSON 包含 `status` 字段;③Content-Type 为 `application/json`。
> [!答案] **2 验收**:
> ```java
> @SpringBootTest
> @AutoConfigureMockMvc
> class HealthControllerTest {
>     @Autowired MockMvc mvc;
> 
>     @Test
>     void health_returns_ok() throws Exception {
>         mvc.perform(get("/api/health"))
>            .andExpect(status().isOk())
>            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
>            .andExpect(jsonPath("$.status").value("ok"));
>     }
> }
> ```
> **举一反三**:`MockMvc` 不启动真实服务器,测的是整个 Spring MVC 链路(Controller→Service→Repository)但速度极快,适合 CI 常跑;集成测试(需真实网络/数据库)用 `@SpringBootTest(webEnvironment=RANDOM_PORT)` + `TestRestTemplate`。

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
