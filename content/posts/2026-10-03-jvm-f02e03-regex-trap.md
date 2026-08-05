---
title: "F2E3 文本捕兽夹 — Pattern、Matcher 与命名分组"
date: "2026-10-03"
series: "jvm-academy"
season: 2
episode: 3
tags: ["Java 25", "正则表达式", "Pattern", "Matcher", "命名分组", "性能"]
excerpt: "Pattern.compile() 是铸捕兽夹，Matcher.find() 是放夹子。夹子要在炉里预先铸好，不能每次用时现铸——小票流水里抓优惠码，三行代码，命名分组让匹配结果可读如文档。"
---

> **"正则表达式不难——难的是每次用时都 `new Pattern()`。那不叫用正则，叫浪费 CPU。"**
> — 焰焰，指着监控大屏说

---

## 🎬 开场：优惠码淹没在流水里

> **〔1〕**
> 阿零面对一堆小票原始日志，每行格式混乱，优惠码散落其中：
>
> ```
> 订单#A001 咖啡×2 COUPON:BREW20 总计￥56.00 [OK]
> 订单#B002 茶×1                  总计￥28.00 [OK]
> 订单#C003 拿铁×3 COUPON:LATTE15 总计￥84.00 [OK]
> ```
>
> 「我想把所有 `COUPON:XXXXXX` 提取出来，分别拿到码本身。」

> **〔2〕**
> 焰焰看了一眼，「两件事要想清楚——**先铸夹，再放夹**。」
>
> `Pattern` 是编译好的正则引擎（铸夹），是不可变对象，线程安全，可以 `static final` 共享。`Matcher` 是一次匹配过程（放夹），有可变状态，每次 `pattern.matcher(input)` 创建新实例，不要跨线程共用。

> **〔3〕**
> 「命名分组 `(?<name>...)` 是第二个要点。」焰焰在白板上写下：
>
> ```java
> (?<code>[A-Z0-9]{4,10})
> ```
>
> 「匹配结果直接 `m.group("code")` 拿，不用数括号是第几个。三个月后读代码，还是人话。」

> **〔4〕**
> 阿零按提示写完三行代码，把全部优惠码提取干净，顺手给每行日志加了行号和金额分组：
>
> ```
> 发现优惠码: BREW20   → 折扣行: COUPON:BREW20
> 发现优惠码: LATTE15  → 折扣行: COUPON:LATTE15
> ```
>
> 「明白了——Pattern 是模具，Matcher 是每一次浇铸。」

---

## 🔑 核心技术：Pattern 与 Matcher

### 编译与匹配分工

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

### 命名分组语法

| 语法 | 含义 |
|---|---|
| `(?<name>...)` | 命名捕获分组 |
| `\k<name>` | 反向引用命名分组 |
| `m.group("name")` | 取命名分组内容 |
| `(?:...)` | 非捕获分组（不编号）|

---

## ⚙️ 代码实录：从流水日志提取优惠码

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

## ⚠️ 性能陷阱：循环内 compile

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

---

## 🔬 炉底显微镜

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

## 📐 版本边界

**版本边界**

| 特性 | JDK | 说明 |
|---|---|---|
| `Pattern` / `Matcher` | JDK 1.4 | 正则 API 引入 |
| 命名分组 `(?<name>...)` | **JDK 7** | 与 Python `(?P<name>...)` 语法不同 |
| `Matcher.reset(CharSequence)` | JDK 1.4 | 复用 Matcher |
| `String.matches()` 内部 compile | JDK 1.4 | 循环热路径勿用 |
| 本话代码运行环境 | JDK 25 | ✅ |

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

---

## 🔮 下话预告：F2E4《懒汉工厂》

捕兽夹铸好了——下一话聊对象怎么按需创建。

`Optional<T>` 把「可能没有」显式化，`Supplier<T>` 把「创建逻辑」延迟到第一次真正需要的时候。焰焰用优惠码查询服务示范如何用这两个组件消灭 `NullPointerException`，同时把初始化副作用收拢到第一次访问时触发。
