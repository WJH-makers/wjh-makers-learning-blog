---
title: "《从零开始学 Java》23 · 泛型包装箱"
date: 2026-08-16
summary: "List<Coffee> 那对尖括号是什么?泛型让容器只装指定类型,把类型错误从运行时提前到编译时——尽管它运行时其实被『擦除』得一干二净。"
tags: [Java, Java漫画, 泛型, generics, 阿零与豆豆]
---

# 《从零开始学 Java》23 · 泛型包装箱

> 连载特刊 · 第二季「对象大陆」第 11 话 · 主线基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——一路用着 `List<Coffee>`、`Map<String,Coffee>`,今天终于搞清那对尖括号到底是什么。

---

## 一、需求:让容器「只装指定的货」

阿零翻出第一季一个「什么都能塞」的老式容器,取东西时得先强转:`(Coffee) box.get()`。一转错就运行时崩。豆豆:「不带类型的老容器,编译官帮不上忙——它不知道你箱子里装的是咖啡还是袜子。**泛型**让你在声明时就写死『这个箱子只装 `Coffee`』,装错的编译期就被当场拦下。」

---

## 二、漫画 · 什么都收的老仓库

> **〔1〕** 两个仓库并排:左边门口刷着「**什么都收**」,里面咖啡、螺丝、袜子混作一团;右边门口挂着牌子 `<Coffee>`,只收咖啡,整整齐齐。
> 豆豆:「泛型 `<T>` 就是给箱子贴上『只装某种货』的标签,让编译官替你把门。」

> **〔2〕** 阿零偏爱左边那间:「什么都收多灵活!一个仓库走天下。」他从里面随手抓一包,当成咖啡就往机器里冲。
> 豆豆:「你抓的是**袜子**……」

> **〔3〕** 机器「砰」地爆开一团黑烟,吐出 `ClassCastException`。阿零满脸黑灰。
> 豆豆(叼着豆子叉腰):「运行时才翻车,顾客都在看。泛型能把这一脚**提前到编译期**,让编译官在你打包前就拦下。」

> **〔4〕** 阿零不服:「那尖括号是不是运行时一直盯着箱子?」豆豆掀开运行时的箱子——**标签没了**,里面只是一个写着 `Object` 的素箱。
> 豆豆:「反转来了——泛型**只活在编译期**。编译完,尖括号被『擦掉』,运行时它就是个装 `Object` 的普通箱子。它是编译官的活,不是 JVM 的活。」

---

## 三、本话目标

- 理解泛型 `<T>` 带来的编译期类型安全;
- 写一个自己的泛型类 `Box<T>`;
- 搞懂**类型擦除**:泛型为何运行时「不存在」,原始类型为何能编译过;
- 踩一次原始类型导致的运行时 `ClassCastException`。

---

## 四、原理图:尖括号只活在编译期

```text
List<Coffee> 只能装 Coffee,取出即 Coffee,无需强转 —— 编译官全程盯着
List(原始类型)什么都能装,取出是 Object,强转那一刻才暴雷

自定义:class Box<T> { T item; T get(){...} void put(T t){...} }
        Box<Coffee> 装咖啡,Box<Member> 装会员,一套代码复用

类型擦除:编译后,Box<Coffee> 和 Box<Member> 变成同一个 Box(内部 T→Object),
         尖括号信息被擦掉,编译器在取值处替你偷偷插入强转(checkcast)。
```

---

## 五、代码:泛型包装箱

```java
class Box<T> {                 // T 是类型参数,用时再指定
    private T item;
    void put(T item) { this.item = item; }
    T get() { return item; }
}

// 全季统一:Coffee 固定三字段(含 stock),沿用第 19 话升级的 record
record Coffee(String name, double price, int stock) {}

public class Warehouse {
    public static void main(String[] args) {
        Box<Coffee> box = new Box<>();          // 声明:这个箱子只装 Coffee
        box.put(new Coffee("美式", 15.0, 20));
        Coffee c = box.get();                    // 直接是 Coffee,不用强转
        System.out.println(c.name() + " ¥" + c.price() + " 库存 " + c.stock());
    }
}
```

> **🎯 面试直击**:什么是类型擦除?为什么面试反复问?
> Java 泛型是**编译期**的把戏:编译器用尖括号做类型检查、并在取值处替你插入强转,**检查通过后就把类型信息「擦掉」**——`List<Coffee>` 和 `List<Member>` 在运行时是**同一个** `List`,内部 `T` 一律变成 `Object`(有上界则擦成上界)。这解释了三件事:① 为什么**原始类型 `List` 能编译过**(运行时它俩本就是一个类型);② 为什么 `list instanceof List<Coffee>` 不允许(运行时没有 `<Coffee>` 可判);③ 为什么不能 `new T[]`(运行时不知道 T 是啥)。附带机制:重写泛型方法时编译器还会自动生成**桥接方法**保证多态正确。

