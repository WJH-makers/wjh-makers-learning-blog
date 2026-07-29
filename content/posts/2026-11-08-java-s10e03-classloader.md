---
title: "《从零开始学 Java》82 · 类加载与双亲委派"
date: 2026-11-08
summary: "阿零想给 String 加个 brewLatte,货箱刚进类加载站就被 Bootstrap 原路退回——双亲委派第一课。更凶的:静态块深夜炸过一次,那个类只回一句 NoClassDefFoundError,阿零却满世界找根本没丢的 jar。"
tags: [Java, Java漫画, JVM, 类加载, 双亲委派, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》82 · 类加载与双亲委派

> 连载特刊 · 番外卷三「引擎室」第 3 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——魔法拆穿了一半;可这些类本身是怎么被「装进」JVM 的?装货入口,在类加载站。

---

## 一、需求:阿零想「优化」String

手写完迷你 AOP,阿零膨胀了:「反射我都会了,下一步给 `java.lang.String` 加个 `brewLatte()`,让字符串自己会做拿铁!」

豆豆切换面试官脸:「先答一题:一个 `.class` 文件,从磁盘到能被你 `new`,中间发生了什么?」

阿零:「……双击运行?」露馅了。今天下到引擎室最底层——**类加载站**。

---

## 二、漫画 · 类加载站的五道闸门

> **〔1〕** 引擎室最底层,「类加载站」霓虹灯牌下,传送带上的 `.class` 货箱排队过五道闸门:加载 → 验证 → 准备 → 解析 → 初始化。
> JVM 城主:「欢迎下舱。你写的每个类,都是先过完这五关,才有资格被 `new`。」

> **〔2〕** 调度塔特写:Application 窗口收到装货单却不动手,先上递 Platform,再上递顶层 Bootstrap;Bootstrap 摇头,单子才层层退回,Application 这才开工。
> 豆豆:「规矩叫**双亲委派**——先问上头,上头都不管,才轮到你亲自装。」

> **〔3〕** 阿零抱着自制货箱冲到窗口,箱上大字:`java.lang.String(阿零优化版,新增 brewLatte)`。单子照例上递,Bootstrap 亮出正版:「这名字,本库有货。假货原路退回。」
> 阿零:「我排了半天队,连柜台都没摸到?!」

> **〔4〕** 深夜,初始化闸门「轰」的一声——`DiscountConfig` 货箱的静态块炸了。城主面无表情盖章:**报废(Erroneous)**。角落的「重试机器人」把爆炸声吞进了日志肚子。

> **〔5〕** 白天,阿零来取 `DiscountConfig`,窗口甩出一张 `NoClassDefFoundError`。阿零掉头冲向 jar 山:「肯定是依赖丢了!」
> 豆豆(叼着豆子叉腰):「找什么 jar?它不是没来,是昨晚炸过。**报废的箱子,不会再给你装第二次。**」

---

## 三、本话目标

- 走完类加载五阶段,记牢「准备阶段静态变量先给零值」;
- 认全三层加载器(Bootstrap/Platform/Application)与双亲委派的「向上问一圈」;
- 说清打破双亲委派的三个正当理由:SPI、Tomcat 隔离、热部署;
- 分清 `ClassNotFoundException` 与 `NoClassDefFoundError`;
- 修一次「静态块炸过,全世界以为 jar 丢了」的事故。

---

## 四、原理图:五道闸门与三层调度塔

```text
类加载站流水线(五阶段):
  加载    读入字节流,生成 Class 对象
  验证    查魔数 CAFEBABE、版本号、字节码合法性——拦住毒货箱
  准备    给静态变量分配内存并赋零值:int→0,引用→null
          (static int x = 8 此刻还是 0;编译期常量例外,直接赋终值)
  解析    符号引用 → 直接引用(把"名字"换成真实门牌号)
  初始化  执行 <clinit>:静态赋值 + 静态块按书写顺序跑,全 JVM 只跑一次

三层加载器(JDK 9+):
  Bootstrap    JVM 自带,装 java.base 等核心模块;getClassLoader() 返回 null
  Platform     装平台模块(JDK 9 起顶替旧的扩展加载器)
  Application  装类路径上的应用类——咖啡站的类都从这儿进站

双亲委派:请求先递父加载器,一路问到 Bootstrap;上头都不管,才自己动手。
  理由一:防篡改——伪造的 java.lang.String 永远到不了柜台;
  理由二:防重复——一个类只装一次,全 JVM 认同一个 Class。
```

初始化只认**主动引用**:`new`、读写静态变量(编译期常量除外)、调静态方法、`Class.forName`、初始化子类先初始化父类、`main` 所在类。

而打破双亲委派的,都有正经理由:

| 打破者 | 怎么打破 | 为什么必须 |
|---|---|---|
| SPI(JDBC) | `DriverManager` 在 java.base(Bootstrap 装的),却用**线程上下文类加载器**装类路径上的数据库驱动 | 父加载器要用子加载器的货——「向下借梯子」 |
| Tomcat | 每个 webapp 一个加载器,**先自己后父**(核心类除外) | 各应用各带同名依赖的不同版本,互不串味 |
| 热部署 | 类一改,换个**全新加载器**重装;旧类随旧加载器一起被回收 | 不重启 JVM 也能换类 |

> **豆豆锐评**:类的身份证 = **加载器 + 全限定名**。两个加载器各装一份同名类,`instanceof` 互不相认,强转直接 `ClassCastException`——Tomcat 跨应用传对象翻车,多半栽在这。

---

## 五、代码:摸一遍调度塔

上一话 `Proxy.newProxyInstance` 造出的 `$Proxy0`,也是过了这条流水线才活的。今天直接摸塔:

```java
public class LoaderTour {
    public static void main(String[] args) {
        ClassLoader app = LoaderTour.class.getClassLoader();
        System.out.println(app);                            // 应用层
        System.out.println(app.getParent());                // 平台层
        System.out.println(app.getParent().getParent());    // null:Bootstrap 在 JVM 内部,没有 Java 对象
        System.out.println(String.class.getClassLoader());  // null:核心类归 Bootstrap
    }
}
```

```text
jdk.internal.loader.ClassLoaders$AppClassLoader@4e0e2f2a
jdk.internal.loader.ClassLoaders$PlatformClassLoader@2f92e0f4
null
null
```

再验证初始化时机——静态块只认主动引用:

```java
class Roaster {
    static { System.out.println("Roaster 初始化了"); }
    static final String BRAND = "豆豆咖啡站";   // 编译期常量
    static String slogan = "深烘不加糖";
}
// main 里:
System.out.println(Roaster.BRAND);    // 常量编译期已折进调用方,不触发初始化
System.out.println(Roaster.slogan);   // 主动引用:先打印「Roaster 初始化了」
```

---

## 六、故意制造 Bug:假 String 与炸过的静态块

**第一幕**:阿零把「优化版」`java/lang/String.java` 塞进类路径,验货:

```java
Class<?> c = Class.forName("java.lang.String");
System.out.println(c.getClassLoader());   // null——Bootstrap 的正版
c.getMethod("brewLatte");                 // 阿零加的新方法呢?
```

**第二幕(真 Bug)**:大扫除把 `discount.conf` 挪走了,而折扣表在静态块里读:

```java
public class DiscountConfig {
    static final Map<String, BigDecimal> RATES;
    static {
        RATES = ConfigFile.read("discount.conf");   // 文件没了 → 静态块抛异常
    }
}
```

下单服务第一次调用时,「重试兜底」的 `catch (Throwable)` 把报错吞进日志海;第二次调用才当着阿零的面爆开。

---

## 七、读懂真实报错

第一幕验货结果——假货被拦得干干净净:

```text
Exception in thread "main" java.lang.NoSuchMethodException: java.lang.String.brewLatte()
        at java.base/java.lang.Class.getMethod(Class.java:2260)
        at LoaderTour.main(LoaderTour.java:9)
```

第二幕,埋在第一次调用日志堆里的真凶:

```text
java.lang.ExceptionInInitializerError
        at OrderService.price(OrderService.java:14)
Caused by: java.lang.IllegalStateException: 找不到配置文件 discount.conf
        at ConfigFile.read(ConfigFile.java:12)
        at DiscountConfig.<clinit>(DiscountConfig.java:8)
        ... 1 more
```

第二次调用,阿零看到的全部:

```text
Exception in thread "main" java.lang.NoClassDefFoundError: Could not initialize class DiscountConfig
        at OrderService.price(OrderService.java:14)
```

阿零翻 target、翻本地仓库、跑依赖树——jar 一个不少。豆豆按五步排障法拉住他:类明明在类路径上,假设就该反过来——不是「找不到」,是「来过,但体检挂了」。往前翻,真凶果然躺在第一次调用里。

- **`ClassNotFoundException`**:受检异常,「名单上根本没这个人」——`Class.forName` / `loadClass` 找不到字节码;
- **`NoClassDefFoundError`**:错误,「人来过,初始化挂了,盖了报废戳」——之后每次再用只回这一句,根因永远在**第一次**的日志里。

> **🎯 面试直击**:双亲委派是什么、为什么、谁打破了它?
> 是什么:加载请求层层上交,父加载器都不管才自己装。为什么:防核心类被篡改 + 保证一个类全 JVM 只有一份。谁打破:SPI(JDBC 驱动走线程上下文加载器)、Tomcat(每应用一个加载器先己后父)、热部署(换加载器重装)。追问点:两个加载器装的同名类 `instanceof` 为 false——唯一性由「加载器 + 全限定名」共同决定。

---

## 八、修复,并用测试证明

根因:静态块让异常裸奔。修法:读不到配置就回退全价——不能因为折扣文件丢了就不卖咖啡:

```java
public class DiscountConfig {
    static final Map<String, BigDecimal> RATES = load();

    private static Map<String, BigDecimal> load() {
        try {
            return ConfigFile.read("discount.conf");
        } catch (RuntimeException e) {
            System.err.println("折扣配置加载失败,回退全价:" + e.getMessage());
            return Map.of();   // 空表 = 人人全价,类照样初始化成功
        }
    }

    public static BigDecimal rateOf(String coffee) {
        return RATES.getOrDefault(coffee, BigDecimal.ONE);
    }
}
```

JUnit 质检员:「证据呢?」

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class DiscountConfigTest {
    @Test
    void missing_config_falls_back_to_full_price() {
        // 配置缺失:类初始化成功,回退全价,而不是留下一个报废的类
        assertEquals(BigDecimal.ONE, DiscountConfig.rateOf("拿铁"));
    }
}
```

口诀记进账本:**见到 `Could not initialize class`,别找 jar,去翻第一次的 `ExceptionInInitializerError`。**

---

## 九、项目检查点 · 豆豆咖啡站 v10.3

```text
咖啡站形态:引擎室巡检 v10.3 —— 每个类进 JVM 的关卡都能讲清
已具备  :五阶段流水线(准备=零值,初始化=<clinit> 只跑一次);三层加载器与双亲委派;
          SPI/Tomcat/热部署三种"正当打破";CNFE 与 NCDFE 分得清;静态块不再裸奔
还没有  :货箱里那些字节到底写了什么、JVM 怎么越跑越快——还没拆过
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 类加载五阶段 + 准备零值 | JVM 八股第一梯队,常追问「静态变量何时是 0」 |
| 双亲委派与打破场景 | 中高级必问,答出线程上下文加载器与 Tomcat 是加分项 |
| CNFE vs NCDFE 排障 | 线上高频根因,能讲「初始化失败盖报废戳」是实战派证明 |

---

## 十一、下一话悬念

类是装进来了,可货箱里装的到底是什么货?阿零打开 `.class` 文件,满屏乱码。

豆豆递来一副眼镜,镜腿刻着 `javap`:「戴上。字节码眼镜——明天起,你看到的不再是乱码,是 JVM 真正执行的指令。」

> 下一话《字节码与 JIT:越跑越快的秘密》:戴上 javap 眼镜看穿 `.class` 里的真实指令,再进 JIT 工厂,看解释器与编译器如何接力,让同一段代码越跑越快。

---

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,中间3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. 类加载五阶段中,给静态变量分配内存并赋**零值**的是哪个阶段?
   - A) 加载
   - B) 验证
   - C) 准备
   - D) 初始化

