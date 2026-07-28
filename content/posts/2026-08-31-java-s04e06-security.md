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
先自己做,再对答案。选择难度递进,解答从概念到综合,代码含边界验证。

### 一、选择题(10 道)
1. [基础]认证(Authentication)和授权(Authorization)的区别是什么?
- A) 两者完全相同　B) 认证="你是谁"(确认身份,如密码比对),授权="你能做什么"(检查权限,如角色)　C) 认证在 Controller 层,授权在 Filter 层　D) 认证用 JWT,授权用 Session
> [!答案] **1-B**　认证 = 验身份(登录、验密码);授权 = 验权限(ADMIN 能改菜单,USER 只能下单)。**举一反三**:401 Unauthorized 实际含义是"未认证"(没登录),403 Forbidden 才是"未授权"(登录了但没权限)——HTTP 状态码命名有历史遗留问题,面试常考区分。

2. [进阶]Spring Security 6+ 中,正确的安全配置方式是?
- A) 继承 `WebSecurityConfigurerAdapter`　B) 定义 `SecurityFilterChain` Bean,用 lambda DSL 配置　C) 写 XML 配置文件　D) 在 Controller 上加注解
> [!答案] **2-B**　Spring Security 5.7+ 废弃了 `WebSecurityConfigurerAdapter`,6+ 版本彻底移除。正确做法:定义 `@Bean SecurityFilterChain`,通过 `HttpSecurity` 的 lambda DSL 配置规则。**举一反三**:看到老教程还在 `extends WebSecurityConfigurerAdapter`,直接跳过——它在你用的版本里已经不存在了。

3. [深入]`BCryptPasswordEncoder` 对同一密码每次编码结果不同,为什么?
- A) 编码算法有随机性 bug　B) 内置随机盐(Salt),每次生成不同随机盐导致结果不同——但 `matches()` 方法能从密文中提取盐值再比对　C) 编码错误　D) 需要手动保存盐值
> [!答案] **3-B**　BCrypt 自动生成随机盐并嵌入结果(密文前缀 `$2a$10$`),所以相同明文每次得出不同密文;`encoder.matches(raw, encoded)` 能从密文中提取盐值再比对。**举一反三**:这是 BCrypt 的安全优势——即使两个用户密码相同,数据库里的密文也不同,无法通过密文反推相同密码;相较之下 MD5/SHA-1 不加盐,相同密码产出相同哈希,彩虹表一击即中。

4. [基础]`SecurityFilterChain` Bean 中的 `authorizeHttpRequests` 用来做什么?
- A) 连接数据库　B) 定义路径级别的安全规则:哪些路径放行(`permitAll`)、哪些需认证(`authenticated`)、哪些限特定角色(`hasRole`)　C) 生成 JWT Token　D) 加密请求参数
> [!答案] **4-B**　`authorizeHttpRequests(auth -> auth.requestMatchers("/api/menu").permitAll().requestMatchers("/api/admin/**").hasRole("ADMIN").anyRequest().authenticated())` 定义整个应用的访问控制矩阵。**举一反三**:匹配顺序遵循"先声明的优先"——把放行的路径写在前面,`anyRequest()` 写在最后兜底。

5. [进阶]密码为什么要用 BCrypt 这种"慢哈希"而不是 MD5/SHA-1?
- A) BCrypt 加密更强　B) BCrypt 是**故意慢**的计算密集型算法——每次哈希耗时可配(`$2a$10$` 中的 10 是 cost factor),暴力破解时攻击者每尝试一次都要付出同样代价,让大规模撞库变得不可行　C) BCrypt 更快　D) MD5 已被破解
> [!答案] **5-B**　安全性不是靠"算法神秘",而是靠"暴力破解的成本"。MD5/SHA-1 太快——一秒能算几十亿次,字典攻击几秒出结果。BCrypt 将每次哈希人为拖慢(如 100ms),对正常登录几乎无感,对攻击者却是天文数字的代价。**举一反三**:Argon2 是新一代"慢哈希",内存消耗可配,抗 GPU 并行破解更强——新项目可优先考虑。

6. [深入]数据库存储的 BCrypt 密文以 `$2a$10$` 开头,各段含义是?
- A) 加密密钥　B) `$2a`=算法版本,`$10`=cost factor(2^10=1024 轮迭代),后面是 22 位 salt + 31 位哈希值　C) 用户 ID 和密码　D) 随机生成的盐值
> [!答案] **6-B**　BCrypt 密文自包含所有验证所需信息:算法版本、cost factor、盐值、哈希值——不需要额外存盐。验证时 `matches()` 从密文中解析这些参数重新算一遍比对。**举一反三**:cost factor 每+1,计算量翻倍;登录场景 10~12 是合理起点(约 100~400ms),过高影响用户体验。

