---
title: "《从零开始学 Java》38 · 注册登录与 Spring Security"
date: 2026-08-31
summary: "接口对谁都敞开,任何人都能改库存。这一话给咖啡站装上认证授权门:密码 BCrypt 加密存储、登录发凭证、按角色控权,并踩一次明文存密码的致命坑。"
tags: [Java, Java漫画, Spring Security, 认证授权, BCrypt, 阿零与豆豆]
---

# 《从零开始学 Java》38 · 注册登录与 Spring Security

> 连载特刊 · 第四季「咖啡帝国」第 6 话 · 基线 Java 25 · Spring Boot 4.x / Spring Security 6+
> 承接:上一话接口健壮了,但对谁都敞开大门,没有身份和权限的概念。

---

## 一、需求:先认得出"你是谁""你能干什么"

现在任何人 `POST /api/orders` 都能下单、甚至改库存。一个真实的咖啡店 API 必须能:**认证**(你是谁)+ **授权**(你能不能做这件事)。顾客能下单,但只有店长能改菜单。豆豆:「装两道门——第一道验身份,第二道查权限。还有,**密码绝不能明文存**,这是红线中的红线。」

---

## 二、漫画 · 认证门与授权岗

> **〔1〕** 咖啡站门口立起两道岗:第一道 `认证`(你是谁?出示凭证),第二道 `授权`(你这身份,能进这个房间吗?)。
> 豆豆:「Spring Security 就是这套门禁,它是一条**过滤器链**,请求进业务之前先过它这关。」

> **〔2〕** 注册时,密码被塞进一个叫 `BCrypt` 的保险箱,出来变成一串 `$2a$10$...` 的乱码。
> 豆豆:「哈希是**单向**的——存进去出不来。就算数据库被拖走,攻击者也拿不到原始密码。」

> **〔3〕** 阿零嫌麻烦,把密码 `123456` **原样**存进数据库。
> 门神(脸黑):「明文?!数据库被瞄一眼,全站账号当场沦陷。你把所有顾客的密码都裸奔挂墙上了。」

> **〔4〕** 阿零改用 BCrypt,再看数据库,密码成了没人看得懂的乱码;登录时拿输入的密码和乱码一比对,照样能验。
> 豆豆(叼豆子):「能验证、又存不出原文——这才是密码该有的样子。」

---

## 三、本话目标

- 理解 Spring Security 的**认证 vs 授权**与过滤器链;
- 用 `BCryptPasswordEncoder` 加密存储密码(绝不明文);
- 用现代 `SecurityFilterChain` Bean + lambda DSL 配置访问规则;
- 按路径/方法/角色控权(菜单公开、下单需登录、改菜单需 ADMIN);
- 踩一次"明文存密码"的致命坑。

---

## 四、原理图:一条安全过滤器链

```text
请求 ──▶ [Spring Security 过滤器链]
             │ 1. 认证:你是谁?(校验凭证 / BCrypt 比对密码)
             │ 2. 授权:你这角色,准不准访问这个路径?
             ▼
        通过 → 进入 Controller;不通过 → 401 未认证 / 403 无权限

规则示例:
  GET  /api/menu     permitAll        谁都能看菜单
  POST /api/orders   authenticated    登录才能下单
  *    /api/admin/** hasRole(ADMIN)    只有店长能进后台
```

---

## 五、代码:认证 + 授权 + 密码加密

安全配置(Spring Security 6+ 的现代写法,不再继承任何 Adapter):

```java
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/menu").permitAll()   // 菜单公开
                .requestMatchers("/api/register").permitAll()               // 注册公开
                .requestMatchers("/api/admin/**").hasRole("ADMIN")          // 后台限店长
                .anyRequest().authenticated())                              // 其余需登录
            .httpBasic(org.springframework.security.config.Customizer.withDefaults());
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();   // 加盐 + 慢哈希,抗彩虹表与暴力破解
    }
}
```

注册时**加密**存储:

```java
@Service
public class UserService {
    private final UserMapper users;
    private final PasswordEncoder encoder;

    public UserService(UserMapper users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    public void register(String username, String rawPassword) {
        String hashed = encoder.encode(rawPassword);   // ★ 存哈希,不存原文
        users.insert(new User(username, hashed, "USER"));
    }
}
```