2. JDK 9+ 的三层类加载器从上到下依次是?
   - A) Application → Platform → Bootstrap
   - B) Bootstrap → Platform → Application
   - C) Bootstrap → Extension → Application
   - D) Platform → Bootstrap → Application

3. `String.class.getClassLoader()` 返回 null,原因是?
   - A) String 类尚未加载
   - B) String 类由 Bootstrap ClassLoader 加载,它在 JVM 内部用 C/C++ 实现,没有对应的 Java 对象
   - C) String 是抽象类,不需要类加载器
   - D) getClassLoader() 对 JDK 核心类永远返回 null

4. 双亲委派机制中,一个类加载请求的传递路径是?
   - A) 当前加载器先自己加载,失败再向上请求
   - B) 直接交给 Bootstrap,不再返回
   - C) 先向上级委派,一路到 Bootstrap;上级都不加载,才自己加载
   - D) 同时交给所有加载器,谁先完成谁返回

5. `static int x = 8` 在**准备阶段**的值是?
   - A) 8
   - B) 0
   - C) null
   - D) 未定义

6. 以下哪个场景**不会**触发类的初始化?
   - A) `new OrderService()`
   - B) `Class.forName("OrderService")`
   - C) 访问类的 `static final String BRAND = "豆豆咖啡站"`(编译期常量)
   - D) 调用类的静态方法

