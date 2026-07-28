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

## 🎯 随堂练习
先自己做,再对答案。选择难度递进,解答从概念到综合,代码含边界验证。

### 一、选择题(10 道)
1. [基础]`@NotNull`、`@NotBlank`、`@NotEmpty` 对字符串的校验差异是?
- A) 三者完全等价　B) `@NotNull` 只拒绝 null;`@NotEmpty` 拒绝 null 和空串 "";`@NotBlank` 拒绝 null、""、纯空格"  "　C) `@NotBlank` 只拒绝 null　D) `@NotEmpty` 只用于集合
> [!答案] **1-B**　递进关系:`@NotNull`(null 不行)→`@NotEmpty`(null 和 "" 都不行)→`@NotBlank`(再加纯空格也不行)。**举一反三**:`@NotEmpty` 也可用于集合/数组,拒绝 null 和空集合;`@NotBlank` 仅用于字符串。

2. [进阶]`@Valid` 和 `@Validated` 的核心区别?
- A) 完全相同　B) `@Valid` 是 JSR-380 标准,`@Validated` 是 Spring 扩展,支持分组校验　C) `@Validated` 只在 Controller 层生效　D) `@Valid` 性能更好
> [!答案] **2-B**　`@Valid`(javax/jakarta.validation) 标准注解;`@Validated`(Spring) 额外支持**分组校验**(如新增和修改走不同校验规则)。**举一反三**:Controller 层两者都可用;Service 层方法参数校验需要用 `@Validated` 在类上 + `@Valid` 在参数上。

3. [深入]`@ControllerAdvice` 的核心作用是什么?
- A) 自动生成 Controller 代码　B) 全局统一处理异常,拦截所有 Controller 抛出的异常并返回一致格式的错误响应　C) 加速 HTTP 响应　D) 管理数据库连接
> [!答案] **3-B**　`@ControllerAdvice` + `@ExceptionHandler` = 全局异常处理,让每个 Controller 不用各自写 try-catch。**举一反三**:`@RestControllerAdvice` = `@ControllerAdvice` + `@ResponseBody`,纯 API 项目用这个。

4. [基础]Request 参数校验失败时,Spring 抛出什么异常?
- A) NullPointerException　B) MethodArgumentNotValidException　C) IllegalArgumentException　D) SQLException
> [!答案] **4-B**　`@Valid` 校验 `@RequestBody` 失败时抛 `MethodArgumentNotValidException`;校验 `@RequestParam`/`@PathVariable` 失败抛 `ConstraintViolationException`。**举一反三**:`@ControllerAdvice` 中捕获这两个异常分别处理,取出 `BindingResult` 中的字段错误详情。

5. [进阶]DTO(Data Transfer Object)相比直接使用 `@Entity` 做请求参数,优势不包括?
- A) 前端要的字段和数据库字段可以不同　B) 校验注解只影响传入数据,不影响实体设计　C) 避免暴露数据库内部结构给前端　D) 运行速度更快
> [!答案] **5-D**　DTO 不是为了性能,而是**解耦**:API 契约和数据库模型独立演化。**举一反三**:MapStruct 或手写 `toEntity()/toDto()` 可规范化转换,避免散落的 getter/setter 赋值。

6. [深入]`@Min(1) @Max(100)` 标注在 `int quantity` 字段上,传入 `quantity=0` 时校验结果?
- A) 通过(0 是合法的 int)　B) 失败——`@Min(1)` 要求值 >= 1,0 不满足　C) 取决于数据库约束　D) 仅在保存到数据库时报错
> [!答案] **6-B**　`@Min(1)` 表示最小值(含)为 1,0 < 1 校验失败;`@Min(value=1)` 和 `@Max(value=100)` 的边界值都是包含的。**举一反三**:`@DecimalMin`/`@DecimalMax` 用于 BigDecimal,String 类型的数值校验;`@Positive` 和 `@Negative` 更语义化。

