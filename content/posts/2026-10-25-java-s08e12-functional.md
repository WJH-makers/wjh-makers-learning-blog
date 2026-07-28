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

### 选择题(10 道)

1. 四大函数式接口中,Predicate 的角色是?
   - A) 变形机　B) 闸门(boolean test)——决定元素进不进流水线　C) 无底洞　D) 补货机
2. `Coffee::name` 属于哪种方法引用形态?
   - A) 静态方法引用　B) 类::实例方法(首参当接收者)　C) 构造器引用　D) 对象::实例方法
3. `Optional.of("拿铁").orElse(queryDb())` 的问题是什么?
   - A) 没问题　B) 即使 Optional 里有值,orElse 的参数(查库)也会先执行　C) 不支持串行　D) 编译错误
4. 正确延迟执行兜底值的方法是什么?
   - A) orElse　B) orElseGet(() -> queryDb())——只在没值时执行　C) get　D) map
5. `Optional.get()` 为什么是坏味道?
   - A) 空盒抛 NoSuchElementException,和判空一样危险　B) 太慢　C) 不支持链式　D) 会还原
6. 并行流的最佳应用场景是哪一组?
   - A) 数据量极小 + IO 密集　B) 数据量大(十万+)、纯 CPU、无共享可变状态、源好拆　C) 任何场景　D) 仅用于文件读取
7. 并行流 + 共享 ArrayList 会导致什么问题?
   - A) 自动同步　B) 元素丢失或数组越界——ArrayList 不是线程安全的　C) 更快　D) 编译拦截
8. Stream 的 collect 在并行流下怎么做到线程安全?
   - A) 自动加锁　B) 每个线程有私人本子(累加器),最后合并——并行安全是设计出来　C) 切换串行　D) 依赖 volatile
9. Collectors.groupingBy + counting 组合的含义是?
   - A) 排序　B) 按某键分组并统计每组的数量　C) 过滤　D) 去重
10. `orElse` 和 `orElseGet` 的核心区别是?
    - A) 返回值类型不同　B) orElse 参数不管有没有值都先执行,orElseGet 只在没值时执行　C) orElseGet 更快　D) orElse 是静态方法

> [!答案]
> **1-B**　Predicate.test 返回 boolean——filter 的参数就是 Predicate,「进不进流水线」看它。**举一反三**:四大接口不用全背——每当你写匿名类内用到 test/apply/accept/get 时,就知道它们分别对应哪个。
> **2-B**　`类名::实例方法` 要求「第一个参数是方法所属类型」——`Coffee::name` 等价于 `c -> c.name()`,c 就是 Coffee。**举一反三**:这是方法引用四种形态里最容易混淆的一种——关键是「流里元素类型恰好是方法所在类」;String::length、BigDecimal::intValue 都是这型。
> **3-B**　orElse 的参数是普通方法调用,在 Optional 解引用之前就执行了——不管盒里有值没值,queryDb() 都跑了。**举一反三**:`orElse(log("hello"))` 也一样——log 总是打,即使 Optional 有值。生产上 orElse 只放常量或已算好的值,绝不放带副作用的代码。
> **4-B**　orElseGet 接收一个 Supplier(补货机),只在 Optional 为空时才调用。**举一反三**:`orElseGet(() -> new ArrayList<>())` 是常见模式——只在需要时才分配空集合,省内存。
> **5-A**　直接 get 空盒 = NoSuchElementException;这和忘了判空一样危险。正确做法:orElse/orElseGet(给缺省值),orElseThrow(给专用异常),ifPresent(有值时执行)。**举一反三**:可以用 `orElseThrow(() -> new BusinessException("..."))` 替代 get;至少抛一个业务可读的异常,而不是让人摸脑子想为什么 NoSuchElement。
> **6-B**　并行流四条判据:数据量(小数据开销大于收益)、纯 CPU(无 IO)、无共享可变状态、好拆的数据源(ArrayList 好拆,LinkedList 难拆)。**举一反三**:默认写串行流;怀疑它可以并行的时候,用 JMH 跑一次基准测试——拿数据说话,不猜。
> **7-B**　ArrayList.add 三步(读 size→放元素→size++)线程不安全——八个线程同时做,互相覆盖,总数丢失;扩容瞬间数组越界。**举一反三**:共享可变状态 + 并行流 = 灾难配方;要收集就交给 collect,要变换就 map(纯函数);纯函数:同一个输入永远同一个输出,不改外部变量。
> **8-B**　collect 的 Supplier/Accumulator/Combiner 协议:每线程拿到自己的新容器(Supplier),往里累加(Accumulator),最后两步合并(Combiner)——全程没有共享状态。**举一反三**:这就是「分而治之」的 Stream 实现:split 数据源 → 多线程执行中间操作 → 各线程收集局部结果 → 合并。理解了这个协议,你也能写自定义 Collectors。
> **9-B**　`groupingBy(分类键, counting())` = SQL 里的 `GROUP BY key, COUNT(*)`。**举一反三**:`groupingBy` 还能嵌套 `mapping/summingInt/maxBy`,一行写出复杂的统计。熟悉 SQL 的人可以一对一对记:WHERE → filter,ORDER BY → sorted,LIMIT → limit,GROUP BY → groupingBy。
> **10-B**　orElse 的参数在调用那一刻就求值;orElseGet 的参数包装在 Supplier 里,只在 Optional 空时才调。**举一反三**:`orElse(new ArrayList<>())` 即使有值也新建了空List——浪费;`orElseGet(ArrayList::new)` 只在需要时才建——这两个是面试官最爱追问的细节。