7. `ClassNotFoundException` 与 `NoClassDefFoundError` 的关键区别是?
   - A) 没区别,只是版本不同
   - B) CNFE 是「名单上没这个人」(找不到字节码);NCDFE 是「人来过,初始化挂了」(类存在但加载失败)
   - C) CNFE 只在编译期出现,NCDFE 在运行期
   - D) CNFE 是 Error,NCDFE 是 Exception

8. Tomcat 打破双亲委派的正确方式是?
   - A) 所有 webapp 共享一个类加载器
   - B) 每个 webapp 一个独立加载器,加载顺序是**先自己后父**(核心类除外)
   - C) 把所有 webapp 的类都交给 Bootstrap 加载
   - D) 完全不用双亲委派,随机加载

9. 阿零的 `DiscountConfig` 静态块读文件失败后,第二次使用该类时直接抛 `NoClassDefFoundError`。此时类的状态是?
   - A) 类已正常加载,只是方法调用出错
   - B) 类被标记为**报废(Erroneous)**,JVM 不会再尝试初始化它
   - C) 类被卸载,需要重新加载
   - D) 类加载器会自动重试初始化

10. 两个不同的类加载器各加载一份同名的 `User` 类(`com.example.User`)。用加载器 A 加载的 `User` 实例,通过加载器 B 的代码做 `instanceof User` 检查,结果是?
   - A) true
   - B) false
   - C) 编译错误
   - D) 抛出 `ClassCastException`

