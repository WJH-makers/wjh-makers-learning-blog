---
title: "《从零开始学 Java》80 · 反射:程序照镜子"
date: 2026-07-21
summary: "并发考试通关,技术债账本翻到最后一页《引擎室》。下舱先领钥匙:反射——程序在运行时照镜子,看见自己的类、方法、字段,还能撬开 private 的门。JUnit、Jackson、Spring 的魔法,全从这面镜子开始。"
tags: [Java, Java漫画, 反射, Class对象, 番外, 阿零与豆豆]
---

![Java漫画：s10e01-reflection](/comics/java/s10e01-reflection.png)

# 《从零开始学 Java》80 · 反射:程序照镜子

> 连载特刊 · 番外卷三「引擎室」第 1 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——并发考试通关当晚,阿零盯着 synchronized 发呆:"锁、GC、Spring 的魔法,引擎室里到底长什么样?"豆豆翻开技术债账本最后一页。

---

## 一、需求:引擎室的钥匙

账本最后一页——**第三页·引擎室**:原理债,JVM/数据库/Spring 的底舱。

豆豆:「下舱先领钥匙。JUnit 质检员怎么认出 `@Test`?Jackson 怎么知道 JSON 塞进哪个字段?Spring 管家怎么凭类名造 Bean?靠的都是**反射**——程序在运行时照镜子,看见并操作自己的类、方法、字段。」

阿零:「程序还能看见自己?」豆豆:「走,类加载站档案馆。」

---

## 二、漫画 · 档案馆里的镜子

> **〔1〕** 「引擎室」铁门开启,第一站类加载站档案馆:JVM 城主拉开一整墙档案柜——每类一张档案卡,列着全部方法、字段、构造器。
> JVM 城主:「类装进来时,我顺手建一张**档案卡——`Class` 对象**。一个类,全 JVM 只此一张。」

> **〔2〕** 阿零拿着写有「applyDiscount」的条子到**公开名录**窗口(getMethod)查询,档案员翻遍名录把条子退回:查无此人。
> 阿零:「不可能!这方法我天天在用!」

> **〔3〕** 换**全量名录**窗口(getDeclaredMethod),查到了——档案卡刚递出,门卫「哐」地拦下:**private,谢绝外借**。阿零抱头蹲下。
> 门卫:「invoke 之前要过访问检查。」

> **〔4〕** 豆豆晃着「setAccessible 特批条」;远处 JUnit 质检员抱着一摞档案卡,边走边圈出带 @Test 的方法。
> 豆豆(叼着豆子叉腰):「特批条只关这一次检查——JUnit、Jackson、Spring 全是常客。但这是框架的特权,不是你写业务的日常。」

---

## 三、本话目标

- 掌握拿到 `Class` 对象的三种方式,理解「一个类只有一份 Class」;
- 分清 `getMethods` 与 `getDeclaredMethods`,会用 `invoke` 调方法、`Field` 读写字段;
- 用 `getDeclaredConstructor().newInstance()` 凭档案造对象;
- 讲清反射为什么慢、框架为什么仍离不开;
- 踩一次「反射取私有方法」的两连坑并修好。

---

## 四、原理图:类加载站的档案馆

```text
拿档案卡三法(类加载站装载 .class 时顺手建卡,每类仅一份):
  OrderService.class               编译期已知,最安全(不触发类初始化)
  svc.getClass()                   手里已有实例
  Class.forName("OrderService")    只有字符串——配置驱动,框架最爱

查档案两本名录:
  getMethods()          公开名录:public,含继承
  getDeclaredMethods()  全量名录:本类全部,含 private,不含继承
```

> **豆豆旁白**:`getXxx` = 公开的 + 继承的;`getDeclaredXxx` = 本类全部(含私有)——方法/字段/构造器通用,一句顶六个 API。老的 `Class.newInstance()` 已弃用(受检异常会原样漏出),用上面的写法。

---

