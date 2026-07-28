---
title: "《从零开始学 Java》70 · 可见性幽灵:JMM 与 volatile"
date: 2026-10-27
summary: "主线程明明把 running 改成 false,盘点线程却像撞了鬼一样停不下来。豆豆带阿零下到线程调度中心:你改的是总账,他读的是抄本。JMM 三性、happens-before 与 volatile 一夜讲透,顺手兑现双检锁旧账。"
tags: [Java, Java漫画, 并发, JMM, volatile, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》70 · 可见性幽灵:JMM 与 volatile

> 连载特刊 · 番外卷二「并发深水区」第 1 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——验收夜打烊后,监控里两个线程同时扣库存,账又对不上了。冬歇第一夜,技术债账本翻到第二页:并发深水区,这次没有豆豆兜底。

---

## 一、事故:改成 false 的开关,像没改一样

为了追那笔对不上的账,阿零写了个后台盘点线程,重算全年流水。算完想停,他在主线程把标志位 `running` 置成 `false`——盘点线程无动于衷,继续全速空转,风扇狂响,进程杀不掉只能强退。

阿零:「同一个变量,我改了,它为什么看不见?」豆豆合上账本:「因为你以为线程们共用一本账。今晚先抓鬼,再谈账。」

---

## 二、漫画 · 线程调度中心抓鬼

> **〔1〕** 冬歇第一夜,店里只剩键盘声。阿零按下「收工」——`running = false`——盘点线程却还在疯狂刷账页。
> 阿零:「我明明把开关关了!它、它在装没看见?!」

> **〔2〕** 豆豆领他钻进 JVM 城主的线程调度中心:一排线程工位,每个工位手边一个小抽屉(工作内存),大厅中央才是唯一的总账台(主内存)。
> JVM 城主:「为了快,每个线程都爱用手边抽屉里的抄本干活,不是每一眼都去看总账。」

> **〔3〕** 【特写格】总账台上 `running` 已翻成 `false`;可盘点线程工位的抽屉里,一只半透明的幽灵按着旧抄本:`true`。
> 豆豆(叼着豆子叉腰):「可见性幽灵,Race 双胞胎的表亲。你改的是总账,他读的是抄本——JIT 热身之后,他连抽屉都懒得开。」

> **〔4〕** 豆豆掏出一枚火漆印章「volatile」盖在 `running` 上:写直达总账,读必须现场核对总账。幽灵嗷一声化烟。
> 豆豆:「章还有第二个功能:两侧的指令不许越过它换位——重排,禁了。」

> **〔5〕** 彩蛋格:阿零兴冲冲要把销量计数器也盖章,豆豆一爪子按住。
> 豆豆:「幽灵怕章,强盗不怕。你那 `count++` 盖了章照样丢单——今晚抓鬼,明晚捉贼。」

---

## 三、本话目标

- 建立 JMM「主内存 / 工作内存」心智模型,分清它是抽象规范而非具体硬件;
- 分账并发三性:可见性、原子性、有序性——各自谁破坏、谁保证;
- 讲透 volatile 两大语义(可见性 + 禁重排)与一大边界(**不保证原子性**);
- 挑 4 条 happens-before 规则讲透:程序次序、volatile、锁、start/join;
- 兑现第 61 话的旧钩子:DCL 单例为什么必须 volatile。

---

## 四、原理图:JMM 与并发三性

```text
     线程 main 工位              线程 inventory 工位
   ┌────────────────┐          ┌────────────────┐
   │ 工作内存(抄本)  │          │ 工作内存(抄本)  │
   │ running=false  │          │ running=true ←旧│
   └───────┬────────┘          └───────┬────────┘
      写回 │ 不知何时                读 │ 未必刷新
   ┌───────┴───────────────────────────┴────────┐
   │        主内存(所有线程共享的唯一总账)         │
   └────────────────────────────────────────────┘
```

注意:JMM 是**抽象规范**,「工作内存」是寄存器 + CPU 多级缓存 + 编译器优化的统称,别背成某块具体硬件。它规定的不是机器长什么样,而是**一个线程的写,什么时候必须对另一个线程可见**。

| 三性 | 一句话 | 谁破坏它 | 谁保证它 |
|---|---|---|---|
| 可见性 | 我写完,你就能看见 | 工作内存缓存旧值 | volatile、锁 |
| 原子性 | 一段操作中途不许插队 | 线程切换(`count++` 是三步) | 锁、CAS(下一话) |
| 有序性 | 代码按看上去的顺序生效 | 编译器 / CPU 指令重排 | volatile、happens-before |

JMM 给程序员的正式承诺叫 **happens-before**:A hb B,则 A 的所有写对 B 可见。全集不用背,这 4 条吃透就够用:

| 规则 | 内容 | 咖啡站直觉 |
|---|---|---|
| 程序次序 | 同一线程内,前面的操作 hb 后面的 | 自己记的流水账自己认 |
| volatile | 对 volatile 变量的**写** hb 后续对它的**读** | 盖章公告,先贴先见 |
| 监视器锁 | 解锁 hb 后续对**同一把锁**的加锁 | 交还钥匙时,你做过的事随钥匙交接 |
| start / join | `t.start()` 前的写对 t 内可见;t 内的写对 `join()` 返回后可见 | 开工前交底,收工后交接 |

内存屏障一句话直觉:JVM 在 volatile 读写两侧插「路障」指令——**写完必须刷出去,读前必须重新拉,两侧指令不得穿越换位**。这就是「可见 + 禁重排」的底层由来。

---

## 五、代码:盘点线程 + 兑现第 61 话的钩子

#69 验收完的主体代码不动,本话在旁边**新增**盘点守护线程(下一节故意写出 Bug 版),并**复查**一处旧代码——第 61 话手写单例时,豆豆说过「双检锁的坑,番外再算」,今天算:

```java
public class ConfigCenter {
    // ← 没有 volatile,双检锁(DCL)就是半成品制造机
    private static volatile ConfigCenter instance;

    private ConfigCenter() { /* 加载冬歇价目表 */ }

    public static ConfigCenter getInstance() {
        if (instance == null) {                    // 第一查:无锁快路径
            synchronized (ConfigCenter.class) {
                if (instance == null) {            // 第二查:持锁复核
                    instance = new ConfigCenter(); // 危险点在这一行
                }
            }
        }
        return instance;
    }
}
```

`instance = new ConfigCenter()` 其实是三步:① 分配内存 → ② 执行构造初始化 → ③ 把引用写给 `instance`。②③ 之间没有数据依赖,允许被重排成 ①③②。另一个线程恰好在「第一查」看见非 null,不进锁直接拿走——一个**没初始化完的半成品**。volatile 禁掉 ③ 越到 ② 前面,DCL 才成立。这就是「有序性」咬人的现场。

---

## 六、故意制造一个 Bug:普通 boolean 当停机开关

盘点线程的第一版,标志位就是个普通 `boolean`:

```java
public class StockDaemon {
    static boolean running = true;                 // ← 故意:普通 boolean

    public static void main(String[] args) throws Exception {
        Thread worker = Thread.ofPlatform().name("inventory-daemon").start(() -> {
            long rounds = 0;
            while (running) {                      // 读的可能永远是抄本旧值
                rounds++;
            }
            IO.println("盘点收工,共巡 " + rounds + " 轮");
        });
        Thread.sleep(1_000);
        running = false;                           // 主线程:该收工了
        worker.join();                             // ← 永远等不到
        IO.println("账本合上");
    }
}
```

---

## 七、观察现象:没有报错的 Bug 最阴

运行后没有任何异常——程序就是**不退出**。默认的 server JIT 热身后,循环里对 `running` 的读被提升出循环,子线程拿着旧值全速空转,可稳定复现。用第 43 话学过的 `jstack` 看现场:

```text
$ jstack 21384
"inventory-daemon" #31 prio=5 os_prio=0 cpu=58734.38ms elapsed=58.81s tid=0x000001f0c2f3d000 nid=0x5a3c runnable  [0x000000d4f4dfe000]
   java.lang.Thread.State: RUNNABLE
        at StockDaemon.lambda$main$0(StockDaemon.java:8)

"main" #1 prio=5 os_prio=0 cpu=93.75ms elapsed=58.90s tid=0x000001f0a1b24d70 nid=0x2f88 in Object.wait()  [0x000000d4f43ff000]
   java.lang.Thread.State: WAITING (on object monitor)
        at java.lang.Object.wait0(java.base@25/Native Method)
```

子线程 `RUNNABLE`(不是卡住,是拿旧值空转烧 CPU),主线程 `WAITING` 在 `join` 上。更阴的是:加一行打印、或挂上调试器,它偶尔又能停——因为这些动作恰好打断了 JIT 的提升优化。**现象随观察而变,正是可见性 Bug 的签名。**

> **🎯 面试直击**:volatile 保证什么、不保证什么?DCL 为什么要 volatile?
> 保证可见性与有序性(禁重排),**不保证原子性**——`count++` 读、加、写三步照样被插队。DCL 里 `new` 可能被重排成「先发引用、后初始化」,别的线程拿到半成品对象;volatile 禁掉这次重排。追问点:不想背这些,单例还有更省心的写法吗?——枚举或静态内部类,回看第 61 话。

---

## 八、修复,并用测试证明

修复只加一个词:

```java
static volatile boolean running = true;   // 写直达总账,读必核总账,幽灵超度
```

重跑,一秒后干脆利落地停:

```text
盘点收工,共巡 1487362209 轮
账本合上
```

把巡查逻辑抽成可测的小类,让 JUnit 质检员(「证据呢?」)留档:

```java
class InventoryWorker {
    private volatile boolean running = true;

    void shutdown() { running = false; }

    long patrol() {                        // 停下来才会返回
        long rounds = 0;
        while (running) rounds++;
        return rounds;
    }
}
```

```java
import org.junit.jupiter.api.Test;
import java.time.Duration;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InventoryWorkerTest {
    @Test
    void volatile_flag_stops_the_worker() throws InterruptedException {
        var worker = new InventoryWorker();
        Thread t = Thread.ofPlatform().name("inventory-daemon").start(worker::patrol);

        Thread.sleep(200);                 // 给 JIT 热身机会
        worker.shutdown();                 // 主线程置 false

        // join(Duration):等到线程终止或超时,返回是否已终止
        assertTrue(t.join(Duration.ofSeconds(2)), "volatile 标志位必须让线程 2 秒内停下");
    }
}
```

> **豆豆锐评**:volatile 不是锁的平替。它管「你写的我看得见」,不管「你写的时候别人别插手」。`count++` 是读、加一、写回三步:两个线程同时读到 100,各自加完都写回 101——丢一单。可见性幽灵怕章,竞态强盗不怕。

---

## 九、项目检查点 · 豆豆咖啡站 v9.1

```text
咖啡站形态:并发加固 v9.1 —— 后台盘点线程能被干净地叫停
已具备  :JMM 主内存/工作内存心智模型;三性分账;happens-before 四条;
          volatile 停机标志;DCL 单例补上 volatile(第 61 话钩子兑现)
还没有  :销量计数 count++ 压测下依旧丢数 —— volatile 罩不住原子性
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| JMM / 主内存与工作内存 / 并发三性 | 并发面试第一问,答不出模型后面全崩 |
| volatile 语义与边界(不保证原子性) | 高频八股,「保证什么不保证什么」必须一口清 |
| happens-before 四条规则 | 能落到规则条文而非「大概可见」是区分项 |
| DCL 单例 + 指令重排 | 手写单例的标配追问,半成品对象要讲得出 |
| jstack 定位无报错的活锁式空转 | 线上排障硬通货,RUNNABLE ≠ 正常 |

---

## 十一、下一话悬念

阿零把销量计数器也盖上了 volatile 章,重跑压测:一万单,计数器停在 9 千多。幽灵确实走了——每个线程都看见了最新值,可「读、加一、写回」三步之间,别的线程照样插队,更新照样互相覆盖。

> 下一话《无锁计数:CAS 与原子家族》:不加锁,能不能安全地加一?硬件出手了——比较并交换(CAS),一条指令完成「看一眼再落笔」,还有一整个原子家族在排队登场。

---

## 🎯 随堂练习

先自己做,再对答案。难度递进:前 3 题基础识记,中间 3 题理解应用,最后 4 题分析判断与综合。

### 选择题(10 道)

1. JMM 中「工作内存」存储的是什么?
   - A) 所有线程共享的变量　B) 线程从主内存拷贝来的变量副本　C) 堆中的对象　D) 方法调用栈帧
2. volatile 关键字最基础的作用是?
   - A) 让变量不可变　B) 保证变量的可见性　C) 让变量变成线程私有　D) 禁止读取该变量
3. 下面哪个说法关于 volatile 是正确的?
   - A) volatile 保证自增操作原子性　B) volatile 不保证原子性　C) volatile 让代码更慢　D) volatile 替代 synchronized
4. `volatile boolean running = true` 在 while 循环中被读,为什么要加 volatile?
   - A) 防止编译错误　B) 不加 volatile,JIT 可能把变量放入寄存器,其他线程的修改永远看不见　C) 为了让代码更清晰　D) 这是约定
5. `volatile int count = 0; count++;` 两个线程各执行 1000 次后,count 的最大值和最小值分别是?
   - A) 最大 2000 最小 2000　B) 最大 2000 最小 2　C) 最大 1000 最小 0　D) 总是 2000
6. DCL 单例中 instance 加 volatile 是防止什么?
   - A) 内存泄漏　B) 指令重排——分配内存后引用先暴露,但对象尚未初始化完成　C) 死锁　D) 序列化破坏
7. 下面这段代码中,线程 B 能否保证读到 `x == 1`?
   ```java
   // 线程A: x = 1; ready = true;  (ready 是 volatile)
   // 线程B: if (ready) { print(x); }
   ```
   - A) 不一定　B) 一定——volatile 写 happen-before volatile 读,线程 A 在 volatile 写之前的所有操作对 B 可见　C) x 必须也加 volatile　D) 编译错误
8. happens-before 规则中,以下哪对关系是 JMM 明确保证的?
   - A) A 线程的任意写 happens-before B 线程的任意读(不加同步)　B) 对一个 volatile 变量的写 happens-before 后续对该变量的读　C) 两个线程的任意操作都有 happens-before 关系　D) 跨线程的普通变量读写自动有序
9. 一个对象 `final` 字段在构造函数返回后,其他线程看到的是?
   - A) 默认值(0/null)　B) 构造函数中赋的值——JMM 对 final 字段有特殊保证　C) 不确定　D) 延迟初始化的值
10. 下面三个工具:①volatile ②synchronized ③AtomicInteger,其中哪组能同时保证可见性、原子性和有序性?
    - A) 只有 ①　B) ①和③都不行,②全满足;③只保证基础原子性和可见性　C) 全部都能　D) 都不能

> [!答案]
> **1-B**　每个线程从主内存拷贝变量到自己的工作内存,操作后刷回。**举一反三**:这就是为什么不加同步的变量,线程间互相看不见——各自看着自己的「抄本」。
> **2-B**　volatile 的两大语义:① 保证可见性(写后立即刷回主内存,读前从主内存拿最新);② 禁止指令重排。**举一反三**:volatile 是 JMM 提供的轻量级同步工具,代价低但不解决原子性。
> **3-B**　volatile 只保证可见性和有序性,**不保证原子性**。count++ 读-改-写三步仍然会被线程间交叉执行。**举一反三**:「volatile 不保原子」是面试最高频考点——背住之后追问自然进 AtomicInteger 或 synchronized。
> **4-B**　JIT 可能把 running 优化到寄存器,循环里一直读寄存器中的旧值——即使另一个线程改了主内存,这个线程也看不见。volatile 禁止这一优化。**举一反三**:不加 volatile 的单线程测试永远通过——因为 JIT 对单线程热点代码才会激进优化,压力测试时 JIT 编译触发后才暴露这个 Bug。
> **5-B**　count++ 三步:读→加→写。2 个线程各 1000 次,最多(运气好)2000;最少 2——因为两个线程各读到一次 0,各写回 1,后续所有操作互相覆盖。**举一反三**:这就是为什么 volatile 计数不可靠——能肉眼推演出最少值是 2,比只答「不安全」强一个档次。
> **6-B**　`instance = new Singleton()` 分解:分配内存→初始化对象→将引用赋给 instance。JIT 可能重排②③——其他线程在③之后②之前读到 instance(非 null),拿到的对象字段全是默认值。volatile 禁止这一重排。**举一反三**:JDK 5 之前 volatile 没这能力——所以老教程里 DCL 是反模式;JSR 133 让 volatile 有了内存屏障语义,现代 JDK(5+)才安全。
> **7-B**　volatile 写 happen-before volatile 读。线程 A 的 x=1(普通写)发生在线程 A 的 volatile 写之前,线程 B 的 volatile 读之后的代码能看到 volatile 写之前的所有操作。ready 就像一条「栅栏」。**举一反三**:这被称为「借助 volatile 发布」——用一个 volatile 标志位让普通变量的变更一起变可见,省掉把所有变量都标成 volatile。
> **8-B**　JMM 定义了六条 happens-before 关系:程序次序、volatile 写-读、锁释放-获取、线程 start、线程 join、final 构造函数。不是所有操作都有 happens-before。**举一反三**:面试追问「JMM 到底保证什么」——不要展开背,而是画一张图:两个线程,用 volatile 变量作媒介,传递可见性。
> **9-B**　JMM 给 final 字段特殊保证:构造函数执行完、返回后,final 字段赋值对所有线程可见(不需要额外同步)。前提是不能让 this 引用在构造期间逃逸。**举一反三**:这就是为什么「尽量让字段 final」是并发安全的天然助手——final 字段在构造函数结束后,其他线程一定看到已初始化的值。
> **10-B**　volatile 只见可见性和有序性;AtomicInteger 保证单个操作(如 get/incrementAndGet)的原子性和可见性;只有 synchronized 同时保证三性(通过加锁下的互斥消除竞争)。**举一反三**:三种工具的定位:volatile=标志位/一写多读;AtomicInteger=计数器/CAS;锁=复合操作/多变量一致性。

### 解答题(5 道)

1. 用自己的话解释 JMM「主内存-工作内存」模型下,「可见性」问题是怎么产生的。
2. volatile 的两大语义分别解决什么问题?给出典型使用场景(至少两个)。
3. DCL 单例的完整实现中,为什么 instance 需要 volatile?去掉 volatile 在什么情况下可能出错?(提示:考虑 JIT 编译和指令重排)
4. 画出 happens-before 四条核心规则的关系图:线程内程序次序、volatile 写读、监视器锁释放获取、线程 start/join。解释它们如何串联成跨线程的可见性链。
5. 设计一个场景:线程 A 负责初始化一个共享的配置对象(多个字段),线程 B 等待初始化完成后读取配置。给出两种同步方案,标注各自的适用场景和开销。

> [!答案]
> **1**　每个线程操作变量时先从主内存拷贝到工作内存(缓存),修改后择机刷回主内存。线程 A 改了变量但没即时刷回,或线程 B 读的时候没从主内存重新取——B 就看到了过期的值。这正是「你改了总账,他照自己的抄本念」。**举一反三**:CPU 和多核架构天然有缓存不一致问题;JMM 不是解决它,而是**规定**哪些手段(volatile/锁/final)能让你跨越缓存获得一致视图。操作系统底层同样有 MESI 协议维护缓存一致性,但应用层不该依赖硬件行为。
> **2**　① 可见性:保证写操作对所有线程立即可见——典型场景:关闭信号标志 `boolean shutdown`(一写多读)。② 禁止重排:保证 volatile 前后指令不会被重排——典型场景:DCL 单例的 instance 字段、需要按序写多个标志位。**举一反三**:volatile 不负责原子性,所以对计数器和链表操作无能为力;把 volatile 想象成一面公告墙:你贴在上面的消息大家都能看到最新版本,但不能阻止好几个人同时贴纸把公告搞乱。
> **3**　完整实现:
```java
class Singleton {
    private static volatile Singleton instance;
    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null)
                    instance = new Singleton();
            }
        }
        return instance;
    }
}
```
无 volatile 时 `new Singleton()` 的分配内存和构造方法可能被 JIT 重排:先让 instance 指向未初始化完的对象,另一线程看到 instance 非 null 就直接用了——得到的对象字段全是默认值。**举一反三**:Enum 单例是 DCL 的终极替代——JVM 天然保证枚举实例的唯一性和初始化安全性,零同步开销且不会有重排问题。大部分单例需求枚举就够了。
> **4**　关系链:
```
线程A:  x=1 → volatileWrite → ┐  程序次序保证前面的操作被 volatile 写"发布"
                                │
线程B:                        volatileRead → y=x   happens-before 保证看到 volatile 写前的所有操作
```
volatile 写读是跨线程桥梁。类似地:线程A 释放锁 → 线程B 获取同锁,锁是桥梁;线程 start 是桥梁(主线程 start 前操作对新线程可见);线程 join 也是桥梁(被 join 线程结束时的操作对主线程可见)。**举一反三**:有了 happens-before 心智模型,你不需要背「什么时候加 volatile」——而是看两个线程之间是否通过某种 happens-before 桥梁传递了可见性。如果没有,就需要加。
> **5**　方案一(volatile 标志位 + final 字段):所有配置字段用 final,初始化完成后设一个 volatile boolean initialized=true。消费者读前检查 initialized。适用:配置只初始化一次不变。开销:只有标志位一个 volatile。方案二(ReadWriteLock):用 ReentrantReadWriteLock,写锁保护初始化,读锁保护消费。适用:配置可能被多次更新。开销:每次读都要获取读锁,比 volatile 开销大。**举一反三**:实际生产上更常见的是用 CountDownLatch——初始化线程完成时 countDown,消费者 await;或直接用 CompletableFuture 的 supplyAsync+thenAccept 链式编排。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
