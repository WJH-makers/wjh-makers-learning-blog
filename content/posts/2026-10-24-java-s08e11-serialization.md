---
title: "《从零开始学 Java》67 · 序列化:让订单穿越重启"
date: 2026-10-24
summary: "咖啡站一断电,内存里的挂单全灭。Serializable 冷冻舱把订单冻成字节、活过重启;transient 拦下支付令牌,serialVersionUID 一改类就翻脸。看清 JDK 序列化三面漏风之后,对外的正道是 Jackson 与 JSON。"
tags: [Java, Java漫画, 序列化, Serializable, serialVersionUID, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》67 · 序列化:让订单穿越重启

> 连载特刊 · 番外卷一「语言宝库」第 11 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——文本会存了,可整个 Order 对象带着状态怎么原样过冬?重启就清零可不行。

---

## 一、事故:一次断电,挂单全灭

冬歇期第一夜,商场电路检修,咖啡站断电十分钟。来电重启后阿零对着屏幕发呆:上一话用字符流写的营业日志一个字没丢,可内存里三张没做完的挂单——订单号、状态、明细、创建时间——整块蒸发。

豆豆:「文件里存的是**字**,内存里活的是**对象**。堆是易失的,断电即清零。想让订单穿越重启,得把整张对象图**冻成字节**送出 JVM——序列化;回店再**原样解冻**——反序列化。」

---

## 二、漫画 · 对象冷冻舱

> **〔1〕** 深夜,JVM 城主拉闸,堆内存城区整片楼灯瞬间熄灭,三张飘在半空的 Order 对象「啪」地消散。
> 阿零(抱头):「我的挂单!顾客明早还要来取的!」

> **〔2〕** 豆豆推来一排硬盘形状的「冷冻舱」。
> 豆豆:「堆城区是内存,断电即清零。想活过重启,就把对象冻成字节,送出 JVM,存进硬盘。」

> **〔3〕** Order 对象排队登舱,JVM 城主逐个检票:「Serializable 贴纸?」一个没贴的对象被拦下,警报大作:`NotSerializableException`。
> 豆豆:「Serializable 是**标记接口**——一个方法都没有,纯粹是一张『我愿意被冻』的登舱贴纸。」

> **〔4〕** 安检口:`payToken` 字段被盖着 **transient** 的印章拦下——「敏感物品,不得登舱」;墙上的静态公告牌 `liveCount` 也被劝返——「你贴在**类**的墙上,不属于任何一个对象,不用上车」。

> **〔5〕** 次日,阿零按下「解冻」,冷冻舱红灯狂闪,屏幕上两串对不上的长数字在打架。
> 阿零:「我就给订单加了个『渠道』字段啊?!」
> 豆豆(叼着豆子叉腰):「你改了类的长相,存档还是旧脸。版本号对不上,JVM 凭什么信这是同一个类?」

---

## 三、本话目标

- 用 `Serializable` + 对象流,把整张 Order 对象图冻进硬盘、活过重启;
- 用 `transient` 拦住敏感字段,说清静态字段为什么天然不序列化;
- 讲透 `serialVersionUID`:不写会怎样、显式声明怎么救、类怎么演进;
- 认清 JDK 序列化三缺点,把对外数据交给 JSON(Jackson);
- 踩一次 `InvalidClassException` 并修好。

---

## 四、原理图:对象过冬管线

```text
冻(存):Order 对象图 ──ObjectOutputStream.writeObject()──▶ 字节流 ──▶ orders.ser
解(取):orders.ser ──▶ 字节流 ──ObjectInputStream.readObject()──▶ 一张全新的对象图

登舱规则:
  Serializable      标记接口,零方法,只表态「允许被冻」;对象图上每个类都得贴
  transient         该字段不上车;解冻后 = 默认值(引用 null / 数字 0)
  static            属于类不属于对象,本来就不在对象图里,谈不上序列化
  serialVersionUID  存档版本号;不显式声明,JVM 就按类结构(字段、方法、接口)自动算一个
```

> **豆豆锐评**:注意是「**整张图**都得贴」——`writeObject` 会顺着字段引用一路冻下去,图上任何一个类没实现 Serializable,当场 `NotSerializableException`。所以老手宁可在订单里存会员 id,也不直接引用整个会员对象:图越小,存档越轻,翻车面越小。

---

## 五、代码:订单冷冻舱 OrderVault

上一话的日志模块一行不动;在存档区旁边新开一间冷冻舱。`Coffee` 还是那个 record(价格自第 60 话起用 BigDecimal),贴上贴纸即可登舱;`Order` 要在制作中改状态,所以是普通类:

```java
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

record Coffee(String name, BigDecimal price, int stock) implements Serializable {}

public class Order implements Serializable {
    private final String id;
    private final List<Coffee> items;
    private final LocalDateTime createdAt = LocalDateTime.now();
    private String status = "挂单";           // 挂单 → 制作中 → 完成
    private transient String payToken;        // 支付令牌:敏感,禁止落盘
    private static int liveCount = 0;         // 在店订单数:属于类,不属于某张订单

    public Order(String id, List<Coffee> items, String payToken) {
        this.id = id; this.items = items; this.payToken = payToken;
        liveCount++;
    }
    public String id()               { return id; }
    public String status()           { return status; }
    public String payToken()         { return payToken; }
    public List<Coffee> items()      { return items; }
    public LocalDateTime createdAt() { return createdAt; }
}
```

```java
import java.io.*;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public class OrderVault {
    static void freeze(Order order, OutputStream sink) throws IOException {
        try (var out = new ObjectOutputStream(sink)) { out.writeObject(order); }
    }
    static Order thaw(InputStream source) throws IOException, ClassNotFoundException {
        try (var in = new ObjectInputStream(source)) { return (Order) in.readObject(); }
    }

    public static void main(String[] args) throws Exception {
        Path vault = Path.of("orders.ser");
        var order = new Order("ORD-1024",
                List.of(new Coffee("拿铁", new BigDecimal("18.00"), 10)), "tok-9f2a");
        freeze(order, Files.newOutputStream(vault));
        System.out.println("冷冻完成:" + Files.size(vault) + " 字节");

        Order back = thaw(Files.newInputStream(vault));
        System.out.println(back.id() + " 状态=" + back.status() + " 令牌=" + back.payToken());
    }
}
```

```text
冷冻完成:601 字节
ORD-1024 状态=挂单 令牌=null
```

三个细节:一杯拿铁的订单冻出 **601 字节**(记住这个数,后面算账);`令牌=null` 说明 transient 真把敏感字段拦在了舱外;重启后的新 JVM 里 `liveCount` 从 0 重新数——静态字段压根不在存档里。

---

## 六、故意制造一个 Bug:改了类,再读旧存档

第二天阿零接需求「区分堂食/外带」,顺手给 Order 加了个字段,然后去解冻昨晚的 `orders.ser`:

```java
public class Order implements Serializable {
    // …原有字段不动…
    private String channel = "堂食";   // ← 新增字段,完全没想过存档的感受
}
```

---

## 七、读懂真实报错

```text
Exception in thread "main" java.io.InvalidClassException: Order; local class incompatible:
        stream classdesc serialVersionUID = -3946787649759510155,
        local class serialVersionUID = 6402885715049432364
        at java.base/java.io.ObjectStreamClass.initNonProxy(ObjectStreamClass.java:597)
        at java.base/java.io.ObjectInputStream.readNonProxyDesc(ObjectInputStream.java:2051)
        at java.base/java.io.ObjectInputStream.readClassDesc(ObjectInputStream.java:1898)
        at java.base/java.io.ObjectInputStream.readObject(ObjectInputStream.java:509)
        at OrderVault.thaw(OrderVault.java:12)
        at OrderVault.main(OrderVault.java:22)
```

两串长数字就是两个 `serialVersionUID`:`stream classdesc` 是**写档时**旧 Order 算出的,`local class` 是**现在**新 Order 算出的。阿零没显式声明,JVM 就按类结构自动计算——加了一个 `channel` 字段,算出来的值立刻变了,旧档全部被拒收。

> **🎯 面试直击**:serialVersionUID 是干什么的?不写会怎样?
> 它是类的「存档版本号」,反序列化时与流里的记录比对,不一致直接 `InvalidClassException`。不写则由 JVM 按类结构自动算,类稍一改动值就变、旧档全作废——所以要长期存的类必须显式声明。追问点:record 是例外,record 类不声明时该值为 0L,且反序列化**豁免这项比对**,按组件名匹配、缺的给默认值。

---

## 八、修复,并用测试证明

显式声明版本号,把「这还是同一个类」的裁判权从自动计算手里拿回来:

```java
public class Order implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;   // 锁死版本号,结构演进不作废旧档
    private String channel = "堂食";
    // …其余字段不变…
}
```

旧档随即能读了,但解冻出来的 `channel` 是 **null** 而不是 `"堂食"`——反序列化不走构造器、不跑字段初始化,旧档里没有的字段只给默认值,用的时候判空兜底。这也是 record 序列化更让人放心的原因:它**一定走规范构造器**,校验逻辑不会被绕过。演进策略三条:

- 锁死 serialVersionUID 后:**加字段兼容**(旧档读出默认值)、删字段兼容(旧数据被忽略)、**改字段类型仍不兼容**,照样炸;
- record 天生宽容:按组件名匹配 + 豁免版本号比对,给 `Coffee` 加组件,旧档照读;
- 结构大改就别硬凑:换新类名或换格式,写一段迁移代码,把旧档一次性洗过去。

```java
import org.junit.jupiter.api.Test;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class OrderVaultTest {
    @Test
    void order_survives_freeze_and_thaw_but_token_does_not() throws Exception {
        var order = new Order("ORD-1024",
                List.of(new Coffee("拿铁", new BigDecimal("18.00"), 10)), "tok-9f2a");
        var buf = new ByteArrayOutputStream();
        OrderVault.freeze(order, buf);

        Order back = OrderVault.thaw(new ByteArrayInputStream(buf.toByteArray()));

        assertEquals("ORD-1024", back.id());
        assertEquals(new BigDecimal("18.00"), back.items().getFirst().price()); // 连 scale 都原样穿越
        assertNull(back.payToken());   // transient:敏感令牌绝不落盘
    }
}
```

修完坑,豆豆泼冷水:JDK 序列化三面漏风——**体积**(一杯拿铁 601 字节,JSON 一百出头);**跨语言**(这堆字节只有 Java 认识,收银小程序看不懂);**安全**(反序列化=拿别人给的字节在你 JVM 里造对象,字节可被精心构造成攻击链,生产上必须配反序列化**过滤器**白名单放行)。所以对外一律 JSON,Java 世界的主力是 Jackson:record 开箱即用,组件即字段、规范构造器即入口(普通类则要无参构造 + getter);字段名和日期格式都能声明式对齐:

```java
record OrderView(@JsonProperty("order_id") String id,
                 List<Coffee> items,
                 @JsonFormat(pattern = "yyyy-MM-dd HH:mm") LocalDateTime createdAt) {}

var mapper = new ObjectMapper().registerModule(new JavaTimeModule()); // 教它认识 java.time
String json = mapper.writeValueAsString(new OrderView(order.id(), order.items(), order.createdAt()));
// {"order_id":"ORD-1024","items":[{"name":"拿铁","price":18.00,"stock":10}],"createdAt":"2026-10-24 09:30"}
```

> **🔀 豆豆的多解台 · 对象持久化,格式怎么选?**

| 方案 | 要点 | 适合什么时候 | 坑 |
|---|---|---|---|
| JDK 序列化 | `Serializable` + 对象流,一行冻整张对象图 | JVM 自用的临时存档、进程内状态落盘 | 体积大、只有 Java 认识、反序列化是攻击面(必须配过滤器) |
| JSON(Jackson) | 文本格式,record 开箱即用,`@JsonProperty` 对齐契约 | 对外 API、跨语言、要人眼可读 | 没有类型信息,日期与精度全靠双方约定 |
| 二进制协议(Protobuf 概念) | 先写契约文件生成代码,按字段编号紧凑编码 | 高吞吐 RPC、省流量、严格的字段演进 | 引入一套编译工具链,人眼不可读 |

豆豆锐评:**默认 JSON**——跨语言、可读、生态大;JDK 序列化只留给「自己冻自己吃」且配了过滤器的场景;性能抠到每个字节再上 Protobuf。

---

## 九、项目检查点 · 豆豆咖啡站 v8.11

```text
咖啡站形态:订单冻得进硬盘、活得过重启;敏感令牌永不落盘
已具备  :Serializable/对象流存取;显式 serialVersionUID 锁版本 + 演进策略;
          transient/静态字段的边界;JDK 序列化三缺点看得清,对外一律 Jackson/JSON
还没有  :统计报表还在用十行 for 循环手搓 —— 流水线该练成内功了
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| Serializable / 对象流 / serialVersionUID | 老系统与 RPC 框架的基本功,面试爱拿 InvalidClassException 考类演进 |
| transient 与敏感字段治理 | 安全意识题:密码、令牌绝不落盘 |
| Jackson / JSON 序列化与格式选型 | 后端 JD 几乎条条写「熟悉 JSON 序列化」 |
| 反序列化攻击与过滤器意识 | 安全向加分项,一句话就能和背书选手拉开差距 |

---

## 十一、下一话悬念

存、取、冻、解,数据管道全通。阿零开始写冬歇总结报表:统计上周卖得最好的三款咖啡——十行 for 循环,外加两个临时 Map,越写越像面条。

豆豆看着屏幕叹气:「该把流水线(回看第 28 话)练成内功了。」

> 下一话《函数式收官:方法引用·Optional·并行流》:十行 for 循环压成一行流水线,Optional 收编 null 幽灵,并行流什么时候真能快——番外卷一的函数式债,一次结清。

---

## 🎯 随堂练习

### 选择题(10 道)

1. Serializable 接口的作用是?
   - A) 自动深拷贝　B) 是一个标记接口(零方法),声明「我愿意被序列化」　C) 压缩对象　D) 生成 equals
2. transient 关键字在序列化中的效果是?
   - A) 加速序列化　B) 该字段不上车,解冻后为默认值(引用 null,数字 0)　C) 加密字段　D) 永久删除
3. static 字段为什么天然不被序列化?
   - A) 编译器 bug　B) static 字段属于类不属于对象,序列化的是对象图　C) 会自动参加　D) 被 transient 替换
4. serialVersionUID 不显式声明会怎样?
   - A) 自动分配随机值　B) JVM 按类结构自动算——字段一改值就变,旧存档全部被拒　C) 没影响　D) 生成异常
5. 显式声明 `private static final long serialVersionUID = 1L` 后加了新字段,反序列化旧存档——新字段的值是?
   - A) 自动赋值　B) 默认值(引用 null)　C) 抛异常　D) 编译错误
6. JDK 序列化三条缺点不包括?
   - A) 体积大(带类型元数据)　B) 只有 Java 认识　C) 反序列化是攻击面(需要配过滤器)　D) 速度比 JSON 慢很多
7. record 在序列化方面有什么优势?
   - A) 没有　B) 一定走规范构造器(校验逻辑被保留),且豁免 serialVersionUID 比对(按组件名匹配)　C) 序列化更快　D) 自动压缩
8. 给外界(API/文件)传数据,应优先用什么格式?
   - A) JDK 序列化　B) JSON(Jackson)——跨语言、人眼可读、生态大　C) 字节流　D) XML 优先
9. InvalidClassException 提示「stream classdesc serialVersionUID=... local class=...」,含义是?
   - A) 磁盘已满　B) 存档时类结构 ≠ 当前类结构(你没显式声明 serialVersionUID,自动算出的不一样)　C) 网络超时　D) 内存不足
10. 反序列化安全的核心防御手段是?
    - A) 不反序列化　B) 配 ObjectInputFilter 白名单,只放行已知类型　C) 用 HTTPS　D) 限定文件路径

> [!答案]
> **1-B**　Serializable 是标记接口(没有任何方法),纯粹是给 JVM 一个信号:「这个类可以被 ObjectOutputStream 序列化」。**举一反三**:ObjectOutputStream 写对象前会检查对象 instanceof Serializable——不是的话直接 NotSerializableException。
> **2-B**　transient 序列化时跳过该字段;反序列化后取到默认值:引用 null,整数 0,boolean false。**举一反三**:敏感字段(密码、令牌、密钥)用 transient;业务上不需要持久化的临时状态(如缓存)也可以用 transient。
> **3-B**　static 字段存在类的元空间,不属于任何实例——序列化只冻实例的对象图。**举一反三**:反序列化后静态字段是「当前 JVM 里类的那个值」,不是冻之前的快照——重启后静态计数器归零。
> **4-B**　serialVersionUID 是类的「存档版本号」——你声明了就不变,没声明 JVM 自动算(字段+方法 决定),类改一点值就变,旧档全都 InvalidClassException。**举一反三**:IDE 都有「生成 serialVersionUID」的检查项;IntelliJ → Settings → Inspections → "Serializable class without 'serialVersionUID'",打开。
> **5-B**　旧存档里没有 channel 字段,反序列化时跳过它——不调构造器、不给默认字面值,只分配类型的零值(引用 null)。**举一反三**:所以这种新字段在解冻后必须判空——`if (channel == null) channel = "堂食"`;这就是 record 在这件事上更好:它走规范构造器,你可以在那里设默认值。
> **6-D**　JDK 序列化的体积不比 JSON 慢一个量级,而是体积更大——它存储了完整的类元数据、字段名、类型信息,比 JSON 臃肿得多。**举一反三**:文章里「一杯拿铁 601 字节」就是 JDK 序列化的产物;同样的数据 Jackson 写 JSON 才一百多字节。
> **7-B**　record 的反序列化不走 readObject,而是读组件名然后调规范构造器——构造器里的校验逻辑(比如 `addons = List.copyOf(addons)`)会被执行。而且 record 的 serialVersionUID 默认为 0L,反序列化时豁免比对。**举一反三**:普通类要模拟 record 的这个行为,得手写 readObject/readResolve——记住,record 就是替你写了这些。
> **8-B**　JSON 跨语言、人眼可读、Jackson 生态覆盖所有常用场景(日期/枚举/自定义序列化器);JDK 序列化只留在 JVM 内部自用的存档。**举一反三**:Jackson 和 Gson 之争:Jackson 的功能和性能都领先;Spring Boot 默认注的就是 Jackson 的 ObjectMapper,这是 Jackson 成为事实标准的推力之一。
> **9-B**　存档时 (stream classdesc) 和当前类 (local class) 的 serialVersionUID 不一致——你没显式声明,加了一个字段后自动算的值变了。**举一反三**:如果这是生产事故,临时修复是回退到旧类,或写迁移程序(先冻成中间格式 JSON,再按新类读回去)。
> **10-B**　`ObjectInputFilter.Config.setSerialFilter(filter)` 全局设白名单,只允许已知的包名/类名反序列化。**举一反三**:这条是 OWASP Top 10 级别的安全建议——Java 反序列化漏洞常年稳居高危;CVE 看几个,就知道不是吓唬人。

### 解答题(5 道)

1. serialVersionUID 为什么必须显式声明?写出一个「加字段后旧存档被拒→恢复」的完整过程。
2. 比较 JDK 序列化和 Jackson JSON 三方面:跨语言、体积、安全性。什么情况下仍用 JDK 序列化?
3. transient 和 static 在序列化中的行为有什么不同?画表对比。
4. record 的反序列化比普通类好在哪?为什么 record 能绕开反序列化的安全风险?
5. 设计一个「订单存档 + 重启恢复」的功能:Order 包含敏感 token,要求存档后 token 不落盘,重启后 token 重新生成。

> [!答案]
> **1**　不加 serialVersionUID:JVM 按类结构(字段名/类型/访问修饰符/父类/接口)自动计算散列。加了一个 channel 字段 → 散列变化 → 旧存档反序列化时 InvalidClassException。修复:显式声明 `private static final long serialVersionUID = 1L`,锁死版本号,旧档可读;新增字段在解冻后得到默认值 null,使用时判空。**举一反三**:实际上 record 不需要显式声明——它的 serialVersionUID 固定 0L,增加了组件名也兼容;这是 JEP 395 为 record 序列化特意做的豁免。
> **2**　| 维度 | JDK 序列化 | Jackson JSON ||---|---|---|| 跨语言 | 只有 Java | 任何语言 || 体积 | 大(含类元数据) | 紧凑(只存数据) || 安全性 | 反序列化攻击(需配过滤器) | 无远程代码执行风险,文本格式 || 仍用场景 | JVM 内部短期缓存、分布式 session(都是自己冻自己吃) | 对外 API、文件、消息队列 |　**举一反三**:Spring Session 用 JDK 序列化存 session 对象——属于「同一个集群内自己的 JVM 互相传」,风险可控;但 session 里的对象一旦写进 Redis 给外部读,就踩安全红线了。
> **3**　| 修饰符 | 序列化行为 | 反序列化后值 | 语义 ||---|---|---|---|| transient | 跳过该字段 | 零值(null/0/false) | 此字段属于临时态或敏感信息,不存档 || static | 不序列化(属于类不属对象) | 当前 JVM 里该类的值 | 静态字段是类级别的,不是对象图的成员 |　**举一反三**:transient 并不等于销毁——序列化是跳过,解冻后你可以在 readObject 里手动还原(比如重新生成 token);static 则从来不在对象图里,所以需要单独保存。
> **4**　普通类反序列化不走构造器——可以绕过构造器里的校验逻辑、final 字段可以被直接写入(通过 Unsafe/反射),攻击者可构造出非法状态的对象的字节流。record 反序列化**必须走规范构造器**——验证逻辑被执行、全部字段必须赋值(否则编译期就过不去)。**举一反三**:这就是为什么 Effective Java 推荐「尽量让类不可变、尽量用 record」——越不可变更安全。
> **5**　```
class Order implements Serializable {
    private String id;
    private transient String payToken; // 不落盘
    private void readObject(ObjectInputStream in) throws Exception {
        in.defaultReadObject();  // 先反序列化非 transient 字段
        this.payToken = TokenGenerator.issue(id);  // 重启后重新生成
    }
}
```　或直接用 record 的规范构造器:record 解冻时走构造器,`payToken` 组件不在组件表里——但你设计上就别把 payToken 放进 record 的组件,单独管理。**举一反三**:`readObject/writeObject` 自定义序列化行为是这个机制的标准扩展点——不过大部分时候不该用;默认行为 + transient 已经解决 90% 的情况。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