## 五、从上一话继续:给 OrderService 配一面镜子

上一话(#79)刚把 `OrderService` 修好,本话一行不改,只「照」它(计价沿用 #60 的 `record Coffee(String name, BigDecimal price, int stock)`):

```java
import java.math.BigDecimal;
import java.math.RoundingMode;

public class OrderService {
    private BigDecimal memberRate = new BigDecimal("0.88");   // 会员 88 折

    public BigDecimal quote(Coffee coffee, boolean member) {
        return member ? applyDiscount(coffee.price()) : coffee.price();
    }

    private BigDecimal applyDiscount(BigDecimal price) {
        return price.multiply(memberRate).setScale(2, RoundingMode.HALF_UP);
    }
}
```

照镜子四连:

```java
// Mirror.java —— JEP 512 紧凑源文件(Java 25),隐式导入 java.base
void main() throws Exception {
    // ① 三种方式,拿到同一张档案卡
    Class<OrderService> c1 = OrderService.class;
    Class<?> c2 = new OrderService().getClass();
    Class<?> c3 = Class.forName("OrderService");
    IO.println(c1 == c2 && c2 == c3);        // true

    // ② 全量名录:私有方法也在列
    for (var m : c1.getDeclaredMethods())
        IO.println(m.getName());             // quote、applyDiscount

    // ③ 不写 new,凭档案造对象
    OrderService svc = c1.getDeclaredConstructor().newInstance();

    // ④ Field 读写:私有折扣率改成对折
    var f = c1.getDeclaredField("memberRate");
    f.setAccessible(true);
    f.set(svc, new BigDecimal("0.50"));
    IO.println(f.get(svc));                  // 0.50
}
```

---

## 六、故意制造一个 Bug:隔空调私有方法

阿零想直接验证折扣算法,拿公开名录去查私有方法:

```java
var m = OrderService.class.getMethod("applyDiscount", BigDecimal.class);   // ← 坑一
IO.println(m.invoke(svc, new BigDecimal("18.00")));
```

---

## 七、读懂真实报错(两连)

```text
Exception in thread "main" java.lang.NoSuchMethodException:
        OrderService.applyDiscount(java.math.BigDecimal)
        at Mirror.main(Mirror.java:9)
```

`getMethod` 只翻**公开名录**,私有方法查无此人。改用 `getDeclaredMethod`,找到了——`invoke` 时又撞第二堵墙:

```text
Exception in thread "main" java.lang.IllegalAccessException:
        class Mirror cannot access a member of class OrderService with modifiers "private"
        at java.base/java.lang.reflect.Method.invoke(Method.java:571)
        at Mirror.main(Mirror.java:11)
```

**找得到 ≠ 调得动**:`invoke` 前有访问检查,`private` 直接拦下。

> **🎯 面试直击**:反射为什么慢?为什么框架还大量用?
> 慢在三处:每次调用要**校验**访问与参数;参数装进 `Object[]`,基本类型要**装箱**;对 JIT 是黑盒,**无法内联**。框架只在**启动期**扫描一次并缓存 `Method`,热路径不走反射,成本一次付清。追问点:热路径动态调用可换 `MethodHandle` 或生成字节码。

---

## 八、修复,并用测试证明

给门卫递特批条——`setAccessible(true)` 关掉**这一处**的访问检查:

```java
var m = OrderService.class.getDeclaredMethod("applyDiscount", BigDecimal.class);
m.setAccessible(true);                              // 特批:跳过访问检查
IO.println(m.invoke(svc, new BigDecimal("18.00"))); // 15.84
```

模块化时代的边界:目标类在**未 `opens` 的模块**里,`setAccessible` 直接抛 `InaccessibleObjectException`——框架要求 `--add-opens` 的原因在此。

```java
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.assertEquals;

class ReflectionTest {
    @Test
    void private_discount_reachable_via_reflection() throws Exception {
        var svc = OrderService.class.getDeclaredConstructor().newInstance();
        var m = OrderService.class.getDeclaredMethod("applyDiscount", BigDecimal.class);
        m.setAccessible(true);
        var price = (BigDecimal) m.invoke(svc, new BigDecimal("18.00"));
        assertEquals(0, price.compareTo(new BigDecimal("15.84")));   // 判等用 compareTo(回看 #60)
    }
}
```

> **豆豆锐评**:**反射是框架的特权,业务代码少用。**它绕过编译期检查——方法改名,编译官 Javac 一声不吭,线上直接 `NoSuchMethodException`;`setAccessible` 更是拆封装的墙。业务里想用,多半是设计出了问题。

---

## 九、项目检查点 · 豆豆咖啡站 v10.1

```text
咖啡站形态:代码没动一行,升级的是工程师——能在运行时「看见」任何类的内部
已具备  :Class 三种获取;两本名录;invoke 私有方法;Field 改写;反射慢在校验/装箱/不可内联
还没有  :只会「看」,不会「认标签办事」——@Test 那样的标签怎么造、程序怎么认
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 反射 API(Class/Method/Field/Constructor) | 读框架源码的入场券;「Spring 怎么造 Bean」的地基 |
| 反射性能与取舍 | 「反射为什么慢」高频八股;答出「启动期扫描 + 缓存」是加分项 |
| setAccessible 与封装边界 | 排查 `InaccessibleObjectException` / `--add-opens` 报错的底气 |

---

## 十一、下一话悬念

阿零把玩着钥匙:程序能在运行时**看见**方法了。豆豆:「再进一步——给方法贴张『会员打折』的标签,让程序自己**认标签办事**呢?」

> 下一话《注解与动态代理:手写迷你 AOP》:自定义注解 + 动态代理,几十行代码手拆 Spring 管家的魔法底牌。

---

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,中间3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. 获取 `Class` 对象有三种方式,以下哪种**不会**触发类的初始化?
   - A) `Class.forName("OrderService")`
   - B) `OrderService.class`
   - C) `new OrderService().getClass()`
   - D) `ClassLoader.loadClass("OrderService")`

2. `getMethods()` 和 `getDeclaredMethods()` 的区别,描述正确的是?
   - A) `getMethods()` 返回本类的全部方法(含 private)
   - B) `getDeclaredMethods()` 返回 public 方法及其从父类继承的方法
   - C) `getMethods()` 返回 public 方法(含继承),`getDeclaredMethods()` 返回本类全部方法(含 private、不含继承)
   - D) 两者返回的结果完全相同,仅命名不同

3. `setAccessible(true)` 的作用是?
   - A) 将 private 字段永久改为 public
   - B) 跳过**该处**的访问检查,允许反射调用私有成员
   - C) 修改字节码,消除 final 修饰符
   - D) 关闭整个 JVM 的安全管理器

4. 以下代码中,`m.invoke(svc, new BigDecimal("18.00"))` 返回的结果最接近?
```java
var m = OrderService.class.getDeclaredMethod("applyDiscount", BigDecimal.class);
m.setAccessible(true);
var svc = OrderService.class.getDeclaredConstructor().newInstance();
```

- A) 18.00(原价未折)
- B) 15.84(88折后)
- C) 0.50(取 memberRate 的值)
- D) 抛出 `NoSuchMethodException`

5. 用反射调用方法时,参数需封装到 `Object[]` 中。对于 `int` 类型的参数,会发生什么?
   - A) 直接传入,无额外开销
   - B) 自动装箱为 `Integer`,再放进 `Object[]`
   - C) 编译错误,反射不支持基本类型
   - D) JIT 自动内联,消除装箱开销

6. 以下关于反射性能慢的描述,**哪个是错误**的?
   - A) 每次调用需校验访问权限与参数匹配
   - B) 基本类型参数需装箱,产生对象分配
   - C) 反射调用对 JIT 是黑盒,无法内联
   - D) 反射调用比直接调用慢,但每次都慢 1000 倍以上

7. 某框架需要在模块化应用中通过反射访问一个未 `opens` 的模块中的私有方法,运行时会抛出?
   - A) `ClassNotFoundException`
   - B) `NoSuchMethodException`
   - C) `InaccessibleObjectException`
   - D) `IllegalArgumentException`

8. 阿零用反射获取了 `OrderService.class` 的 `memberRate` 字段,然后执行 `f.set(svc, new BigDecimal("0.50"))`。第二次获取同一个 Class 对象上的同一个 Field 再 `get(svc)`,结果是?
   - A) 0.88(原始值,反射修改不持久)
   - B) 0.50(被修改后的值)
   - C) null(反射修改仅在当前方法有效)
   - D) 抛出 `IllegalAccessException`

9. 以下场景中,**不适合**使用反射的是?
   - A) JUnit 在启动时扫描带 `@Test` 的方法
   - B) Jackson 将 JSON 字段映射到 POJO 属性
   - C) 电商下单服务在每次请求时用反射调用扣库存方法
   - D) Spring 在容器启动时根据 `@Component` 扫描并实例化 Bean

10. 已知框架在启动时用反射扫描注解并缓存 `Method` 对象。以下关于这种设计模式的描述,最准确的是?
   - A) 因为缓存了 `Method`,反射零开销,后续调用与直接调用一致
   - B) 缓存避免了每次重新查找,但 `invoke` 本身的校验/装箱/不可内联开销仍在
   - C) 缓存后 JIT 可以跨反射调用做内联
   - D) 缓存 `Method` 等价于把反射转成了 `MethodHandle`,性能完全一致

### 解答题(5 道)

**Q1(概念)** 简述获取 `Class` 对象的三种方式及其适用场景,特别说明哪种方式不会触发类的初始化。

**Q2(解释)** 为什么 `getMethod("applyDiscount", BigDecimal.class)` 会抛出 `NoSuchMethodException`,而 `getDeclaredMethod` 能找到?找到后为什么 `invoke` 又抛出 `IllegalAccessException`?

**Q3(场景)** 某项目需要从配置文件读取类名并动态创建实例。请写出核心代码,并说明相比 `new` 的优势与风险。

**Q4(分析)** 本话提到反射慢的三大原因(校验/装箱/不可内联)。请分析:为什么框架(如 Spring)仍然大量使用反射,却不会因此成为性能瓶颈?

**Q5(设计)** 你需要设计一个简单的依赖注入容器:扫描指定包下的 `@Component` 类,找到带 `@Autowired` 的字段并注入。请用反射写出核心流程(伪代码或关键代码均可),并说明对循环依赖你会如何处理。

> [!答案]
> **选择题**
> 1-B。`OrderService.class` 不触发初始化;`Class.forName` 会触发;`getClass()` 触发(对象已存在);`loadClass` 不触发但非三种方式之一。★举一反三:编译期常量引用也不触发初始化,锁的是「主动引用」五个字。
>
> 2-C。`getXxx` = 公开 + 继承;`getDeclaredXxx` = 本类全部(含私有)。★举一反三:这个命名规律对 Method、Field、Constructor 三者统一。
>
> 3-B。`setAccessible` 只关**这一处**的访问检查,不改变字段本身修饰符。★举一反三:模块化时代,目标类在未 `opens` 的模块中时 `setAccessible` 直接抛异常。
>
> 4-B。`applyDiscount` 是私有方法,逻辑为 `price * memberRate`(0.88),18×0.88=15.84。★举一反三:setAccessible 只跳过访问检查,不改变方法本身的逻辑。
>
> 5-B。反射 `invoke` 的参数统一为 `Object[]`,基本类型必然装箱。★举一反三:这是反射慢的三原因之一——装拆箱产生 GC 压力。
>
> 6-D。「每次都慢 1000 倍」是未经预热的冷数据;稳态下差距远没有那么大,但不可内联的根本限制仍在。★举一反三:用 JMH 测微基准,别信单次秒表的假结论(下一话 #83 详细讲)。
>
> 7-C。Java 9+ 模块化下,未 `opens` 的包拒绝 `setAccessible`,抛 `InaccessibleObjectException`。★举一反三:框架通过 `--add-opens` 启动参数获得访问权,这是排查反射报错的必经之路。
>
> 8-B。Field 对象是同一个,`set` 修改的是**实例**的字段值,`get` 自然读到修改后的值。★举一反三:反射修改的是堆中对象的真实字段,不是临时拷贝。
>
> 9-C。反射应在**启动初始化阶段**一次性使用(如扫描注解、注入依赖),不应放在热路径上。★举一反三:Spring 在容器启动时完成所有反射工作,运行时 Bean 的调用是直接的。
>
> 10-B。缓存 `Method` 解决了查找开销,但 `invoke` 依然要过校验/装箱/不可内联三道坎。★举一反三:热路径需要更高性能的动态调用,可换 `MethodHandle` 或直接生成字节码(LambdaMetafactory)。
>
> **解答题**
>
> **Q1** 三种方式:① `类名.class`——编译期已知,最安全,不触发初始化,适合硬编码场景;② `对象.getClass()`——已有实例时使用,会触发初始化(因为对象已存在);③ `Class.forName("全限定名")`——只有字符串时使用(如读取配置文件),会触发初始化,框架最爱。★举一反三:理解「不触发初始化」对于排查类的初始化时机非常重要,尤其是静态块中有副作用的场景。
>
> **Q2** `getMethod` 只查**公开名录**(public 方法,含继承),`applyDiscount` 是 private,所以抛 `NoSuchMethodException`。`getDeclaredMethod` 查**全量名录**(本类所有方法含 private),找到了。但 `invoke` 之前会做访问检查,private 方法被拦下,抛 `IllegalAccessException`。★举一反三:找到 ≠ 能调用——这是两重检查:名录查找(方法存不存在)和访问控制(让不让调)。
>
> **Q3** 核心代码:`Class<?> clz = Class.forName(config.getClassName()); Object obj = clz.getDeclaredConstructor().newInstance();`。优势:松耦合,换实现只需改配置文件;风险:编译期类型检查失效,类名写错/构造器不匹配运行时才暴露,且绕过了封装。★举一反三:这就是 Spring 的 `@Component` 扫描和 Bean 实例化的底层机制。
>
> **Q4** 框架使用反射的策略是「**启动期一次性投入,运行期零成本**」:①只在容器启动时扫描注解、解析依赖、实例化 Bean,此时性能容忍度高;②扫描结果(如 Method、BeanDefinition)被缓存,运行时调用 Bean 的方法是**直接调用**而非反射;③反射只在控制反转(IoC)和依赖注入的初始化阶段干活,热路径不碰反射。★举一反三:Spring 的 AOP 代理虽然用到了反射思想,但运行时替身(`$Proxy`/CGLIB)的方法调用是直接调用,不是每次 invoke 都走反射。
>
> **Q5** 核心流程:①获取包路径下所有类→②过滤带 `@Component` 的→③每个类 `clz.getDeclaredConstructor().newInstance()` 实例化→④遍历 `clz.getDeclaredFields()`,找带 `@Autowired` 的→⑤`field.setAccessible(true); field.set(instance, container.getBean(field.getType()))`。循环依赖处理:setter 注入可以用「二级缓存」——先把半成品(实例化但未填充)放进早期缓存,当 B 需要 A 时从缓存中取半成品,B 填充完,A 再补填。构造器注入的循环依赖无解,需要拆类或 `@Lazy`。★举一反三:这就是 Spring IoC 容器的雏形——三级缓存储半成品、`ObjectFactory` 延迟创建代理,都是这个思路的工业化实现。
>
> ---

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*