### 解答题(5 道)

**Q1(概念)** 画出类加载五阶段的流程图,并标注每个阶段的职责。特别说明为什么「准备阶段静态变量先给零值」这个设计是必要的。

**Q2(解释)** JDBC 驱动加载(SPI 机制)是如何打破双亲委派的?为什么必须打破?

**Q3(场景)** 某应用需要在不重启的情况下,将修改后的 `.class` 文件替换掉内存中已加载的类。请设计热部署的核心思路,并说明为什么必须换一个新的类加载器。

**Q4(分析)** 分析以下代码中 `Roaster.BRAND` 和 `Roaster.slogan` 的访问分别是否触发类初始化,以及为什么。
```java
class Roaster {
    static { System.out.println("Roaster 初始化了"); }
    static final String BRAND = "豆豆咖啡站";
    static String slogan = "深烘不加糖";
}
```

**Q5(设计)** 你需要实现一个简单的「插件热加载」框架:指定一个目录,扫描其中的 `.jar` 文件,每个 jar 中有一个实现了 `Plugin` 接口的类,要求插件可随时加载/卸载。请设计核心架构,说明类加载器的使用策略。

> [!答案]
> **选择题**
> 1-C。准备阶段分配内存并赋零值;初始化阶段才执行 `<clinit>`(静态赋值+静态块)。★举一反三:`static int x = 8` 在准备阶段是 0,初始化阶段才变 8——面试高频追问点。
>
> 2-B。Bootstrap(核心模块) → Platform(平台模块) → Application(类路径上的应用类)。★举一反三:JDK 9 前是 Bootstrap → Extension → Application;Extension 被 Platform 取代。
>
> 3-B。String 在 `java.base` 模块中,归 Bootstrap 加载。Bootstrap 用 C/C++ 实现,Java 层查询返回 null。★举一反三:`getClassLoader()` 返回 null 表示「被 Bootstrap 加载的」,不是「没加载」。
>
> 4-C。双亲委派的核心是「先向上问一圈」:请求从当前加载器层层上递,到 Bootstrap 为止,上级都不管才自己加载。★举一反三:这个「先父后子」的规矩从 JDK 1.2 沿用至今。
>
> 5-B。准备阶段只赋零值:引用→null、int→0、boolean→false。★举一反三:唯一例外是编译期常量(`static final int X = 8`),在准备阶段直接赋终值。
>
> 6-C。编译期常量在编译阶段就内联到调用方的字节码中,访问它不触发类初始化。★举一反三:把 `static final` 改成 `static`(去掉 final),就触发初始化了——和类加载的「主动引用」定义一致。
>
> 7-B。CNFE 是受检异常:「类名对应的 .class 文件找不到」;NCDFE 是 Error:「类找到了,但初始化阶段失败了,类被标记为报废」。★举一反三:见到 NCDFE,别找 jar,翻第一次的 `ExceptionInInitializerError` 日志。
>
> 8-B。Tomcat 每个 webapp 独立 ClassLoader,加载顺序「先己后父」(核心类如 java.* 除外)——各应用同名不同版本的库互不干扰。★举一反三:这是「打破双亲委派」的教科书案例,SPI 和热部署是另外两个。
>
> 9-B。静态块抛异常后,类被标记为 Erroneous(报废),之后任何对该类的使用都直接抛 NCDFE,不会再触发初始化。★举一反三:所以静态块里读配置/连网络要极端谨慎,做好兜底。
>
> 10-B。类的唯一标识 = 加载器 + 全限定名。两个加载器各装一份同名类,JVM 视它们为两个不同的类型,`instanceof` 判 false,强转抛 `ClassCastException`。★举一反三:Tomcat 跨 webapp 传对象翻车,大多是这个原因。
>
> **解答题**
>
> **Q1** 流程:加载(读字节流→Class 对象)→验证(检查魔数 CAFEBABE/版本/字节码合法性)→准备(分配内存+赋零值)→解析(符号引用→直接引用)→初始化(执行 `<clinit>`:静态赋值+静态块按顺序跑)。「准备阶段先赋零值」的设计必要性:①内存安全性——任何时刻读取静态字段都不会是未初始化的垃圾值;②顺序保证——所有静态变量在初始化代码执行前已有确定初始态,避免 `if (flag)` 读到不确定值。★举一反三:这个设计也意味着不能依赖「静态变量的赋值顺序跨过零值阶段」,`static int a = b + 1` 中如果 b 在准备阶段是 0,这里是合法的。
>
> **Q2** JDBC 的驱动接口(`java.sql.Driver`)在 `java.base` 模块(Bootstrap 加载),而具体驱动(如 `com.mysql.cj.jdbc.Driver`)在类路径上(Application 加载)。按双亲委派,Bootstrap 的儿子找不到 Bootstrap 的孙子——Bootstrap 加载的 `DriverManager` 反过来需要加载「下层」的驱动。解决方案:使用**线程上下文类加载器**(Thread Context ClassLoader)——`DriverManager` 通过 `Thread.currentThread().getContextClassLoader()` 拿到 Application ClassLoader,用后者加载驱动类。这就是「父加载器向子加载器借梯子」,SPI 的经典打破模式。★举一反三:这种打破不是设计缺陷,而是「上层接口需要加载下层实现」时必然的妥协。
>
> **Q3** 热部署核心思路:①监听 class 文件变化;②变化时创建**全新的 ClassLoader 实例**,用新加载器重新加载所有类;③旧类随旧加载器一起被 GC 回收;④业务请求路由到新加载器加载的类实例。必须换新加载器的原因:JVM 规范规定,同一个类加载器不能重复加载同一个类(会抛异常),且已加载的类无法被卸载——唯一卸载的方式是它所属的 ClassLoader 整个被回收。★举一反三:这就是 Spring DevTools 和 JRebel 的工作方式——重启快是因为只换了 ClassLoader,没重启 JVM。
>
> **Q4** `Roaster.BRAND` 不触发初始化:它是 `static final String` 且值是编译期常量,在编译阶段就内联到调用方字节码中(`ldc "豆豆咖啡站"`),不经过 `Roaster` 类。`Roaster.slogan` 触发初始化:它是 `static` 变量但不是编译期常量,访问它属于「主动引用」,先执行 `<clinit>`(打印"Roaster 初始化了"),再返回 `slogan` 的值。★举一反三:这个区别是面试中「类初始化时机」的经典追问——`static final` 的对象引用(如 `new Object()`)也不是编译期常量,会触发初始化!
>
> **Q5** 插件热加载框架设计:①定义 `Plugin` 接口(`void start()`/`void stop()`);②`PluginClassLoader` 继承 `URLClassLoader`,每个插件一个实例;③扫描目录下 `.jar`,用独立的 `PluginClassLoader` 加载其中的 `Plugin` 实现类;④插件间隔离:不同插件用不同 ClassLoader,同名类互不冲突;⑤卸载:关闭对 ClassLoader 及其加载的类的所有引用,让 GC 回收——关键是不能有任何「根引用」指向已卸载插件的类/对象。⑥插件通信:通过 `Plugin` 接口或共享的「宿主 API」交互,避免直接传递插件内部的类(会引发 ClassCastException)。★举一反三:OSGi、Eclipse 的插件体系、Tomcat 的 webapp 隔离,都是这个思路的不同成熟度实现。
>
> ---

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
