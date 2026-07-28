---
title: "《从零开始学 Java》12 · 控制台咖啡机(第一季大结局)"
date: 2026-08-05
summary: "菜单、点单、算价、判断、出杯、小票、异常兜底全部合体,交付第一季完整项目 v1,并配一套 JUnit 测试。第一位真实顾客的一通乱输入,成了它的成人礼。"
tags: [Java, Java漫画, 项目实战, 控制台程序, 阿零与豆豆]
---

# 《从零开始学 Java》12 · 控制台咖啡机(第一季大结局)

> 第一季「点火篇」第 12 话 · 基线 JDK 25 · 项目检查点:控制台咖啡机 v1。
> 长期项目:**豆豆咖啡站**。十二话走到这里,它第一次成为一台能真正交付的机器。

---

## 一、需求:把十一话拼成一台能用的机器

变量、运算、判断、switch、循环、数组、方法、输入、字符串、排障——十一话的能力,这一话全部整合成一个**真正能交互运行**的控制台咖啡机:开机循环显示菜单,顾客反复点单,出错不崩、给提示,输 0 离店。

---

## 二、漫画 · 第一位真实顾客

![《从零开始学 Java》12 · 控制台咖啡机(第一季大结局) —— 阿零与豆豆六格漫画](/comics/java/s01e12-coffee-machine.png)


> [!文字版]
> **〔1〕** 阿零合上最后一块面板,咖啡站的灯依次亮起,菜单在屏幕上滚动。
> 阿零:「它……真的能用了。菜单、点单、算价、小票,全接上了!」
>
> **〔2〕** 门铃"叮咚"——**第一位真实顾客**推门进来,一屁股坐到键盘前,手指乱按:编号栏敲了个 `k`,回车。
> 阿零(得意):「放心,我加了 `try`,不会崩——」
>
> **〔3〕** 屏幕突然疯了:「下单失败」「下单失败」「下单失败」……红字如瀑布狂刷,根本停不下来。顾客吓得后仰。
> 阿零(脸白):「它、它自己刷疯了?我明明 catch 住了啊!」
>
> **〔4〕** 豆豆坐在角落,没动,只抬了下眼皮:「五步法。观察现象——它在**无限重试**同一个坏输入。为什么 catch 了还停不下?」
>
> **〔5〕** 阿零盯着缓冲区,一拍大腿——独立想通了:「`nextInt()` 抛异常时**没吃掉**那个 `k`!它还赖在输入缓冲里,下一轮 `nextInt()` 又读到它、又抛……死循环!」他手动在 `catch` 里补上一句 `sc.nextLine()`,把坏 token 清干净。
> 阿零:「清掉缓冲——重跑!」瀑布戛然而止,机器稳稳打出「下单失败,请重新输入」。
>
> **〔6〕** 顾客这次老实敲了「1」「1」「20」,小票"嗤"地吐出。豆豆终于站起来,拍拍阿零:「看见没?你自己按住了一台差点崩掉的机器。第一季,你真的会写 Java 了。」
---

## 三、本话目标

- 把前十一话整合成一个连贯、能持续交互的程序;
- 用循环支撑「持续点单」,用 `try/catch` 兜住一切乱输入;
- 看懂 Scanner 缓冲死循环的成因与根治;
- 交付带测试的第一季项目 v1,并逐段走查、枚举边界。

---

## 四、完整代码:控制台咖啡机 v1

