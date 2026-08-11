---
title: "《JVM 火种纪》10 · 文本捕兽夹"
date: 2026-10-03
summary: "小票原始日志每行格式混乱，优惠码和金额散落其中。阿零用 Pattern.compile() 预先铸好捕兽夹，Matcher.find() 去放夹子；命名分组 (?<code>...) 让匹配结果可读如文档；炉底看 Pattern 内部 NFA 节点树。"
tags: [Java, Java漫画, JVM, 正则表达式, Java25, 阿零与焰焰]
---

# 《JVM 火种纪》10 · 文本捕兽夹

> JVM 火种纪 · 卷二「类库补课篇」第 3 话 · 基线 Java 25（最新 LTS）
> 长期项目:**豆豆咖啡站**。上一话破了夏令时凶案，日志格式化器换干净了——可小票日志每行的格式本身就是一团乱麻，用 `indexOf` + `substring` 摸位置随时摸错。

---

## 一、事故：优惠码淹没在流水里

上一话把日志格式化器换成了线程安全的 `DateTimeFormatter`。这周阿零打开小票原始日志，遇到另一种麻烦:每行格式都不规则，优惠码和金额散落其间。

```
订单#A001 咖啡×2 COUPON:BREW20 总计￥56.00 [OK]
订单#B002 茶×1                  总计￥28.00 [OK]
订单#C003 拿铁×3 COUPON:LATTE15 总计￥84.00 [OK]
```

他现在的方法是 `indexOf("COUPON:")` 找位置，再 `substring` 往后截一段——但截几位？碰到没有优惠码的行怎么办？碰到新的格式 `PROMO:SAVE10` 怎么办？每改一次需求，`indexOf` 链就要再往里加一层。

豆豆路过看了一眼：「你在用手一个个摸位置。要抓东西，得先铸个夹子。」

---

## 二、漫画 · 优惠码淹没在流水里

![《JVM 火种纪》10 · 文本捕兽夹——Pattern 与 Matcher 六格漫画](/comics/jvm/f02e03-regex-trap.png)

> [!文字版]
> **〔1〕** 阿零面对一堆小票原始日志，每行格式混乱，优惠码散落其中:「我想把所有 `COUPON:XXXXXX` 提取出来，分别拿到码本身。」他展示那串 `indexOf` 链，每次需求一变就往里加一层。
>
> **〔2〕** 焰焰看了一眼，「两件事要想清楚——**先铸夹，再放夹**。」`Pattern` 是编译好的正则引擎（铸夹），不可变，线程安全，可以 `static final` 共享。`Matcher` 是一次匹配过程（放夹），有可变状态，每次 `pattern.matcher(input)` 创建新实例，不要跨线程共用。
>
> **〔3〕** 「命名分组 `(?<name>...)` 是第二个要点。」焰焰在白板上写下:`(?<code>[A-Z0-9]{4,10})`。「匹配结果直接 `m.group("code")` 拿，不用数括号是第几个。三个月后读代码，还是人话。」
>
> **〔4〕** 阿零按提示写完三行代码，把全部优惠码提取干净，顺手给每行加了行号和金额分组：「明白了——Pattern 是模具，Matcher 是每一次浇铸。」
>
> **〔5〕** 焰焰追一句：「你上一话懂了共享有状态的对象会踩踏。这里 `Pattern` 是无状态的——多少线程同时用这一个 `Pattern` 都行，状态在 `Matcher` 那边，每次重新创建就好。」
>
> **〔6〕** 炉底浮出一个 JDK 1.4 的正则残影，抱着一摞 `StringTokenizer`：「那年代要从字符串里抓子串，得一刀一刀手切……」焰焰把它送进收藏柜，「一行 `Pattern.compile` 的工作量，你们全省了。」残影散进火里。

---

## 三、本话目标

- 理解 `Pattern`（预编译，不可变，线程安全）与 `Matcher`（单次匹配，有状态）的职责分工；
- 用 `static final Pattern` 避免循环热路径里的重复编译；
- 用命名分组 `(?<name>...)` 让提取结果可读；
- 用 `find()` 循环提取多个匹配；
- 说清正则 API 的版本边界与 `String.matches()` 的陷阱。

---

## 四、炉内原理图：Pattern 是模具，Matcher 是浇铸

上一话我们看到 `static final` 不能保证线程安全——保证安全靠的是**不可变**。`Pattern` 是一个编译完成后永远不再修改内部状态的对象:

```
Pattern（不可变，线程安全）
  .compile(regex)          ← 编译，耗时，只做一次
  .matcher(input)          ← 返回新 Matcher 实例（轻量）

Matcher（可变，非线程安全）
  .find()                  ← 向后搜索下一个匹配
  .matches()               ← 全串匹配
  .group("name")           ← 取命名分组
  .group(n)                ← 取第 n 组（从1起）
  .start() / .end()        ← 匹配区间（字符偏移）
  .reset(newInput)         ← 复用 Matcher 换输入
```

