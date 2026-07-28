---
title: "《从零开始学 Java》58 · 位运算与口味开关"
date: 2026-10-15
summary: "加第九个口味要改五处签名?豆豆把八个 boolean 收编进一个 int:32 个拨杆,置位清位测试一行搞定。可算术右移会偷偷复制符号位,高档甜度当场变成负数下标;顺路再证明一遍,HashMap 的容量为什么必须是 2 的幂。"
tags: [Java, Java漫画, 位运算, 位图, 补码, HashMap, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》58 · 位运算与口味开关

> 连载特刊 · 番外卷一「语言宝库」第 2 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——拷贝修利索了,可 Order 签名里那八个 boolean 口味还摊在原地,豆豆放了话:一个 int 就能装下全部开关。

---

## 一、账本第一页:八个 boolean 的赎金

冬歇第二天,技术债账本第一页翻到第二行。新品「厚乳拿铁」立项,要加第九个口味开关 `thickMilk`。阿零把要动的地方数了一遍:record 组件表、拷贝构造器、wither 方法、小票打印、会员同步接口——**五处签名全要改**,而这已经是本月第三次了。

豆豆:「你的 Order 像一列拖着八节车厢的小火车,每节只坐一个 true/false。一个 int 天生就有 **32 个比特位**——32 个拨杆的配电盘,你包下整栋楼,只住了一层。」

---

## 二、漫画 · 配电室里的 32 个拨杆

> **〔1〕** 技术债账本摊在吧台上,Order 画成一列小火车,车尾拖着八节写满 true/false 的 boolean 车厢;阿零正蹲着给第九节车厢刷漆。
> 阿零:「加个厚乳,我得改五处签名……」豆豆(叼着豆子):「八个开关坐八节车厢?醒醒,int 自带 32 个拨杆。」

> **〔2〕** JVM 城主推开一扇标着「配电室」的铁门:墙上一排 32 个拨杆,从右往左编号 0 到 31,豆豆往 bit 0 贴「加糖」的名牌。
> JVM 城主:「每个 int 在我城里,就是这么一排电闸。」豆豆:「一杆一口味,八个口味占八杆,还剩一整面墙。」

> **〔3〕** 豆豆演示三块闸牌:两排拨杆送进 `&` 牌,只有「都开」的位亮;送进 `|` 牌,「有开就亮」;送进 `^` 牌,「不一样才亮」;末了一拉 `~` 总闸,整排灯全体翻面。
> 豆豆:「与、或、异或、取反——配电室四大手艺,一次对齐 32 个开关,比你写八个 if 利落多了。」

> **〔4〕** 阿零手贱把最左边的 31 号杆拨了上去,头顶数字屏「咔」一声跳成一串负数,他吓得后仰。
> 阿零:「灯没坏,数怎么负了?!」豆豆:「补码——bit 31 的权重是 −2³¹,它亮着,整个数就是负的。它还兼职:**符号位**。」

> **〔5〕** 阿零抡起写着 `>>` 的扳手把整排拨杆右移四格,左边竟影分身似的复制出一串亮着的「1」;Logic Bug 怪趴在符号位上笑出声。
> 豆豆:「`>>` 是**算术**右移,搬家永远带着符号位;想让左边灌 0,用三个箭头的 `>>>`。这一字之差,下午就会咬你。」

> **〔6〕** 彩蛋格:豆豆举起小黑板——「hash & (n−1)」,背景里第 22 话的抽屉墙闪闪发光。
> 豆豆:「HashMap 的抽屉墙玩的也是这手掩码。下课前,你自己就能证明它的容量为什么必须是 2 的幂。」

---

## 三、本话目标

- 建立二进制与补码直觉:负数只是「最高位亮着」的比特串;
- 熟练 `&` `|` `^` `~` `<<` `>>` `>>>` 七件兵器;
- 掌握掩码四件套:置位、清位、测试、翻转;
- 用一个 int 位图收编 Order 的口味开关与甜度档;
- 证明 HashMap 容量为什么必须是 2 的幂(`hash & (n-1)`)。

---

## 四、原理图:七件兵器与掩码四件套

| 兵器 | 名字 | 口诀 | 4 位示意 |
|---|---|---|---|
| `a & b` | 与 | 都 1 才 1(掩码、测试) | `0110 & 0011 = 0010` |
| `a \| b` | 或 | 有 1 就 1(置位、合并) | `0110 \| 0011 = 0111` |
| `a ^ b` | 异或 | 不同才 1(翻转、成对抵消) | `0110 ^ 0011 = 0101` |
| `~a` | 取反 | 全员翻面(配 `&` 做清位) | `~0110 = 1001` |
| `a << n` | 左移 | ×2ⁿ,右边灌 0 | `0001 << 3 = 1000` |
| `a >> n` | 算术右移 | ÷2ⁿ,左边补**符号位** | 负数会灌进一排 1 |
| `a >>> n` | 逻辑右移 | 左边**一律灌 0** | 本话破案钥匙 |

```text
int tasteFlags 的 32 个拨杆(bit 0 在最右)
bit: 31 30 29 28 | 27 ……………… 8 | 7  6  5  4  3  2  1  0
     甜度档(0~15) |  空房(预留)  | 热 奶油 低因 香草 浓缩 燕麦 去冰 加糖
     ↑ bit 31 兼任符号位:它被点亮,整个 int 就是负数

掩码四件套(MASK = 1 << n)
  置位  flags |=  MASK        开灯:该位强制变 1,其余不动
  清位  flags &= ~MASK        关灯:~ 先造出「只有该位是 0」的反模
  测试  (flags & MASK) != 0   查灯:& 把其余位全部归零
  翻转  flags ^=  MASK        反转:^ 对着 1 就翻面,对着 0 不动

补码一分钟
  最高位不是「负号标记」,是权重为 −2³¹ 的普通一位
  0000…0101 = 5    1111…1011 = −5(取反加一)    1111…1111 = −1
  负数别用肉眼猜,交给 Integer.toBinaryString 看拨杆
```

---

## 五、从上一话继续:把八节车厢收编成一个 int

上一话的 Order 还长这样(节选):`record Order(String coffee, boolean sugar, boolean iceFree, … boolean hot)`。今天整列火车退役,换一块配电盘:

```java
/** 口味配电盘:每个常量只点亮一位(1 << n)。 */
public final class Taste {
    public static final int SUGAR      = 1;       // bit 0 加糖
    public static final int ICE_FREE   = 1 << 1;  // bit 1 去冰
    public static final int OAT_MILK   = 1 << 2;  // bit 2 燕麦奶
    public static final int EXTRA_SHOT = 1 << 3;  // bit 3 加浓缩
    public static final int VANILLA    = 1 << 4;  // bit 4 香草
    public static final int DECAF      = 1 << 5;  // bit 5 低因
    public static final int WHIP       = 1 << 6;  // bit 6 奶油顶
    public static final int HOT        = 1 << 7;  // bit 7 热饮

    private Taste() {}

    public static int set(int flags, int mask)     { return flags | mask; }           // 置位
    public static int clear(int flags, int mask)   { return flags & ~mask; }          // 清位
    public static int toggle(int flags, int mask)  { return flags ^ mask; }           // 翻转
    public static boolean has(int flags, int mask) { return (flags & mask) == mask; } // 测试

    /** 甜度档 0~15,住进最高 4 位(bit 28~31)。 */
    public static int withSweetness(int flags, int level) {
        return (flags & 0x0FFF_FFFF) | (level << 28);
    }
}

record Order(String coffee, int tasteFlags) {
    Order withTaste(int mask)    { return new Order(coffee, Taste.set(tasteFlags, mask)); }
    Order withoutTaste(int mask) { return new Order(coffee, Taste.clear(tasteFlags, mask)); }
}
```

```java
var order = new Order("拿铁", 0).withTaste(Taste.OAT_MILK | Taste.HOT); // | 一次点亮两位
IO.println(Integer.toBinaryString(order.tasteFlags()));                  // 10000100
IO.println(Taste.has(order.tasteFlags(), Taste.HOT));                    // true
```

加第九个口味?`Taste` 里添一行常量,**零签名改动**。顺手还清了上一话的旧账:int 是基本类型,拷贝按值走——浅拷贝幽灵对位图天然无效。

> **🔀 豆豆的多解台 · 一组布尔状态,存哪儿?**

| 解法 | 代码要点 | 适合什么时候 | 坑 |
|---|---|---|---|
| 散装 boolean | `record Order(…, boolean sugar, boolean iceFree)` | 开关 ≤3 个、彼此无关、要一眼看懂 | 每加一个开关,构造器/拷贝/序列化全链路改签名 |
| int 位图 | 常量 = `1 << n`,`flags \|= SUGAR` | 开关多、要进数据库一列或网络一个字段、要按位批量运算 | 第 n 位是什么全靠注释约定;`>>`/`>>>` 一字之差就翻车 |
| EnumSet | `EnumSet.of(SUGAR, HOT)` | 应用层首选:类型安全、见名知义,底层同样是位向量 | 得先有枚举——它是第 61 话的正主 |

豆豆锐评:**Java 代码内部默认 EnumSet**——它把今天这套位图整个藏进了类型安全的壳里;但跟数据库、缓存、外部协议对话时,int 位图仍是通用货币。内功今天必须练,壳等第 61 话再套。

---

## 六、故意制造一个 Bug:`>>` 搬来的符号位

豆豆把甜度档(0~15)塞进了最高 4 位,阿零负责在小票上打印档位名牌:

```java
public class SweetnessBoard {
    static final String[] LEVEL = new String[16];   // 0~15 档的甜度名牌
    static {
        LEVEL[0] = "无糖"; LEVEL[5] = "半糖"; LEVEL[12] = "全糖+"; LEVEL[15] = "齁甜";
    }

    public static void main(String[] args) {
        int flags = Taste.withSweetness(Taste.SUGAR | Taste.HOT, 12);
        int level = flags >> 28;                    // ← 故意:拿算术右移当逻辑右移用
        IO.println("甜度档:" + LEVEL[level]);
    }
}
```

联调时甜度 0~7 档全部通过,阿零收工。下午第一位点「12 档全糖+」的顾客,把咖啡站打崩了。

---

## 七、读懂真实报错

```text
Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index -4 out of bounds for length 16
	at SweetnessBoard.main(SweetnessBoard.java:10)
```

下标是 **−4**?拨杆推演一遍:12 = `1100`,放进 bit 28~31 后 **bit 31 = 1,整个 int 是负数**;`>>` 右移补的是符号位,28 个 1 涌进左边——`1111…1100`,按补码读就是 −4。而 0~7 档 bit 31 = 0,`>>` 与 `>>>` 结果相同,所以测试全绿。**符号位陷阱只咬高位**,这正是它最阴的地方。

> **🎯 面试直击**:HashMap 容量为什么必须是 2 的幂?
> 因为定位桶用的是 `hash & (n - 1)` 而不是 `hash % n`:n 是 2 的幂时,n−1 恰好是一串全 1 的低位掩码,按位与等价于取模却快得多,对负 hash 也不会算出负下标(`%` 会)。追问点:key 的 hash 要先 `h ^ (h >>> 16)` 把高 16 位扰动进低位——注意 JDK 用的正是 `>>>`——否则高位差异会被掩码整段丢掉;扩容后每个元素只看「多出来的那一位」,原地不动或搬到「原下标 + 旧容量」。(抽屉墙本尊,回看第 22 话。)

---

## 八、修复,并用测试证明

```java
/** 甜度档:>>> 逻辑右移,左边一律灌 0,符号位没资格跟车。 */
public static int sweetness(int flags) {
    return flags >>> 28;
    // 等价修法:return (flags >> 28) & 0xF;  —— 先移位再掩码,滤掉符号位垃圾
}
```

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class TasteTest {

    @Test
    void high_sweetness_survives_the_sign_bit() {
        int flags = Taste.withSweetness(Taste.SUGAR | Taste.HOT, 12);
        assertTrue(flags < 0);                     // bit 31 已点亮,int 确实是负数
        assertEquals(12, Taste.sweetness(flags));  // >>> 不认符号位,档位安然无恙
    }

    @Test
    void mask_roundtrip_set_clear_test() {
        int flags = Taste.set(0, Taste.OAT_MILK | Taste.HOT);
        assertTrue(Taste.has(flags, Taste.OAT_MILK));
        assertFalse(Taste.has(Taste.clear(flags, Taste.HOT), Taste.HOT));
    }
}
```

JUnit 质检员盖章:「证据呢?——喏,负数进,12 出。」

---

## 九、项目检查点 · 豆豆咖啡站 v8.2

```text
咖啡站形态:口味开关从八个 boolean 收编成一个 int 位图,甜度档住进高 4 位
已具备  :补码直觉;& | ^ ~ << >> >>> 七件套;掩码四件套(置位/清位/测试/翻转);
          >>> 安全取高位;能现场推导 hash & (n-1) 为什么要求容量是 2 的幂
还没有  :位图第 n 位是什么全靠注释约定——类型安全的开关集合(EnumSet)要等第 61 话枚举登场
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 位运算七件套(`&` `\|` `^` `~` `<<` `>>` `>>>`) | 协议解析、算法题、中间件源码的通用底层语言 |
| 位图压缩布尔状态 + 掩码四件套 | Linux 权限位、Redis bitmap、库表状态列的惯用法 |
| `hash & (n-1)` 与 2 的幂容量 | HashMap 八股必问,能现场推导远胜背诵 |
| `>>` vs `>>>` 符号位陷阱 | 面试官的追问级细节,答对即加分 |

---

## 十一、下一话悬念

位图顺利上线。收工前阿零做了个「小优化」:把门店常点的口味组合缓存成 `Map<String, Integer>`,对比两单口味时随手写了 `==`。诡异的事来了——两单 flags 都是 127 时,`==` 说相等;换一对都是 128 的,`==` 却翻脸说不等。同一段代码,127 是朋友,128 是陌生人。

> 下一话《包装类与自动装箱的陷阱》:int 与 Integer 之间有一道看不见的装箱线,线后站着一个只认 −128~127 的缓存幽灵。阿零将明白:`==` 比的从来不是「值」,而是「是不是同一个对象」。

---

## 🎯 随堂练习

先自己做,再对答案。

### 选择题(10 道)

1. `int flags` 配合 `1 << n` 做位标记的真身是?
   - A) flags 是数组　B) flags 的 32 个比特是 32 个独立拨杆　C) 类似 String　D) 编译器魔法