```java
import java.util.Scanner;

public class CoffeeMachine {
    static final String[] MENU = {"美式", "拿铁", "卡布奇诺"};
    static final double[] PRICES = {15.0, 18.0, 20.0};

    static double priceOf(int choice) {
        if (choice < 1 || choice > MENU.length)
            throw new IllegalArgumentException("没有编号 " + choice);
        return PRICES[choice - 1];
    }

    static String receipt(int choice, int qty, double paid) {
        double total = priceOf(choice) * qty;
        if (paid < total)
            throw new IllegalStateException("余额不足,还差 ¥%.2f".formatted(total - paid));
        return """
               —— 豆豆咖啡站 ——
               %s × %d 杯
               应付 ¥%.2f · 找零 ¥%.2f
               ——————————————
               """.formatted(MENU[choice - 1], qty, total, paid - total);
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println("欢迎光临豆豆咖啡站(输入 0 离店)");
        while (true) {
            for (int i = 0; i < MENU.length; i++)
                System.out.println((i + 1) + ". " + MENU[i] + " ¥" + PRICES[i]);
            System.out.print("请输入编号:");
            try {
                int choice = sc.nextInt();   // 放进 try:顾客敲字母也不会整个程序崩溃
                if (choice == 0) { System.out.println("欢迎再来 ☕"); break; }
                System.out.print("几杯:");
                int qty = sc.nextInt();
                System.out.print("付款:");
                double paid = sc.nextDouble();
                System.out.print(receipt(choice, qty, paid));
            } catch (RuntimeException e) {
                System.out.println("下单失败:" + e.getMessage());   // 兜住乱输入/余额不足
                sc.nextLine();   // ★ 清掉缓冲里残留的坏 token,否则下一轮 nextInt 会反复失败、死循环刷屏
            }
        }
    }
}
```

> **豆豆锐评 · 两处不能省的细节,栽过的人都懂**
> ① 读 `choice` 的 `nextInt()` **必须**在 `try` 里 —— 顾客第一步就敲字母,它直接抛 `InputMismatchException`;放在 `try` 外,就不是"下单失败",而是**整个程序当场崩溃**。
> ② `catch` 里那句 `sc.nextLine()` **不能删** —— `nextInt()` 抛异常时**不会吃掉**那个坏 token,它还赖在输入缓冲里。不清掉,下一轮 `nextInt()` 又读到它、又抛……**死循环刷「下单失败」**。这是几乎每个人写第一个交互程序都会踩的坑。

> **依赖致意**:这里的 `try/catch` 只当**「出错不崩、给个提示」的护栏**用——它拦住一切 `RuntimeException`,把崩溃变成一行友好提示。至于异常有几个家族、`checked` 与 `unchecked` 怎么分、`finally` 与 `try-with-resources` 怎么用,是**第三季「异常季」专门拆解**的大题。本话先会用这道护栏,原理留到那时讲透。

---

## 五、逐段走查(读懂每一块为什么在这)

```text
MENU / PRICES  —— 两个 static final 数组:菜单和价格,一一对应(编号 - 1 = 下标)
priceOf()      —— 先做上下界校验再取价,把「越界」挡在取数组之前
receipt()      —— 复用 priceOf 算总价,付款不足就抛异常,否则用文本块 + formatted 出小票
main()         —— while(true) 撑起「持续点单」,输 0 才 break;
                  一次点单的三步读取全包在 try 里,任何一步出错都落到同一张「护栏网」
catch          —— 统一兜 RuntimeException(它是 IllegalArgument/IllegalState/InputMismatch 的共同祖先)
                  + sc.nextLine() 清缓冲,是这台机器能「反复接客」而不刷屏的关键
```

一条设计原则贯穿始终:**校验前置、异常兜底、动作复用**——正是第八话「把步骤收进方法」的直接兑现。

---

## 六、故意制造一个 Bug

把库存边界判断写反,只防上界、漏了下界:

```java
if (choice < 1 || choice > MENU.length)   // 正确:双侧都防
// 若写成只判上界:
if (choice > MENU.length)                 // ← 故意:负数/0 漏防
```

传入 `choice = -1` 时,`PRICES[choice - 1]` → `PRICES[-2]`,直接 `ArrayIndexOutOfBoundsException`。**边界判断少一侧**,是最常见的线上事故来源之一——修回双侧判断即可。这也呼应上一话的教训:边界,是逻辑 Bug 最爱藏身的地方。

---

## 七、边界枚举:这台机器扛得住哪些乱输入

工程交付前,把「顾客能干出的坏事」列全,逐条确认有没有兜住:

