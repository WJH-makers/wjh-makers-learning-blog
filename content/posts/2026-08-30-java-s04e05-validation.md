---
title: "《从零开始学 Java》37 · 参数校验与统一异常处理"
date: 2026-08-30
summary: "接口来者不拒:qty 传 -1 库存不减反增,出错还把 500 栈甩给前端。这一话用 Bean Validation 把脏输入挡在门外,用 @RestControllerAdvice 把异常收进统一投诉窗口。"
tags: [Java, Java漫画, 参数校验, 异常处理, Spring, 阿零与豆豆]
---

# 《从零开始学 Java》37 · 参数校验与统一异常处理

> 连载特刊 · 第四季「咖啡帝国」第 5 话 · 基线 Java 25 · Spring Boot 4.x(Jakarta EE 11)
> 承接:上一话数据落了库,但接口对脏输入毫无防备,异常还直接甩 500 栈。

---

## 一、需求:把脏输入挡在门外

`POST /api/orders` 现在来者不拒:`qty` 传 `-1`、`name` 传空字符串都能长驱直入。更糟的是——`qty = -1` 时,`qty > stock`(-1 > 3)为假,于是"扣库存"变成 `stock - (-1)`,**库存凭空多了一杯**。出了业务错,还把一大坨 500 错误栈原样甩给前端。豆豆:「一个健壮的 API,要在**门口就拦下脏数据**,并且**用统一、干净的格式**回报错误。」

---

## 二、漫画 · 门卫与投诉窗口

![《从零开始学 Java》37 · 参数校验与统一异常处理 —— 阿零与豆豆分镜漫画](/comics/java/s04e05-validation.png)

> **〔1〕** 接口门口新设一位**门卫**,手持清单:`name` 不能空、`qty` 必须为正。
> 豆豆:「`@Valid` 一挂,门卫(Bean Validation)就按注解逐条查。不合格的,**根本进不了后厨**。」

> **〔2〕** 大堂角落开了个**统一投诉窗口** `@RestControllerAdvice`,所有异常不管从哪层冒出来,都汇到这里处理。
> 豆豆:「以前异常各自乱窜、直接砸到顾客脸上(500 栈)。现在全走这个窗口,**翻译成干净的错误 JSON、配正确的状态码**再回。」

> **〔3〕** 阿零嫌门卫碍事,把 `@Valid` 摘了。一个 `qty = -1` 大摇大摆进来,库存不减反增。
> 阿零:「诶?我卖出去还越卖越多?」豆豆(叼豆子):「因为你把门卫辞了。**校验不是麻烦,是护栏。**」

> **〔4〕** 补回门卫,`qty = -1` 当场被拦,窗口回一句干净的 `400 杯数必须大于 0`。
> 豆豆:「记住分工:**4xx 是拦住客户端的错,5xx 才是我们自己的锅。** 参数错就该利落地回 400。」

---

## 三、本话目标

- 用 **Bean Validation**(`jakarta.validation`)给请求参数加约束;
- 用 `@Valid` 触发校验,把脏输入挡在 Controller 门口;
- 用 `@RestControllerAdvice` + `@ExceptionHandler` 统一处理异常;
- 给不同异常返回**恰当的状态码**(400/404/409)与统一错误体;
- 踩一次"没校验导致库存不减反增"的坑。

---

## 四、原理图:门卫 + 投诉窗口

```text
POST /api/orders  {name, qty}
      │
      ▼  @Valid 触发 Bean Validation(门卫)
   不合格 ──▶ 抛 MethodArgumentNotValidException
      │合格
      ▼
 CoffeeService.order() ──缺货──▶ 抛 OutOfStockException
      │                 ──无此单品──▶ 抛 IllegalArgumentException
      ▼
   所有异常都被 @RestControllerAdvice(统一投诉窗口)接住:
     MethodArgumentNotValidException → 400 INVALID_ARGUMENT
     IllegalArgumentException        → 404 NOT_FOUND
     OutOfStockException             → 409 OUT_OF_STOCK
   统一返回 { "code": "...", "message": "..." }
```

---

## 五、代码:校验 + 统一异常

请求体用 `record` 承载,直接挂校验注解:

```java
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record OrderRequest(
    @NotBlank(message = "单品名不能为空") String name,
    @Positive(message = "杯数必须大于 0")  int qty) {}
```