### 解答题(5 道)

1. 四个函数式接口(Predicate/Function/Consumer/Supplier)各写一个咖啡站例子,画表解释它们充当的角色。
2. 遍历一个 `List<Order>`,取出已支付订单,按金额降序排,取前五,收集成 List。写一条 Stream 流水线。
3. 解释为什么并行流往共享 ArrayList 里 add 会丢失数据,以及为什么 collect 方案能避免。
4. `orElse` 和 `orElseGet` 的求值时机差异:给一个带副作用的例子,证明 orElse 总是执行兜底代码。
5. 什么时候不该用 Optional 做字段?为什么它只应做返回值?

> [!答案]
> **1**　| 接口 | 角色 | 咖啡站例子 ||---|---|---|| Predicate | 闸门 | `order -> order.status() == PAID`,filter 时用 || Function | 变形机 | `Order::total`,map 时从订单→金额 || Consumer | 无底洞 | `IO::println`,只吞不吐,forEach 时用 || Supplier | 补货机 | `ArrayList::new`,只吐不吞,collect 时提供容器 |　**举一反三**:把 Stream 想象成工厂流水线:Predicate=质检站(filter),Function=喷漆工位(map),Consumer=包装入库(forEach),Supplier=新开一个空托盘(collect 的容器提供者)。
> **2**　```java
List<Order> top5 = orders.stream()
    .filter(o -> o.status() == Status.PAID)
    .sorted(Comparator.comparing(Order::total).reversed())
    .limit(5)
    .toList();
```　**举一反三**:如果 sorted 在前、limit 在后——stream 是先排序再取前五(整体排序 O(n log n));如果把 limit 放 sorted 前面,意思是「先任意取 5 个,再排」——不是 Top 5 而是「抽中的 5 个内的排序」。
> **3**　ArrayList.add 是三步:读当前 size,放到 size 位置,size+1。两个线程同时读到 size=10,都放到 index 10,后者覆盖前者 → 丢一条。如果 size 从 10→11 时另一个线程正扩容到新数组,旧数组 index 11 越界。collect 方案:每线程有自己的 ArrayList → 自己的局部 add 是顺序的 → 最终 Combiner 把局部 list 合并。**举一反三**:collect 的并行安全源于**每个累加器独享一个可变容器**,最后一次性合并——这正是 Fork/Join 模型的套路。
> **4**　```java
int[] counter = new int[1];
Supplier<String> backup = () -> { counter[0]++; return "兜底"; };
Optional.of("拿铁").orElse(backup.get()); // 拿铁,但counter已经+1了(backup被执了)
Optional.of("拿铁").orElseGet(backup);   // 拿铁,counter没变
System.out.println(counter[0]); // 1
```　**举一反三**:orElse 参数在方法调用前计算——这是 Java 方法参数求值的常规规则(参数在方法调用前求值)。orElseGet 延迟执行的背后是 Supplier 把代码包了一层。
> **5**　Optional 是「返回值」——给调用方一个明确的「可能为空」信号。当做字段:每个 getter 返回 Optional,团队里「每次用都得 .orElse()」啰嗦;序列化多一层麻烦;更致命的是字段本身可能为 null → 你判的是「Optional 本身为 null」还是「盒子里为空」?Optional 做方法参数同理——应该让调用方决定怎么处理「可能为空」。**举一反三**:Optional 做字段的唯一可取场景是「类内部直实空了也合理,但我想用一个统一的方式提供兜底值」——即便如此也不推荐,用 `Collections.emptyList()` 之类的零对象模式更干净。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
