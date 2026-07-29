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

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. JMM 里的「工作内存」指的是?
   - A) 某块具体的硬件缓存　B) **抽象规范中的概念**:寄存器 + CPU 多级缓存 + 编译器优化的统称　C) 线程栈　D) 堆的一部分
2. 并发三性中,`count++` 破坏的是哪一性?
   - A) 可见性　B) **原子性** —— 它是读、加、写三步　C) 有序性　D) 持久性
3. `volatile` 保证什么、不保证什么?
   - A) 全都保证　B) **保证可见性 + 禁止指令重排,不保证原子性**　C) 只保证原子性　D) 只保证有序性
4. 下列**不属于**本话讲的 happens-before 四条规则的是?
   - A) 程序次序规则　B) volatile 写 hb 后续读　C) 解锁 hb 后续对同一把锁的加锁　D) **GC 回收 hb 对象终结**
5. `instance = new ConfigCenter()` 实际是哪三步?
   - A) 加锁、创建、解锁　B) **分配内存 → 执行构造初始化 → 把引用写给 instance**　C) 查找、复制、赋值　D) 只有一步
6. DCL 单例必须加 `volatile`,是为了?
   - A) 保证可见性　B) **禁止「②③ 重排」** —— 否则别的线程可能在第一查看到非 null,拿到一个没初始化完的半成品　C) 提升性能　D) 语法要求
7. 普通 `boolean running` 当停机标志失效的原因是?
   - A) boolean 不能跨线程　B) **子线程读的是工作内存里的旧抄本,JIT 还可能把读提升出循环**　C) 主线程没写成功　D) 需要加 static
8. 用 `jstack` 看这个卡死现场,子线程状态是?
   - A) `BLOCKED`　B) `WAITING`　C) **`RUNNABLE`** —— 不是卡住,是拿旧值全速空转烧 CPU　D) `TERMINATED`
9. 「加一行打印或挂上调试器,它偶尔又能停」说明?
   - A) 是随机故障　B) **现象随观察而变,正是可见性 Bug 的签名** —— 这些动作打断了 JIT 的提升优化　C) 打印有副作用　D) 调试器有 bug
10. 内存屏障在 volatile 读写两侧做了什么?
    - A) 加锁　B) **写完必须刷出去、读前必须重新拉,两侧指令不得穿越换位**　C) 复制变量　D) 暂停线程

> [!答案]
> **1-B**　它是规范不是硬件。**举一反三**:JMM 规定的是「一个线程的写什么时候必须对另一个线程可见」,而不是机器长什么样。
> **2-B**　三步之间随时被插队。**举一反三**:所以给它加 volatile 没用 —— 下一话的 CAS 才是对症的药。
> **3-B**　两保证一不保证。**举一反三**:这句话必须一口清 —— 面试里说「volatile 保证线程安全」直接出局。
> **4-D**　GC 与 happens-before 无关。**举一反三**:另外三条(程序次序、volatile、锁、start/join)覆盖了日常九成场景。
> **5-B**　②③ 之间没有数据依赖,所以允许重排。**举一反三**:「允许重排」是编译器和 CPU 的合法优化 —— 不是 bug,是你没告诉它不许。
> **6-B**　禁重排才是 DCL 里 volatile 的主要职责。**举一反三**:不想背这些,单例直接用枚举或静态内部类(第 61 话)。
> **7-B**　旧抄本 + JIT 提升。**举一反三**:这也是为什么「本地跑没事、加了压力就复现」—— JIT 要热身够久才会做这类优化。
> **8-C**　`RUNNABLE` ≠ 正常。**举一反三**:第 43 话的死循环也是 RUNNABLE —— 看到它高 CPU 就该去看栈顶停在哪。
> **9-B**　观察改变现象。**举一反三**:这类「一加日志就好了」的问题,几乎都是并发/优化相关,别以为是玄学。
> **10-B**　路障指令。**举一反三**:理解屏障,就理解了为什么 volatile 有性能代价 —— 它禁掉了一部分优化。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
