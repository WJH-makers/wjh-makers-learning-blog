---
title: "《从零开始学 Java》08 · 制作步骤:方法"
date: 2026-08-01
summary: "前七话一直在借用 static 方法,今天正式拆开它:参数是入口、返回值是出口、void 只做事不返回。顺带把『Java 只有值传递』这道面试钩子埋下。"
tags: [Java, Java漫画, 方法, 函数, 阿零与豆豆]
---

# 《从零开始学 Java》08 · 制作步骤:方法

> 第一季「点火篇」第 8 话 · 基线 JDK 25 · 承接:菜单已用数组管理的咖啡站。
> 长期项目:**豆豆咖啡站**。本话把散在 `main` 里的动作,收进一台台可复用的「机器」。

---

## 一、需求:别再复制粘贴

其实从第一话起,你就一直在**借用**方法——`main` 是方法,`greeting()` 是方法,连 `System.out.println` 都是在调别人写好的方法。前七话我们只管「调」,今天正式把方法**拆开**:它由什么零件构成,自己怎么造一台。

眼下的痛点很具体:「算总价」「判断够不够钱」「循环出杯」这些逻辑散落在 `main` 各处,同样的算式抄了三遍。改一处优惠规则,得满屏找齐十处一起改——漏一处就是线上事故。把它们收进**方法**:定义一次,到处调用。

---

## 二、漫画 · 空转的机器

![《从零开始学 Java》08 · 制作步骤:方法 —— 阿零与豆豆六格漫画](/comics/java/s01e08-methods.png)


> [!文字版]
> **〔1〕** 车间里立着一台贴着 `makeCoffee(名称, 杯数)` 的机器:左边是进料口(参数),右边是出货口(返回值)。
> 豆豆:「方法 = 一台可复用的机器。**参数**是入口,把原料递进去;**返回值**是出口,把成品端出来。」
>
> **〔2〕** 阿零兴冲冲造了台新机器,铭牌上焊死一行:「本机保证吐出一个 `double`」。
> 阿零:「参数我接好了,算式也写了,收工!」
>
> **〔3〕** 顾客把钱塞进进料口——机器嗡嗡运转,指示灯狂闪,出货口却**什么都没吐**。齿轮空转,卡死。
> 阿零:「它……算是算了,可就是不把结果端出来?!」
>
> **〔4〕** 编译官 Javac 举着红牌冲进来,一把拉下总闸:「**停!** 你铭牌上写着『必吐 double』,却存在一条走到头也不 `return` 的路。这机器**不许出厂**。」
>
> **〔5〕** 豆豆叼着豆子叉腰:「声明了返回类型,就得对它负责——**每一条**执行路径都要真的 `return` 一个值。你光算不端出来,等于承诺了不兑现。」
>
> **〔6〕** 阿零补上一句 `return t;`,机器"咔"地吐出一杯咖啡。
> 豆豆(小声):「……记住这台空转的机器。将来你少写一个 `return`,脑子里就该浮现它卡死的样子。」
---

## 三、本话目标

- 亲手定义带参数、带返回值的方法,看懂方法签名的每一段;
- 分清**返回类型**与 `return` 的关系,理解「每条路径都要返回」;
- 用 `void` 表示「只做事、不返回」;
- 搞懂一句面试钩子:**Java 只有值传递**;
- 踩一次「缺少 return 语句」的编译错误,并读懂它。

---

## 四、原理图:一台方法机器的构造

```text
 返回类型   方法名   ( 参数类型 参数名, ... )    ← 这一整行叫「方法签名」
   │         │              │
 出口的      对外的        入口:调用时把实参
 货物类型    名牌          拷贝一份塞进来
   ▼
 double   total   ( double price, int qty ) {
     return price * qty;     // 非 void → 每条路径都必须 return 一个 double
 }

 void serve(...) { ... }     // void = 只执行动作,不端出货物,可以不 return
```

三句话记牢:

- **返回类型 = 出口货物的类型。** 写了 `double`,就必须 `return` 一个 `double`;写了 `void`,就一个值都不许返。
- **参数 = 入口。** 调用时你给的叫「实参」,方法里接的叫「形参」——形参是实参**拷贝的一份**(下面第七节的面试钩子就卡在这)。
- **一个方法只做一件事。** 名字是动词最好:`total`、`canAfford`、`serve`,读代码像读句子。

---

## 五、代码:把步骤收进方法

