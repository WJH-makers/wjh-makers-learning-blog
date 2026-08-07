---
title: "《从零开始学 Java》67 · 序列化:让订单穿越重启"
date: 2026-07-08
summary: "咖啡站一断电,内存里的挂单全灭。Serializable 冷冻舱把订单冻成字节、活过重启;transient 拦下支付令牌,serialVersionUID 一改类就翻脸。看清 JDK 序列化三面漏风之后,对外的正道是 Jackson 与 JSON。"
tags: [Java, Java漫画, 序列化, Serializable, serialVersionUID, 番外, 阿零与豆豆]
---

![Java漫画：s08e11-serialization](/comics/java/s08e11-serialization.png)

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

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. `Serializable` 接口的特点是?
   - A) 有一个 `serialize()` 方法要实现　B) **标记接口,零方法,只表态「允许被冻」**　C) 是抽象类　D) 只能用于 record
2. 序列化一个对象时,对象图上其它类怎么办?
   - A) 自动处理　B) **图上每个类都得实现 `Serializable`**,任何一个没实现就抛 `NotSerializableException`　C) 只需顶层类实现　D) 由 JVM 跳过
3. `transient` 修饰的字段,解冻后是?
   - A) 原值　B) **默认值**(引用 null / 数字 0)　C) 抛异常　D) 被跳过不存在
4. `static` 字段为什么不参与序列化?
   - A) 被自动排除　B) **它属于类不属于对象**,本来就不在对象图里　C) 因为是共享的　D) 需要加 transient
5. `serialVersionUID` 的作用是?
   - A) 对象的唯一 ID　B) **类的「存档版本号」**,反序列化时与流中记录比对,不一致抛 `InvalidClassException`　C) 序列化顺序　D) 校验和
6. 不显式声明 `serialVersionUID` 会怎样?
   - A) 编译报错　B) **由 JVM 按类结构自动计算,类稍一改动值就变、旧档全部作废**　C) 默认为 0　D) 不影响
7. 反序列化时,对象是怎么被创建的?
   - A) 调用无参构造器　B) 调用全参构造器　C) **不走构造器、也不跑字段初始化** —— 旧档没有的字段只给默认值　D) 通过反射调用 setter
8. record 在序列化上的特殊之处是?
   - A) 不能序列化　B) **不声明时 UID 为 0L 且豁免版本号比对,按组件名匹配,而且一定走规范构造器**(校验不会被绕过)　C) 必须显式声明 UID　D) 只能序列化基本类型
9. JDK 序列化的三个缺点是?
   - A) 慢、复杂、难用　B) **体积大、只有 Java 认识(不跨语言)、反序列化是攻击面**　C) 不支持泛型、不支持继承、不支持集合　D) 已被移除
10. 生产环境使用 JDK 反序列化时,必须配的是?
    - A) 加密　B) **反序列化过滤器(白名单放行)**　C) 压缩　D) 签名

> [!答案]
> **1-B**　标记接口只是一个表态。**举一反三**:`Cloneable` 也是标记接口 —— 这类「空接口 + 约定行为」的设计现在已不推荐。
> **2-B**　整张图都要贴。**举一反三**:所以老手宁可在订单里存会员 id,也不直接引用整个会员对象 —— 图越小,翻车面越小。
> **3-B**　它不上车。**举一反三**:密码、令牌、连接对象都该标 transient;但要记得解冻后用它前先判空。
> **4-B**　它压根不在对象图里。**举一反三**:所以重启后静态计数器归零是必然的 —— 这类状态要单独持久化。
> **5-B**　它是版本裁判。**举一反三**:错误信息里的两串数字,一串来自流、一串来自当前类,对比着看就知道是不是类改过了。
> **6-B**　自动计算等于把裁判权交给编译器。**举一反三**:要长期存的类必须显式声明 —— 这是把「兼容性」的决定权拿回自己手里。
> **7-C**　绕过构造器是个隐患。**举一反三**:这意味着构造器里的校验、防御性拷贝全被跳过 —— 一个不变量完好的类可能被反序列化成非法状态。
> **8-B**　record 走规范构造器,校验不会被绕过。**举一反三**:这正是 record 序列化更让人放心的原因,也是它设计上「不可变优先」的一致体现。
> **9-B**　体积、跨语言、安全。**举一反三**:一杯拿铁的订单冻出 601 字节,JSON 只要一百出头 —— 差距是数量级的。
> **10-B**　白名单是唯一靠谱的防线。**举一反三**:反序列化 = 拿别人给的字节在你的 JVM 里造对象,这句话理解了,为什么它危险就不用背了。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*