Controller 用 `@Valid` 触发校验(记得加依赖 `spring-boot-starter-validation`):

```java
@PostMapping("/orders")
public Coffee order(@Valid @RequestBody OrderRequest req) {   // @Valid = 门卫上岗
    return service.order(req.name(), req.qty());
}
```

统一异常处理器——一个类收住所有异常:

```java
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.util.stream.Collectors;

record ApiError(String code, String message) {}

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)              // 400:客户端参数错
    public ApiError onInvalid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ":" + f.getDefaultMessage())
            .collect(Collectors.joining("; "));
        return new ApiError("INVALID_ARGUMENT", msg);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)                // 404:菜单里没这款
    public ApiError onNotFound(IllegalArgumentException e) {
        return new ApiError("NOT_FOUND", e.getMessage());
    }

    @ExceptionHandler(OutOfStockException.class)
    @ResponseStatus(HttpStatus.CONFLICT)                 // 409:库存不足这类状态冲突
    public ApiError onOutOfStock(OutOfStockException e) {
        return new ApiError("OUT_OF_STOCK", e.getMessage());
    }
}
```

---

## 六、故意制造一个 Bug:把门卫辞了

删掉 Controller 参数上的 `@Valid`:

```java
public Coffee order(@RequestBody OrderRequest req) {   // ← 故意:没有 @Valid
    return service.order(req.name(), req.qty());
}
```

然后 `POST /api/orders` 传 `{"name":"美式","qty":-1}`。

---

## 七、读懂现象:库存越卖越多

没有校验,`qty = -1` 直达 Service。`qty > stock` → `-1 > 3` 为 **false**,跳过缺货检查;扣库存 `stock - qty` = `3 - (-1)` = **4**。卖出去反而多了一杯——**脏输入直接破坏了业务不变量**。这类 Bug 不报错、不崩溃,却在悄悄污染数据,比崩溃更可怕。

补回 `@Valid`,门卫在进 Service 之前就拦下,统一窗口回:

```json
{ "code": "INVALID_ARGUMENT", "message": "qty:杯数必须大于 0" }
```

状态码 `400`——干净利落地告诉前端"是你参数错了",而不是甩一坨栈。

> **⏳ 版本时光机 · 校验注解的包名迁移**

| 版本 | 校验注解包 | 说明 |
|---|---|---|
| Spring Boot 2 | `javax.validation.constraints.*` | Java EE 时代 |
| **Spring Boot 3 / 4** | `jakarta.validation.constraints.*` | Jakarta EE 迁移,`javax`→`jakarta`(升级时最常见的编译错就出在这) |

> **🎯 面试直击**:什么时候该返回 400,什么时候 500?
> **400(及 4xx)= 客户端的锅**:参数缺失/非法、格式错、没权限——你应当**主动校验并返回 4xx**,让调用方知道怎么改;**500 = 服务端的锅**:未预料的异常(空指针、数据库炸了)。铁律:**永远别把异常栈直接返回给前端**——既泄露实现细节(安全风险),又不友好。用 `@RestControllerAdvice` 统一兜底,已知业务异常给明确 4xx,未知异常给一个不含栈的 500。追问:`@RestControllerAdvice` 本质是 AOP,横切所有 `@RequestMapping` 方法,集中拦截异常。

---

## 八、用测试证明:脏输入被 400 挡下

```java
@Test
void negative_qty_is_rejected_with_400() throws Exception {
    mvc.perform(post("/api/orders")
            .contentType("application/json")
            .content("{\"name\":\"美式\",\"qty\":-1}"))
       .andExpect(status().isBadRequest())              // 400
       .andExpect(jsonPath("$.code").value("INVALID_ARGUMENT"));
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v4.3

```text
新增:请求参数校验(@Valid + Bean Validation)、统一异常处理(@RestControllerAdvice)
用到:jakarta.validation、@NotBlank/@Positive、@ExceptionHandler、恰当的 4xx 状态码
还没有:接口对谁都开放 —— 任何人都能改库存、下单,没有登录和权限
        —— 下一话加注册登录与 Spring Security
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| Bean Validation | 后端接口标配,CR 必看入参有没有校验 |
| 统一异常处理 | "健壮的 API" 的核心,面试常聊 |
| 状态码语义(400/404/409/500) | 前后端联调与设计的通用素养 |
| javax→jakarta 迁移认知 | Spring Boot 2→3 升级的高频踩点 |