2. 要把 bit 3 点亮(置 1),同时其余位不变,正确写法是?
   - A) `flags = 1 << 3`　B) `flags |= 1 << 3`　C) `flags &= 1 << 3`　D) `flags ^= 1 << 3`
3. 要把 bit 5 关掉(清 0),同时其余位不变,正确写法是?
   - A) `flags &= ~(1 << 5)`　B) `flags |= 1 << 5`　C) `flags = 0`　D) `flags >> 5`
4. 算术右移 `>>` 和逻辑右移 `>>>` 的唯一区别是?
   - A) 速度不同　B) `>>` 左边补符号位,`>>>` 左边一律灌 0　C) `>>` 不认负数　D) 没有任何区别
5. 甜度档(0~15)存在 bit 28~31,值为 12 时整个 int 是负数。用 `>>` 取甜度会得到?
   - A) 12　B) −4　C) 0　D) 抛异常
6. 上一个 Bug 的正确修法是?
   - A) `flags >>> 28`　B) `flags >> 28` 再 +1　C) 用 double 存　D) 外挂 if
7. `a ^ b` 什么时候用于「翻转」?
   - A) `a ^ 0` = 0　B) `flags ^= mask`,对着 1 的位翻面　C) 永远等于 ~　D) 只用来 +1
8. HashMap 容量必须为 2 的幂,与位运算的关联是?
   - A) 纯属巧合　B) `hash & (n−1)` 等价取模且快,n−1 是全 1 掩码　C) 为了好看　D) 与位运算无关