> **⏳ 版本时光机 · 尖括号这一路怎么来的**

| JDK 版本 | 写法 | 关键变化 |
|---|---|---|
| Java 1.4 及以前 | `List list = new ArrayList(); Coffee c = (Coffee) list.get(0);` | 无泛型,全靠手动强转,类型错误一律拖到运行时 |
| Java 5 | `List<Coffee> list = new ArrayList<Coffee>();` | 引入泛型,类型检查提前到编译期(用擦除实现,兼容老代码) |
| Java 7 | `List<Coffee> list = new ArrayList<>();` | 菱形运算符 `<>`,右边类型可省略,少打一遍 |
| Java 10+ | `var list = new ArrayList<Coffee>();` | `var` 推断,左边也省;主线默认这么写 |

一句演进小结:从「满屏强转、运行时暴雷」到「编译期把关、一个 `<>` 搞定」——泛型把类型错误从最贵的运行时,拉回到最便宜的编译期。

---

## 六、故意制造一个 Bug:用原始类型

去掉泛型,往「咖啡箱」里塞进一个字符串:

```java
Box raw = new Box();            // ← 故意:原始类型,丢失类型信息
raw.put("我不是咖啡");           // 编译只给一条 unchecked 警告,不拦
Coffee c = (Coffee) raw.get();  // 取出时强转
System.out.println(c.name());
```

---

## 七、读懂真实报错

```text
Exception in thread "main" java.lang.ClassCastException:
        class java.lang.String cannot be cast to class Coffee
        at Warehouse.main(Warehouse.java:12)
```

`ClassCastException` —— 原始类型让编译官睁一只眼闭一只眼(只给一条 `unchecked` 警告),错误一路拖到**运行时**强转那一刻才爆。而这个强转,平时你用 `Box<Coffee>` 时是**编译器偷偷替你插的**(类型擦除的一部分);现在类型信息丢了,插进去的强转就成了定时炸弹。用 `Box<Coffee>`,那行 `put("...")` 在**编译期**就通不过——**这正是泛型的价值:把错误提前**。

> **豆豆锐评**:看到 IDE 里那条黄色的 `unchecked` 警告别无视,它就是原始类型在向你招手。「能编译过」不等于「安全」——编译官只是碍于向后兼容不得不放行老式写法,不代表它认可。

---

## 八、修复,并用测试证明

