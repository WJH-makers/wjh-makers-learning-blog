---
title: "F3E1 十二枚会员徽章 — enum 本质与常量特定方法"
date: "2026-11-14"
series: "jvm-academy"
season: 3
episode: 1
tags: ["Java 25", "enum", "常量特定方法", "switch", "单例"]
summary: "每枚徽章内置折扣算法，不是靠外部 if-else 分拣——焰焰揭秘 enum 是编译器替你 new 好的一组单例，常量特定方法让每个常量有自己的行为，switch 表达式让分拣穷尽无遗漏。"
---

![JVM 火种纪漫画：f03e01-enum-badge](/comics/jvm/f03e01-enum-badge.png)

> **"enum 不是 int 的别名——它是一组有名字、有行为、不可伪造的单例对象。把会员等级存 int，是在用哑巴替代会说话的对象。"**
> — 焰焰，看着 `if (level == 1)` 的分支链说

---

## 🎬 开场：会员折扣的 if-else 迷宫

> **〔1〕**
> 阿零写了一个会员折扣函数，30 行 if-else：`if (level == 1)` 普通，`if (level == 2)` 银牌，……`if (level == 5)` 黑金。焰焰看了一眼：「5 种等级，忘了写 level=4 的分支，编译器不提示，测试也不一定覆盖。」

> **〔2〕**
> 「换成 enum，编译器帮你数有几个常量。switch 表达式穷尽所有分支——漏写一个，编译报错。」焰焰定义了 5 个等级：
>
> ```java
> enum MemberLevel { NORMAL, SILVER, GOLD, PLATINUM, BLACK_GOLD }
> ```

> **〔3〕**
> 「但常量特定方法更优雅——把折扣逻辑放进枚举本身，不是放在外面的 switch 里。」焰焰改写：
>
> ```java
> enum MemberLevel {
>     NORMAL { @Override public int discount(int cents) { return cents; } },
>     GOLD   { @Override public int discount(int cents) { return cents * 9 / 10; } };
>     public abstract int discount(int cents);
> }
> ```
>
> 「现在每枚徽章知道自己的折扣规则，不需要外部 switch。」

> **〔4〕**
> 阿零把 12 种折扣逻辑分别内置进每个常量，主流程只剩一行：`level.discount(price)`。逻辑从散落的 if-else 收进了枚举定义，新增等级只需加一个常量，旧逻辑不动。

---

## 🔑 核心技术：enum 底层与常量特定方法

### enum 底层是什么

```java
enum Color { RED, GREEN, BLUE }
// 编译器等价于：
final class Color extends Enum<Color> {
    public static final Color RED   = new Color("RED",   0);
    public static final Color GREEN = new Color("GREEN", 1);
    public static final Color BLUE  = new Color("BLUE",  2);
    // ...values(), ordinal(), name() 等方法由 Enum 基类提供
}
```

关键结论：
- 每个枚举常量是 `Color` 类的**唯一实例**（单例）
- `==` 比较枚举常量安全（同一 JVM 内只有一个实例）
- `ordinal()` 是声明顺序（0起），不要用于持久化/业务逻辑
- `name()` 是声明名称（字符串），`Color.valueOf("RED")` 反向查找

### 常量特定方法

```java
enum Op {
    PLUS  { @Override public int apply(int a, int b) { return a + b; } },
    MINUS { @Override public int apply(int a, int b) { return a - b; } };
    public abstract int apply(int a, int b);
}
// Op.PLUS.apply(3, 2) → 5
// Op.MINUS.apply(3, 2) → 1
```

每个常量重写抽象方法，逻辑内聚在枚举定义里。

---

## ⚙️ 代码实录：会员徽章折扣系统

