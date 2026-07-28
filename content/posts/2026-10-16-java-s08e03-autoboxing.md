---
title: "《从零开始学 Java》59 · 包装类与自动装箱的陷阱"
date: 2026-10-16
summary: "会员等级 127 时 == 判等一路绿灯,128 却突然翻车;积分表里取出的 null 一拆箱就爆。Integer 不是 int:装箱走 valueOf,缓存只到 127,比较必须 equals。豆豆带阿零掀开堆城区的缓存货架,把自动装箱的三颗雷一次排干净。"
tags: [Java, Java漫画, 包装类, 自动装箱, IntegerCache, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》59 · 包装类与自动装箱的陷阱

> 连载特刊 · 番外卷一「语言宝库」第 3 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——口味位图刚上线,阿零随手拿 Integer 对象用 `==` 比较:127 相等,128 却不等,幽灵已经现身。

---

## 一、事故:128 级老会员,系统不认

冬歇特训,细节债第三笔。咖啡站的会员等级从积分表里取出来就是 `Integer` 对象;「同级拼团」活动要判断两位会员是否同级,阿零随手一个 `==`。测试数据等级最高 127,一路绿灯;老会员老陈和老王双双攒到 128 级,系统却咬定他俩「不同级」。

阿零:「同一行代码,127 全对,128 全错——判等还能跟数字大小有关?」

豆豆(面试官脸):「先别改代码。我问你:`Integer` 是数,还是对象?`==` 对对象比的是什么?」阿零张了张嘴,没接上——细节债,追问即露馅。

---

## 二、漫画 · 堆城区的缓存货架

> **〔1〕** 阿零把两张「128」等级牌拍在判等门上,喊「一样!」——门亮红灯:不一样。旁边两张「127」牌轻松过闸,绿灯。
> 阿零:「见鬼了,127 是同一个人,128 就成陌生人?」

> **〔2〕** JVM 城主领他走进堆城区,墙角立着一排常驻小格子,编号 **-128 ~ 127**,每格里住着一个现成的 Integer 住户。
> JVM 城主:「这是 IntegerCache 货架。`valueOf` 碰到这个区间的数,直接把**同一位**老住户递给你,不盖新房。」

> **〔3〕** 阿零要「128」,城主耸耸肩,当场 new 一间新房;再要一次,又 new 一间——两间房,门牌号不同。
> 豆豆:「`==` 比的就是门牌号。127 每次拿到同一位老住户,当然相等;128 每次都是新房客,地址不同,`==` 翻脸。」

> **〔4〕** 【特写格】编译官 Javac 出示两张翻译单:`Integer a = 128` 被改写成 `Integer.valueOf(128)`(装箱);`int x = a` 被改写成 `a.intValue()`(拆箱)。
> 编译官:「装箱拆箱是我在编译期替你插的代码,不是免费魔法。」

> **〔5〕** Null 幽灵从一张空积分表里飘出来,阿零伸手把「null」当 int 接住,「砰」。
> 豆豆(叼着豆子叉腰):「表里没这个人,`get` 给你 null;你让 null 去 `intValue()`,幽灵可不就贴脸开炸。」

---

## 三、本话目标

- 认全 8 对基本类型 ↔ 包装类,分清「数」与「对象」;
- 讲清装箱 = `valueOf`、拆箱 = `intValue` 等 `xxxValue`,全是编译期翻译;
- 吃透 IntegerCache:为什么 127 `==` 为 true、128 为 false;
- 排掉两颗雷:包装类比较用 `equals`、null 拆箱 NPE;
- 记住包装类当 Map 键的类型匹配规矩。

---

## 四、原理图:翻译机 + 缓存货架

```text
你写的                 编译官实际生成的
Integer a = 128;   →   Integer a = Integer.valueOf(128);   // 装箱
int x = a;         →   int x = a.intValue();               // 拆箱

Integer.valueOf(n):
  n ∈ [-128, 127]  → 返回 IntegerCache 里同一个共享对象
  其他             → 每次装箱都造新对象

==      比引用(门牌号)—— 是不是同一个对象
equals  比数值          —— 值相等,且要求类型相同
```

| 基本类型 | 包装类 | 缓存情况 |
|---|---|---|
| byte / short / int / long | Byte / Short / Integer / Long | -128~127(Integer 上界可调) |
| char | Character | 0~127 |
| boolean | Boolean | TRUE / FALSE 两个常量 |
| float / double | Float / Double | 无缓存,装箱必是新对象 |

> **豆豆锐评**:IntegerCache 的上界确实能用 `-XX:AutoBoxCacheMax=256` 调大,调完 128 的 `==` 真会变 true——但那是 JVM 调优参数,不是让你赌运气的。换台机器、换个启动脚本,结果就反转。结论一次背死:**包装类比较永远 `equals`(或 `Objects.equals`),`==` 只留给基本类型。**

---

## 五、代码:同级拼团判定(从上一话继续)

在第 58 话口味位图会员的基础上,给积分表加一个「同级判定」。阿零版长这样:

```java
import java.util.HashMap;
import java.util.Map;

public class MemberLevel {
    static final Map<String, Integer> LEVELS = new HashMap<>();   // 会员名 → 等级(对象!)

    static boolean sameLevel(String a, String b) {
        return LEVELS.get(a) == LEVELS.get(b);    // 阿零版:127 以内测试全过
    }

    void main() {
        LEVELS.put("阿零", 127);
        LEVELS.put("豆豆", 127);
        IO.println(sameLevel("阿零", "豆豆"));     // true,阿零:「稳了」
    }
}
```

顺带一条**包装类当 Map 键**的规矩:包装类不可变、`equals`/`hashCode` 稳定,当键没问题;坑在**类型必须严丝合缝**——`Map<Long, String>` 里 `map.get(1)` 永远查不到:1 装箱成 `Integer`,`Long.equals(Integer)` 恒为 false。查长整型键,写 `map.get(1L)`。

---

## 六、故意制造一个 Bug:等级 128 的判等翻车

老陈和老王升到 128 级,阿零顺手写了个最小验证:

```java
LEVELS.put("老陈", 128);
LEVELS.put("老王", 128);
IO.println(sameLevel("老陈", "老王"));   // 阿零以为必是 true

Integer a = 128, b = 128;
IO.println(a == b);                      // 最小复现
Integer c = 127, d = 127;
IO.println(c == d);
```

---

## 七、观察真实现象与报错

```text
false
false
true
```

没有异常,没有警告,**静悄悄地给错**——比崩溃更阴险。128 出了缓存,两次装箱是两个对象,`==` 必然 false;127 命中货架上同一个住户,才「碰巧」true。

阿零顺着排查积分表,又踩响第二颗雷——不存在的会员直接取积分当 int 用(Map 取值回看第 22 话):

```java
Map<String, Integer> points = new HashMap<>();
int p = points.get("路人甲");    // 表里没这个人,get 返回 null
```

```text
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "java.lang.Integer.intValue()" because the return value of "java.util.Map.get(Object)" is null
	at MemberLevel.main(MemberLevel.java:21)
```

编译官插进去的 `intValue()` 对着 null 调用,当场爆炸。数据库查出的 `Integer` 字段同理——null 一赋给 `int` 就是这颗雷。

> **🎯 面试直击**:`Integer` 127 `==` 为 true、128 为 false,为什么?
> 自动装箱走 `Integer.valueOf`:-128~127 命中 IntegerCache,返回同一个共享对象,`==` 比引用自然 true;128 出了缓存,每次装箱都是新对象,引用不同即 false。追问点:缓存上界可用 `-XX:AutoBoxCacheMax` 调大,但工程上绝不依赖——包装类比较一律 `equals`。

---

## 八、修复,并用测试证明

比较改走值判等(顺手 null 安全),取积分给缺省值,拆箱永不碰 null:

```java
import java.util.Objects;

static boolean sameLevel(String a, String b) {
    return Objects.equals(LEVELS.get(a), LEVELS.get(b));   // 比值不比地址,null 也不炸
}

static int pointsOf(Map<String, Integer> points, String name) {
    return points.getOrDefault(name, 0);                   // 不存在给 0,绝不拆 null
}
```

顺带一枪,**三元运算符拆箱陷阱**:`vip ? 1 : bonus`(`bonus` 是 `Integer`)分支一边 int 一边 Integer,整个表达式统一成 int 触发自动拆箱——`bonus` 为 null 当场 NPE。分支类型对齐,别混装。

JUnit 出示证据:

```java
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class MemberLevelTest {
    @Test
    void level_128_compares_by_value_not_identity() {
        MemberLevel.LEVELS.put("老陈", 128);
        MemberLevel.LEVELS.put("老王", 128);
        assertTrue(MemberLevel.sameLevel("老陈", "老王"));   // 跨过缓存边界照样判对
    }

    @Test
    void missing_member_points_default_to_zero() {
        assertEquals(0, MemberLevel.pointsOf(Map.of("阿零", 500), "路人甲"));
    }
}
```

两条全绿。JUnit 质检员在 128 边界上敲章:「证据呢?——这回有了。」

---

## 九、项目检查点 · 豆豆咖啡站 v8.3

```text
咖啡站形态:同级拼团跨过 128 边界不再翻车;积分查询缺省兜底为 0
已具备  :8 对基本↔包装速查;装箱=valueOf 拆箱=xxxValue;IntegerCache 与 ==/equals 边界;null 拆箱防雷;Map 键类型匹配规矩
还没有  :对账夜将至,double 记的账已经开始漏「分」——钱的类型还没被认真对待
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 自动装箱/拆箱机制(valueOf / xxxValue) | 「Integer 127/128」是笔试口试双料常客 |
| IntegerCache 与 == vs equals | 八股高频,能讲到缓存上界可调是加分项 |
| null 拆箱防御(getOrDefault / Objects.equals) | 生产 NPE 高发区,防御写法是基本功 |

---

## 十一、下一话悬念

对账夜。豆豆把全年流水一键汇总,账面比钱箱**整整差了 3 分钱**。阿零逐笔核对,每一笔都「对」,加起来就是不对——在 double 的世界里,0.1 加 0.2 从来不等于 0.3。

> 下一话《BigDecimal 与钱的尊严》:double 计价的原罪要清算了。钱要换上配得上它的类型,而阿零会在 `equals` 与 `compareTo` 之间再摔一跤。

---

## 🎯 随堂练习

先自己做,再对答案。

### 选择题(10 道)

1. `Integer a = 128` 编译后约等于什么?
   - A) `Integer a = new Integer(128)`　B) `Integer a = Integer.valueOf(128)`　C) `int a = 128`　D) 不编译
2. `int x = a`(a 是 Integer)编译后会变成?
   - A) `int x = a`　B) `int x = a.intValue()`　C) `int x = Integer.parseInt(a)`　D) 编译错误
3. `Integer a = 127; Integer b = 127;` 用 `==` 比较结果是?
   - A) true　B) false　C) 编译错误　D) 抛异常
4. `Integer a = 128; Integer b = 128;` 用 `==` 比较结果是?
   - A) true　B) false　C) 编译错误　D) 视 JVM 而异
5. 上一题结果为 false 的根因是?
   - A) 128 超出 int 范围　B) IntegerCache 缓存 −128~127,128 不在缓存内,每次装箱造新对象　C) `==` 对 Integer 禁用　D) JDK bug
6. `Map<String, Integer>.get("路人甲")` 返回 null,赋值给 `int x` 会?
   - A) x = 0　B) 编译期直接拦截　C) NullPointerException(拆箱触发的 intValue() 炸了)　D) x = null
7. 包装类之间判等,正确的做法是?
   - A) 一律 `==`　B) `equals()`(或 `Objects.equals`)　C) 先转 int 再 `==`　D) 随便
8. `Map<Long, String>` 里 `map.get(1)` 永远查不到,因为?
   - A) Map 不支持包装类　B) 1 装箱是 Integer,`Long.equals(Integer)` 恒 false　C) key 必须是 String　D) 编译器警告
9. 表达式 `vip ? 1 : bonus`(bonus 是 Integer 且 null)会?
   - A) 返回 0　B) NPE——三元运算符两边类型对齐时触发拆箱　C) 返回 null　D) 编译期限制
10. 哪对基本类型对应的包装类没有缓存?
    - A) int → Integer　B) char → Character　C) boolean → Boolean　D) float → Float

> [!答案]
> **1-B**　自动装箱走 `valueOf`,不是 `new`。**举一反三**:`valueOf` 的源码就四行,进去看一眼就理解了 IntegerCache;看过就不会再错。
> **2-B**　拆箱 = 编译期插入 `xxxValue()` 调用,是隐藏的代码,所以 null 拆箱会 NPE。**举一反三**:用 javap -c 反编译一段含装箱拆箱的代码,亲眼看到这条隐藏指令,这辈子不会忘。
> **3-A**　127 在 IntegerCache 缓存内,两次装箱返回同一个共享对象。**举一反三**:这只是碰巧——工程上绝不依赖 `==` 比包装类,换台机器/调了缓存上界结果就反转。
> **4-B**　128 超出默认缓存范围,每次装箱都是 new 新对象。**举一反三**:这是笔试口试双料常客,面试时能说出缓存范围 −128~127 且上界可调,就是满分回答。
> **5-B**　`valueOf` 判断 `low <= i <= high`,在范围内返回缓存里的同一个对象,否则 new 新对象。**举一反三**:Byte/Short/Long 的缓存也是 −128~127,Character 是 0~127,Boolean 只有 TRUE/FALSE 两个常量;Float/Double 没有缓存。
> **6-C**　`get` 返回 null,赋给 `int` 触发拆箱 `intValue()`,在 null 上调用方法必然 NPE。**举一反三**:防御写法是 `getOrDefault(key, 0)`,或者用 `Integer` 接收再判空——数据从 DB 里取出来的 Integer 字段同理。
> **7-B**　`equals` 比值不比引用;`Objects.equals(a, b)` 额外处理了两边都是 null 的情况。**举一反三**:面试追问「`a.equals(b)` vs `Objects.equals(a, b)`」——前者 a 是 null 当场 NPE,后者没问题。
> **8-B**　`map.get(1)` 的 1 自动装箱为 Integer,`Long.equals(Integer)` 永远返回 false,因为类型不同。**举一反三**:这个 Bug 在生产上极阴——不报异常,就是永远查不到,排查到怀疑人生;养成写 `1L` 的肌肉记忆。
> **9-B**　三元表达式先确定整体类型:一边 int 一边 Integer → 整体是 int → bonus 被拆箱 → null.intValue() = NPE。**举一反三**:三元运算符类型对齐规则是「转成大的那个」,Integer + int = int,Long + int = long,知道这条规则就能预判雷区。
> **10-D**　Float 和 Double 没有缓存,每次装箱必定是 new 新对象。**举一反三**:浮点数取值无限多,缓存没意义;这也是 `new Float(0.1) == new Float(0.1)` 永远 false 的另一重原因。

### 解答题(5 道)

1. 用自己的话讲清自动装箱和拆箱分别对应哪两个方法,为什么 null 拆箱会 NPE?
2. IntegerCache 缓存的范围是多少?为什么它能解释「127 `==` 是 true、128 `==` 是 false」?
3. 包装类比较应该用什么?`==` 和 `equals` 在包装类上的语义分别是什么?
4. 从 Map<String, Integer> 里取积分,怎么写才不会因 null 而拆箱 NPE?给出至少两种写法。
5. 为什么说「int 优先于 Integer,包装类只用在必须装箱的地方(放进集合/泛型/可空字段)」?

> [!答案]
> **1**　装箱 = `valueOf()`(int → Integer),拆箱 = `intValue()`(Integer → int),都是编译期自动插入的。null 拆箱时 `null.intValue()` 必然 NPE——编译期不拦,因为它不知道运行时会拿到 null。**举一反三**:凡是「数据库查出的可空字段」配 `Integer` 接收,再加一步 getOrDefault/判空;把拆箱永远放在 null 检查之后。
> **2**　IntegerCache 默认缓存 −128 到 127。127 装箱两次都命中缓存,返回同一个对象,`==` 比引用自然 true;128 每次装箱都 new 新对象,地址不同 = false。**举一反三**:上界能用 `-XX:AutoBoxCacheMax=256` 调大,调完 128 也会 true——但这恰好证明所有依赖 `==` 的代码都是在赌配置,正确做法就是不用 `==`。
> **3**　`==` 比引用(是不是同一个对象),`equals` 比值(内容相等 + 类型相同)。包装类判等永远用 `equals` 或 `Objects.equals`。**举一反三**:实际上 `Integer.equals(Long)` 不会抛异常,直接返回 false——类型不同时 equals 不报错,只是静默不等,这是另一种「不炸但悄悄错」的形态。
> **4**　① `int p = points.getOrDefault("路人甲", 0)`;② `Integer p = points.get("路人甲"); if (p != null) { ... }`。**举一反三**:`getOrDefault` 最干净,一行兜底;但要小心 `getOrDefault` 不能防御 Map 本身的 null key/value 策略——HashMap 允许 null,Hashtable/CHM 不允许。
> **5**　因为拆箱 NPE、装箱开销、缓存陷阱都是 int 没有的。int 是值类型,`==` 天然安全、不占堆、不会被 null。只在放进集合(泛型擦除到 Object 需装箱)、可空字段(DB 查出的 null)时用包装类。**举一反三**:「基本类型优先」是 Effective Java 的第 61 条,背后的理由是安全 + 性能 + 语义一致。`int` 还天然线程安全——每个线程栈上都有自己的一份。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