---

## 十一、下一话悬念

接口健壮了,可它对谁都敞开大门:任何人都能改库存、下任意单。咖啡站得先认得出"你是谁""你能不能做这件事"。

> 下一话《注册登录与 Spring Security》:阿零给咖啡站装上认证授权门——密码加密存储、登录发凭证、按角色控制谁能改菜单谁只能下单,让 API 第一次有了"身份"的概念。

---

## 🎯 随堂练习

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. `@Valid` 加在 Controller 参数上的作用是?
   - A) 转换 JSON　B) 触发 Bean Validation,把脏输入挡在进 Service 之前　C) 记录日志　D) 开启事务
2. 去掉 `@Valid` 后传 `qty = -1`,会发生什么?
   - A) 报 400　B) `-1 > 3` 为 false 跳过缺货检查,库存 `3 - (-1)` 变成 **4** —— 卖出去反而多了一杯　C) 抛空指针　D) 订单被忽略
3. 上题这种 Bug 的可怕之处在于?
   - A) 会让服务崩溃　B) 不报错、不崩溃,却在悄悄污染数据　C) 只在高并发出现　D) 会拖慢接口
4. 参数非法应该返回哪个状态码?
   - A) `200`　B) `400`　C) `500`　D) `409`
5. 「库存不足」这类**状态冲突**最贴切的状态码是?
   - A) `400`　B) `404`　C) `409`　D) `403`
6. `@RestControllerAdvice` 的本质是?
   - A) 一个过滤器　B) AOP —— 横切所有 `@RequestMapping` 方法,集中拦截异常　C) 一个拦截器链　D) 一个 Servlet
7. 关于把异常栈直接返回给前端,正确的说法是?
   - A) 方便前端排查,应该返回　B) **绝不该** —— 既泄露实现细节(安全风险),又不友好　C) 只在测试环境返回即可　D) 由框架决定
8. Spring Boot 3/4 里校验注解的包名是?
   - A) `javax.validation.constraints.*`　B) `jakarta.validation.constraints.*`　C) `org.springframework.validation.*`　D) `java.validation.*`
9. 校验失败时 Spring 抛出的异常是?
   - A) `IllegalArgumentException`　B) `MethodArgumentNotValidException`　C) `ConstraintViolationException`(仅 `@RequestBody` 场景)　D) `ValidationFailedException`
10. 4xx 和 5xx 的归属划分是?
    - A) 4xx 服务端的锅、5xx 客户端的锅　B) **4xx 客户端的锅**(参数/权限/格式),**5xx 服务端的锅**(未预料的异常)　C) 都是服务端的锅　D) 由业务自行约定

> [!答案]
> **1-B**　门卫上岗,不合格的进不来。**举一反三**:校验放在最外层最省事 —— 越往里走,脏数据造成的破坏面越大。
> **2-B**　负数绕过了「大于库存」的判断。**举一反三**:所有「只判上界不判下界」的校验都有同类风险,和第 12 话的 `choice = -1` 是同一个错误家族。
> **3-B**　静默污染比崩溃更难查。**举一反三**:崩溃会立刻暴露,脏数据可能三个月后才被财务发现,修复成本天差地别。
> **4-B**　`400 Bad Request`。**举一反三**:配合统一错误体 `{code, message}`,前端才能精准提示用户改哪个字段。
> **5-C**　`409 Conflict` 表示「请求本身没问题,但当前状态不允许」。**举一反三**:重复下单、版本冲突、并发修改都适合 409。
> **6-B**　它是 AOP 的一个应用。**举一反三**:所以它能集中处理所有 Controller 的异常,而不必在每个方法里写 try-catch。
> **7-B**　栈里可能有类名、路径、SQL 片段。**举一反三**:已知业务异常给明确 4xx,未知异常给一个不含栈的 500,并把完整栈记进服务端日志。
> **8-B**　Jakarta EE 迁移。**举一反三**:Spring Boot 2→3 升级最常见的编译错就出在这个包名上。
> **9-B**　`@RequestBody` + `@Valid` 触发的是它。**举一反三**:而 `@RequestParam`/路径变量上的约束失败抛的是 `ConstraintViolationException`,两者要分别处理。
> **10-B**　分清归属才能定位责任。**举一反三**:接口设计时主动把可预期的错误映射成 4xx,能显著减少前后端扯皮。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*