7. [基础]以下哪个路径配置表示"只有 ADMIN 角色能访问后台管理"?
- A) `.requestMatchers("/api/admin/**").authenticated()`　B) `.requestMatchers("/api/admin/**").hasRole("ADMIN")`　C) `.requestMatchers("/api/admin/**").permitAll()`　D) `.anyRequest().hasRole("ADMIN")`
> [!答案] **7-B**　`hasRole("ADMIN")` 检查用户是否有 `ROLE_ADMIN` 权限——ADMIN 角色才能访问。`authenticated()` 只要求登录,不限角色;`permitAll()` 完全开放。**举一反三**:`hasAnyRole("ADMIN","STAFF")` 允许多角色;`hasAuthority("order:create")` 可做更细粒度的权限控制(权限字符串)。

8. [进阶]明文存密码的危害是?
- A) 没有危害　B) 数据库一旦泄露,攻击者直接看到所有人的原始密码——且很多人多站用同一个密码,连带其他平台账号沦陷　C) 查询变慢　D) 只影响性能
> [!答案] **8-B**　明文存密码 = 把所有用户的密码裸放在数据库里。一旦通过 SQL 注入、备份泄露、内鬼等途径被拖库,**所有账号立刻沦陷**。更致命的是"撞库"——拿到这套用户名/密码后,攻击者会去其他网站试(微信、邮箱、网银),一个站泄露连累全网。**举一反三**:BCrypt 哈希后,即使数据库被拖走,攻击者也拿不到原始密码——这就是**防御纵深**:每一层都假设上一步已经失守。

9. [深入]`httpBasic(Customizer.withDefaults())` 的作用是什么?
- A) 开启 OAuth2 登录　B) 开启 HTTP Basic 认证——浏览器弹出用户名密码对话框,每次请求带 `Authorization: Basic base64(user:pass)` 头　C) 开启 JWT 验证　D) 开启 CSRF 保护
> [!答案] **9-B**　HTTP Basic Auth 将用户名密码用 Base64 编码放进请求头,简单直接。**举一反三**:Base64 是**编码**不是加密——可逆,所以必须搭配 HTTPS,否则网络嗅探就能拿到原始密码。生产环境多改用 JWT Token 或 Session Cookie 做认证,token 本身不暴露密码。

10. [综合]Spring Security 的过滤器链中,安全规则检查的执行顺序是?
- A) 随机顺序　B) 按 `requestMatchers` 声明的**先后顺序**依次匹配,第一个匹配的规则生效,后续不再检查——所以 `permitAll()` 的路径要写在 `anyRequest()` 前面　C) 按路径长度从长到短　D) 按方法(GET/POST)分组
> [!答案] **10-B**　Spring Security 的匹配规则是"先到先得"——`requestMatchers("/api/menu").permitAll()` 写在前面,`/api/menu` 就无条件放行;然后 `anyRequest().authenticated()` 兜底所有未匹配的路径。如果顺序写反,`anyRequest()` 先匹配了所有请求,后面的规则全失效。**举一反三**:同一个应用可以有多个 `SecurityFilterChain` Bean(API 用 JWT、管理后台用 Session),用 `@Order` 控制优先级,同样先匹配的先生效。

### 二、解答题(3 道)
1. [概念]用自己的话解释"认证→授权"两步流程,并说明 BCrypt 在这两步中各自扮演什么角色。
> [!答案] **1**　①认证阶段(你是谁):用户提交用户名+原始密码 → Spring Security 从数据库查出该用户的 BCrypt 密文 → 调用 `encoder.matches(原始, 密文)` 比对 → 比对通过则创建认证成功的 `Authentication` 对象。BCrypt 在认证阶段的作用是"验密码":不还原原文,只比对。②授权阶段(你能做什么):认证通过后,SecurityContext 里保存了用户的角色信息 → 请求后续经过 `authorizeHttpRequests` 规则或 `@PreAuthorize` 注解 → 对比用户角色和路径所需角色 → 通过则放行,不通过返回 403。BCrypt 在授权阶段**不参与**——授权只看角色/权限。**举一反三**:认证和授权的依赖关系——先认证(拿到身份盒),后授权(根据盒里的角色权限做判断),两个阶段串行、职责清晰。

2. [场景]咖啡站的权限设计:顾客(USER)只需下单和查菜单,店长(ADMIN)还需管理菜单和用户。请写出 `SecurityFilterChain` 的完整配置代码,并为"下单接口需登录、管理菜单需 ADMIN、其余需认证、注册和菜单开放"这四条规则排好顺序。
> [!答案] **2**　`http.authorizeHttpRequests(auth -> auth.requestMatchers("/api/register").permitAll().requestMatchers(HttpMethod.GET, "/api/menu").permitAll().requestMatchers("/api/admin/**").hasRole("ADMIN").anyRequest().authenticated()).httpBasic(Customizer.withDefaults());`。关键顺序:公开路径(`register`/`menu GET`)最前→管理员路径次之→`anyRequest().authenticated()` 兜底。注意 `menu` 的 GET 开放但 POST/PUT/DELETE `menu` 应限制——用 `HttpMethod.GET` 细化方法级控制。**举一反三**:如果 ADMIN 也有下单需求,用 `hasAnyRole("USER","ADMIN")` 允许两个角色访问下单接口——别让 ADMIN 登录后反而无法下单。