7. [基础]以下哪个注解用于校验字符串长度?
- A) `@Length`　B) `@Size`　C) `@Range`　D) A 和 B 都可以
> [!答案] **7-D**　`@Size(max=50)`(JSR-380,通用)和 `@Length(min=1,max=50)`(Hibernate 扩展,仅字符串)都能校验长度。**举一反三**:`@Size` 也可用于 Collection/Map/Array——"大小"语义通用;`@Length` 语义专属于字符串。

8. [进阶]自定义校验注解(如 `@ValidPhone`)需要哪些组成?
- A) 只需注解定义　B) 注解定义 + `ConstraintValidator` 实现类　C) 只需实现类　D) 自动生成,无需手写
> [!答案] **8-B**　自定义校验 = `@interface` 注解(加上 `@Constraint(validatedBy=PhoneValidator.class)`)+ `ConstraintValidator<ValidPhone,String>` 实现类的 `isValid()` 方法。**举一反三**:`ConstraintValidatorContext` 可自定义错误消息;组合已有注解也能实现部分场景(如 `@NotNull @Size(max=11) @Pattern(regexp="1[3-9]\\d{9}")`)。

9. [深入]校验注解中 `message="{coffee.name.notblank}"` 的含义?
- A) 硬编码错误消息　B) 引用 i18n 消息文件(如 `ValidationMessages.properties`)中的 key,支持国际化　C) 自动翻译成多语言　D) 仅用于日志
> [!答案] **9-B**　`{key}` 语法从 `ValidationMessages.properties`(或 Spring 的 `messages.properties`)中查找对应语言的错误消息。**举一反三**:Spring Boot 自动注册 `MessageSource`,配合 `Locale` 实现校验消息国际化。

10. [综合]`@Valid` 在校验嵌套对象时(如 OrderDTO 内含 List<OrderItemDTO> 字段),需要额外做什么?
- A) 什么都不用做,自动校验嵌套　B) 在嵌套字段上也加 `@Valid` 注解,才能触发级联校验　C) 嵌套对象不能校验　D) 使用 `@Validated` 替代
> [!答案] **10-B**　`@Valid` 不会自动穿透到嵌套对象——必须在字段上再加 `@Valid`:`private @Valid List<OrderItemDTO> items;`。**举一反三**:分组校验时,嵌套对象的 `@Valid` 也需要显式标注,否则内层校验不触发。

### 二、解答题(3 道)
1. [概念]为什么建议用 DTO 接收请求参数而非直接使用 `@Entity`?至少列出三个理由。
> [!答案] **1**　①解耦:API 需要的字段和数据库表字段常常不同(如注册需"确认密码"字段,DB 不存);②安全:避免"Mass Assignment"攻击——恶意用户可能传 `isAdmin=true` 字段,若直接绑定 Entity 会意外修改权限字段;③校验隔离:DTO 上的校验注解只管输入合法性,不影响 Entity 的持久化逻辑。**举一反三**:DTO 还支持组装多个实体的字段(如"订单详情"DTO 同时包含用户和商品信息),前端一次拿到全部所需数据。

2. [场景]咖啡站的"注册"和"修改个人信息"都需要校验手机号,但注册时手机号必填,修改时可选。如何用同一个 UserDTO 同时满足两种校验规则?
> [!答案] **2**　使用**校验分组(Validation Groups)**。定义两个接口 `Create.class` 和 `Update.class`,在 DTO 字段上标注 `@NotBlank(groups=Create.class)`,Controller 中用 `@Validated(Create.class) @RequestBody UserDTO` 或 `@Validated(Update.class)` 区分。必填/可选由不同的 group 控制,同一个 DTO 复用于不同场景。**举一反三**:分组不宜过多(通常 2~3 组),否则维护成本上升——如"注册"和"修改"差异太大,直接定义两个独立 DTO 反而更清晰。

