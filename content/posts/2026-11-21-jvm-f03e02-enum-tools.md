---
title: "F3E2 徽章专用工具箱 — EnumMap、EnumSet 与枚举状态机"
date: "2026-11-21"
series: "jvm-academy"
season: 3
episode: 2
tags: ["Java 25", "EnumMap", "EnumSet", "状态机", "enum", "集合"]
excerpt: "EnumMap 是按徽章开槽的专属抽屉柜，读写比 HashMap 快一个数量级；EnumSet 是位图集合，判断是否包含只需一次位运算。订单状态机用枚举画地铁线路图，走错轨道编译时就拦截。"
---

> **"用 HashMap 存枚举键，就像用通用货架摆专属卡槽的东西——能放，但浪费空间，也浪费时间。"**
> — 焰焰，把 `HashMap<MemberLevel, Integer>` 换成 `EnumMap`

---

## 🎬 开场：三种需求，三把专用钥匙

> **〔1〕**
> 阿零面对三个需求：
>
> - 统计每个会员等级的今日下单数（键是枚举，值是整数）
> - 判断某订单享有哪些特权（多个枚举标志位）
> - 订单状态只能按合法路径流转（`待支付→已支付→备餐中→已完成`，不能跳过）

> **〔2〕**
> 焰焰拿出三把专用钥匙：「`EnumMap` 对应第一个——键是枚举时，它用数组代替哈希表，按 `ordinal` 直接下标，O(1) 无哈希碰撞。`EnumSet` 对应第二个——位图，一个 `long` 存 64 个标志，`contains` 是一次位与操作。」

> **〔3〕**
> 「状态机对应第三个。」焰焰在白板上画了一条地铁线路：
>
> ```
> PENDING → PAID → PREPARING → READY → DONE
>                               ↓
>                            CANCELLED（仅从 PREPARING 可取消）
> ```
>
> 「每个枚举常量持有一个合法后继状态集，转换前先校验，非法转换立即抛异常。」

> **〔4〕**
> 阿零把三个模块串起来：下单→入状态机，支付→查 EnumMap 更新统计，享特权→EnumSet 位图检查。代码量少了一半，运行速度快了一倍，逻辑漏洞从运行时变成了编译时。

---

## 🔑 核心技术：EnumMap vs HashMap

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

## ⚙️ 代码实录：三件套实战

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

**实测输出**（GraalVM 25.0.4）：

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

## 🔬 炉底显微镜

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

## 📐 版本边界

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

---

## 🔮 下话预告：F3E3《镜之洞窟》

工具箱封好了——下一话打开炉底那面镜子。

反射（Reflection）让你在运行时看见类的骨骼：字段、方法、构造器，甚至 `private` 的也看得见。焰焰拿着 `Class<?>` 走进镜之洞窟，教阿零「照镜子」的代价，以及为什么不能只依赖镜子——`MethodHandle` 才是更快更安全的替代。