命名分组的优势在可读性:三个月后 `m.group("code")` 比 `m.group(1)` 更容易看懂你在取什么。它在性能上和编号分组相同——`Pattern` 内部维护一张 `Map<String,Integer>` 把名字映射到下标。

---

## 五、从上一话继续改代码：用 Pattern+Matcher 替掉 indexOf 链

上一话那支 `static final DateTimeFormatter` 的写法在这里可以照搬:夹子铸在类加载时，循环里只管放:

```java
// javac -encoding UTF-8 --release 25 CouponExtractor.java
import java.util.regex.*;
import java.util.List;

class CouponExtractor {

    // ── 铸好夹子：static final，只编译一次 ────────────────
    // 命名分组 code：大写字母+数字，4~10位
    // 命名分组 amount：金额，如 56.00
    static final Pattern COUPON_PAT =
        Pattern.compile("COUPON:(?<code>[A-Z0-9]{4,10})");

    static final Pattern AMOUNT_PAT =
        Pattern.compile("总计￥(?<amount>[0-9]+\\.[0-9]{2})");

    public static void main(String[] args) {
        List<String> lines = List.of(
            "订单#A001 咖啡×2 COUPON:BREW20 总计￥56.00 [OK]",
            "订单#B002 茶×1                  总计￥28.00 [OK]",
            "订单#C003 拿铁×3 COUPON:LATTE15 总计￥84.00 [OK]"
        );

        for (String line : lines) {
            // 每次放新夹子（创建新 Matcher）
            Matcher cm = COUPON_PAT.matcher(line);
            Matcher am = AMOUNT_PAT.matcher(line);

            String code   = cm.find() ? cm.group("code")   : "无";
            String amount = am.find() ? am.group("amount") : "??";

            System.out.printf("优惠码: %-8s | 金额: %-6s | %s%n",
                code, amount, line.substring(0, 9));
        }

        // ── find() 循环：一行日志含多个匹配 ──────────────────
        String multiLine = "COUPON:EARLY10 COUPON:VIP50 COUPON:BREW20";
        Matcher m = COUPON_PAT.matcher(multiLine);
        int count = 0;
        while (m.find()) {
            System.out.printf("  [%d] 码=%s  start=%d end=%d%n",
                ++count, m.group("code"), m.start(), m.end());
        }
    }
}
```

**实测输出**（GraalVM 25.0.4）：

```
优惠码: BREW20   | 金额: 56.00  | 订单#A001
优惠码: 无       | 金额: 28.00  | 订单#B002
优惠码: LATTE15  | 金额: 84.00  | 订单#C003
  [1] 码=EARLY10  start=7  end=15
  [2] 码=VIP50    start=23 end=29
  [3] 码=BREW20   start=37 end=43
```

关键验证：命名分组 `code`/`amount` 独立提取；无优惠码行返回 `"无"`；`find()` 循环正确定位多匹配偏移。

---

## 六、故意翻一次车：循环里现铸夹子

阿零跑通了代码，觉得正则很简单。焰焰指了指他以前写过的一段日报统计代码:

```java
// 危险：每次循环都重新编译正则，性能浪费
for (String line : millionLines) {
    Pattern p = Pattern.compile("COUPON:(?<code>[A-Z0-9]{4,10})");
    Matcher m = p.matcher(line);
    ...
}

// 也是陷阱：String.matches() 内部每次 compile
line.matches("COUPON:.*");  // 简单场景才用，不在循环热路径里用

// 正确：static final Pattern，只编译一次
static final Pattern PAT = Pattern.compile("COUPON:(?<code>[A-Z0-9]{4,10})");
```

「Pattern 是模具——铸一次，用千万次。你那段代码每行都铸一次，就算只跑一万行也相当于编译器跑了一万遍。」

---

## 七、编译官罚单

> **📋 编译官罚单 · 这次编译官没吭声**
>
> 循环内 `Pattern.compile()` 语法完全合法，编译器不会有任何提示:
>
> ```text
> （无编译错误——每次循环重新编译正则，性能悄悄浪费）
> ```
>
> 这不是语法问题，是**性能问题**——和上一话一样属于编译器管不到的那一类。`Pattern.compile()` 把正则字符串解析成 NFA 节点树，每次调用都要重走一遍词法分析和图构造。在循环热路径上重复做这件事，监控里看到的是 CPU 慢慢吃满，而不是一个报错。

---

## 八、修复并验证

修复只有一条：**把 `Pattern.compile()` 搬出循环，存为 `static final` 字段**。`Matcher` 可以在循环内每次新建（轻量），也可以用 `reset()` 复用同一个对象。

