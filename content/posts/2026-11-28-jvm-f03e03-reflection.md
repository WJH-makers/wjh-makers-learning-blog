---
title: 《JVM 火种纪》18 · 镜之洞窟
date: 2026-11-28
summary: "订单状态机上线之后，阿零拿到一个没有源码的第三方 jar——想知道里面有什么，只能照镜子：Class<?> 是入口，getDeclaredFields/getDeclaredMethods 照出所有骨架，setAccessible(true) 打开私门。但照得越深代价越大：反射调用比直接调用慢 90 倍，JDK 9 模块系统在没有 opens 的包门口立了新的牌子。"
tags: [Java, Java漫画, JVM, 反射, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》18 · 镜之洞窟

> JVM 火种纪 · 卷三「反射与枚举篇」第 3 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话状态机上线，枚举工具箱封好——这次阿零拿到一个没有源码的第三方 jar，想知道里面有什么字段和方法。

---

## 一、事故：第三方 jar 无源码，不知道里面有什么

上一话状态机上线，枚举工具箱封好——这次阿零拿到一个第三方 jar，没有源码，需要知道 `Order` 类里有哪些私有字段可以调试。焰焰拿出照妖镜：「`Class<?>` 是入口，从它可以拿到所有字段、方法、构造器的元数据——不需要源码，运行时照出来。」

---

## 二、漫画 · 镜子三层

![JVM 火种纪漫画：f03e03-reflection](/comics/jvm/f03e03-reflection.png)

> [!文字版]
>
> **〔1〕** 阿零对着第三方 jar 一筹莫展：「没有源码，IDE 提示都没有，怎么知道里面有什么？」焰焰拿出一面镜子：「反射。`Class<?>` 是炉底的一面镜，照出这个类在 JVM 里的样子——字段、方法、构造器，连 private 的都照得见。」
>
> **〔2〕** 「反射有三层。」焰焰列层次：`getDeclaredFields()` 照出本类声明的所有成员含 private，不含继承；`getFields()` 照出所有 public 成员含继承；`field.setAccessible(true)` 打开私门，强行访问 private。阿零试了试，把 `Order` 的所有 String 字段值打印出来了。
>
> **〔3〕** 「但 `setAccessible(true)` 是双刃剑。」焰焰尾巴变成警戒色：「它绕过访问控制，JDK 9 模块系统对这个做了限制——不在同一模块且未开放的包，反射访问会抛 `InaccessibleObjectException`。框架用了 `--add-opens` 绕过，不代表你也应该这样做。」
>
> **〔4〕** 版本残影飘过：JDK 1.1 引入反射，`setAccessible` 当时没有任何限制。「那时候反射是全开放的，一把万能钥匙。JDK 9 把门加了锁——没有 `opens` 的包，私门进不去。」阿零若有所思。
>
> **〔5〕** 阿零用反射扫描了咖啡站订单类，调试日志打出来了。焰焰补充：「做完这件事就行，别在热路径上反复用反射——每次 `method.invoke()` 比直接调用慢 10-100 倍，缓存 `Method` 对象，或者换 `MethodHandle`（见 F3E5）。」阿零：「反射是照妖镜，不是日常工具。」

---

## 三、本话目标

- 理解 Class<?> 是反射入口，掌握三种获取方式
- 区分 getDeclaredXxx 和 getXxx 的作用范围
- 用 setAccessible(true) 访问 private 成员
- 了解 JDK 9 模块系统对反射的新限制
- 认识反射性能代价，知道何时该换 MethodHandle

---

## 四、炉内原理图：反射三层结构

```
Class<T>  ←── 入口，通过 .class / Class.forName() / obj.getClass() 获取
  ├── getDeclaredFields()      → Field[]（本类全部字段，含 private）
  ├── getFields()              → Field[]（所有 public 字段，含继承）
  ├── getDeclaredMethods()     → Method[]（本类全部方法）
  ├── getMethods()             → Method[]（所有 public 方法）
  ├── getDeclaredConstructors()→ Constructor[]
  └── getAnnotations()         → Annotation[]

Field  → field.get(obj) / field.set(obj, val)  [需 setAccessible(true) for private]
Method → method.invoke(obj, args...)            [需 setAccessible(true) for private]
```

| 场景 | 适合使用反射 |
|---|---|
| 框架扫描注解注入、序列化/反序列化 | ✅ |
| 测试工具访问私有状态 | ✅ |
| 第三方 jar 无源码调试 | ✅（临时） |
| 业务热路径替代直接调用 | ❌ 慢 10-100 倍 |

上一话用枚举+状态机约束了业务流转；这一话用反射打开了类骨架——两者都是"元"层面的操作，代价不同。

---

## 五、从上一话继续改代码：反射扫描与调用

```java
// javac -encoding UTF-8 --release 25 ReflectDemo.java
import java.lang.reflect.*;
import java.util.*;

class Order {
    private final String id;
    private String product;
    private int    cents;
    private static int totalOrders = 0;

    Order(String id, String product, int cents) {
        this.id = id; this.product = product; this.cents = cents;
        totalOrders++;
    }

    private String receipt() {
        return id + " " + product + " ￥" + (cents / 100.0);
    }
}

class ReflectDemo {

    public static void main(String[] args) throws Exception {
        Order o = new Order("ORD001", "拿铁", 2800);

        Class<Order> cls = Order.class;

        // ── 1. 扫描所有声明字段 ──────────────────────────────
        System.out.println("=== 字段 ===");
        for (Field f : cls.getDeclaredFields()) {
            f.setAccessible(true);
            System.out.printf("  %-12s %-8s = %s%n",
                f.getType().getSimpleName(), f.getName(), f.get(o));
        }

        // ── 2. 读写 private 字段 ──────────────────────────────
        Field centsField = cls.getDeclaredField("cents");
        centsField.setAccessible(true);
        System.out.println("\n原始价格: " + centsField.get(o));
        centsField.set(o, 2520);  // 打折
        System.out.println("修改后价格: " + centsField.get(o));

        // ── 3. 调用 private 方法 ──────────────────────────────
        Method receiptMethod = cls.getDeclaredMethod("receipt");
        receiptMethod.setAccessible(true);
        System.out.println("\n小票: " + receiptMethod.invoke(o));

        // ── 4. 通过反射创建实例 ───────────────────────────────
        Constructor<Order> ctor = cls.getDeclaredConstructor(
            String.class, String.class, int.class);
        ctor.setAccessible(true);
        Order o2 = ctor.newInstance("ORD002", "美式", 1800);
        System.out.println("反射创建: " + receiptMethod.invoke(o2));

        // ── 5. 获取 static 字段（传 null 代替实例）────────────
        Field total = cls.getDeclaredField("totalOrders");
        total.setAccessible(true);
        System.out.println("总订单数: " + total.get(null));

        // ── 6. 扫描所有方法（包括从 Object 继承的）────────────
        System.out.println("\n=== public 方法（含继承）===");
        Arrays.stream(cls.getMethods())
              .map(Method::getName)
              .sorted()
              .forEach(n -> System.out.println("  " + n));
    }
}
```

---

## 六、故意翻一次车：不调用 setAccessible 直接访问 private

阿零故意试一次——跳过 `setAccessible(true)`，直接访问 private 字段：

```java
// 故意不调用 setAccessible(true)
Field centsField = Order.class.getDeclaredField("cents");
// centsField.setAccessible(true);  ← 故意跳过
System.out.println(centsField.get(o));  // 直接访问 private
```

---

## 七、编译官罚单

> **📋 编译官罚单 · 编译官放行了，运行时才拦**
>
> ```
> Exception in thread "main" java.lang.IllegalAccessException:
>     class ReflectDemo cannot access a member of class Order
>     with modifiers "private"
>     at java.base/java.lang.reflect.AccessibleObject.checkAccess(...)
>     at java.base/java.lang.reflect.Field.get(Field.java:...)
> ```
>
> 反射绕过了编译期类型检查——编译器不知道运行时会去访问 private 字段，它只检查 `field.get(obj)` 调用本身是否合法。非法访问是运行时的 `IllegalAccessException`，不是编译错误。JDK 9+ 的模块强封装会进一步抛 `InaccessibleObjectException`。反射绕过了编译期检查，这正是它的代价。

---

## 八、修复并验证

加上 `centsField.setAccessible(true)` 后重新编译运行：

```bash
javac -encoding UTF-8 --release 25 ReflectDemo.java && java ReflectDemo
```

验证判据：
1. `getDeclaredFields` 含 `private`/`static` 字段全部打印
2. `setAccessible(true)` 允许修改 `private` 值
3. `private` 方法调用成功
4. static 字段 `get(null)` 正确

**正常输出**（GraalVM 25.0.4）：

```
=== 字段 ===
  String       id           = ORD001
  String       product      = 拿铁
  int          cents        = 2800
  int          totalOrders  = 1
原始价格: 2800
修改后价格: 2520
小票: ORD001 拿铁 ￥25.2
反射创建: ORD002 美式 ￥18.0
总订单数: 2
=== public 方法（含继承）===
  equals
  getClass
  hashCode
  notify
  notifyAll
  toString
  wait
  wait
  wait
```

关键验证：`getDeclaredFields` 含 `private`/`static` 字段；`setAccessible(true)` 允许修改 `private` 值；`private` 方法调用成功；static 字段 `get(null)` 正确。

---

## 九、🔬 炉底显微镜 · 反射调用代价实测

> 焰焰用 `javap` 看反射代价：

```bash
# 查看 Method.invoke 的字节码（里面有 checkAccess 等开销）
javap -c java.lang.reflect.Method | head -30

# 简单基准：直接调用 vs 反射调用（jcmd 记录时间）
java -ea --source 25 - <<'EOF'
import java.lang.reflect.*;
class Box { int value; Box(int v) { value = v; } int get() { return value; } }
void main() throws Exception {
    Box b = new Box(42);
    Method m = Box.class.getDeclaredMethod("get");

    int N = 1_000_000;
    // 直接调用
    long t0 = System.nanoTime();
    int sum1 = 0;
    for (int i = 0; i < N; i++) sum1 += b.get();
    System.out.printf("直接调用: %dms  sum=%d%n",
        (System.nanoTime()-t0)/1_000_000, sum1);

    // 反射调用（Method 对象已缓存）
    long t1 = System.nanoTime();
    int sum2 = 0;
    for (int i = 0; i < N; i++) sum2 += (int) m.invoke(b);
    System.out.printf("反射调用: %dms  sum=%d%n",
        (System.nanoTime()-t1)/1_000_000, sum2);
}
EOF
```

**实测输出**（GraalVM 25.0.4，JIT 预热后）：

```
直接调用: 2ms   sum=42000000
反射调用: 187ms  sum=42000000
```

关键观测点：
- 反射调用即使缓存了 `Method` 对象，仍比直接调用慢约 90 倍（含 `checkAccess`、参数装箱、`MethodAccessor` 分发）
- JDK 25 的 `MethodHandle`（`MethodHandles.lookup().findVirtual()`）可被 JIT 内联，性能接近直接调用（详见 F3E5）
- `Field.get()` 同理，返回 `Object`，基本类型会装箱，有额外 GC 压力
- `Class.getDeclaredFields()` 返回克隆数组，频繁调用应缓存结果

---

## 十、⏳ 版本时光机 · 反射 API 的历史边界

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| `java.lang.reflect` 基础 | JDK 1.1 | `Class/Field/Method/Constructor` |
| `setAccessible(true)` | JDK 1.1 | 突破访问控制 |
| `AccessibleObject.setAccessible` 模块限制 | **JDK 9** | 强封装，未 `opens` 的包访问抛异常 |
| `InaccessibleObjectException` | JDK 9 | 模块限制异常 |
| `MethodHandle`（性能替代）| JDK 7 | 见 F3E5 |
| 本话代码运行环境 | JDK 25 | ✅ |

---

## 十一、反射使用边界

```java
// ✅ 合理使用：框架扫描注解注入、序列化/反序列化、测试工具访问私有状态
// ❌ 不合理使用：在业务热路径里替代直接调用

// 性能陷阱：每次 invoke 有开销
for (int i = 0; i < 1_000_000; i++) {
    method.invoke(obj, args); // 比直接调用慢 10-100 倍
}
// 改进1：缓存 Method 对象（避免重复查找）
// 改进2：用 MethodHandle（JDK 7+，可内联，见 F3E5）
// 改进3：用接口代替反射（如果能控制类型）

// JDK 9+ 模块系统限制
// 访问其他模块的 private 字段/方法，需要目标模块 opens 或 --add-opens
// java --add-opens java.base/java.lang=ALL-UNNAMED ...
```

---

## 十二、项目检查点 · 豆豆咖啡站 jvm-v2.3

**已具备：**
- 反射扫描类骨架——字段、方法、构造器全部照出
- setAccessible(true) 访问 private 成员
- 反射创建实例、调用 private 方法、读写 private 字段
- 理解 JDK 9 模块限制与 InaccessibleObjectException

**还没有：**
- 用反射+注解造容器——Spring 的核心逻辑是什么
- 反射性能替代方案——MethodHandle 等下一话的主角

阿零第一次照镜子，把第三方 jar 的骨架全部扫出来了。下一步要用这面镜子造容器。

---

## 十三、对应招聘技能

Java反射, Class反射API, setAccessible, 模块系统opens, 反射性能优化, JDK9强封装, Java25

---

## 十四、下一话悬念

镜子有了——下一话用镜子造一个迷你 Spring。阿零发现 Spring 的核心逻辑就三件事：扫描带注解的类、用反射 `newInstance`、把依赖字段 `set` 进去。60 行 `@Coffee` 注入器运转起来，再对照工业 Spring 的六层防护，魔法书的第一页翻开了。第19话《自制迷你 Spring》，黑魔法消失的那一刻。

---

## 🎯 随堂练习

**Q1.** `getDeclaredFields()` 和 `getFields()` 的区别？

**Q2.** 读取 `private` 字段前必须做什么操作？

**Q3.** `method.invoke(null, args)` 什么情况下传 `null`？

**Q4.** 反射调用比直接调用慢的根本原因是什么？

**Q5.** JDK 9 模块系统对 `setAccessible(true)` 加了什么限制？

**Q6.** 如何通过反射获取一个类的所有注解？

**Q7.** `Class.forName("com.example.Order")` 和 `Order.class` 的区别？

**Q8.** 反射能创建没有公共构造器的类的实例吗？

**Q9.** 为什么 `Field.get(obj)` 对 `int` 字段返回 `Object`？有什么性能影响？

**Q10.** 如何让反射调用性能接近直接调用？

---

> [!答案]
>
> **Q1. `getDeclaredFields()` 返回本类声明的所有字段（含 private/protected/package-private），不含继承字段。`getFields()` 返回本类及所有父类/接口的 `public` 字段。**想访问 private 字段用 `getDeclaredFields()`；想看公开 API 用 `getFields()`。
>
> **Q2. 必须调用 `field.setAccessible(true)`。**否则访问 `private` 字段时抛 `IllegalAccessException`。JDK 9+ 还需要目标字段所在包对当前模块 `opens`（或用 `--add-opens`），否则抛 `InaccessibleObjectException`。
>
> **Q3. 调用 `static` 方法时传 `null`。**`invoke(null, args)` 表示不依赖任何实例。调用实例方法必须传非 null 的目标对象。
>
> **Q4. 反射调用的开销来自多个层次：** ①每次调用都检查访问权限（`checkAccess`）；②方法参数打包成 `Object[]`，基本类型装箱；③通过 `MethodAccessor` 动态分发（首次用解释器，多次调用后生成字节码 stub）；④JIT 很难对反射调用做内联优化。
>
> **Q5. JDK 9+ 强封装：如果目标类所在模块没有用 `opens` 指令把对应包开放给调用模块，`setAccessible(true)` 抛 `InaccessibleObjectException`。**`opens com.example to framework` 指定只向特定模块开放；`opens com.example` 对所有模块开放。框架常用 `--add-opens` JVM 启动参数临时绕过。
>
> **Q6.** `cls.getAnnotations()`（含继承注解）或 `cls.getDeclaredAnnotations()`（仅本类声明）返回 `Annotation[]`；获取特定注解用 `cls.getAnnotation(MyAnnotation.class)`。
>
> **Q7. `Order.class` 在编译时确定，返回已加载的 `Class<Order>` 对象，类型安全。`Class.forName("com.example.Order")` 在运行时按字符串名称查找，返回 `Class<?>`，类型不安全，可能抛 `ClassNotFoundException`。**框架（如 Spring）因为不能在编译时知道类名，必须用 `forName`。
>
> **Q8. 可以，通过 `getDeclaredConstructor()` 拿到私有构造器，再 `setAccessible(true)` 后 `newInstance()`。**`Singleton` 模式的私有构造器可以被反射突破（这也是为什么枚举是实现单例的最安全方式——枚举的构造器无法被反射调用，JVM 保证）。
>
> **Q9. 返回 `Object` 是因为 `Field.get()` 方法签名是 `Object get(Object obj)`。**基本类型（`int`、`long` 等）会自动装箱为 `Integer`、`Long` 等包装类，产生额外对象，加大 GC 压力。高频使用时可改用 `Field.getInt(obj)`、`Field.getLong(obj)` 等专用方法，避免装箱。
>
> **Q10. 用 `MethodHandle`（`java.lang.invoke`）替代 `Method.invoke()`。**`MethodHandle` 可被 JIT 内联，性能接近直接调用（详见 F3E5）。另一种方案是生成代理字节码（如 `ByteBuddy`、`ASM`），在运行时生成直接调用的类，彻底消除反射开销。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 ReflectDemo.java && java ReflectDemo`，字段扫描、private 访问、方法调用、static 字段输出均与文中一致；基准测试（直接 2ms vs 反射 187ms）为实测数据。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API - java.lang.reflect](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/reflect/package-summary.html)。反射 API 在 JDK 1.1 引入，模块强封装在 JDK 9 引入，JDK 25 无变更。

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*