```java
public class Cafe {
    // 有返回值:算总价
    static double total(double price, int qty) {
        return price * qty;
    }

    // 有返回值:够不够付
    static boolean canAfford(double paid, double total) {
        return paid >= total;
    }

    // void:只负责「出杯」这个动作,不返回任何东西
    static void serve(String name, int qty) {
        for (int i = 1; i <= qty; i++) {
            System.out.println("第 " + i + " 杯" + name + " ☕");
        }
    }

    public static void main(String[] args) {
        double t = total(15.0, 3);           // 把结果端出来,存进 t
        if (canAfford(50.0, t)) serve("美式", 3);
    }
}
```

`main` 一下子清爽了:它只负责「编排」——先算价、再判断、够钱就出杯,每一步都甩给一台专门的机器。以后改价格逻辑,只动 `total` 一处,全站生效。

---

## 六、故意制造一个 Bug

给 `total` 声明了 `double` 返回类型,却把 `return` 删了——正是漫画里那台空转的机器:

```java
static double total(double price, int qty) {
    double t = price * qty;
    // return t;   ← 故意删掉:算了,但没端出来
}
```

重新 `javac Cafe.java`。

---

## 七、读懂真实报错

> **📋 编译官罚单**

```text
Cafe.java:5: error: missing return statement
    }
    ^
1 error
```

`missing return statement` —— 方法承诺「吐出一个 `double`」,却存在一条**走到右大括号还没 `return`** 的路径。编译官的铁律:**非 `void` 方法的每一条执行路径,都必须 `return` 一个值**。注意它把箭头 `^` 指在了结尾的 `}` 上——因为「缺 return」这件事,是走到方法末尾那一刻才暴露的。

> **豆豆锐评**:这错好在**编译期**就拦下了,连 JVM 的门都没进。真正难缠的是那种「有 `return`、但 `return` 错东西」的逻辑 Bug——那种不报错,得靠测试抓,第十一话专门收拾它们。

现在把「值传递」这道钩子埋下——它是理解方法参数的关键,也是几乎必问的面试题:

> **🎯 面试直击**:Java 是值传递还是引用传递?
> **只有值传递。** 调方法时,传的永远是实参的一份**拷贝**。传 `int` 拷的是数字本身,方法内改形参不影响外面;传**对象/数组**时,拷的是「**引用的值**」——两个引用指向同一个对象,所以方法内改对象内容外面看得见,但把形参重新指向新对象,外面那个引用纹丝不动。一句话:**拷的是引用,不是对象**。对象的细节第二季《对象大陆》展开,这里先记住这句结论。

一个你现在就能验证的例子(数组是对象,第七话刚学过):

```java
static void addSalt(int[] cups) { cups[0] = 999; }   // 改的是同一个数组
// 调用后 cups[0] 真的变成 999 —— 因为拷来的引用指向同一个数组
static void replace(int[] cups) { cups = new int[]{0}; }  // 把形参指向新数组
// 调用后外面的数组毫发无损 —— 重新赋值只动了那份拷贝
```

---

## 八、修复,并用测试证明

补回 `return t;`。方法拆得干净,天然好测——不需要键盘、不需要屏幕,给输入验输出:

```java
@Test
void total_and_afford() {
    assertEquals(45.0, Cafe.total(15.0, 3));       // 15×3
    assertTrue(Cafe.canAfford(50.0, 45.0));        // 付 50 够付 45
    assertFalse(Cafe.canAfford(40.0, 45.0));       // 付 40 不够
}
```

这就是「把逻辑抽成方法」的最大红利之一:**能被单独调用的代码,才能被单独测试**;能被测试的代码,才敢让别人改。

---

## 九、项目检查点 · 豆豆咖啡站 v0.8