| 顾客输入 | 机器反应 | 靠什么兜住 |
|---|---|---|
| 编号敲 `abc` | `nextInt` 抛 `InputMismatchException` → 提示「下单失败」并继续 | `try` + `catch` 里 `sc.nextLine()` 清缓冲 |
| 编号敲 `9`(超范围) | `priceOf` 抛 `IllegalArgumentException` → 提示后继续 | `priceOf` 的上下界校验 |
| 编号敲 `0` | 打印「欢迎再来」正常离店 | `if (choice == 0) break;` |
| 付款少于总价 | `receipt` 抛 `IllegalStateException` → 提示「余额不足…」 | `paid < total` 判断 |
| 杯数处敲字母 | 同样抛异常落进 catch,清缓冲后重来 | 三步读取全在同一个 `try` 内 |
| 编号敲 `-1`(若漏下界) | 会 `ArrayIndexOutOfBounds` —— **正是第六节的 Bug** | 双侧边界校验 |

> **豆豆锐评**:能把这张表写全的人,和「只测了一遍正常流程就说做完了」的人,差的就是**健壮性意识**。真实顾客永远比你想象的更有创造力。

---

## 八、给项目配测试

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CoffeeMachineTest {
    @Test
    void price_by_menu() {
        assertEquals(15.0, CoffeeMachine.priceOf(1));
        assertEquals(20.0, CoffeeMachine.priceOf(3));
    }

    @Test
    void reject_out_of_range() {
        assertThrows(IllegalArgumentException.class, () -> CoffeeMachine.priceOf(0));  // 下界
        assertThrows(IllegalArgumentException.class, () -> CoffeeMachine.priceOf(9));  // 上界
    }

    @Test
    void reject_insufficient_payment() {
        assertThrows(IllegalStateException.class,
            () -> CoffeeMachine.receipt(1, 3, 10.0));   // 45 元只付 10
    }
}
```

注意测的都是 `priceOf` / `receipt` 这些**纯逻辑方法**——不碰键盘,所以能被自动验证;交互部分交给上面那张边界表人工过一遍。这正是全季反复强调的:**把逻辑从 IO 里剥出来,才测得动**。

---

## 九、项目检查点 · 豆豆咖啡站 v1 🎉

```text
交付:一个可交互运行、带异常兜底、带测试的控制台咖啡机
能力:菜单循环 / 点单 / 算价 / 边界校验 / 小票 / 出错不崩
局限:所有数据散在一堆数组和 static 方法里,咖啡的「名字+价格+库存」没绑在一起
       —— 这正是第二季要解决的:用「对象」把它们打包