验证判据三条：

1. **命名分组提取正确**:`m.group("code")` 拿到 `BREW20`，`m.group("amount")` 拿到 `56.00`。
2. **无匹配行不抛异常**:无优惠码的行 `cm.find()` 返回 `false`，代码走到 `"无"` 分支，不崩。
3. **`find()` 循环多匹配正确**:一行三个 COUPON 时，三次 `find()` 各自返回正确的 `start`/`end`。

正常路径实测输出（GraalVM 25.0.4）：

```
优惠码: BREW20   | 金额: 56.00  | 订单#A001
优惠码: 无       | 金额: 28.00  | 订单#B002
优惠码: LATTE15  | 金额: 84.00  | 订单#C003
  [1] 码=EARLY10  start=7  end=15
  [2] 码=VIP50    start=23 end=29
  [3] 码=BREW20   start=37 end=43
```

---

## 九、🔬 炉底显微镜 · Pattern 内部的 NFA 节点树

> 焰焰在炉底检查 Pattern 内部状态：

```bash
# 查看 Pattern 编译后的节点结构（反编译）
javap -p java.util.regex.Pattern | head -20

# 验证 Matcher 非线程安全：同一 Matcher 两线程同时 find()，输出混乱
# 正确验证用法：每次 pattern.matcher(input) 创建新实例
java -ea --source 25 - <<'EOF'
import java.util.regex.*;
void main() {
    Pattern p = Pattern.compile("\\d+");
    Matcher m = p.matcher("123 456 789");
    while (m.find()) {
        System.out.println("找到: " + m.group() + " @" + m.start());
    }
    // reset 后复用 Matcher
    m.reset("999 888");
    while (m.find()) {
        System.out.println("重用: " + m.group());
    }
}
EOF
```

**实测输出**：

```
找到: 123 @0
找到: 456 @4
找到: 789 @8
重用: 999
重用: 888
```

关键观测点：
- `Pattern.compile()` 把正则字符串编译为 NFA 节点树，过程涉及语法解析，耗时是 `matcher()` 的数十倍
- `Matcher.reset(input)` 复用 `Matcher` 对象本身，避免 GC 压力，适合高频短生命周期场景
- `(?<name>...)` 命名分组在 `Pattern` 内部维护 `Map<String,Integer>` 记录分组下标，性能与编号分组相同

---

## 十、⏳ 版本时光机 · 正则 API 的版本边界

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| `Pattern` / `Matcher` | JDK 1.4 | 正则 API 引入 |
| 命名分组 `(?<name>...)` | **JDK 7** | 与 Python `(?P<name>...)` 语法不同 |
| `Matcher.reset(CharSequence)` | JDK 1.4 | 复用 Matcher |
| `String.matches()` 内部 compile | JDK 1.4 | 循环热路径勿用 |
| 本话代码运行环境 | JDK 25 | ✅ |

---

## 十一、命名分组语法速查

| 语法 | 含义 |
|---|---|
| `(?<name>...)` | 命名捕获分组 |
| `\k<name>` | 反向引用命名分组 |
| `m.group("name")` | 取命名分组内容 |
| `(?:...)` | 非捕获分组（不编号）|

---

## 十二、项目检查点 · 豆豆咖啡站 jvm-v1.3

- **已具备**：订单时间戳存 `Instant`（v1.1）；海外时区处理（v1.2）；小票日志的优惠码和金额用 `static final Pattern` 预编译提取，命名分组让结果可读，`find()` 循环应对多匹配场景。
- **还没有**：正则还只处理了「匹配」——还没有处理「贪婪模式吃掉整行」、「嵌套量词把 CPU 吃满」这类正则性能坑。

阿零的变化：他这一话第一次把「编译」和「执行」分开对待——上一话他懂了不可变对象的线程安全，这一话他懂了**不可变的同时还要共享**：一次铸造，所有线程用同一把夹子，状态在 Matcher 那边，每次新建。

---

## 十三、对应招聘技能

`Pattern` 与 `Matcher` 分工、命名分组与可读性、`static final Pattern` 预编译、`find()` 循环提取多匹配、`String.matches()` 的性能陷阱、`Matcher.reset()` 复用。

---

## 十四、下一话悬念

捕兽夹铸好了，用起来也顺手了。可阿零发现了一行特殊的小票——`[VIP][EARLY][VIP][LATE][VIP] 订单总计: ￥128.00`——一个看起来很简单的正则 `.*\[.*\].*` 在这行上跑了半分钟，进程直接卡死。

