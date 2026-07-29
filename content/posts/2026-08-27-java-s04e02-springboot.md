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

![《从零开始学 Java》34 · 第一个 Spring Boot 服务 —— 阿零与豆豆分镜漫画](/comics/java/s04e02-springboot.png)

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

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. `@SpringBootApplication` 是哪三个注解的组合?
   - A) `@Configuration` + `@Bean` + `@Import`　B) `@SpringBootConfiguration` + `@EnableAutoConfiguration` + `@ComponentScan`　C) `@RestController` + `@Service` + `@Repository`　D) `@Component` + `@Autowired` + `@Value`
2. Spring Boot「自动配置」的判断依据是?
   - A) 配置文件里写了什么　B) **classpath 里有什么**,靠 `@ConditionalOnClass` 之类条件装配　C) 启动参数　D) 运行时探测端口
3. 所有请求先到达的「总分拣台」是?
   - A) `Tomcat`　B) `DispatcherServlet`　C) `@RestController`　D) `HttpMessageConverter`
4. 把 `@RestController` 注释掉后访问 `/hello`,结果是?
   - A) 500 服务器错误　B) 404 —— 这个类没被当成控制器,`@GetMapping` 没被登记进处理表　C) 启动失败　D) 返回空字符串
5. 控制器类必须放在哪里才会被扫描到?
   - A) 任意位置　B) 启动类**同包或其子包**(`@ComponentScan` 默认扫描范围)　C) 必须和启动类同一个文件　D) `src/main/resources` 下
6. `spring-boot-starter-web` 带来了什么?
   - A) 只有 Spring MVC　B) 内嵌 Tomcat + Spring MVC 等一整套 Web 依赖　C) 数据库连接池　D) 日志框架
7. Spring Boot 3/4 相比 1/2 的重大基线变化是?
   - A) 不再内嵌服务器　B) 包名从 `javax.*` 迁到 **`jakarta.*`**,基线 Java 17+　C) 放弃注解改用 XML　D) 不再支持 Maven
8. 「约定优于配置」的准确含义是?
   - A) 没有配置　B) 不是没配置,而是它**按约定替你配好了**,你只在偏离约定时才需要写　C) 配置只能写在 yaml　D) 配置由运行时决定
9. `MockMvc` 的价值是?
   - A) 生成假数据　B) 不用真启动服务器就能测接口的请求-响应　C) 压测工具　D) 替代 JUnit
10. 内嵌服务器相比传统「装外部 Tomcat + web.xml」的优势是?
    - A) 性能更高　B) 应用自带服务器,一个 jar 就能跑,部署与配置大幅简化　C) 支持更多协议　D) 不需要 JVM

> [!答案]
> **1-B**　三合一注解。**举一反三**:所以启动类的位置很关键 —— 它同时决定了组件扫描的根包。
> **2-B**　按 classpath 条件装配。**举一反三**:所以「引入一个 starter 就自动生效」不是魔法,是一堆 `@Conditional` 在起作用,`--debug` 启动能看到自动配置报告。
> **3-B**　`DispatcherServlet` 是前端控制器。**举一反三**:它按 URL 查处理器映射表,查不到就 404 —— 第 4 题的答案就藏在这里。
> **4-B**　没贴标签就没登记。**举一反三**:同类问题还有「贴了 `@Controller` 却忘了 `@ResponseBody`」,返回值会被当成视图名去找模板。
> **5-B**　默认扫描启动类所在包及子包。**举一反三**:类放到了平级的另一个顶层包,就会「怎么都扫不到」—— 这是新手最常见的诡异问题之一。
> **6-B**　starter 是一组依赖的打包。**举一反三**:starter 的本质就是「一个 pom + 一套自动配置」,理解这点你也能写自己的 starter。
> **7-B**　jakarta 迁移是硬分水岭。**举一反三**:老代码升级 Spring Boot 3 的最大工作量往往就是这个包名替换。
> **8-B**　约定不等于没有配置。**举一反三**:所以想改端口只需 `server.port=9090` 一行 —— 偏离约定的地方才需要你出手。
> **9-B**　它跑完整的 MVC 流程但不开真端口。**举一反三**:比起启动完整服务再发 HTTP 请求,它快得多,适合放进日常单元测试。
> **10-B**　一个 jar 就能跑。**举一反三**:这也是容器化部署的前提 —— 镜像里不用再装应用服务器。

---

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
