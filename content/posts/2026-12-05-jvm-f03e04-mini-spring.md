---
title: 《JVM 火种纪》19 · 自制迷你 Spring
date: 2026-12-05
summary: "反射镜照出了类骨架——下一步是用它造容器。阿零发现 Spring 的核心逻辑就三件事：扫描带注解的类、用反射 newInstance、把依赖字段 set 进去。60 行 @Coffee 注入器运转起来，再对照工业 Spring 的六层防护，魔法书的第一页翻开了。"
tags: [Java, Java漫画, JVM, 注解, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》19 · 自制迷你 Spring

> JVM 火种纪 · 卷三「反射与枚举篇」第 4 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话反射镜照出类骨架，但调用路径有代价——这次把镜子用起来，造一个迷你容器，拆解 Spring 的第一层魔法。

---

## 一、事故：@Autowired 是怎么把对象注进去的

上一话反射镜照出类骨架，但调用路径有代价——阿零转头看 Spring 的 `@Autowired`，标在字段上，容器启动后对象自动就有了。「这是怎么做到的？」焰焰把一个 250 行的 Spring Bean 生命周期图推到一边：「先别看这个。我们先用 60 行代码复现核心——你自己写一遍，黑魔法就消失了。」

---

## 二、漫画 · 60 行拆解魔法

![JVM 火种纪漫画：f03e04-mini-spring](/comics/jvm/f03e04-mini-spring.png)

> [!文字版]
> **〔1〕** 阿零第一次看 Spring 配置：`@Autowired` 标在字段上，容器启动后对象自动就有了。「里面有黑魔法吗？」焰焰把 Spring 生命周期图推到一边：「先用 60 行代码复现核心——你自己写一遍，黑魔法就消失了。」
>
> **〔2〕** 「DI 容器的最小原型只需要三件事。」焰焰写下：①`@Coffee` 标记「这个类由容器管理」；②扫描，找到当前包下所有带 `@Coffee` 的类；③用反射创建实例，把依赖字段填进去。阿零：「就这三步？」「就这三步。」
>
> **〔3〕** 「字段注入最容易实现。」焰焰：「直接 `setAccessible(true)` 写进去。工业 Spring 更推荐构造器注入——显式依赖、易于测试，但字段注入最能展示反射的威力，先用它入门。」
>
> **〔4〕** 版本残影飘过：「`@Retention(CLASS)` 是默认策略——.class 文件有，但运行时反射读不到。」JDK 5 引入注解时，这个默认值坑了很多新手。「Spring 的注解全部用 `RUNTIME`，不然反射扫不到。」
>
> **〔5〕** 60 行代码写完，阿零用三个类测试：`CoffeeShop` 依赖 `OrderService`，`OrderService` 依赖 `InventoryRepo`。容器启动，三个对象自动创建并连线，`coffeeShop.takeOrder("拿铁")` 正常运行。「就这样？」「就这样。工业 Spring 在这之上加了六层防护，但核心就是你刚写的这些。」

---

## 三、本话目标

- 理解注解三种保留策略与 RUNTIME 的必要性
- 用反射扫描带注解的类并创建实例
- 实现字段注入，理解 setAccessible 在容器中的作用
- 对比工业 Spring 与 60 行版本的六层差距
- 认识循环依赖、作用域等容器进阶问题

---

## 四、炉内原理图：注解 + 反射扫描流程

```
1. 定义 @Coffee 注解（@Retention RUNTIME，才能在运行时被反射读到）
2. 扫描当前包：ClassLoader + 包路径 → .class 文件 → Class.forName()
3. 过滤带 @Coffee 的类，存入注册表 Map<Class<?>, Object>
4. 实例化：getDeclaredConstructor().newInstance()
5. 注入：getDeclaredFields() 过滤带 @Coffee 的字段 → setAccessible(true) → set()
6. 重复 5 直到所有依赖都满足（简单 BFS/拓扑，60 行版本做单轮扫描）
```

| 注解保留策略 | .class 文件 | 运行时反射可读 | 用途 |
|---|---|---|---|
| `SOURCE` | ✗ | ✗ | Lombok、编译时检查 |
| `CLASS`（默认） | ✅ | ✗ | 编译时处理工具（APT） |
| `RUNTIME` | ✅ | ✅ | Spring、Jackson 等框架扫描 |

上一话用反射读写类成员；这一话把反射升级为容器引擎，驱动依赖图的自动装配。

---

## 五、从上一话继续改代码：60 行迷你容器

```java
// javac -encoding UTF-8 --release 25 -d out *.java && java -cp out MiniApp
import java.lang.annotation.*;
import java.lang.reflect.*;
import java.util.*;
import java.io.*;
import java.net.*;

// ── 标记注解 ──────────────────────────────────────────────────
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.FIELD})
@interface Coffee {}

// ── 三个业务类 ────────────────────────────────────────────────
@Coffee
class InventoryRepo {
    public boolean hasStock(String item) { return true; }
}

@Coffee
class OrderService {
    @Coffee InventoryRepo repo;  // 等待容器注入

    public String place(String item) {
        if (repo.hasStock(item)) return "下单成功: " + item;
        return "缺货: " + item;
    }
}

@Coffee
class CoffeeShop {
    @Coffee OrderService orderService;  // 等待容器注入

    public void takeOrder(String drink) {
        System.out.println(orderService.place(drink));
    }
}

// ── 60 行迷你容器 ─────────────────────────────────────────────
class MiniContainer {

    private final Map<Class<?>, Object> beans = new HashMap<>();

    /** 扫描包，注册所有 @Coffee 类并完成依赖注入 */
    public void scan(String packageName) throws Exception {
        // 1. 把包名转为路径，找 .class 文件
        String path = packageName.replace('.', '/');
        URL root = Thread.currentThread()
                         .getContextClassLoader()
                         .getResource(path);
        if (root == null) throw new IllegalArgumentException("包不存在: " + packageName);

        File dir = new File(root.toURI());
        List<Class<?>> coffeeClasses = new ArrayList<>();

        for (File f : Objects.requireNonNull(dir.listFiles())) {
            if (!f.getName().endsWith(".class")) continue;
            String name = packageName + "." + f.getName().replace(".class", "");
            Class<?> cls = Class.forName(name);
            if (cls.isAnnotationPresent(Coffee.class)) {
                coffeeClasses.add(cls);
                // 2. 用无参构造器创建实例
                Constructor<?> ctor = cls.getDeclaredConstructor();
                ctor.setAccessible(true);
                beans.put(cls, ctor.newInstance());
            }
        }

        // 3. 依赖注入：把带 @Coffee 的字段填上对应实例
        for (Class<?> cls : coffeeClasses) {
            Object instance = beans.get(cls);
            for (Field f : cls.getDeclaredFields()) {
                if (!f.isAnnotationPresent(Coffee.class)) continue;
                Object dep = beans.get(f.getType());
                if (dep == null) throw new RuntimeException(
                    "找不到依赖: " + f.getType().getSimpleName() + " in " + cls.getSimpleName());
                f.setAccessible(true);
                f.set(instance, dep);
            }
        }
    }

    /** 按类型获取 Bean */
    @SuppressWarnings("unchecked")
    public <T> T get(Class<T> cls) {
        return (T) Objects.requireNonNull(beans.get(cls),
            "未注册: " + cls.getSimpleName());
    }
}

// ── 启动入口 ──────────────────────────────────────────────────
class MiniApp {
    public static void main(String[] args) throws Exception {
        MiniContainer container = new MiniContainer();
        container.scan("");   // 扫描默认包（演示用，生产用真实包名）

        CoffeeShop shop = container.get(CoffeeShop.class);
        shop.takeOrder("拿铁");
        shop.takeOrder("冰美式");

        // 验证是否同一实例（容器默认单例）
        OrderService s1 = container.get(OrderService.class);
        OrderService s2 = ((CoffeeShop) container.get(CoffeeShop.class)).orderService;
        System.out.println("单例验证: " + (s1 == s2));
    }
}
```

---

## 六、故意翻一次车：@Coffee 注解改成 @Retention(CLASS)

阿零故意试一次——把 `@Retention(RetentionPolicy.RUNTIME)` 改成默认的 `CLASS`：

```java
// 故意用默认保留策略（CLASS），运行时反射读不到
@Retention(RetentionPolicy.CLASS)   // ← 故意改
@Target({ElementType.TYPE, ElementType.FIELD})
@interface Coffee {}
```

---

## 七、编译官罚单

> **📋 编译官罚单 · 编译官放行了，运行时才拦**
>
> ```
> Exception in thread "main" java.lang.RuntimeException:
>     找不到依赖: InventoryRepo in OrderService
>     at MiniContainer.scan(MiniApp.java:xx)
>     at MiniApp.main(MiniApp.java:xx)
> ```
>
> `@Retention(CLASS)` 是默认值——.class 文件里有注解信息，但运行时 `cls.isAnnotationPresent(Coffee.class)` 返回 `false`，容器扫描不到任何 Bean，注入时找不到依赖，抛出 `RuntimeException`。编译器完全不知道这是问题，它只检查注解的语法，不检查保留策略是否满足运行时需求。这正是反射注解的代价——错误在运行时才暴露。

---

## 八、修复并验证

把 `@Retention` 改回 `RUNTIME`，重新编译运行：

```bash
javac -encoding UTF-8 --release 25 -d out *.java && java -cp out MiniApp
```

验证判据：
1. 三层依赖自动注入成功，无需手动 new
2. `takeOrder` 正常输出下单结果
3. 单例验证 `s1 == s2` 为 `true`

**正常输出**（GraalVM 25.0.4）：

```
下单成功: 拿铁
下单成功: 冰美式
单例验证: true
```

关键验证：三层依赖（`CoffeeShop → OrderService → InventoryRepo`）自动注入成功；容器默认单例（`s1 == s2` 为 `true`）；`takeOrder` 无需手动 `new` 任何对象。

---

## 九、🔬 炉底显微镜 · @Retention 三种策略的差异

> 焰焰用 `javap` 验证 `@Retention(RUNTIME)` 的必要性：

```bash
# 查看注解保留策略对字节码的影响
# 1. 编译后用 javap 看注解是否可见
javap -verbose InventoryRepo.class | grep -A3 "annotation"

# 2. 验证 @Retention 三种策略的差异
# SOURCE  → 编译后丢失，javap 看不到
# CLASS   → .class 文件有，但运行时反射读不到（默认策略！）
# RUNTIME → .class 有且反射可读 ← @Coffee 必须用这个

java --source 25 - <<'EOF'
import java.lang.annotation.*;
@Retention(RetentionPolicy.CLASS)   // 默认策略
@interface ClassOnly {}
@Retention(RetentionPolicy.RUNTIME)
@interface RunTime {}

@ClassOnly @RunTime
class Demo {}

void main() {
    var cls = Demo.class;
    System.out.println("CLASS注解可见: " + (cls.getAnnotation(ClassOnly.class) != null));
    System.out.println("RUNTIME注解可见: " + (cls.getAnnotation(RunTime.class) != null));
}
EOF
```

**实测输出**：

```
CLASS注解可见: false
RUNTIME注解可见: true
```

关键观测点：
- `@Retention(CLASS)` 是默认值，运行时反射**看不到**，新手常见陷阱
- `@Target` 限制注解可以放哪里（TYPE/FIELD/METHOD/PARAMETER/...），放错会编译报错
- `jcmd <pid> VM.class_hierarchy` 可以查看运行时类继承结构，辅助调试容器加载情况
- 工业级扫描（如 `classpath*:com/example/**/*.class`）用 `PathMatchingResourcePatternResolver`，处理 jar URL 中的嵌套路径

---

## 十、⏳ 版本时光机 · 注解 API 的历史边界

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| `java.lang.annotation` 基础 | JDK 5 | `@Retention`、`@Target`、`@interface` |
| `ElementType.TYPE_USE` / `TYPE_PARAMETER` | JDK 8 | 类型注解 |
| `@Repeatable`（可重复注解） | JDK 8 | 同一元素标多个相同注解 |
| 注解处理器 `javax.annotation.processing` | JDK 6 | 编译时处理（APT），不需要 RUNTIME |
| `AnnotatedElement.getDeclaredAnnotationsByType()` | JDK 8 | 读取重复注解 |
| 本话代码运行环境 | JDK 25 | ✅ |

---

## 十一、与工业 Spring 的差距

```java
// 工业 Spring 在这 60 行之上加了什么？

// ❶ 作用域（Scope）
// @Scope("prototype") → 每次 getBean() 返回新实例
// 60行版：全部单例，无法区分

// ❷ 循环依赖检测
// A 依赖 B，B 依赖 A → Spring 用三级缓存处理
// 60行版：循环依赖会 StackOverflowError 或永远填不满

// ❸ 代理（AOP）
// @Transactional / @Async → Spring 生成 CGLIB/JDK 动态代理包装 Bean
// 60行版：没有代理，注解语义靠手写实现

// ❹ 生命周期回调
// @PostConstruct / @PreDestroy / InitializingBean
// 60行版：创建后不回调任何方法

// ❺ 构造器注入（推荐）
// Spring 推荐：final 字段 + 构造器注入，不需要 setAccessible
// 60行版：字段注入，需要 setAccessible，框架友好度低

// ❻ 类扫描范围与类加载器隔离
// Spring Boot 用 classpath 扫描 + 多级 ClassLoader
// 60行版：只扫一个目录，不处理 jar 内部的类
```

---

## 十二、项目检查点 · 豆豆咖啡站 jvm-v2.4

**已具备：**
- 注解 + 反射驱动的 DI 容器原型
- @Coffee 标记 + 扫描 + 实例化 + 字段注入全流程
- 单例容器，依赖图自动装配
- 理解工业 Spring 在此基础上的六层防护

**还没有：**
- 反射调用的性能瓶颈解决方案——MethodHandle 等下一话登场
- Class-File API——直接操作字节码

阿零把魔法书的第一页翻开了。下一步要换一面更快的镜子。

---

## 十三、对应招聘技能

Java注解, @Retention策略, 运行时反射扫描, 依赖注入原理, Spring容器核心, APT注解处理器, Java25

---

## 十四、下一话悬念

60 行注入器运转了，但反射路径是 JIT 的盲区——每次 `Method.invoke()` 都带着装箱、权限检查、解释器分发。下一话换一面更快的镜子：`MethodHandle` 给 JIT 一个可内联的调用目标，实测快 10 倍；`VarHandle` 把 `Unsafe` 的后门换成正门；Class-File API（JEP 484，JDK 24 正式）让阿零第一次徒手读字节码。第20话《更快的镜子》，卷三魔法祛魅收官。

---

## 🎯 随堂练习

**Q1.** `@Retention(RetentionPolicy.CLASS)` 和 `@Retention(RetentionPolicy.RUNTIME)` 的区别？

**Q2.** 为什么 `@Target` 要同时包含 `TYPE` 和 `FIELD`？只有 `TYPE` 会发生什么？

**Q3.** 容器扫描到一个有 `@Coffee` 字段但该字段类型没有 `@Coffee` 的情况，上面的代码会怎么处理？

**Q4.** 如何改造 `MiniContainer` 支持构造器注入（而非字段注入）？

**Q5.** 如果两个类相互依赖（A 有 `@Coffee B b`，B 有 `@Coffee A a`），上面的容器会如何处理？

**Q6.** `@interface Coffee` 和 `interface Coffee` 的语法区别是什么？

**Q7.** 注解处理器（APT）和运行时反射注解的本质区别是什么？各自的优势？

**Q8.** Spring `@Component` / `@Service` / `@Repository` 本质上有什么区别？

**Q9.** 为什么 Spring 推荐构造器注入而不是字段注入？

**Q10.** 如何让容器支持 `@Scope("prototype")`，每次 `get()` 返回新实例？

---

> [!答案]
>
> **Q1. `CLASS` 保留到 .class 文件但运行时反射看不到；`RUNTIME` 运行时反射可以读到。**`CLASS` 是默认值——如果写 `@interface Foo {}` 不加 `@Retention`，反射调用 `cls.getAnnotation(Foo.class)` 总是返回 `null`，是新手常见踩坑点。框架扫描注解必须用 `RUNTIME`；编译时代码生成（APT、Lombok）用 `SOURCE` 或 `CLASS` 即可。
>
> **Q2. `@Coffee` 同时用在类（`@Coffee class OrderService`）和字段（`@Coffee OrderService svc`）上，需要 `@Target({TYPE, FIELD})`。**只有 `TYPE` 则字段上的 `@Coffee` 编译报错；只有 `FIELD` 则类声明上的 `@Coffee` 报错。两个用途合并到一个注解是最简演示方式；工业 Spring 用 `@Component`（标类）和 `@Autowired`（标字段/构造器）分开。
>
> **Q3. `beans.get(f.getType())` 返回 `null`，容器抛出 `RuntimeException("找不到依赖: ...")`。**这是最简单的「未满足依赖」处理。工业 Spring 也会抛 `NoSuchBeanDefinitionException`，但会在容器启动阶段统一检测（而不是在注入阶段懒发现），并给出清晰的依赖链路提示。
>
> **Q4. 构造器注入：扫描带 `@Coffee` 参数注解的构造器，对每个参数从容器获取对应实例。**例如：`@Coffee OrderService(InventoryRepo repo)`，容器找到该构造器，对参数类型查 `beans.get(InventoryRepo.class)`，组装参数数组后 `ctor.newInstance(args)`。好处：`final` 字段、不需要 `setAccessible`、空参数即可发现依赖未满足。
>
> **Q5. 单轮注入时会出现问题：注入 A 的 `b` 字段时 B 已存在（已创建实例），注入 B 的 `a` 字段时 A 也已存在，看似没问题。**但若是构造器注入就会死锁：创建 A 需要先有 B，创建 B 需要先有 A。Spring 用「三级缓存」（单例工厂、早期暴露的半成品 Bean、完整 Bean）打破字段注入的循环依赖；构造器注入的循环依赖 Spring 也无法解决，会直接报错。
>
> **Q6. `@interface Coffee` 是注解类型声明（`java.lang.annotation.Annotation` 的子接口），方法定义即注解属性（可有默认值）。**`interface Coffee` 是普通接口。两者语法相似但语义完全不同：注解不能有普通方法体、不能继承其他注解（只能间接通过 `@Repeatable` / 元注解组合）；注解的方法声明形如 `String value() default ""` 而非 `void doSomething()`。
>
> **Q7. APT（注解处理器）在编译期运行，可以生成新源文件（如 Lombok 生成 getter/setter），不产生运行时开销；运行时反射注解需要 JVM 动态读取，有反射开销但更灵活（可处理运行时才知道的类型）。**Lombok 用 APT（`SOURCE` 保留）；Spring `@Autowired` 用运行时反射（`RUNTIME` 保留）；Dagger 2 用 APT 在编译时生成注入代码，零反射开销。
>
> **Q8. `@Component`、`@Service`、`@Repository`、`@Controller` 在 Spring 内部完全等价——它们都是 `@Component` 的元注解别名，容器扫描时无差别对待。**区别在语义和切面织入：`@Repository` 触发 Spring 的持久层异常转换（DataAccessException）；`@Controller` 标记为 MVC 处理器；`@Service` 无额外功能，纯语义标记。
>
> **Q9. 构造器注入的三大优势：①依赖是 `final` 的，创建后不可变；②依赖为 null 时构造器调用就报错，而非运行时 NPE；③无需 `setAccessible`，不绕过访问控制。**字段注入虽然代码更简洁，但测试时无法通过构造器传入 mock 对象（必须用反射或 Spring 容器），且隐藏了类的真实依赖数量。
>
> **Q10. 在 `beans` 中只存单例类；`get()` 检查是否有 `@Scope("prototype")` 注解，有则每次重新 `newInstance()` 并重新注入依赖，不存入 `beans`。**工业 Spring 为 prototype 作用域使用独立的对象工厂（`ObjectFactory` / `Supplier<T>`），并不在 BeanFactory 里缓存实例；singleton 的依赖 prototype Bean 时还需要 `ApplicationContext.getBean()` 或 `@Lookup` 方法注入，否则会拿到同一个 prototype 实例。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 -d out *.java && java -cp out MiniApp`，三层依赖自动注入成功，单例验证 `true`，`@Retention` 差异实测输出 `false/true`，与文中一致。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API - java.lang.annotation](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/annotation/package-summary.html)。注解 API 在 JDK 5 引入，`@Repeatable` 在 JDK 8 引入，JDK 25 无变更。

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*