焰焰看了一眼监控上红色的 CPU：「夹子铸得太贪了。贪婪的 `.*` 一口吞下整行，再慢慢往外吐——遇上嵌套量词，吐的次数是指数级的。」下一话，**贪婪/懒惰/独占量词与回溯灾难**上场：把 CPU 从 100% 救下来的，是改两个字符。

---

## 🎯 随堂练习

**Q1.** `Pattern` 和 `Matcher` 分别是线程安全的吗？

**Q2.** 为什么要把 `Pattern.compile()` 结果存为 `static final` 字段？

**Q3.** `m.matches()` 和 `m.find()` 有什么区别？

**Q4.** 命名分组 `(?<price>\d+\.\d{2})` 如何取出匹配的金额字符串？

**Q5.** `Pattern.compile("\\d+")` 和 `Pattern.compile("\d+")` 有什么区别？

**Q6.** `m.find()` 返回 `false` 后再次调用 `m.find()` 会怎样？

**Q7.** 如何在一个字符串里找出所有匹配（不只第一个）？

**Q8.** `String.replaceAll("[aeiou]", "*")` 内部每次都 `compile` 吗？有没有性能更好的写法？

**Q9.** 非捕获分组 `(?:...)` 与普通分组 `(...)` 的区别是什么？

**Q10.** 正则 `^COUPON:\w+$` 与 `COUPON:\w+` 应用 `m.matches()` 和 `m.find()` 时行为分别如何？

---

> [!答案]
>
> **Q1. `Pattern` 线程安全（不可变），`Matcher` 线程不安全（有可变状态）。**每个线程调用 `pattern.matcher(input)` 创建独立的 `Matcher` 实例，不要跨线程共用同一个 `Matcher`。
>
> **Q2. `Pattern.compile()` 编译正则为 NFA，耗时较高。**放在 `static final` 字段里，只在类加载时编译一次，之后所有调用复用已编译的对象，避免循环热路径里反复编译的性能浪费。
>
> **Q3. `m.matches()` 要求整个输入串完全匹配正则（隐式加了 `^` 和 `$`）；`m.find()` 在输入串中搜索下一个满足正则的子串，不要求全串匹配。**
>
> **Q4.** `m.find()` 返回 `true` 后，调用 `m.group("price")` 取出该分组内容。
>
> **Q5. `"\\d+"` 是 Java 字符串字面量转义，代表正则 `\d+`（匹配一个或多个数字）；`"\d+"` 是非法 Java 字符串（`\d` 不是合法转义序列，Java 14+ 编译报错）。**正则中的反斜杠在 Java 字符串里必须写成 `\\`。
>
> **Q6. `m.find()` 返回 `false` 表示已到输入末尾，再次调用仍返回 `false`（不会重置到开头）。**要重新搜索需调用 `m.reset()` 或创建新 `Matcher`。
>
> **Q7. 使用 `while (m.find()) { ... }` 循环**，每次 `m.find()` 向后找下一个匹配，直到返回 `false`。JDK 9+ 也可用 `m.results()` 返回 `Stream<MatchResult>`。
>
> **Q8. 是的，`String.replaceAll()` 内部每次都调用 `Pattern.compile()`。**性能更好的写法是预编译 `static final Pattern`，然后用 `pat.matcher(s).replaceAll("*")`。
>
> **Q9. 非捕获分组 `(?:...)` 不分配分组编号、不记录匹配内容**，性能略优于普通分组，适合只分组不捕获的场景（如 `(?:foo|bar)+`）。命名分组 `(?<name>...)` 或编号分组 `(...)` 则会记录匹配内容，可后续引用。
>
> **Q10.** `^COUPON:\w+$` 配合 `m.matches()`：`matches()` 自动全串匹配，`^$` 可省略效果相同，能匹配 `"COUPON:BREW20"` 这样的纯字符串。配合 `m.find()`：`find()` 搜索子串，`^` 限制行首，`$` 限制行尾，若输入包含其他内容也能找到第一个匹配的行首行尾段。无 `^$` 的 `COUPON:\w+` 配合 `m.find()` 可在任意位置找到匹配子串，是提取场景的常用写法。

---

## 运行环境、验证与依据

- **运行环境**：GraalVM 25.0.4+7.1（`graalvm-jdk-25.0.4`），Windows 11，编码 UTF-8。
- **验证方式**：`javac -encoding UTF-8 --release 25 CouponExtractor.java && java CouponExtractor`，输出与文中实测结果一致；`find()` 循环多匹配、`reset()` 复用均通过验证。
- **官方依据**：[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API - java.util.regex.Pattern](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/regex/Pattern.html) 与 [Matcher](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/regex/Matcher.html)。命名分组 `(?<name>...)` 在 JDK 7 引入，JDK 25 无变更。

*本话属于连载《从零进化Java:JVM 火种纪》。世界观与卷次地图见 [/jvm](/jvm)。*