---

## 六、故意制造一个 Bug:明文存密码

图省事,注册时直接存原始密码:

```java
public void register(String username, String rawPassword) {
    users.insert(new User(username, rawPassword, "USER"));   // ← 故意:明文!
}
```

---

## 七、读懂现象:数据库一泄,全站沦陷

看一眼数据库:

```text
| username | password | role |
| alice    | 123456   | USER |     ← 明文!谁看到都能直接登录
```

密码列是**人眼可读的原文**。一旦数据库被拖库(备份泄露、注入、内鬼),**所有账号立刻沦陷**——而且很多人多站同一个密码,连累一片。用 BCrypt 后:

```text
| username | password                                                      |
| alice    | $2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq4XY...(60 位不可逆哈希)       |
```

哈希**单向不可逆**,自带随机盐(同样的密码每次哈希结果都不同),攻击者即便拿到也没法还原。登录时,Spring Security 用 `encoder.matches(输入, 哈希)` 比对,不还原、也能验证。

> **⏳ 版本时光机 · Spring Security 配置的换代**

| Spring Security 版本 | 配置写法 | 状态 |
|---|---|---|
| ≤ 5.6 | 继承 `WebSecurityConfigurerAdapter` 覆写 `configure()` | **已废弃并移除** |
| 5.7+ / 6 / 7 | 定义 `SecurityFilterChain` **@Bean** + lambda DSL | 现在的唯一正道 |

看到老教程还在 `extends WebSecurityConfigurerAdapter`,直接跳过——它在你用的版本里已经不存在了。

> **🎯 面试直击**:认证和授权有什么区别?密码为什么要哈希加盐?
> **认证(Authentication)= 你是谁**(核验身份,如密码比对);**授权(Authorization)= 你能干什么**(核验权限,如角色)。先认证后授权。密码存储:① **哈希**(单向不可逆),数据库泄露也拿不到原文;② **加盐**(每个密码配随机盐),让相同密码哈希不同,破掉彩虹表;③ 用 **BCrypt/Argon2** 这类**慢**哈希,故意拖慢每次计算以抵御暴力破解——**绝不用 MD5/SHA-1 存密码**(太快、易撞)。

---

## 八、用测试证明:未登录下单被拦

```java
@Test
void order_without_login_is_401() throws Exception {
    mvc.perform(post("/api/orders")
            .contentType("application/json")
            .content("{\"name\":\"美式\",\"qty\":1}"))
       .andExpect(status().isUnauthorized());   // 401:先证明你是谁
}

@Test
void password_is_hashed_not_plaintext() {
    var encoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
    String hashed = encoder.encode("123456");
    assertNotEquals("123456", hashed);            // 存的不是原文
    assertTrue(encoder.matches("123456", hashed)); // 但能验证
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v4.4

```text
新增:认证 + 授权门(Spring Security),密码 BCrypt 加密,按路径/角色控权
用到:SecurityFilterChain、authorizeHttpRequests、BCryptPasswordEncoder、401/403
还没有:该把这一季所有能力拼成一套完整、自洽的 REST 咖啡店 API 交付
        —— 下一话第四季大结局
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| Spring Security 认证授权 | 后端安全基本盘,JD 常列 |
| 密码哈希加盐 / BCrypt | 安全红线题,答错直接扣分 |
| 现代 SecurityFilterChain 配置 | 区分"看的是不是过时教程" |
| 认证 vs 授权 | 面试高频概念题 |

---

## 十一、下一话悬念

认证、授权、加密都齐了。是时候把 HTTP、Spring Boot、三层、MySQL、校验、安全**拼成一套完整的 REST 咖啡店 API**,正式交付第四季。

> 下一话《完整咖啡店 API》(第四季大结局):阿零把六话能力收拢成一套自洽的接口——注册登录、浏览菜单、下单扣库存、店长管理,配统一错误响应与测试,交付 Spring Boot 单体 v4,咖啡站正式"上网营业"。

---

