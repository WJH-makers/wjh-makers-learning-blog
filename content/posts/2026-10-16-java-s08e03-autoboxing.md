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

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