始终带上泛型参数,让编译官全程把关:

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class WarehouseTest {
    @Test
    void generic_box_is_type_safe() {
        Box<Coffee> box = new Box<>();
        box.put(new Coffee("拿铁", 18.0, 10));
        assertEquals("拿铁", box.get().name());   // 取出即 Coffee,不用强转
        // box.put("字符串");  // 这行若取消注释,编译期直接报错 —— 错误被挡在门外
    }
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v1.11

```text
咖啡站形态:容器类型安全,取值不再强转
已具备  :理解并用好泛型,弄懂类型擦除为何让原始类型能编译却不安全
还差临门一脚:把对象 + 集合 + 接口 + 泛型,整合成一套面向对象版咖啡站 —— 下一话第二季大结局
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 泛型 / 编译期类型安全 | 集合、框架的地基;几乎所有 Java 岗默认要求 |
| **类型擦除** | 面试必问,能说清「原始类型为何能编译」直接拉开层次 |
| 原始类型的风险 / unchecked 警告 | 代码审查里的常见告警 |

---

## 十一、下一话悬念

对象、封装、继承、多态、接口、集合、泛型——第二季的武器,全齐了。阿零摩拳擦掌,豆豆却把他领回了第一季那台缠满电线的老咖啡机前。

> 下一话《面向对象版咖啡站》**第二季大结局**:把第一季那台「数组 + 静态方法」硬撑的咖啡机,重构成一套干净的对象模型 v2——`Coffee` 值对象、`Menu` 索引、`PaymentMethod` 接口、订单集合各司其职。阿零还会回头看自己第一季写的 v1 代码,连他自己都嫌乱。

---

## 🎯 随堂练习
先自己做，再对答案。选择难度递进，解答从概念到综合，代码含边界验证。

### 一、选择题（10 道）

1. [基础] 泛型的主要作用是什么？- A) 提高运行速度　B) 编译期的类型安全检查，避免强转 + 把类型错误提前到编译期　C) 美化代码　D) 代替继承
2. [基础] `List<Coffee>` 中的 `<>` 是什么意思？- A) 运算符　B) 类型参数——指定 List 只能装 Coffee　C) 注释　D) 语法装饰
3. [基础] 泛型在编译后还存在吗？- A) 完整保留　B) 被擦除（类型擦除），运行时 `<T>` 被替换为上限类型　C) 部分保留　D) 变成字符串
4. [进阶] 类型擦除后，`List<String>` 和 `List<Integer>` 运行时是什么关系？- A) 不同的类　B) 同一个 `ArrayList` 类　C) 一个能编译一个不能　D) 无关系
5. [进阶] 下列哪项**不能**使用泛型？- A) `new T()`　B) `List<T>`　C) `<T> void method(T t)`　D) `class Box<T>`
6. [进阶] `List<Coffee>` 能不能赋给 `List<Drink>`（Drink 是 Coffee 的父类）？- A) 能　B) 不能——泛型是不型变的（invariant）　C) 能但需要强转　D) 反过来能
7. [进阶] 原始类型 `List`（不加 `<>`）与 `List<Object>` 的区别是什么？- A) 完全相同　B) 原始类型绕过泛型检查，可以往里面放任意类型而不报编译错误　C) `List<Object>` 更危险　D) 不能混用
8. [综合] `List<? extends Number>` 意味着什么？- A) 只能放 Number　B) 可以接收 `List<Integer>`、`List<Double>` 等，但**只能读不能写**（除 null）　C) 只能读 String　D) 无限制
9. [综合] `List<? super Integer>` 意味着什么？- A) 只能存 Integer　B) 可以接收 `List<Integer>`、`List<Number>`、`List<Object>`，能写入 Integer 但读出是 Object　C) 不能写　D) 等同于 `List<Integer>`
10. [综合] PECS 口诀是什么？- A) Producer Extends, Consumer Super　B) Producer Super, Consumer Extends　C) 没有口诀　D) Provider External, Consumer Static

> [!答案] **1-B**　泛型 = 编译期类型约束——把 `ClassCastException` 从运行时提到编译时，且省去手写强转。**2-B**　`<>` 内写类型参数，告诉编译器"这个容器只装这种货"。**3-B**　类型擦除：编译后 `<T>` 替换为 `Object`（或上限类型），运行时无泛型信息。**4-B**　两者在运行时是同一个 `ArrayList.class`——JVM 看不见 `<String>` 和 `<Integer>`。**5-A**　`new T()` 不合法——因为运行时 T 已被擦除为 Object，JVM 不知道要 new 什么具体类型。**6-B**　泛型不型变：`List<Coffee>` 不是 `List<Drink>` 的子类型——如果允许，就可能往 `List<Drink>` 里塞 Tea 而实际是 List<Coffee>，破坏类型安全。**7-B**　原始类型关闭泛型检查，可以 `add(任意类型)` 不出编译错误——只在运行时可能炸。`List<Object>` 则有编译检查。**8-B**　`? extends` = 生产者（Producer），可以从集合读取但不能安全写入——因为不知道具体的子类型。**9-B**　`? super` = 消费者（Consumer），可以写入 Integer 及子类但取出来只有 Object——因为不知道"超类"具体是哪个。**10-A**　PECS = Producer Extends（? extends 用于读），Consumer Super（? super 用于写）。
**举一反三**：第 5、6、8、9、10 五题连起来是泛型面试完整闭环——"为什么不能 new T → 类型擦除 → 为什么 List<A> 不能赋给 List<B> → 不型变 → 通配符怎么解锁 → PECS"。能流畅讲完这套的，泛型就过关了。

### 二、解答题（3 道）

1. [概念] Java 泛型是"真泛型"还是"语法糖"？和其他语言（如 C# 的泛型）相比，Java 的类型擦除有什么优缺点？
2. [场景] 咖啡站有一个 `Warehouse<T>` 通用仓库类，既能装 `Coffee`（通过 `Warehouse<Coffee>`），也能装 `Member`。请设计这个泛型类，并说明如果用户写 `Warehouse raw = new Warehouse(); raw.store("字符串");` 会发生什么——编译器会报警吗？运行时安全吗？
3. [综合] 有一段方法签名：`void copy(List<? extends Coffee> src, List<? super Coffee> dest)`。解释这段签名是什么意思、为什么 src 用 `extends` 而 dest 用 `super`、能传入什么类型的参数。把这个方法泛型化（用 `<T>` 改写）得到等效签名。

> [!答案] **1**　Java 泛型是**编译期语法糖 + 运行时擦除**——不是"真泛型"（reified generics）。优点：①向后兼容（旧代码的原始类型能和新泛型代码共存）；②没有运行时泛型开销。缺点：①不能 `new T()`/`instanceof List<T>`——运行时类型信息丢失；②基础类型不能用（`List<int>` 不行，必须 `List<Integer>` 装箱）；③通过反射可以绕过泛型检查插入不匹配的元素（heap pollution）。C# 的泛型是运行时保留的（reified），可以 `new T()`、支持基础类型，但代价是增加了运行时元数据开销。**举一反三**：`List<String>.class` 不存在——只有 `List.class`，这是类型擦除最直观的表现。**2**　
> ```java
> class Warehouse<T> {
>     private T item;
>     void store(T item) { this.item = item; }
>     T retrieve() { return item; }
> }
> // 正确用法:
> Warehouse<Coffee> w1 = new Warehouse<>();
> w1.store(new Coffee("美式", 15.0, 10));  // ✓
> Coffee c = w1.retrieve();                 // ✓ 不需要强转
> // 原始类型:
> Warehouse raw = new Warehouse();
> raw.store("字符串");  // 编译器只会给一个 unchecked warning，不阻塞
> Coffee c2 = (Coffee) raw.retrieve();  // 运行时 ClassCastException!
> ```
> 原始类型绕过了所有泛型检查——编译器只给黄色 warning，但运行时该炸还是会炸。这就是类型擦除的代价——泛型安全只存在于编译期。**举一反三**：生产项目应该开启 `-Xlint:unchecked` 把警告当错误处理。**3**　`<? extends Coffee>` → src 是生产者，能传入 `List<Coffee>` 或 `List<PremiumCoffee>`，只能从中读元素（类型为 Coffee）。`<? super Coffee>` → dest 是消费者，能传入 `List<Coffee>` 或 `List<Drink>` 或 `List<Object>`，能往里写入 Coffee。泛型化改写：
> ```java
> <T> void copy(List<? extends T> src, List<? super T> dest) {
>     for (T item : src) dest.add(item);
> }
> ```
> **举一反三**：调用时 Java 自动推断 T——`copy(listOfPremiums, listOfDrinks)` 自动算出 T=Coffee。这就是 PECS 在标准库（`Collections.copy`）中的经典应用。

### 三、代码题（2 道）

1. [基础] 写一个泛型方法 `swap(T[] arr, int i, int j)` 交换数组两个位置的元素。分别用 `String[]` 和 `Integer[]` 验证，并要求传入不同类型时不需要重载方法。
2. [综合] 设计泛型类 `Pair<A, B>`：字段 `A first; B second`，提供 getter/setter。写一个静态泛型方法 `swap` 把 `Pair` 的 first 和 second 交换（注意：first 和 second 类型不同，交换后变成 `Pair<B, A>`，需要返回新对象）。测试：`Pair<String, Integer>` 交换后变成 `Pair<Integer, String>`，验证类型安全。

> [!答案] **1 验收**：
> ```java
> public static <T> void swap(T[] arr, int i, int j) {
>     T tmp = arr[i];
>     arr[i] = arr[j];
>     arr[j] = tmp;
> }
> // 验证:
> String[] s = {"美式", "拿铁"};
> swap(s, 0, 1);
> System.out.println(Arrays.toString(s));  // [拿铁, 美式]
> Integer[] n = {1, 2, 3};
> swap(n, 0, 2);
> System.out.println(Arrays.toString(n));  // [3, 2, 1]
> // swap(n, 0, "hi"); 编译错误——T 在调用时被推断为 Integer，不能传 String
> ```
> **举一反三**：`<T>` 放在返回类型之前声明 Type Parameter——这是泛型方法的语法标志。编译后该方法只有一个版本（T 擦除为 Object），但编译期保证了类型安全。**2 验收**：
> ```java
> class Pair<A, B> {
>     private A first;
>     private B second;
>     Pair(A first, B second) { this.first = first; this.second = second; }
>     public A getFirst() { return first; }
>     public B getSecond() { return second; }
>     @Override public String toString() { return "(" + first + ", " + second + ")"; }
> 
>     static <A, B> Pair<B, A> swap(Pair<A, B> p) {
>         return new Pair<>(p.second, p.first);
>     }
> }
> // 测试:
> Pair<String, Integer> coffee = new Pair<>("美式", 15);
> System.out.println(coffee);                          // (美式, 15)
> Pair<Integer, String> swapped = Pair.swap(coffee);
> System.out.println(swapped);                         // (15, 美式)
> System.out.println(swapped.getFirst().getClass());   // class java.lang.Integer
> System.out.println(swapped.getSecond().getClass());  // class java.lang.String
> 
> // 类型安全验证:
> // Integer price = coffee.getSecond(); → 编译期告警（需要从 Object 强转）——但这行不会错，类型是对的
> // 如果用原始类型: Pair raw = coffee; raw.second = "not a number"; → 编译器 warning, runtime 可能炸
> ```
> **举一反三**：`swap` 方法返回类型是 `Pair<B, A>`——类型参数的位置交换了。这是泛型"类型级计算"的一个简单示例——编译器全程跟踪类型变化，保证你不会误把 Integer 当 String 用。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 `/java`。*