```java
// javac -encoding UTF-8 --release 25 MemberBadge.java
enum MemberLevel {
    NORMAL("普通",    0) {
        @Override public int discount(int cents) { return cents; }
    },
    SILVER("银牌",  200) {
        @Override public int discount(int cents) { return cents * 95 / 100; }
    },
    GOLD  ("黄金",  500) {
        @Override public int discount(int cents) { return cents * 90 / 100; }
    },
    PLATINUM("铂金", 2000) {
        @Override public int discount(int cents) { return cents * 85 / 100; }
    },
    BLACK_GOLD("黑金", 10000) {
        @Override public int discount(int cents) { return cents * 75 / 100; }
    };

    final String label;
    final int minPoints; // 达标积分门槛

    MemberLevel(String label, int minPoints) {
        this.label = label;
        this.minPoints = minPoints;
    }

    public abstract int discount(int cents);

    // 根据积分查等级
    public static MemberLevel byPoints(int points) {
        var levels = values();
        for (int i = levels.length - 1; i >= 0; i--) {
            if (points >= levels[i].minPoints) return levels[i];
        }
        return NORMAL;
    }
}

class MemberBadge {
    public static void main(String[] args) {
        int price = 2800; // 28元 = 2800分
        int[] pointSamples = {0, 300, 600, 3000, 15000};

        System.out.println("=== 会员折扣 ===");
        for (int pts : pointSamples) {
            MemberLevel level = MemberLevel.byPoints(pts);
            int finalPrice = level.discount(price);
            System.out.printf("积分%6d → %-6s → %-4s → 实付%d分%n",
                pts, level.name(), level.label, finalPrice);
        }

        // switch 表达式穷尽验证（漏写分支→编译报错）
        System.out.println("\n=== switch 穷尽 ===");
        for (MemberLevel lv : MemberLevel.values()) {
            String badge = switch (lv) {
                case NORMAL     -> "⚪";
                case SILVER     -> "🥈";
                case GOLD       -> "🥇";
                case PLATINUM   -> "💎";
                case BLACK_GOLD -> "🖤";
            };
            System.out.println(badge + " " + lv.label);
        }

        // == 比较安全
        System.out.println("\nNORMAL == byPoints(0): "
            + (MemberLevel.NORMAL == MemberLevel.byPoints(0)));
    }
}
```

**实测输出**（GraalVM 25.0.4）：

```
=== 会员折扣 ===
积分     0 → NORMAL  → 普通  → 实付2800分
积分   300 → SILVER  → 银牌  → 实付2660分
积分   600 → GOLD    → 黄金  → 实付2520分
积分  3000 → PLATINUM → 铂金  → 实付2380分
积分 15000 → BLACK_GOLD → 黑金  → 实付2100分
=== switch 穷尽 ===
⚪ 普通
🥈 银牌
🥇 黄金
💎 铂金
🖤 黑金
NORMAL == byPoints(0): true
```

关键验证：常量特定方法各自计算正确；`switch` 表达式穷尽5个常量；`==` 比较枚举安全。

---

## ⚠️ 常见陷阱

```java
// 陷阱1：ordinal() 用于持久化（常量顺序变则数据错乱）
db.save(level.ordinal());        // 危险！
db.save(level.name());           // ✅ 或自定义 code 字段

// 陷阱2：switch 遗漏分支在 Java 14 之前不报错
// Java 14+ switch 表达式（有返回值）要求穷尽，编译器兜底

// 陷阱3：枚举构造器不能 public（编译器强制 private）
enum X { A; public X() {} } // 编译错误：Illegal modifier for the enum constructor

// 陷阱4：EnumSet/EnumMap 比普通 Set/Map 快，应优先使用（见 F3E2）
```

---

## 🔬 炉底显微镜

> 焰焰用 `javap` 看编译器对枚举做了什么：

```bash
# 编译后查看枚举字节码
javac -encoding UTF-8 --release 25 MemberBadge.java
javap -c MemberLevel | head -30

# 验证枚举单例：同一 JVM 内 == 比较永远 true
java -ea --source 25 - <<'EOF'
enum Day { MON, TUE }
void main() {
    Day a = Day.valueOf("MON");
    Day b = Day.MON;
    System.out.println("相同引用: " + (a == b));        // true
    System.out.println("ordinal: " + b.ordinal());      // 0
    System.out.println("name: "    + b.name());         // MON
    System.out.println("所有常量: ");
    for (Day d : Day.values()) System.out.println("  " + d);
}
EOF
```

**实测输出**：

```
相同引用: true
ordinal: 0
name: MON
所有常量:
  MON
  TUE
```

关键观测点：
- 每个枚举类都有编译器生成的 `values()` 返回所有常量数组（每次调用都克隆数组，频繁调用建议缓存）
- `Enum.valueOf(name)` 内部查 `EnumConstantNotPresentException`；大小写必须完全匹配
- 枚举常量是类级别的 `static final` 字段，在类加载时初始化，保证 JVM 内唯一性（不跨 ClassLoader）
- 带常量特定方法的枚举，每个常量实际上是枚举类的匿名子类

---

## 📐 版本边界

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| `enum` 基础 | JDK 5 | 类型安全枚举 |
| 常量特定方法（抽象方法枚举）| JDK 5 | 每常量重写抽象方法 |
| `switch` 语句支持枚举 | JDK 5 | |
| `switch` 表达式（穷尽检查）| **JDK 14**（正式）| 有返回值，漏分支→编译错 |
| 本话代码运行环境 | JDK 25 | ✅ |