```text
咖啡站形态:算价 / 判断 / 出杯 都收进了可复用方法,main 只剩编排
已具备  :方法定义与调用、参数与返回值、void、值传递的初步认识、方法级测试
还没有  :一切输入都写死在代码里,顾客没法自己点单 —— 下一话让顾客开口
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 方法 / 参数 / 返回值 / 签名 | Java 基础第 0 项;方法重载、封装的前提 |
| `void` vs 返回类型 | 面试:方法签名怎么构成、能不能只靠返回类型区分重载 |
| **值传递** | 高频面试题「Java 是值传递还是引用传递」,答错直接减分 |
| 把逻辑抽成可测方法 | 「代码可测试性」,资深工程师的分水岭 |

---

## 十一、下一话悬念

咖啡站现在自说自话,顾客点什么全写死在代码里——`total(15.0, 3)` 那个 `3`,是程序员替顾客拍的板,顾客本人插不上嘴。

> 下一话《顾客输入:Scanner》:柜台上架起一支叫 `Scanner` 的听筒,`nextInt()` 听整数、`nextLine()` 听一整行,咖啡站第一次变成**交互式**程序。可阿零很快会发现,这支听筒有个几乎人人都踩的「滋啦」怪响……

---

## 🎯 随堂练习

先自己做，再对答案。选择1-3基础识记，4-6理解应用，7-9分析判断，10综合；解答递进；代码题从写到验证。

### 一、选择题（10 道）

1. [基础] 以下哪个是正确的 Java 方法声明？
   - A) `void calc() { }`　B) `calc(void) { }`　C) `int calc() { }`　D) A 和 C 都正确

2. [基础] 一个 `void` 方法可以写 `return;` 吗？
   - A) 不可以，void 方法不能出现 return　B) 可以，`return;` 表示提前退出　C) 可以，但必须放在方法末尾　D) 只有 main 方法可以

3. [基础] 以下哪个不是方法重载的正确示例（与 `void print(int a)` 构成重载）？
   - A) `void print(String a)`　B) `int print(int a)`　C) `void print(int a, int b)`　D) `void print(double a)`

4. [理解] Java 方法参数传递的方式是？
   - A) 值传递　B) 引用传递　C) 基本类型值传递，对象引用传递　D) 取决于参数类型

5. [理解] 以下代码输出什么？`public static void change(int x) { x = 100; }` 调用 `int a = 5; change(a); System.out.println(a);`
   - A) 5　B) 100　C) 编译报错　D) 运行时异常

6. [应用] 以下代码输出什么？`public static void change(int[] arr) { arr[0] = 99; }` 调用 `int[] a = {1,2,3}; change(a); System.out.println(a[0]);`
   - A) 1　B) 99　C) 编译报错　D) 运行时异常

7. [分析] 以下方法能否构成重载？`void test(int a, double b) { }` 和 `void test(double a, int b) { }`
   - A) 可以，参数类型顺序不同　B) 不可以，参数类型相同　C) 可以，但调用时可能产生歧义　D) A 和 C 都正确

8. [分析] 以下代码的问题是什么？`public static int getResult() { if (Math.random() > 0.5) return 1; }`
   - A) 没有问题　B) 缺少 `else` 分支　C) 不是所有路径都有返回值　D) random 应该在循环里用

9. [判断] 关于 `main` 方法，以下说法正确的是？
   - A) 一个类中可以有多个 `main` 方法　B) `main` 方法必须是 `public static void`　C) `main` 方法不能调用其他方法　D) `main` 方法可以没有 `String[] args` 参数

10. [综合] 以下代码输出什么？`int a = 5; int b = 10; swap(a, b); System.out.println(a + ", " + b);` 其中 `swap` 定义为 `void swap(int x, int y) { int t = x; x = y; y = t; }`
    - A) 10, 5　B) 5, 10　C) 编译报错　D) 10, 10

> [!答案]
> **1-D**：`void` 写在返回类型位置（Java 风格），不是参数位置（B 是 C/Python 风格）。`int` 返回类型需要内部有 `return 值;`。**举一反三**：方法签名 = 返回类型 + 方法名 + 参数列表，同一个类中不能有两个签名完全相同的方法（会产生编译错误）。
> **2-B**：`void` 方法可以写 `return;`（不带值），作用是提前结束方法执行。通常用于前置条件不满足时直接返回，避免深层嵌套。**举一反三**：`return;` 在 void 方法末尾可以省略——方法执行完自动返回。
> **3-B**：重载只看**方法名 + 参数列表**（参数个数、类型、顺序），不看返回类型。`int print(int a)` 参数列表和 `void print(int a)` 完全相同，不算重载，编译器会报"方法重复定义"错误。**举一反三**：两个方法只有返回类型不同不足以构成重载——Java 无法根据调用上下文推断你要哪个返回类型。
> **4-A**：Java 只有**值传递**。基本类型传值的副本，对象传引用（地址）的副本。说"对象是引用传递"是常见误解——实际传递的是引用的副本，副本指向同一个对象。**举一反三**：这解释了为什么方法内 `list = new ArrayList()` 不影响外部变量，而 `list.add("x")` 会影响——前者改的是副本引用的指向，后者是通过副本引用操作了同一个对象。
> **5-A**：`x` 是形参，接收的是 `a` 的值（5）的副本。方法内 `x = 100` 改的是这个副本，原始变量 `a` 不受影响，最终输出 5。**举一反三**：这是值传递最直接的体现——基本类型永远不可能被方法改变。
> **6-B**：`arr` 接收的是 `a` 引用的副本，但这个副本仍然指向堆上同一个 `{1,2,3}` 数组对象。`arr[0] = 99` 通过这个副本修改了数组内容，所以 `a[0]` 变为 99。**举一反三**：这不是"引用传递"，而是"通过值传递的引用副本操作了同一个对象"——两个概念不同。
> **7-D**：可以构成重载（参数列表不同：`int, double` vs `double, int`）。但在调用 `test(1, 2)` 时，两个 `int` 都可以隐式转为 `double`，编译器无法判断你调的是哪一个，产生歧义编译错误。**举一反三**：泛型擦除也可能导致重载歧义——`void m(List<Integer>)` 和 `void m(List<String>)` 擦除后签名相同，编译失败。
> **8-C**：如果 `Math.random()` 返回 ≤0.5，`if` 条件不成立，方法体没有 `return` 语句，但方法签名声明了返回 `int`。Java 编译器要求"所有执行路径都必须有返回值"，此代码编译失败。**举一反三**：加 `else return 0;` 或在方法末尾加 `return 0;` 解决。
> **9-B**：作为程序入口的 `main` 必须是 `public static void main(String[] args)`。D 错：省略参数会编译通过但不再是 JVM 识别的入口，运行时报 "main method not found"。A 错：可以写多个重载 `main`（如 `main(int x)`），但只有一个能作为入口。C 错：main 当然可以调用其他方法。**举一反三**：`main` 只是入口函数，本身没有任何特权——它调用的方法和其他方法地位相同。
> **10-B**：Java 是值传递，`swap(a, b)` 传递的是 a 和 b 的值副本，方法内交换的是副本 x 和 y，原始变量 a、b 不受影响。输出仍是 5, 10。**举一反三**：Java 中没有 C++ 的引用传递语法，无法实现真正的原地交换方法——这是很多面试的陷阱题。

### 二、解答题（3 道）

1. [概念阐述] 什么是方法重载（Overload）？构成重载需要满足哪些条件？返回类型不同算不算重载？请举例说明。

2. [场景解释] 咖啡机系统中，写一个 `calcTotal` 方法。现在有三条业务线：①已知杯数 × 单价（`calcTotal(int count, double price)`）；②已知杯数和折扣率（`calcTotal(int count, double price, double discount)`）；③已知总价和配送费（`calcTotal(double subtotal, int deliveryFee)`）。请设计三个重载方法并说明编译器如何区分调用。

3. [综合分析] "Java 是值传递"这个说法在面试中经常被问到。请从三个层次证明这个结论：①基本类型参数的实验；②对象参数"方法内修改字段"的实验；③对象参数"方法内重新赋值引用"的实验。结合实验代码说明为什么③不能改变外部引用的原因是值传递而非引用传递。

> [!答案]
> **1**　重载指同一个类中允许多个**方法名相同**但**参数列表不同**的方法并存。条件：参数个数不同 / 参数类型不同 / 参数类型顺序不同。只看参数列表——返回类型、访问修饰符、异常列表都**不算**重载的依据。`int foo() { }` 和 `void foo() { }` 不能构成重载（编译器无法根据调用上下文区分）。重载的意义在于"同一种操作对不同输入的处理"——如 `Math.abs(int)` 和 `Math.abs(double)`。**举一反三**：重载是在编译时决定的（静态绑定），覆盖（Override）是在运行时决定的（动态绑定）——两者常被混淆。
> **2**　设计三个重载：`public static double calcTotal(int count, double price) { return count * price; }`（基础版），`public static double calcTotal(int count, double price, double discount) { return count * price * discount; }` （折扣版），`public static double calcTotal(double subtotal, int deliveryFee) { return subtotal + deliveryFee; }`（配送版）。编译器根据**实参的个数和类型**在编译期就能确定调用哪个版本：`calcTotal(3, 15.9)` → 第 1 个，`calcTotal(3, 15.9, 0.8)` → 第 2 个，`calcTotal(47.7, 5)` → 第 3 个。**举一反三**：如果三个方法参数类型有重叠（如 `(int, double)` vs `(double, int)`），调用 `calcTotal(3, 5)` 时两个 int 都能隐式转为 double，编译器报歧义错误。
> **3**　三个层次证明：①基本类型：`int a=5; change(a);` 方法内 `x=100`，外部 a 还是 5——值被复制了。②对象参数修改字段：`int[] a={1}; change(a);` 方法内 `arr[0]=99`，外部 a[0] 也是 99——因为副本引用指向同一个对象，通过副本引用的 `.` 操作可以修改对象内容。③对象参数重新赋值引用：`int[] a={1}; change(a);` 方法内 `arr = new int[]{99}`，外部 a 还是 {1}——因为 `arr` 是形参副本，改 `arr` 指向新对象不影响外部 a 的指向。如果 Java 真的是引用传递，③中 `arr = new int[]{99}` 就会让外部 a 也指向新对象——但实验证明不会，这正好推翻了"引用传递"假说。**举一反三**：面试回答公式——"Java 只有值传递。基本类型传值的副本，引用类型传引用地址的副本。通过副本引用可以改对象内容但不是引用传递，因为不能把外部变量本身重新指向新对象。"

### 三、代码题（2 道）

1. [基础实现] 写三个重载方法 `max`：① `max(int a, int b)` 返回最大值；② `max(int a, int b, int c)` 返回最大值（调用①实现）；③ `max(int[] arr)` 返回数组最大值（用循环实现）。测试：max(3,7) → 7，max(3,7,2) → 7，max(new int[]{3,7,2,9,1}) → 9。

2. [综合设计] 写一个"温度转换工具类"：包含方法 `c2f(double c)`（摄氏→华氏，f=c×9/5+32）、`f2c(double f)`（华氏→摄氏，c=(f-32)×5/9），以及重载方法 `convert(double value, String scale)`（scale 为 "C" 则转为华氏，为 "F" 则转为摄氏，其他抛异常）。在 main 中演示：冰点（0°C → 32°F）、沸点（212°F → 100°C）、正常体温（37°C → 98.6°F），要求输出包含一位小数。

> [!答案]
> **1 验收**：
> ```java
> public static int max(int a, int b) {
>     return a > b ? a : b;
> }
>
> public static int max(int a, int b, int c) {
>     return max(max(a, b), c);  // 复用二参数版本
> }
>
> public static int max(int[] arr) {
>     if (arr == null || arr.length == 0) {
>         throw new IllegalArgumentException("数组不能为空");
>     }
>     int m = arr[0];
>     for (int i = 1; i < arr.length; i++) {
>         if (arr[i] > m) m = arr[i];
>     }
>     return m;
> }
>
> // 测试
> System.out.println(max(3, 7));                  // 7
> System.out.println(max(3, 7, 2));               // 7
> System.out.println(max(new int[]{3, 7, 2, 9, 1})); // 9
> ```
> **举一反三**：重载方法之间可以互相调用——③调用②，②调用①，层层递进，减少重复代码。注意 `arr` 空数组时初始化 `arr[0]` 会越界，务必先做防御检查。
>
> **2 验收**：
> ```java
> public static double c2f(double c) {
>     return c * 9.0 / 5.0 + 32;
> }
>
> public static double f2c(double f) {
>     return (f - 32) * 5.0 / 9.0;
> }
>
> public static double convert(double value, String scale) {
>     if (scale.equals("C")) {
>         return c2f(value);
>     } else if (scale.equals("F")) {
>         return f2c(value);
>     } else {
>         throw new IllegalArgumentException("scale 必须是 C 或 F，实际：" + scale);
>     }
> }
>
> // main 演示
> public static void main(String[] args) {
>     System.out.printf("0°C = %.1f°F\n", c2f(0));        // 32.0°F ✓
>     System.out.printf("212°F = %.1f°C\n", f2c(212));    // 100.0°C ✓
>     System.out.printf("37°C = %.1f°F\n", c2f(37));      // 98.6°F ✓
>
>     System.out.printf("convert 版: %.1f\n", convert(0, "C"));    // 32.0
>     System.out.printf("convert 版: %.1f\n", convert(212, "F"));  // 100.0
>     // convert(100, "X"); → 抛异常
> }
> ```
> 运行验证：0°C=32.0°F, 212°F=100.0°C, 37°C=98.6°F 全部精确。**举一反三**：注意用 `9.0/5.0` 而非 `9/5`——后者是整数除法得 1，导致公式完全错误（0°C 变成 32°F？0×1+32=32 碰巧对，但 100°C 就变成 100×1+32=132°F 了——实际应该是 212°F）。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 `/java`。*