9. JDK 里 hash 值扰动时用 `h ^ (h >>> 16)`,这里为什么是 `>>>` 而不是 `>>`?
   - A) 写错了　B) `>>>` 左边灌 0,符号位不会污染低位扰动　C) `>>` 更快　D) 都可以
10. 把八个散装 boolean 收编成一个 int 位图,最大的工程收益是?
    - A) 省内存(次要)　B) 构造器/拷贝/序列化签名一劳永逸,加口味只增常量　C) JVM 启动更快　D) 代码更好看

> [!答案]
> **1-B**　int 位图就是拿 32 个比特当 32 个独立开关。**举一反三**:EnumSet 底层就是用 long/int 位向量实现,今天的位运算是明天类型安全的基础。
> **2-B**　`|=` 只在对应位写 1,其余位保持原样;`|= 1 << 3` 就是说「bit 3 给我亮」。**举一反三**:MySQL 的权限位、Linux 文件权限(r=4 w=2 x=1)都是这套逻辑。
> **3-A**　`~` 把 mask 取反——原来 bit 5 是 1 的变成只有 bit 5 是 0,再 `&` 就能精准掐灭那一位。**举一反三**:清位必须先 `~` 再 `&`,两步不能反过来;`flags &= mask` 是把其余位全关了。
> **4-B**　算术右移保守符号位(负数左边灌 1),逻辑右移不管符号一律灌 0。**举一反三**:取高位字段(如甜度档)必须 `>>>`;`>>` 只在「÷2 并保留正负」时用。
> **5-B**　12 = `1100`,放在 bit 28~31 后 bit 31=1 整个 int 是负数,`>> 28` 左边补满 28 个 1 → 按补码读就是 −4。**举一反三**:0~7 档 bit 31=0,`>>` 和 `>>>` 结果一样,所以「测试全绿」——符号位陷阱只咬高位。
> **6-A**　`>>>` 左边灌 0,不认符号位;`(flags >> 28) & 0xF` 也是等价的先移位再掩码。**举一反三**:凡是取嵌在高位区的字段,一律 `>>>` 或加掩码兜底。
> **7-B**　`flags ^= mask` 让 mask 里为 1 的那些位反个面(0→1,1→0),其余位纹丝不动。**举一反三**:异或成对抵消,`a ^ b ^ b = a`;做简单加密/校验和时常看到。
> **8-B**　n 是 2 的幂时 n−1 二进制全 1,`hash & (n−1)` 就是「只留低几位」的取模,比 `hash % n` 快很多。**举一反三**:扩容后每个元素只看「多出来的那一位」是 0 还是 1,原地不动或搬到原下标 + 旧容量。
> **9-B**　hash 高 16 位如果不扰动进低位,会整段被掩码 `n−1` 丢弃;`>>>` 确保左边灌 0,扰动干净。**举一反三**:面试追问 JDK 源码细节,能说出 `>>>` 和扰动理由 = 真看过源码。
> **10-B**　位图作为一种「一条 int 字段替代 N 个 boolean」的压缩方案,最大收益是签名稳定——加新口味只需在 Taste 常量类加一行,不碰 Order 构造器。**举一反三**:数据库的状态列、Redis 的 bitmap、协议的头字段,到处是位图的身形。