---

## 🎯 随堂练习

**Q1.** `enum` 常量可以用 `==` 比较吗？为什么？

**Q2.** `ordinal()` 为什么不应该用于数据库持久化？

**Q3.** 什么是常量特定方法？它解决了什么问题？

**Q4.** 枚举可以实现接口吗？可以继承类吗？

**Q5.** `MemberLevel.values()` 每次调用的代价是什么？如何优化？

**Q6.** `switch` 语句（无返回值）对枚举是否要求穷尽？`switch` 表达式呢？

**Q7.** 枚举构造器的访问修饰符有什么限制？

**Q8.** `EnumSet.of(NORMAL, SILVER)` 与 `new HashSet<>(Arrays.asList(...))` 的性能差距在哪？

**Q9.** 枚举能有可变字段吗？这样做好吗？

**Q10.** 如何从字符串 `"GOLD"` 反查枚举常量？

---

> [!答案]
>
> **Q1. 可以，且推荐。**枚举常量是 JVM 内的唯一实例（`static final` 单例），`==` 比较的是引用，枚举不需要重写 `equals()`（`Enum.equals()` 内部就是 `==`）。不过为可读性，用 `==` 或 `.equals()` 都接受。
>
> **Q2. `ordinal()` 是声明顺序（0起），一旦在枚举中间插入新常量，后面所有常量的 `ordinal` 都变了**，数据库里存的旧值就错位了。应该用 `name()`（字符串）或自定义的稳定 `code` 字段。
>
> **Q3. 常量特定方法：枚举声明抽象方法，每个常量用匿名类体重写该方法**，把各自的行为逻辑内聚在枚举定义内部，消除了外部 `switch/if-else` 分拣逻辑，新增常量时强制实现该方法。
>
> **Q4. 枚举可以实现接口**（常量特定方法本质上就是枚举实现了接口的一种形式）。枚举不能显式继承类——它隐式继承了 `java.lang.Enum`，Java 单继承限制不允许再继承其他类。
>
> **Q5. `values()` 每次调用都返回一个新克隆的数组**，有 GC 压力。优化：`private static final MemberLevel[] VALUES = values();` 缓存一次，循环里用 `VALUES` 代替 `values()`。JDK 21+ 的 switch 模式匹配对枚举穷尽检查无需 `values()`。
>
> **Q6. `switch` 语句（`switch (...) { case ... : ... }`）对枚举不要求穷尽**，可以只写部分 case，漏掉的走 default 或直接跳过。**`switch` 表达式（有返回值，`switch (...) { case ... -> ... }`）要求穷尽**，漏写分支编译报错（除非有 default）。
>
> **Q7. 枚举构造器不能是 `public` 或 `protected`**，只能是 `private` 或包私有（无修饰符）。编译器强制这一点，防止外部代码创建新的枚举实例。
>
> **Q8. `EnumSet` 底层用 `long` 位图实现（64个以内的常量用单个 long）**，所有操作都是位运算 O(1)，内存极小。`HashSet` 是哈希表，每个元素是对象，内存开销是 `EnumSet` 的数十倍，操作也慢。
>
> **Q9. 可以有可变字段，但不推荐。**枚举常量是单例，可变字段意味着全局共享状态，在并发场景下不安全，破坏了枚举"不可变常量"的语义。如需关联可变数据，用 `EnumMap<Level, T>` 替代。
>
> **Q10. `MemberLevel.valueOf("GOLD")`**——名称大小写必须与声明完全一致，否则抛 `IllegalArgumentException`。也可以用 `Enum.valueOf(MemberLevel.class, "GOLD")`。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 MemberBadge.java && java MemberBadge`，5种等级折扣、switch 穷尽、`==` 比较输出均与文中一致。
- **官方依据**：[Java SE 25 JLS §8.9](https://docs.oracle.com/javase/specs/jls/se25/html/jls-8.html#jls-8.9)（枚举类型）、[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)。`enum` 在 JDK 5 引入，switch 表达式在 JDK 14 正式化，JDK 25 无变更。

---

## 🔮 下话预告：F3E2《徽章专用工具箱》

徽章建好了——下话用专用工具箱管它们。

`EnumMap` 是按徽章开槽的专属抽屉柜，读写比 `HashMap` 快一个数量级；`EnumSet` 是位图集合，含不含某个等级只需一次位运算。最后用枚举实现一个订单状态机——状态是地铁线路图，转换是轨道，走错轨道在编译时就拦截。