## 🎯 随堂练习

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. 认证(Authentication)和授权(Authorization)的区别是?
   - A) 认证 = 你能干什么,授权 = 你是谁　B) **认证 = 你是谁**(核验身份),**授权 = 你能干什么**(核验权限),先认证后授权　C) 两者等价　D) 认证由前端做,授权由后端做
2. 密码明文存进数据库,最大的风险是?
   - A) 占空间　B) 一旦被拖库(备份泄露、注入、内鬼),所有账号立刻沦陷,还连累用户在其它站的同款密码　C) 查询变慢　D) 不符合语法
3. BCrypt 的三个关键特性是?
   - A) 可逆、快速、定长　B) 单向不可逆、自带随机盐、**慢**哈希　C) 对称加密、可解密、高性能　D) 压缩、加密、签名
4. 为什么**不能**用 MD5/SHA-1 存密码?
   - A) 输出太长　B) 它们太**快**,适合校验文件却便于暴力破解,且已有大量碰撞与彩虹表　C) 不支持中文　D) 已从 JDK 移除
5. 「加盐」主要防的是?
   - A) 暴力破解　B) 彩虹表 —— 让相同密码每次哈希结果都不同　C) 中间人攻击　D) SQL 注入
6. 存了哈希之后,登录时怎么验证?
   - A) 把哈希解密回原文比对　B) 用 `encoder.matches(输入, 哈希)`,不还原也能验证　C) 明文比对　D) 只能重置密码
7. Spring Security 5.7+ / 6 / 7 的正确配置方式是?
   - A) 继承 `WebSecurityConfigurerAdapter` 覆写 `configure()`　B) 定义 `SecurityFilterChain` **@Bean** + lambda DSL　C) 写 XML　D) 用 `@EnableGlobalMethodSecurity`
8. 看到老教程写 `extends WebSecurityConfigurerAdapter`,应该?
   - A) 照着抄　B) 直接跳过 —— 它已被废弃并移除　C) 加个 `@Deprecated` 继续用　D) 降级 Spring 版本
9. 未登录访问需要认证的接口,返回?
   - A) `403`　B) `401`(未认证);已登录但角色不够才是 `403`　C) `404`　D) `500`
10. `.requestMatchers(HttpMethod.GET, "/api/menu").permitAll()` 表达的是?
    - A) 菜单接口只有管理员能看　B) GET 菜单对所有人开放,无需登录　C) 禁止访问菜单　D) 菜单需要 ADMIN 角色

> [!答案]
> **1-B**　先证明你是谁,再看你能不能。**举一反三**:401 和 403 的区别正是这两步各自失败的结果。
> **2-B**　拖库即全站沦陷。**举一反三**:很多人多站同一密码,所以你存的明文会连累用户在别处的账号 —— 这是行业红线。
> **3-B**　不可逆 + 随机盐 + 故意慢。**举一反三**:BCrypt 的 cost 参数可调,硬件变快时调高一档就能维持破解成本。
> **4-B**　快就是原罪。**举一反三**:MD5/SHA 适合做文件校验和,不适合做密码 —— 用途不同,别混。
> **5-B**　盐让预计算表失效。**举一反三**:BCrypt 把盐直接编码进那 60 位哈希串里,所以不用单独存一列。
> **6-B**　用同样的盐重算再比对。**举一反三**:所以「找回密码」只能重置不能找回 —— 系统真的不知道你的原密码。
> **7-B**　`SecurityFilterChain` Bean 是现在的唯一正道。**举一反三**:配置从「继承覆写」转向「声明 Bean」,是 Spring 全线的设计走向。
> **8-B**　它在你用的版本里已经不存在了。**举一反三**:选教程先看 Spring Security 版本 —— 这个模块的 API 变动是全 Spring 生态最大的。
> **9-B**　401 是「你是谁我不知道」。**举一反三**:前端据此决定「跳登录页」还是「提示无权限」,混用会让用户体验很奇怪。
> **10-B**　`permitAll` 表示放行。**举一反三**:注意规则**从上往下匹配**,`anyRequest().authenticated()` 必须放最后,否则会把前面的放行规则吃掉。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*