### 解答题(5 道)

1. 用一张表画出位运算七件套(`&` `|` `^` `~` `<<` `>>` `>>>`)各自的口诀和典型使用场景。
2. 为什么 `>>>` 取出高 4 位甜度是安全的,`>>` 却会出负数?画出补码推导过程。
3. 假设一组咖啡口味开关(加糖/去冰/燕麦奶/加浓缩/香草/低因/奶油/热饮)用 int 位图存储,写掩码四件套(置位、清位、测试、翻转)的完整实现。
4. 解释为什么 HashMap 容量必须是 2 的幂。如果一个 HashMap 容量是 10(非 2 的幂),用 `hash % 10` 和 `hash & 9` 的结果一样吗?
5. dayOfWeek 字段占用 bit 0~2,value 字段占用 bit 3~7,写两段分别取出这两个字段,并说明为什么取出 value 字段时必须要么 `>>>` 要么加掩码。

> [!答案]
> **1**　| 兵器 | 口诀 | 典型场景 ||---|---|---|| `&` | 都 1 才 1 | 测试某位是否亮、掩码过滤 || `\|` | 有 1 就 1 | 置位、合并多个标志 || `^` | 不同才 1 | 翻转开关、成对抵消校验 || `~` | 全员翻面 | 配 `&` 清位 || `<<` | ×2ⁿ,右灌 0 | 造 mask、获取 2 的幂 || `>>` | ÷2ⁿ,左补符号位 | 保留符号的算术移位 || `>>>` | 左边灌 0 | 取高位字段,去除符号干扰 |　**举一反三**:画这张表比死背定义有用十倍,面试时边画边讲,你就是在「推导」而不是「背书」。
> **2**　12 = `0000...1100`,左移到 bit 28~31 后变成 `1100 0000...0000`。bit 31 = 1 使整个 int 为负数。`>> 28` 左边补 28 个 1 → `1111...1100` = −4;而 `>>> 28` 左边补 0 → `0000...1100` = 12。**举一反三**:任何把高位当「数据」而不是「符号」的场景,出门只认 `>>>`;算术右移只在「除以 2ⁿ 且关心符号」时出场。
> **3**　```java
static final int SUGAR = 1 << 0, OAT = 1 << 2;
static int set(int f, int m) { return f | m; }          // 置位
static int clear(int f, int m) { return f & ~m; }       // 清位
static boolean has(int f, int m) { return (f & m) == m; } // 测试
static int toggle(int f, int m) { return f ^ m; }       // 翻转
```　**举一反三**:真实代码里不需要每次手写这四件套,EnumSet 底层就是这套;但知道底层是用位运算,才知道 `EnumSet.of(A,B)` 为什么既省内存又算得飞快。
> **4**　容量 n = 2^k 时 n−1 二进制低 k 位全 1,`hash & (n−1)` 等价于保留 hash 的低 k 位,与取模结果相同但快。n=10 时 9 = `1001`,不是全 1 低掩码——hash 值在 bit 1(2 那一位)的变化会被掩码丢弃,导致某些桶永远分不到元素,分布严重不均。**举一反三**:HashSet/TreeMap/LinkedHashMap 底层全是哈希表,它们的容量也走 2 的幂;只要见过一次 `n−1` 掩码的推导,这辈子不会再问「能不能把 HashMap 容量设成 100」。
> **5**　```java
int value = (flags >>> 3) & 0x1F; // 逻辑右移后掩码:去符号 + 只取 5 位
int day = flags & 0x7;            // 低 3 位直接掩码
```　如果 value 字段碰巧最高位是 1,用 `>> 3` 就会把符号位的一排 1 带下来污染结果。**举一反三**:多字段压缩到一个 int(或一个 long)是协议帧/硬件寄存器的日常操作;Java 里你做的事和 C 里的 struct 位域等价,只是写法不同。