3. [综合]从"密码存储、验证流程、安全缺陷"三个角度,分析"明文存密码"为什么是致命的,以及 BCrypt 如何逐一解决这些缺陷。
> [!答案] **3**　①密码存储:明文→攻击者获取数据库即获取所有密码;BCrypt→数据库存的是 `$2a$10$...` 密文,不可逆,拖库也拿不到原文。②验证流程:明文→直接 `equals()` 比对;BCrypt→`encoder.matches(raw,encoded)` 从密文中提取算法版本 + cost + salt + 哈希值,重新算一遍比对——能验证、不能还原。③安全缺陷:明文→无盐,相同密码密文相同,100 个用户用 `123456` 一眼全暴露;BCrypt→自动加盐,相同密码哈希结果不同,且慢哈希让暴力破解的计算成本从"几秒"变成"几百年"。**根本原则**:密码的底线永远是**不可逆**——存密文而非明文,验证用比对而非解密。BCrypt/Argon2/scrypt 都遵循这个原则。**举一反三**:即使是加密(可逆),密钥也可能泄露——所以密码存储永远该用**单向哈希加盐**,而不是加密。

### 三、代码题(2 道)
1. [基础]写一个 `SecurityConfig` 类:放行 `GET /api/menu` 和 `/api/register`,`/api/admin/**` 限 ADMIN 角色,其余需认证;配置 BCrypt 密码编码器;使用 HTTP Basic 认证。
> [!答案] **1 验收**:
> ```java
> @Configuration
> @EnableWebSecurity
> class SecurityConfig {
>     @Bean
>     SecurityFilterChain chain(HttpSecurity http) throws Exception {
>         http.authorizeHttpRequests(auth -> auth
>                 .requestMatchers(HttpMethod.GET, "/api/menu").permitAll()
>                 .requestMatchers("/api/register").permitAll()
>                 .requestMatchers("/api/admin/**").hasRole("ADMIN")
>                 .anyRequest().authenticated())
>             .httpBasic(Customizer.withDefaults());
>         return http.build();
>     }
>     @Bean
>     PasswordEncoder encoder() { return new BCryptPasswordEncoder(); }
> }
> ```
> **举一反三**:如果不需要浏览器弹出登录框,生产可用 Session + 表单登录(`formLogin()`)或 JWT Token 替代 HTTP Basic。

2. [综合]写一个测试,验证:①未登录访问 `/api/orders` 返回 401;②用合法用户(需注入 UserDetailsService)访问 `/api/orders` 返回 200;③密码存储为 BCrypt 密文而非原文;④同一密码两次哈希结果不同(证明有随机盐)。用 `@SpringBootTest` + `@AutoConfigureMockMvc` + `@WithMockUser` 注解实现。
> [!答案] **2 验收**:
> ```java
> @SpringBootTest
> @AutoConfigureMockMvc
> class SecurityTest {
>     @Autowired MockMvc mvc;
> 
>     @Test
>     void order_without_auth_returns_401() throws Exception {
>         mvc.perform(post("/api/orders").contentType("application/json")
>                 .content("{\"name\":\"美式\",\"qty\":1}"))
>            .andExpect(status().isUnauthorized());
>     }
> 
>     @Test
>     @WithMockUser(username = "alice", roles = "USER")
>     void order_with_auth_returns_200() throws Exception {
>         mvc.perform(post("/api/orders").contentType("application/json")
>                 .content("{\"name\":\"美式\",\"qty\":1}"))
>            .andExpect(status().isOk());
>     }
> 
>     @Test
>     void password_is_hashed_not_plaintext() {
>         var encoder = new BCryptPasswordEncoder();
>         String hashed = encoder.encode("123456");
>         assertNotEquals("123456", hashed, "存的不能是原文");
>         assertTrue(hashed.startsWith("$2a$"), "BCrypt 密文以 $2a$ 开头");
>     }
> 
>     @Test
>     void same_password_hashes_differently() {
>         var encoder = new BCryptPasswordEncoder();
>         String h1 = encoder.encode("123456");
>         String h2 = encoder.encode("123456");
>         assertNotEquals(h1, h2, "相同密码两次哈希必须不同——证明含随机盐");
>         assertTrue(encoder.matches("123456", h1));
>         assertTrue(encoder.matches("123456", h2));
>     }
> }
> ```
> **举一反三**:`@WithMockUser` 是测试安全规则的神器——无需真实登录,直接 mock 一个已认证用户,专注测"已认证后的权限控制";生产测试建议配合 `@SpringBootTest` 验证完整的过滤器链行为。

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