3. [综合]描述一次校验失败从"请求进入 Controller"到"前端收到错误响应"的完整流程,包括涉及的类、异常、和 `@ControllerAdvice` 如何处理。
> [!答案] **3**　①请求进入 Controller → `@Valid @RequestBody CoffeeDTO dto` 触发校验 → ②Validator 遍历 DTO 上所有注解,发现 `name` 为空 → ③Spring 抛出 `MethodArgumentNotValidException`,内含 `BindingResult`(每个字段的错误详情) → ④`@RestControllerAdvice` 中 `@ExceptionHandler(MethodArgumentNotValidException.class)` 捕获 → ⑤取出 `FieldError` 列表,组装成统一格式:`{"code":400,"message":"name: 咖啡名不能为空","data":null}` → ⑥返回 HTTP 400 给前端。**举一反三**:Handler 中通过 `ex.getBindingResult().getFieldErrors().stream().map(e->e.getField()+":"+e.getDefaultMessage()).collect(joining("; "))` 即可提取所有字段错误。

### 三、代码题(2 道)
1. [基础]定义 `CreateCoffeeDTO`:(name 必填不超 30 字;price 必须正数;stock 0~999),写一个 Controller 的 `POST /api/coffee` 方法接收并校验它。校验失败返回 400 + 字段错误详情。
> [!答案] **1 验收**:
> ```java
> class CreateCoffeeDTO {
>     @NotBlank @Size(max=30) private String name;
>     @Positive private BigDecimal price;
>     @Min(0) @Max(999) private Integer stock;
>     // getters/setters
> }
> 
> @RestController @RequestMapping("/api/coffee")
> class CoffeeController {
>     @PostMapping
>     public ResponseEntity<Coffee> create(@Valid @RequestBody CreateCoffeeDTO dto) {
>         return ResponseEntity.status(201).body(service.create(dto));
>     }
> }
> 
> @RestControllerAdvice
> class GlobalExceptionHandler {
>     @ExceptionHandler(MethodArgumentNotValidException.class)
>     public ResponseEntity<Map<String,Object>> handle(MethodArgumentNotValidException ex) {
>         String msg = ex.getBindingResult().getFieldErrors().stream()
>                 .map(e -> e.getField() + ": " + e.getDefaultMessage())
>                 .collect(Collectors.joining("; "));
>         return ResponseEntity.badRequest().body(Map.of("error", msg));
>     }
> }
> ```
> **举一反三**:`BindingResult` 放在 Controller 方法参数中可手动处理校验结果,不经过全局异常处理器。

2. [综合]写一个 `@WebMvcTest` 测试,验证:①正常请求返回 201;②name 为空返回 400 + 错误消息含 "name";③price 为负数返回 400;④stock 超过 999 返回 400。每个测试用例都验证具体错误字段在响应中。
> [!答案] **2 验收**:
> ```java
> @WebMvcTest(CoffeeController.class)
> @AutoConfigureMockMvc
> class CoffeeControllerTest {
>     @Autowired MockMvc mvc;
>     @MockBean CoffeeService service;
> 
>     @Test void create_valid_returns201() throws Exception {
>         mvc.perform(post("/api/coffee").contentType(APPLICATION_JSON)
>                 .content("{\"name\":\"美式\",\"price\":15,\"stock\":100}"))
>            .andExpect(status().isCreated());
>     }
> 
>     @Test void create_emptyName_returns400() throws Exception {
>         mvc.perform(post("/api/coffee").contentType(APPLICATION_JSON)
>                 .content("{\"name\":\"\",\"price\":15,\"stock\":100}"))
>            .andExpect(status().isBadRequest())
>            .andExpect(jsonPath("$.error").value(containsString("name")));
>     }
> 
>     @Test void create_negativePrice_returns400() throws Exception {
>         mvc.perform(post("/api/coffee").contentType(APPLICATION_JSON)
>                 .content("{\"name\":\"美式\",\"price\":-1,\"stock\":100}"))
>            .andExpect(status().isBadRequest());
>     }
> 
>     @Test void create_stockExceed_returns400() throws Exception {
>         mvc.perform(post("/api/coffee").contentType(APPLICATION_JSON)
>                 .content("{\"name\":\"美式\",\"price\":15,\"stock\":1000}"))
>            .andExpect(status().isBadRequest());
>     }
> }
> ```
> **举一反三**:四个测试覆盖"正常"和三种"边界失败"——这是参数校验的**基本测试矩阵**:有效值、null、超界、边界值。

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
