---
title: "《从零开始学 Java》68 · 函数式收官:方法引用·Optional·并行流"
date: 2026-10-25
summary: "报表还靠十行 for?函数式收官一话补齐:方法引用四种形态、Optional 的正确姿势、Collectors 分组统计,再踩一次并行流往共享 ArrayList 里 add 的暗坑——统计数忽多忽少,偶发数组越界。账本第一页,今天写满。"
tags: [Java, Java漫画, Stream, Optional, 并行流, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》68 · 函数式收官:方法引用·Optional·并行流

> 连载特刊 · 番外卷一「语言宝库」第 12 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——订单存取管道全通,可豆豆盯着阿零那十行 for 循环写的统计报表直叹气:是时候把流水线练成内功了。

---

## 一、需求:报表别再用十行 for

第 67 话存档读回来的销售流水,阿零写统计:for 循环套 if,再手工往计数 Map 里加一。能跑,但豆豆换上面试官脸:「你简历写着『熟悉 Stream』(回看第 28 话)。追问三件事:方法引用有几种形态?`orElse` 和 `orElseGet` 差在哪?并行流什么时候反而更慢?」

阿零:「……我就会 `.stream().filter()`。」

豆豆翻开账本第一页,只剩最后一格空着——**函数式**。「今天收官。」

---

## 二、漫画 · 流水线的最后一课

> **〔1〕** 技术债账本第一页摊在桌上,11 个勾,最后一格空白。豆豆敲着它,面试官三连问砸下来,阿零后背冒汗。
> 豆豆:「会用,和讲得透,隔着一整个冬天。」

> **〔2〕** 流水线上四个工位拟人亮相:Predicate 是只放行合格品的**闸门**(test),Function 是**变形机**(apply),Consumer 是只吞不吐的**无底洞**(accept),Supplier 是只吐不吞的**补货机**(get)。
> 豆豆:「你写过的每个 lambda,拆到底都是这四种工位之一。」

> **〔3〕** 阿零一笔一划写 `c -> c.name()`,豆豆直接递上一张名片:`Coffee::name`。
> 豆豆:「lambda 是现场教『怎么做』;方法引用是递名片——『这活儿,归他』。」

> **〔4〕** 一个透明快递盒(Optional)。阿零看都不看就 `.get()` 硬掰,盒子是空的,Null 幽灵「嗖」地飘出来。
> 豆豆(叼着豆子叉腰):「`get` 是坏味道——空盒硬掰,跟不判空一个德行。」

> **〔5〕** 阿零把流水线拆成八条并行,却让所有工人往**同一本**共享清单上记账。Race 双胞胎挤在清单前抢一支笔,数字涂得忽多忽少。
> 阿零:「怎么每次跑出来的总数都不一样?!」

> **〔6〕** JUnit 质检员抱臂立在终点:「证据呢?」
> 豆豆:「中间工位保持纯函数,收集的活交给 `collect`——每人一个小本,最后合账。」

---

## 三、本话目标

- 认全四大函数式接口,写出方法引用四种形态;
- 用对 Optional:`orElse`/`orElseGet` 求值差异、map/filter 链、不做字段和参数;
- 用 `groupingBy` / `counting` / `joining` 一条流水线出报表;
- 判断并行流何时快何时慢,踩一次共享可变状态的坑;
- 用 Stream Gatherers(JDK 24)做一个窗口聚合。

---

## 四、原理图:四种工位与一张名片

```text
Stream 流水线(回看第 28 话):数据源 → 中间操作(懒,不到终点不开工)→ 终结操作
parallel():同一条流水线拆成多段同时跑,底层全应用共用一个 ForkJoinPool 公共池
Optional:一个"可能装着值"的透明盒子,逼你把「没有」当正常分支处理
```

| 接口 | 抽象方法 | 工位角色 | 咖啡站例子 |
|---|---|---|---|
| `Predicate<T>` | `boolean test(T)` | 闸门:进不进流水线 | `c -> c.stock() > 0` |
| `Function<T,R>` | `R apply(T)` | 变形机:T 变 R | `Coffee::name` |
| `Consumer<T>` | `void accept(T)` | 无底洞:只吞不吐 | `IO::println` |
| `Supplier<T>` | `T get()` | 补货机:只吐不吞 | `() -> new ArrayList<>()` |

| 方法引用形态 | 写法 | 等价 lambda |
|---|---|---|
| 类::静态方法 | `BigDecimal::valueOf` | `x -> BigDecimal.valueOf(x)` |
| 对象::实例方法 | `menu::get` | `k -> menu.get(k)` |
| 类::实例方法(首参当接收者) | `Coffee::name` | `c -> c.name()` |
| 构造器引用 | `ArrayList::new` | `() -> new ArrayList<>()` |

> **⏳ 版本时光机 · 一段「回调」的进化**

| JDK 版本 | 写法 | 关键变化 |
|---|---|---|
| JDK 7 | `new Comparator<Coffee>() { public int compare(...) {…} }` 匿名内部类五行 | 只想传一段行为,却被迫裹一层类 |
| Java 8 | `(a, b) -> a.price().compareTo(b.price())` → 再简成 `Comparator.comparing(Coffee::price)` | Lambda 让行为能当参数;方法引用连「怎么做」都省了 |
| JDK 24 | `stream.gather(Gatherers.windowFixed(3))` | Gatherers 转正(JEP 485):中间操作本身也能自定义 |

一句演进小结:从「裹一层类」到「递一张名片」,再到「流水线工位自己也能造」。

---

## 五、代码:把十行 for 换成一条流水线

在第 67 话读回的流水 `sold` 之上,报表全部重写:

```java
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Gatherers;

// #60 起计价统一 BigDecimal
record Coffee(String name, BigDecimal price, int stock) {}

public class Report {
    public static void main(String[] args) {
        List<Coffee> sold = List.of(
                new Coffee("拿铁", new BigDecimal("18.00"), 1),
                new Coffee("美式", new BigDecimal("15.00"), 1),
                new Coffee("拿铁", new BigDecimal("18.00"), 1));

        // ① 每款销量:分组 + 计数
        Map<String, Long> countByName = sold.stream()
                .collect(Collectors.groupingBy(Coffee::name, Collectors.counting()));
        IO.println(countByName);                       // {美式=1, 拿铁=2}

        // ② 小票摘要:joining(分隔符, 前缀, 后缀)
        IO.println(sold.stream().map(Coffee::name)
                .collect(Collectors.joining("、", "今日卖出:", "。")));

        // ③ 销冠:max 给的是 Optional,map 链着用,空了走兜底
        String top = sold.stream()
                .max(Comparator.comparing(Coffee::price))
                .map(Coffee::name)
                .orElse("今日无销量");
        IO.println("销冠:" + top);

        // ④ 每 3 单一批的小计:Gatherers 窗口聚合(JDK 24 转正)
        sold.stream()
                .gather(Gatherers.windowFixed(3))
                .map(batch -> batch.stream().map(Coffee::price)
                        .reduce(BigDecimal.ZERO, BigDecimal::add))
                .forEach(sum -> IO.println("一批小计:" + sum));
    }
}
```

Optional 的正确姿势,一张表收干净:

| 姿势 | 要点 |
|---|---|
| `orElse(算兜底)` | **有没有值,兜底表达式都先执行**——兜底是现成常量才用它 |
| `orElseGet(() -> 算兜底)` | 空了才执行——兜底要查库、建对象,一律用它 |
| `map` / `filter` 链 | `opt.map(Coffee::name).filter(n -> !n.isBlank())`,空盒自动短路,不用层层判空 |
| `get()` | 坏味道:空盒抛 `NoSuchElementException`;真要抛,用 `orElseThrow(...)` 抛得明明白白 |
| 当字段 / 参数 | **别**。设计本意只做返回值;当字段还得多想一层「Optional 本身是不是 null」,套娃 |

> **豆豆锐评**:`orElse(queryDb())` 这种写法,值好好地在盒子里,库也白查一遍——生产环境里它就是慢查询批发商。

---

## 六、故意制造一个 Bug:并行流 + 共享 ArrayList

十万条流水,阿零想提速,顺手 `parallelStream`,又顺手往外面的共享清单里 add:

```java
List<String> names = new ArrayList<>();
sold10w.parallelStream().forEach(c -> names.add(c.name()));   // ← 八个工人抢同一个本子
IO.println(names.size());
```

连跑三次:`99213`、`98764`、第三次直接崩。

---

## 七、读懂真实报错

```text
Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException:
        Index 74241 out of bounds for length 69790
        at java.base/java.util.ArrayList.add(ArrayList.java:457)
        at java.base/java.util.ArrayList.add(ArrayList.java:470)
        at Report.lambda$main$1(Report.java:31)
        at java.base/java.util.stream.ForEachOps$ForEachOp$OfRef.accept(ForEachOps.java:184)
        ...
```

`ArrayList` 不是线程安全的。`add` 拆开是三步:读 size → 往下标 size 放元素 → size+1。八个线程同时做:两人读到同一个 size,互相覆盖,总数变少;更险的是**扩容瞬间**,有人拿着旧下标往还没换大的数组外写——数组越界。最阴的一点:**多数时候它不崩,只是悄悄少几百条**。静默丢数据,比崩溃可怕得多。

> **🎯 面试直击**:并行流什么时候反而更慢?
> 四种情况:① 数据量小、单条任务轻,拆分调度开销盖过计算;② 流水线里有 IO/阻塞,占死公共池工人,全应用的并行流一起卡;③ 大量装箱拆箱(该用 `IntStream` 却用 `Stream<Integer>`);④ 共享可变状态——要么加锁变相串行,要么算错。追问点:所有并行流默认共用**同一个** ForkJoinPool 公共池,一处滥用全局遭殃——这个池的内脏,#77/#78 下深水区再解剖。

---

## 八、修复:收集的活,交还给 collect

纪律一句话:**中间操作保持纯函数**——只做「输入 → 输出」,不碰外面的世界(不改共享变量、不做 IO)。收集这种带状态的活交给终结操作:`collect`/`toList()` 会给每个工人发私人小本,各记各的,最后按序合并——**并行安全是设计出来的,不靠运气**。

```java
List<String> names = sold10w.parallelStream().map(Coffee::name).toList();
```

要不要开 `parallel`,四条全中再开:数据量大(十万级起步或单条计算重)、纯 CPU 不碰 IO、无共享可变状态、源好拆(`ArrayList`/数组好拆,链式结构难拆)。默认写串行,拿测量数据说话——质检员只认证据:

```java
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.function.Supplier;
import java.util.stream.IntStream;
import static org.junit.jupiter.api.Assertions.assertEquals;

class ReportTest {
    @Test
    void parallel_collect_loses_nothing() {
        var sold10w = IntStream.range(0, 100_000)
                .mapToObj(i -> new Coffee("单" + i, new BigDecimal("18.00"), 1))
                .toList();
        assertEquals(100_000,
                sold10w.parallelStream().map(Coffee::name).toList().size());
    }

    @Test
    void orElse_evaluates_eagerly_orElseGet_does_not() {
        var calls = new int[1];
        Supplier<String> backup = () -> { calls[0]++; return "兜底"; };
        Optional.of("拿铁").orElse(backup.get());   // 有值,兜底照样执行了一次
        Optional.of("拿铁").orElseGet(backup);      // 有值,兜底根本没执行
        assertEquals(1, calls[0]);
    }
}
```

两个测试全绿:十万条一条不丢;`orElse`/`orElseGet` 的求值差异,不再是背出来的,是测出来的。

---

## 九、项目检查点 · 豆豆咖啡站 v8.12

```text
咖啡站形态:报表一条流水线出——分组销量、小票摘要、销冠、三单一批小计;十万条流水并行统计一条不丢
已具备  :四大函数式接口与方法引用四形态;Optional 正确姿势(orElse/orElseGet/链式/不做字段);
          groupingBy·counting·joining;并行流四条判据与纯函数纪律;Gatherers 窗口聚合
还没有  :账本第一页的 12 项改造还散在 12 话里,没在同一家店里同时跑起来——明天验收
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| Lambda / 方法引用 / Stream | JD 标配「熟练 Java 8+ 函数式风格」,代码评审第一眼看你的流水线干不干净 |
| Optional 正确姿势 | 防 NPE 的现代基本功;`get()` 满天飞是评审减分项 |
| 并行流的边界 | 高频题「并行流为什么可能更慢」,能点出公共 ForkJoinPool 是加分项 |
| Collectors / Gatherers | 报表聚合类需求的标准解;知道 Gatherers 说明你跟着 JDK 在长个儿 |

---

## 十一、下一话悬念

豆豆在账本第一页最后一格,重重打了个勾——**12 个格子,全满**。

「明天,精装修验收日。BigDecimal 计价、枚举状态机、时间线、正则、叫号队列、LRU 缓存……一次性,把 12 项改造跑给全店看。」

阿零:「一次性?万一哪项没接好——」

豆豆(叼着豆子):「那正好,当场清账。」

> 下一话《精装修验收日》:番外卷一收卷。12 项改造整合进咖啡站,JUnit 全绿才算数——据说还有一条漏网之鱼,躲在某个角落里用着 double。

---

## 🎯 随堂练习

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. `Predicate<T>` / `Function<T,R>` / `Consumer<T>` / `Supplier<T>` 的抽象方法依次是?
   - A) `apply` / `test` / `get` / `accept`　B) **`test` / `apply` / `accept` / `get`**　C) 都是 `apply`　D) `filter` / `map` / `forEach` / `supply`
2. `Coffee::name` 属于方法引用的哪一种形态?
   - A) 类::静态方法　B) 对象::实例方法　C) **类::实例方法(首参当接收者)**　D) 构造器引用
3. `orElse(...)` 和 `orElseGet(...)` 的关键区别是?
   - A) 返回类型不同　B) **`orElse` 的兜底表达式无论有没有值都会先执行;`orElseGet` 只在空盒时才执行**　C) 前者更快　D) 后者可能返回 null
4. `Optional.of("拿铁").orElse(queryDb())` 的问题是?
   - A) 编译报错　B) **值好好地在盒子里,库还是白查了一遍** —— 生产环境的慢查询批发商　C) 返回 null　D) 抛异常
5. 关于 `Optional`,下列做法**不推荐**的是?
   - A) 当方法返回值　B) 用 `map`/`filter` 链式处理　C) 用 `orElseThrow` 明确抛错　D) **当字段或方法参数**
6. `opt.get()` 被视为坏味道,因为?
   - A) 性能差　B) **空盒时抛 `NoSuchElementException`,等于把判空责任又丢回去了**;要抛就用 `orElseThrow` 抛明白　C) 已废弃　D) 不支持泛型
7. 并行流里 `forEach(c -> sharedList.add(...))` 会?
   - A) 正常工作　B) **总数忽多忽少,扩容瞬间还可能 `ArrayIndexOutOfBoundsException`** —— `ArrayList` 不是线程安全的　C) 抛并发修改异常　D) 自动加锁
8. 上题最阴险的地方在于?
   - A) 一定会崩溃　B) **多数时候不崩,只是悄悄少几百条** —— 静默丢数据　C) 只在 Windows 出现　D) 日志会刷屏
9. 并行流反而更慢的情形**不包括**?
   - A) 数据量小、单条任务轻　B) 流水线里有 IO/阻塞　C) 大量装箱拆箱　D) **纯 CPU 计算、十万级数据、无共享状态**
10. 所有并行流默认共用什么?
    - A) 各自独立的线程池　B) **同一个 ForkJoinPool 公共池** —— 一处滥用全局遭殃　C) 主线程　D) 虚拟线程

> [!答案]
> **1-B**　闸门、变形机、无底洞、补货机。**举一反三**:记住「只吞不吐是 Consumer,只吐不吞是 Supplier」,四个接口就不会混。
> **2-C**　首参自动当接收者。**举一反三**:所以 `Coffee::name` 能当 `Function<Coffee, String>` 用 —— 参数被「借」去当了 this。
> **3-B**　一个提前求值,一个惰性求值。**举一反三**:兜底是现成常量用 `orElse`,要计算/查库一律 `orElseGet`。
> **4-B**　白查一遍库。**举一反三**:这类「看着没错但白干活」的问题不会报错,只会体现在监控曲线上。
> **5-D**　它的设计本意只做返回值。**举一反三**:当字段还得多想一层「Optional 本身是不是 null」—— 套娃反而更危险。
> **6-B**　它把问题又推回去了。**举一反三**:`orElseThrow(() -> new BizException("..."))` 既抛得明白,又带上了业务上下文。
> **7-B**　`add` 拆开是「读 size → 放元素 → size+1」三步。**举一反三**:这和第 71 话的 `count++` 是同一类竞态,只是发生在集合内部。
> **8-B**　静默丢数据比崩溃可怕。**举一反三**:崩溃会立刻被发现,少几百条可能永远没人察觉。
> **9-D**　这恰恰是并行流的理想场景。**举一反三**:开不开并行,四条判据全中再开 —— 数据量大、纯 CPU、无共享状态、源好拆。
> **10-B**　全应用共用一个池。**举一反三**:所以并行流里做 IO 会占死公共池工人,把整个应用的并行流一起拖垮。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*