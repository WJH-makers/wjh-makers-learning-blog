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

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. 掩码四件套中,「清位」的正确写法是?
   - A) `flags |= MASK`　B) `flags &= ~MASK`　C) `flags ^= MASK`　D) `flags >>= MASK`
2. `flags ^= MASK` 的效果是?
   - A) 置位　B) 清位　C) **翻转**该位(对着 1 就翻面,对着 0 不动)　D) 测试该位
3. `>>` 和 `>>>` 的区别是?
   - A) 没区别　B) **`>>` 算术右移,左边补符号位;`>>>` 逻辑右移,左边一律灌 0**　C) `>>>` 更快　D) `>>>` 只能用于 long
4. 甜度 12 放进 bit 28~31 后用 `>> 28` 取出,结果是 −4,原因是?
   - A) 12 本身是负数　B) bit 31 被点亮使整个 int 成为负数,`>>` 把符号位一路复制进左边　C) 数组下标越界　D) 移位次数写错
5. 为什么 0~7 档测试全绿、12 档才翻车?
   - A) 低档没走这段代码　B) 0~7 档 bit 31 = 0,`>>` 与 `>>>` 结果相同 —— **符号位陷阱只咬高位**　C) 缓存导致　D) 编译器优化
6. 补码里最高位的正确理解是?
   - A) 一个「负号标记」　B) **权重为 −2³¹ 的普通一位**　C) 校验位　D) 保留位
7. HashMap 定位桶用 `hash & (n-1)` 而不是 `hash % n`,前提是?
   - A) n 是质数　B) **n 是 2 的幂** —— 此时 n−1 是一串全 1 的低位掩码,按位与等价取模且更快　C) hash 非负　D) n 大于 16
8. `hash % n` 相比 `hash & (n-1)` 的另一个问题是?
   - A) 结果不准　B) 对负 hash 会算出**负下标**　C) 不支持大数组　D) 线程不安全
9. JDK 里 `h ^ (h >>> 16)` 这一步扰动的目的是?
   - A) 加密　B) 把**高 16 位的差异混进低位**,否则高位差异会被低位掩码整段丢掉　C) 压缩 hash　D) 防止溢出
10. Java 应用层表达一组布尔状态,豆豆推荐的默认方案是?
    - A) 散装 boolean 字段　B) int 位图　C) **EnumSet** —— 类型安全、见名知义,底层同样是位向量　D) `List<Boolean>`

> [!答案]
> **1-B**　`~MASK` 先造出「只有该位是 0」的反模,再与。**举一反三**:置位用 `|=`、清位用 `&= ~`、翻转用 `^=`、测试用 `&` —— 四件套记死就够用一辈子。
> **2-C**　异或天生就是「不同才 1」。**举一反三**:同一个值异或两次会还原,这个性质在加密、交换、找单身数里到处都是。
> **3-B**　一个补符号位,一个补 0。**举一反三**:Java 没有 `<<<` —— 左移不存在符号问题,所以只有右移分两种。
> **4-B**　符号位被一路复制。**举一反三**:凡是把数据塞进 int 高位再取出的场景,一律用 `>>>` 或先移位再 `& 0xF`。
> **5-B**　只咬高位,所以最阴。**举一反三**:测试数据要专门覆盖「会点亮符号位」的边界,否则低档全绿会给你虚假的安全感。
> **6-B**　它是有权重的一位,不是标记。**举一反三**:理解这一点,`-1` 为什么是全 1、`Integer.MIN_VALUE` 取绝对值为什么还是自己,都能推出来。
> **7-B**　2 的幂让掩码成立。**举一反三**:这也解释了 HashMap 为什么会把你传的初始容量「向上取整到 2 的幂」。
> **8-B**　取模会保留符号。**举一反三**:所以自己写哈希分桶时,别忘了 `Math.abs` 或改用位与 —— 负下标是隐蔽的越界源。
> **9-B**　扰动让高位参与定位。**举一反三**:注意 JDK 用的正是 `>>>` —— 又一次印证了第 3 题的区别在真实源码里有多重要。
> **10-C**　EnumSet 把位图藏进了类型安全的壳里。**举一反三**:但跟数据库、缓存、外部协议对话时,int 位图仍是通用货币 —— 内功还是要练。