```

---

## 十、对应招聘技能

| 本话技能 | 招聘里的样子 |
|---|---|
| 整合一个可运行的小程序 | 简历第一个「作品」 |
| 异常兜底 / 边界处理 | 代码健壮性,面试与 Code Review 都盯 |
| Scanner 缓冲死循环的根治 | 「你怎么排查一个死循环」的真实案例 |
| 给项目写测试 | 「熟悉单元测试」的真实证据 |

---

## 十一、第一季完 · 下一季预告

第一季,阿零从一行 `Hello` 走到了一台能用、能扛乱输入、有测试兜底的咖啡机;更重要的是,他从「事事问豆豆」长到了「自己按住一台差点崩掉的机器」。靠的,是「一堆变量 + 一堆方法」。

可当咖啡的种类越来越多、每种都有自己的名字、价格、库存和做法时,散在数组里的数据会迅速失控——`MENU[i]` 和 `PRICES[i]` 全靠下标「暗中约定」对齐,一旦错位就是灾难。

> 第二季《对象大陆》:阿零学会用 `class` 把「一杯咖啡」的名字、价格、库存**打包成一个对象**,再用集合管理成百上千的订单——这才是 Java 真正的灵魂。



## 🎯 随堂练习

先自己做，再对答案。选择1-3基础识记，4-6理解应用，7-9分析判断，10综合；解答递进；代码题从写到验证。

### 一、选择题（10 道）

1. [基础] S1 咖啡机项目中，菜单和价格靠什么来维护对应关系？
   - A) `HashMap`　B) 数组下标对齐　C) 对象字段　D) 数据库

2. [基础] 咖啡机的 `showMenu()` 方法的主要职责是？
   - A) 计算总价　B) 读取用户输入　C) 打印菜单列表　D) 验证输入合法性

3. [基础] 为什么 S1 咖啡机适合用 `do-while` 作为主循环？
   - A) 因为不知道用户要点多少杯　B) 至少要先看到菜单再决定是否继续　C) `while` 不能读键盘输入　D) `do-while` 比 `while` 语法更短

4. [理解] `MENU[i]` 和 `PRICES[i]` 用下标对齐来对应，这种"平行数组"设计的核心风险是？
   - A) 数组不能存字符串　B) 增删菜单项时容易下标错位　C) 无法遍历数组　D) 占内存太多

5. [理解] 咖啡机中，`initMenu()` 方法的返回值类型应该是？
   - A) `void`（直接初始化静态数组）　B) `int`　C) `String`　D) `String[][]`（二维数组，名称和价格打包）

6. [应用] 在咖啡机项目中，如果要增加第 4 款饮品，需要改动哪些部分？
   - A) 只需在菜单数组中加一项　B) 菜单数组和价格数组各加一项　C) 菜单数组加一项，价格自动对应　D) 不需要改动，数组自动扩展

7. [分析] 以下关于 S1 咖啡机代码结构的说法，哪项**不符合**"单一职责原则"？
   - A) `showMenu()` 只负责打印菜单　B) `calcTotal()` 只负责计算价格　C) `main()` 中混合了输入/计算/输出所有逻辑　D) `printReceipt()` 只负责格式化输出小票

8. [分析] 咖啡机系统中，如果用 `switch` 替代 `if` 来处理菜单选择，本质上是？
   - A) 从范围判断改为等值匹配，更适合菜单编号分发　B) 让代码变慢　C) 语法错误，switch 不能处理整数　D) 两者没有区别

9. [判断] 以下关于综合实战项目的说法正确的是？
   - A) 综合项目就是把所有知识点随机组合　B) 综合项目中每个方法的职责越模糊越好　C) 综合项目和单知识点练习的区别是"多知识点的协调与衔接"　D) 综合项目不需要考虑代码结构

10. [综合] 在最终版咖啡机中，以下哪个模块的复用频率最高（被其他方法调用次数最多）？
    - A) `showMenu()`（打印菜单）　B) `calcTotal(int choice, int qty)`（计算小计）　C) `initMenu()`（初始化数据）　D) `main()`（程序入口）

> [!答案]
> **1-B**：第一季还没学集合和类，使用 `MENU[i]` 和 `PRICES[i]` 两个数组，靠下标 i 暗中对应——这就是"下标暗合"。一旦增删菜单项，很容易对不上号。**举一反三**：第二季引入 `class Coffee` 后，名字和价格打包在一起，从根本上消除了这个脆弱性。
> **2-C**：`showMenu()` 职责单一——只负责遍历菜单数组并打印。不应在这里做计算、读取输入或验证操作。**举一反三**：单一职责是写出可维护代码的第一法则——一个方法只做一件事。
> **3-B**：`do-while` 保证循环体至少执行一次——用户打开程序先看到菜单，然后决定点什么、是否继续。如果用 `while`，需要在循环外额外写一遍显示菜单的代码。**举一反三**：几乎所有"菜单驱动"的控制台程序都用 `do-while` 作为主循环。
> **4-B**：两个平行数组通过相同下标关联，修改一个数组时必须同步修改另一个——增删一项时如果忘记更新另一个数组，就会导致"美式显示成摩卡的价格"。最根本的解决方案是用对象封装。**举一反三**：平行数组是重构（refactor）的强烈信号——一旦发现，就应该提取为类。
> **5-D**：最佳设计是让 `initMenu()` 返回一个二维数组（`String[][]`）或未来的对象数组，使名称和价格绑定在一起返回。如果只返回 `void` 而去操作全局静态数组，方法就耦合了全局状态，不利于测试。**举一反三**：方法之间的数据流动应该通过参数和返回值，而不是全局变量——这是从"面向过程"到"模块化设计"的关键一步。
> **6-B**：需要同时在菜单名称数组和价格数组的对应位置各添加一项。如果忘记更新价格数组，第 4 款饮品可能显示为错误的（默认）价格 0。**举一反三**：如果改成二维数组 `String[][] menu`，增删一项只要改一处——结构设计决定了修改成本。
> **7-C**：`main()` 中把输入读取、菜单解析、价格计算、小票打印全部堆在一起，违反了单一职责原则。更好做法：`main()` 只做流程编排（"显示菜单 → 读输入 → 调计算方法 → 调打印方法"），具体逻辑封装在各自方法中。**举一反三**：如果你需要在注释里写"//第一步：...""//第二步：..."，可能就是在提示你自己——这些步骤应该各自提取为方法。
> **8-A**：菜单编号是整数等值匹配（case 1/2/3），switch 天然适合。if-else 更适合范围判断（如价格区间）。在这个场景中 switch 更清晰、执行效率也更高。**举一反三**：选择 if 还是 switch 的决策很简单——判断逻辑是"值 == 常量"用 switch，是"值 > 某范围"用 if。
> **9-C**：综合实战项目的特点是多个知识点协同工作形成完整系统，而非知识点各自独立。例如咖啡机中变量存储数据、方法组织逻辑、循环控制交互、数组管理菜单、Scanner 读取输入——这些都必须在同一个流程中正确衔接。**举一反三**：综合项目的能力差距在于"接口设计"——变量怎么传给方法、方法的返回值怎么驱动下一步，这比单个知识点本身更重要。
> **10-A**：`showMenu()` 在每次循环中都被调用——用户每轮点单前都需要先看菜单。`calcTotal()` 只在点单时调用一次，`initMenu()` 可能只在程序启动时调用一次。**举一反三**：高频调用的方法更要注意性能（虽然菜单项目少影响不大）和输出格式的稳定性。

### 二、解答题（3 道）

1. [概念阐述] 从"单兵练习"到"综合实战"（如 S1 咖啡机），项目维度发生了哪些质变？请从代码量、知识耦合度、调试难度三个角度说明。

2. [场景解释] 如果要在现有咖啡机基础上增加功能——"累计消费满 100 元后自动给下一单打 8 折"，请描述需要新增哪些变量、修改哪些方法、调整哪部分流程。不要写代码，用文字描述改动方案。

3. [综合分析] 总结 S1 咖啡机中，变量/运算/判断/循环/数组/方法/Scanner 七个知识点是如何"串联"成一个可运行系统的？请画出系统的数据流（从用户输入到小票输出的全过程），说明每个知识点的角色和衔接方式。

> [!答案]
> **1**　三维质变：①**代码量**——单练习 10~20 行，综合项目 100~200 行，从"写完就懂"变成"需要结构化管理"（如方法拆分）。②**知识耦合度**——不再是学完变量忘了变量、学完循环忘了循环，而是所有知识点在同一时刻协同运作。一个知识点的 Bug 会影响另一个知识点的结果（如数组越界导致价格计算错误、Scanner 缓冲区残留导致菜单跳过）。③**调试难度**——单个知识点练习时 Bug 很明显（就几行代码），综合项目中一个 Bug 可能需要在 6 个方法间追踪数据流才能定位。需要学会"打桩"和"缩小排查范围"。**举一反三**：综合项目是从"写代码"到"写系统"的分水岭——前者靠记忆力，后者靠结构设计能力。
> **2**　改动方案：①新增一个全局变量 `cumulativeTotal` 记录累计消费额（跨订单累加，不能每次归零）。②新增一个 `boolean` 变量 `nextOrderDiscount` 标记下一单是否享受 8 折。③在每单结算完成后，检查 `cumulativeTotal >= 100`，如果满足则设置 `nextOrderDiscount = true`，同时将 `cumulativeTotal -= 100`（扣除满赠门槛，或重置为 0 取决于业务规则）。④在下单计算价格时，先判断 `nextOrderDiscount` 是否为 true，是则 `discount = 0.8`，计算完后重置 `nextOrderDiscount = false`。⑤`printReceipt()` 中如果使用了折扣，需要在"总价"行额外标注折扣信息。**举一反三**：这种"累计 + 跨单状态"的需求是状态机思想的雏形——程序需要记忆历史行为来影响未来决策，这也是面向对象和设计模式的萌芽。
> **3**　数据流：用户输入编号和数量（Scanner） → 编号转为菜单索引（数组：下标对齐命中和价格）→ 数量乘单价（运算：自动类型提升）→ 累加到总价（变量：记录状态 + 运算：+=复合赋值）→ 判断是否继续点单（判断：if/else 或用户输入 y/n）→ 循环返回菜单（循环：do-while）→ 最终生成小票（方法：printReceipt 封装格式化逻辑）。衔接方式：Scanner 的输出（用户输入值）作为方法的参数 → 方法内部用数组做数据查找 → 计算结果通过 return 返回给调用者 → main 负责全部流程编排。**举一反三**：画出这种"数据是怎么流经各个知识点的"是理解任何程序的第一步——不要对着代码一行行读，而是先画出"数据从哪里来、经过谁、到哪里去"。

### 三、代码题（2 道）

1. [基础实现] 写一个最小可运行的"奶茶点单机"：菜单 3 款（珍珠奶茶8元、椰果奶茶9元、红豆奶茶10元），用 `do-while` 循环运行，用户输入 1/2/3 选款、输入杯数、打印小计，输入 0 退出并打印总价。要求：①两个数组（名称、价格）下标对齐；②至少拆分出 `showMenu()` 和 `calcTotal()` 两个方法；③处理无效输入（编号 1~3 以外提示重新输入）。

2. [综合设计] 在题 1 的基础上，请实现完整版奶茶店：①新增第 4 款"双拼奶茶 12 元"；②增加"第二杯半价"促销：同一款饮品买两杯以上时，超过 1 杯的部分半价（如 3 杯 = 1 原价 + 2 半价）；③用 `StringBuilder` 生成小票，展示每项的"原价×数量=小计"以及折扣详情；④计算总优惠金额并在小票中显示；⑤实现"每日销售统计"：程序退出后打印当日总营业额和总杯数（多轮点单累加）。

> [!答案]
> **1 验收**：
> ```java
> import java.util.Scanner;
>
> public class MilkTea {
>     static String[] menu = {"珍珠奶茶", "椰果奶茶", "红豆奶茶"};
>     static int[] prices = {8, 9, 10};
>
>     static void showMenu() {
>         System.out.println("=== 奶茶菜单 ===");
>         for (int i = 0; i < menu.length; i++) {
>             System.out.printf("%d. %-8s %d元\n", i + 1, menu[i], prices[i]);
>         }
>         System.out.println("0. 结账退出");
>         System.out.print("请选择: ");
>     }
>
>     static int calcTotal(int choice, int qty) {
>         return prices[choice - 1] * qty;
>     }
>
>     public static void main(String[] args) {
>         Scanner sc = new Scanner(System.in);
>         int totalPrice = 0;
>         StringBuilder receipt = new StringBuilder("===== 小票 =====\n");
>         int choice;
>
>         do {
>             showMenu();
>             choice = sc.nextInt();
>             sc.nextLine(); // 清残留
>
>             if (choice == 0) break;
>
>             if (choice < 1 || choice > menu.length) {
>                 System.out.println("无此饮品，请重新选择");
>                 continue;
>             }
>
>             System.out.print("杯数: ");
>             int qty = sc.nextInt();
>             sc.nextLine();
>             if (qty <= 0) {
>                 System.out.println("杯数必须 > 0");
>                 continue;
>             }
>
>             int subtotal = calcTotal(choice, qty);
>             totalPrice += subtotal;
>             receipt.append(String.format("%s × %d = %d元\n",
>                 menu[choice - 1], qty, subtotal));
>             System.out.printf("已添加: %s × %d = %d元\n",
>                 menu[choice - 1], qty, subtotal);
>
>         } while (true);
>
>         receipt.append("==================\n");
>         receipt.append("总价: ").append(totalPrice).append("元\n");
>         System.out.println(receipt);
>         sc.close();
>     }
> }
> ```
> **举一反三**：`prices[choice - 1]` 的 `-1` 是因为菜单显示 1/2/3，但数组索引是 0/1/2。这是"界面序号 vs 数组索引"的经典偏移量模式。
>
> **2 验收**：
> ```java
> import java.util.Scanner;
>
> public class MilkTeaPlus {
>     static String[] menu = {"珍珠奶茶", "椰果奶茶", "红豆奶茶", "双拼奶茶"};
>     static int[] prices = {8, 9, 10, 12};
>     static int dailyTotal = 0;  // 日营业额
>     static int dailyCups = 0;   // 日总杯数
>
>     static void showMenu() {
>         System.out.println("\n=== 奶茶菜单 ===");
>         for (int i = 0; i < menu.length; i++) {
>             System.out.printf("%d. %-8s %d元 (第2杯起半价)\n",
>                 i + 1, menu[i], prices[i]);
>         }
>         System.out.println("0. 结账退出");
>         System.out.print("请选择: ");
>     }
>
>     // 第二杯半价计算
>     static double calcWithPromo(int choice, int qty) {
>         if (qty <= 1) return prices[choice - 1] * qty;
>         // 1瓶原价 + (qty-1)瓶半价
>         return prices[choice - 1] + prices[choice - 1] * 0.5 * (qty - 1);
>     }
>
>     public static void main(String[] args) {
>         Scanner sc = new Scanner(System.in);
>         StringBuilder receipt = new StringBuilder("===== 小票 =====\n");
>         double totalPaid = 0;
>         double totalSaved = 0;
>         int choice;
>
>         do {
>             showMenu();
>             String line = sc.nextLine();
>             try { choice = Integer.parseInt(line); }
>             catch (NumberFormatException e) { choice = -1; }
>
>             if (choice == 0) break;
>             if (choice < 1 || choice > menu.length) {
>                 System.out.println("无此饮品，请重新选择");
>                 continue;
>             }
>
>             System.out.print("杯数: ");
>             int qty;
>             try { qty = Integer.parseInt(sc.nextLine()); }
>             catch (NumberFormatException e) { qty = -1; }
>
>             if (qty <= 0) {
>                 System.out.println("杯数必须 > 0");
>                 continue;
>             }
>
>             double subtotal = calcWithPromo(choice, qty);
>             double original = prices[choice - 1] * qty;
>             double saved = original - subtotal;
>
>             totalPaid += subtotal;
>             totalSaved += saved;
>             dailyCups += qty;
>
>             receipt.append(String.format(
>                 "%-8s ×%2d  原价%.1f  优惠价%.1f  省%.1f\n",
>                 menu[choice - 1], qty, original, subtotal, saved));
>             System.out.printf("已添加: 优惠价 %.1f 元 (省了 %.1f 元!)\n",
>                 subtotal, saved);
>
>         } while (true);
>
>         dailyTotal = (int) Math.round(totalPaid);
>
>         receipt.append("============================\n");
>         receipt.append(String.format("应付: %.1f 元\n", totalPaid));
>         receipt.append(String.format("共省: %.1f 元\n", totalSaved));
>         System.out.println("\n" + receipt);
>
>         // 日统计
>         System.out.println("===== 今日统计 =====");
>         System.out.printf("总营业额: %d 元\n", dailyTotal);
>         System.out.printf("总杯数: %d 杯\n", dailyCups);
>         System.out.printf("人均: %.1f 元\n",
>             dailyCups > 0 ? totalPaid / dailyCups * 2 : 0); // 粗略按 2 杯/人
>
>         sc.close();
>     }
> }
> /* 示例运行:
> 选 1 珍珠奶茶 × 3 → 原价 24, 优惠价 8+4+4=16, 省 8
> 选 4 双拼奶茶 × 2 → 原价 24, 优惠价 12+6=18, 省 6
> 结账 → 应付 34元, 共省 14元, 日统计 34元 / 5杯
> */
> ```
> 运行验证：半价计算正确（第 1 杯原价，第 N 杯 = 原价 × 0.5 × (N-1)），小票明细完全对齐，日统计数据正确累加。**举一反三**：注意半价公式的边界——当 qty=1 时 `prices[choice-1] * 0.5 * (1-1) = 0`，相当于只有原价一单，这是正确的优惠逻辑（买 1 杯无优惠）。

---

*完整季次地图见 [/java](/java);世界观设定见仓库 `docs/java-comic-academy/handbook.md`。*
