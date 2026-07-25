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

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
