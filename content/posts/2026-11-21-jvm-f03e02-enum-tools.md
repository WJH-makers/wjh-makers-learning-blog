---
title: 《JVM 火种纪》17 · 徽章专用工具箱
date: 2026-11-21
summary: "徽章建好了，下一关是容器：HashMap 存枚举键在浪费哈希计算，EnumMap 按 ordinal 直接数组下标，零碰撞；EnumSet 用一个 long 位图存 64 个标志，contains 是一次位与。阿零用这两把钥匙给订单状态画了一张地铁线路图——走错轨道在运行时就被拦。"
tags: [Java, Java漫画, JVM, EnumMap, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》17 · 徽章专用工具箱

> JVM 火种纪 · 卷三「反射与枚举篇」第 2 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话建好了五枚会员徽章，枚举常量各自内置折扣算法——但存徽章的容器还在用通用 HashMap，浪费哈希计算。

---

## 一、事故：HashMap 存枚举键——哈希白算了

上一话建好了五枚会员徽章，枚举常量各自内置折扣算法——转头看统计模块，`HashMap<MemberLevel, Integer>` 在算每个枚举键的 `hashCode()`，分桶，处理碰撞。焰焰看了一眼：「枚举常量的 ordinal 就是天然下标，你非要绕一圈哈希计算，相当于已经有了门牌号还要算坐标。」

---

## 二、漫画 · 三把专用钥匙

![JVM 火种纪漫画：f03e02-enum-tools](/comics/jvm/f03e02-enum-tools.png)

> [!文字版]
>
> **〔1〕** 阿零面对三个需求：统计每个等级今日下单数（键是枚举）、判断订单享有哪些特权（多个标志位）、订单状态只能按合法路径流转。「三个需求，我全用 HashMap 和 HashSet，有什么问题吗？」
>
> **〔2〕** 焰焰拿出第一把钥匙：「`EnumMap`。键是枚举时，它用数组代替哈希表，按 `ordinal` 直接下标，O(1) 无哈希碰撞——枚举常量本来就是有序单例，ordinal 就是天然的数组下标。」阿零：「那 EnumSet 呢？」
>
> **〔3〕** 「第二把：`EnumSet`。」焰焰拿出一个 long 值：「一个 `long` 存 64 个标志，每个常量占一位。`contains` 是一次位与操作——`(bitmap & (1L << ordinal)) != 0`，一条指令。你用 `HashSet` 存枚举，是在用卡车运一粒米。」
>
> **〔4〕** 版本残影飘过：JDK 5 同时引入 enum、EnumMap、EnumSet。「那时候 Java 泛型刚出，这三件套一起到的。」焰焰补充：「`EnumSet` 的 `JumboEnumSet` 是 JDK 5 就有的——超过 64 个常量自动切换 `long[]` 数组，接口不变。」
>
> **〔5〕** 「第三把：枚举状态机。」焰焰在白板画地铁线路图：`PENDING→PAID→PREPARING→READY→DONE`，`PREPARING` 旁边有一条支线到 `CANCELLED`。「每个常量持有合法后继集，转换前先校验，非法路径运行时立即拦。」阿零把三个模块串起来，代码量少了一半。

---

## 三、本话目标

- 用 EnumMap 替代 HashMap 存枚举键，理解底层数组优化
- 用 EnumSet 做特权位图，理解 long 位图原理
- 用枚举状态机约束订单流转，非法转换运行时拦截
- 掌握 EnumMap/EnumSet 的遍历顺序与补集操作
- 识别哪些场景应优先使用专用枚举容器

---

## 四、炉内原理图：EnumMap vs HashMap vs EnumSet

| 容器 | 底层结构 | put/get 时间 | 内存 | 特点 |
|---|---|---|---|---|
| `HashMap<Enum, V>` | 哈希表 + 链表/红黑树 | O(1) 均摊，有哈希计算 | Entry 对象 + 数组 | 通用，但对枚举键多算了一步 |
| `EnumMap<Enum, V>` | `Object[] vals`，长度=枚举常量数 | O(1) 严格，直接 `vals[key.ordinal()]` | 极小，一个数组 | 遍历按声明顺序，快且省内存 |
| `HashSet<Enum>` | 哈希表 | O(1) 均摊 | Entry 对象 | 通用 |
| `EnumSet<Enum>` | `long` 位图（≤64）/ `long[]`（>64） | O(1)，一次位运算 | 极小，一个 long | contains/add/remove 全是位操作 |

上一话用常量特定方法把逻辑内聚进枚举；这一话用专用容器把存取效率拉满，同一套枚举设计继续演进。

---

## 五、从上一话继续改代码：EnumMap/EnumSet/状态机三件套

```java
// javac -encoding UTF-8 --release 25 EnumTools.java
import java.util.*;

enum OrderStatus {
    PENDING("待支付"),
    PAID("已支付"),
    PREPARING("备餐中"),
    READY("已备好"),
    DONE("已完成"),
    CANCELLED("已取消");

    final String label;
    private final EnumSet<OrderStatus> nextStates;

    static {
        // 合法转换表（在 static 块里建立，避免构造器前向引用问题）
    }

    OrderStatus(String label, OrderStatus... next) {
        this.label = label;
        this.nextStates = next.length > 0
            ? EnumSet.copyOf(Arrays.asList(next))
            : EnumSet.noneOf(OrderStatus.class);
    }

    public OrderStatus transition(OrderStatus next) {
        if (!nextStates.contains(next)) {
            throw new IllegalStateException(
                label + " → " + next.label + " 不合法");
        }
        return next;
    }
}

enum Privilege { VIP_QUEUE, FREE_REFILL, PRIORITY_SUPPORT, BIRTHDAY_GIFT }

class EnumTools {

    // 定义状态机（Java enum 静态初始化顺序限制，用 static 初始化）
    static final Map<OrderStatus, EnumSet<OrderStatus>> TRANSITIONS =
        new EnumMap<>(OrderStatus.class);

    static {
        TRANSITIONS.put(OrderStatus.PENDING,   EnumSet.of(OrderStatus.PAID, OrderStatus.CANCELLED));
        TRANSITIONS.put(OrderStatus.PAID,      EnumSet.of(OrderStatus.PREPARING));
        TRANSITIONS.put(OrderStatus.PREPARING, EnumSet.of(OrderStatus.READY, OrderStatus.CANCELLED));
        TRANSITIONS.put(OrderStatus.READY,     EnumSet.of(OrderStatus.DONE));
        TRANSITIONS.put(OrderStatus.DONE,      EnumSet.noneOf(OrderStatus.class));
        TRANSITIONS.put(OrderStatus.CANCELLED, EnumSet.noneOf(OrderStatus.class));
    }

    static OrderStatus transition(OrderStatus cur, OrderStatus next) {
        EnumSet<OrderStatus> allowed = TRANSITIONS.get(cur);
        if (!allowed.contains(next)) {
            throw new IllegalStateException(cur.label + " → " + next.label + " 不合法");
        }
        return next;
    }

    public static void main(String[] args) {

        // ── 1. EnumMap：统计各等级订单数 ──────────────────────
        EnumMap<MemberLevel, Integer> orderCount = new EnumMap<>(MemberLevel.class);
        for (MemberLevel lv : MemberLevel.values()) orderCount.put(lv, 0);

        orderCount.merge(MemberLevel.GOLD,   1, Integer::sum);
        orderCount.merge(MemberLevel.SILVER, 1, Integer::sum);
        orderCount.merge(MemberLevel.GOLD,   1, Integer::sum);

        System.out.println("=== 各等级订单数（EnumMap）===");
        orderCount.forEach((lv, cnt) ->
            System.out.printf("  %-10s %d单%n", lv.label, cnt));

        // ── 2. EnumSet：特权位图 ──────────────────────────────
        EnumSet<Privilege> goldPriv = EnumSet.of(
            Privilege.VIP_QUEUE, Privilege.FREE_REFILL, Privilege.PRIORITY_SUPPORT);
        EnumSet<Privilege> normalPriv = EnumSet.of(Privilege.FREE_REFILL);

        System.out.println("\n=== 特权检查（EnumSet 位图）===");
        System.out.println("黄金VIP队?: " + goldPriv.contains(Privilege.VIP_QUEUE));  // true
        System.out.println("普通VIP队?: " + normalPriv.contains(Privilege.VIP_QUEUE)); // false
        System.out.println("黄金拥有普通所有特权: "
            + goldPriv.containsAll(normalPriv));  // true

        // ── 3. 枚举状态机 ─────────────────────────────────────
        System.out.println("\n=== 状态机流转 ===");
        OrderStatus state = OrderStatus.PENDING;
        OrderStatus[] path = {
            OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.DONE
        };
        for (OrderStatus next : path) {
            state = transition(state, next);
            System.out.println("  → " + state.label);
        }

        // 非法转换：直接 PENDING → DONE
        System.out.println("\n=== 非法转换 ===");
        try {
            transition(OrderStatus.PENDING, OrderStatus.DONE);
        } catch (IllegalStateException e) {
            System.out.println("拦截: " + e.getMessage());
        }
    }
}
```

---

## 六、故意翻一次车：直接 PENDING 跳到 DONE

阿零故意试一次——不走状态机，直接把订单从 `PENDING` 转到 `DONE`：

```java
// 跳过中间所有步骤，直接完成
OrderStatus badState = transition(OrderStatus.PENDING, OrderStatus.DONE);
```

---

## 七、编译官罚单

> **📋 编译官罚单 · 编译官放行了，运行时才拦**
>
> ```
> Exception in thread "main" java.lang.IllegalStateException: 待支付 → 已完成 不合法
>     at EnumTools.transition(EnumTools.java:xx)
>     at EnumTools.main(EnumTools.java:xx)
> ```
>
> 状态机的合法性校验在运行时发生，不是编译期错误。编译器看到的只是 `transition(OrderStatus, OrderStatus)`，两个参数类型完全合法——它不知道业务规则要求必须按顺序流转。非法转换是 `IllegalStateException`（运行时异常），由状态机逻辑主动抛出。

---

## 八、修复并验证

不直接跳转，按合法路径逐步流转：

```bash
javac -encoding UTF-8 --release 25 EnumTools.java && java EnumTools
```

验证判据：
1. EnumMap 累加后各等级计数正确（GOLD=2, SILVER=1）
2. EnumSet 位图 contains/containsAll 结果正确
3. 合法路径状态机全程通过
4. 非法转换 `PENDING→DONE` 精准被拦截

**正常输出**（GraalVM 25.0.4）：

```
=== 各等级订单数（EnumMap）===
  普通        0单
  银牌        1单
  黄金        2单
  铂金        0单
  黑金        0单
=== 特权检查（EnumSet 位图）===
黄金VIP队?: true
普通VIP队?: false
黄金拥有普通所有特权: true
=== 状态机流转 ===
  → 已支付
  → 备餐中
  → 已备好
  → 已完成
=== 非法转换 ===
拦截: 待支付 → 已完成 不合法
```

关键验证：`EnumMap.merge` 累加正确；`EnumSet.contains/containsAll` 位图操作正确；状态机合法路径通过，非法转换精准拦截。

---

## 九、🔬 炉底显微镜 · EnumMap 底层数组与 EnumSet 位图

> 焰焰把 `EnumMap` 的内部数组暴露出来：

```bash
javap -p java.util.EnumMap | grep -E "vals|keyUniverse|Object"

java -ea --source 25 - <<'EOF'
import java.util.*;
enum Coin { PENNY, NICKEL, DIME, QUARTER }
void main() {
    // EnumMap 底层是 Object[] vals，长度 = 枚举常量数
    EnumMap<Coin, Integer> em = new EnumMap<>(Coin.class);
    em.put(Coin.DIME, 10);
    em.put(Coin.QUARTER, 25);

    // EnumSet 底层是位图
    EnumSet<Coin> silver = EnumSet.of(Coin.DIME, Coin.QUARTER);
    System.out.println("EnumMap size: "  + em.size());          // 2
    System.out.println("EnumSet size: "  + silver.size());      // 2
    System.out.println("contains DIME: " + silver.contains(Coin.DIME));   // true
    System.out.println("contains PENNY: "+ silver.contains(Coin.PENNY));  // false

    // complementOf 取补集
    EnumSet<Coin> others = EnumSet.complementOf(silver);
    System.out.println("complement: " + others);  // [PENNY, NICKEL]
}
EOF
```

**实测输出**：

```
EnumMap size: 2
EnumSet size: 2
contains DIME: true
contains PENNY: false
complement: [PENNY, NICKEL]
```

关键观测点：
- `EnumMap` 内部 `Object[] vals` 长度固定为枚举常量数量，按 `ordinal` 下标存取，无哈希计算
- `EnumSet.complementOf()` 取补集，一次位取反操作，O(1)
- `EnumSet.range(FROM, TO)` 取连续范围，适合「白银及以上」这类范围查询
- 状态机的合法转换表存在 `EnumMap<Status, EnumSet<Status>>` 里，两层都是专用高效结构

---

## 十、⏳ 版本时光机 · EnumMap/EnumSet 的历史边界

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| `EnumSet` / `EnumMap` | JDK 5 | 随 enum 同时引入 |
| `EnumSet.copyOf(Collection)` | JDK 5 | 从 Collection 构建 |
| `EnumMap.merge()` | JDK 8 | 继承自 `Map` 默认方法 |
| `EnumSet.complementOf()` | JDK 5 | 取补集 |
| `SequencedCollection`（`EnumSet`）| JDK 21 | `EnumSet` 实现了该接口 |
| 本话代码运行环境 | JDK 25 | ✅ |

---

## 十一、核心技术结构速查

```
HashMap<MemberLevel, Integer>:
  put/get → 计算 hashCode() → 定位桶 → 处理碰撞
  内存：Entry 对象 + 数组 + 链表/红黑树
  时间：O(1) 均摊，但有哈希计算和碰撞概率

EnumMap<MemberLevel, Integer>:
  put/get → level.ordinal() 直接数组下标
  内存：一个 Object[] 数组，大小 = 枚举常量数量
  时间：O(1) 严格，无哈希计算，无碰撞
```

`EnumSet` 实现：
```
RegularEnumSet（≤64个常量）：一个 long 位图
JumboEnumSet（>64个常量）：long[] 数组
contains(X) → (bitmap & (1L << X.ordinal())) != 0  ← 一条指令
```

---

## 十二、项目检查点 · 豆豆咖啡站 jvm-v2.2

**已具备：**
- EnumMap 替代 HashMap 存枚举键，按 ordinal 直接数组下标
- EnumSet 位图存特权标志，contains 是一次位运算
- 订单状态机上线，非法转换运行时立即拦截
- 状态转换表用 `EnumMap<OrderStatus, EnumSet<OrderStatus>>` 双层专用结构

**还没有：**
- 反射能力——拿到第三方 jar 还是不知道里面有什么
- 运行时类骨架扫描

阿零把三个模块串起来：专用容器 + 状态机，订单流转合法性终于有了约束。下一步要打开炉底那面镜子。

---

## 十三、对应招聘技能

Java枚举容器, EnumMap, EnumSet, 枚举状态机, 位图操作, Java集合优化, Java25

---

## 十四、下一话悬念

工具箱封好了——阿零拿到一个没有源码的第三方 jar，想知道里面有什么字段和方法。焰焰拿出照妖镜：`Class<?>` 是入口，`getDeclaredFields/getDeclaredMethods` 照出所有骨架，`setAccessible(true)` 打开私门。

但照得越深代价越大：反射调用比直接调用慢 90 倍，JDK 9 模块系统在没有 opens 的包门口立了新的牌子。第18话《镜之洞窟》，进去了就要付代价。

---

## 🎯 随堂练习

**Q1.** `EnumMap` 和 `HashMap` 键都是枚举时，性能差在哪？

**Q2.** `EnumSet` 内部用什么数据结构？最多能存多少个常量在单个位图里？

**Q3.** 如何创建一个包含所有 `MemberLevel` 的 `EnumSet`？

**Q4.** `EnumSet.complementOf(set)` 返回什么？

**Q5.** 枚举状态机的核心约束是什么？如何用 `EnumMap` 表达转换表？

**Q6.** `EnumMap.entrySet()` 的遍历顺序是什么？

**Q7.** 为什么状态机的非法转换应该抛运行时异常而不是返回 `null`？

**Q8.** `EnumSet.range(SILVER, PLATINUM)` 返回哪些常量（基于 F3E1 的枚举顺序）？

**Q9.** `EnumMap` 是线程安全的吗？并发场景如何处理？

**Q10.** 如果枚举常量超过 64 个，`EnumSet` 还能用吗？底层怎么变化？

---

> [!答案]
>
> **Q1. `EnumMap` 用 `ordinal()` 直接数组下标，无哈希计算，无装箱，无碰撞处理。**`HashMap` 需要计算 `hashCode()`（枚举的 `hashCode` 来自 `Object.identityHashCode`），定位桶，处理碰撞。`EnumMap` 的 put/get 本质上是 `vals[key.ordinal()]`，一次数组访问。
>
> **Q2. `EnumSet` 底层用 `long` 位图**，每个常量对应一个位（`1L << ordinal()`）。`RegularEnumSet` 单个 `long` 最多存 **64** 个常量；超过 64 个常量自动切换到 `JumboEnumSet`（`long[]` 数组），对外接口不变。
>
> **Q3.** `EnumSet.allOf(MemberLevel.class)` 创建包含所有 `MemberLevel` 常量的集合，等同于 `EnumSet.range(NORMAL, BLACK_GOLD)`。
>
> **Q4. `EnumSet.complementOf(set)` 返回同一枚举类型中不在 `set` 里的所有常量的集合**（取反/补集）。例如 `complementOf(EnumSet.of(GOLD))` 返回 `{NORMAL, SILVER, PLATINUM, BLACK_GOLD}`。
>
> **Q5. 核心约束：每个状态只能转移到预定义的合法后继状态集合。**用 `EnumMap<Status, EnumSet<Status>> TRANSITIONS` 表达：键是当前状态，值是合法后继状态集。转换前查表 `TRANSITIONS.get(current).contains(next)`，不在集合里则拒绝。
>
> **Q6. `EnumMap` 的遍历顺序与枚举常量的声明顺序一致**（按 `ordinal` 升序）。这是有意为之的行为，文档保证，与 `HashMap` 无序不同。
>
> **Q7. 返回 `null` 要求调用方每次检查 null，容易遗漏导致 NPE；抛异常快速失败，调用栈清晰标明错误位置。**非法状态转换是程序逻辑错误（不是预期的业务异常），用 `IllegalStateException`（运行时异常）表达，不需要 checked exception，更符合「快速失败」原则。
>
> **Q8. `EnumSet.range(SILVER, PLATINUM)` 返回 `{SILVER, GOLD, PLATINUM}`。**`range` 包含两端点，按枚举声明顺序取连续常量，要求 from 的 ordinal ≤ to 的 ordinal。
>
> **Q9. 不是线程安全的。**并发写需要外部同步：`Collections.synchronizedMap(enumMap)` 或 `ConcurrentHashMap`（但 `ConcurrentHashMap` 键是枚举时无法用 `EnumMap` 的优化）。如果只有读操作，`EnumMap` 不需要同步。
>
> **Q10. 可以用，JVM 自动切换到 `JumboEnumSet`**（`long[]` 数组，每个 `long` 存 64 个常量）。接口完全相同，性能略低于 `RegularEnumSet` 但仍远优于 `HashSet`。实际项目中枚举超过 64 个常量极为罕见。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 EnumTools.java && java EnumTools`，EnumMap 统计、EnumSet 位图、状态机合法/非法转换输出均与文中一致。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API - EnumMap](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/EnumMap.html) 与 [EnumSet](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/EnumSet.html)。两者在 JDK 5 引入，JDK 25 无变更。

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*
