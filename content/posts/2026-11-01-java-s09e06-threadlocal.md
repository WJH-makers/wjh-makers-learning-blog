---
title: "《从零开始学 Java》75 · 一人一托盘:ThreadLocal"
date: 2026-11-01
summary: "线程池里,上一单 VIP 的 9 折残留在托盘上,普通顾客也被打了折。ThreadLocal 给每线程一只私有托盘,却埋着泄漏藤蔓:key 弱引用、value 强引用,线程不死又不 remove,内存永远收不回。"
tags: [Java, Java漫画, ThreadLocal, 内存泄漏, 并发, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》75 · 一人一托盘:ThreadLocal

> 连载特刊 · 番外卷二「并发深水区」第 6 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——并发菜单稳了,可「当前订单的会员上下文」开始在线程池里串号:每个工人需要自己的托盘。

---

## 一、事故:VIP 的 9 折,普通顾客也领到了

收银流程早已搬进线程池。VIP 打 9 折,阿零先把「当前折扣」塞进 static 字段——豆豆否决:「所有工人共用一块小黑板,两单并发互相涂改,Race 双胞胎老巢。」

阿零改用 `ThreadLocal`:每线程一份独立副本。当晚投诉就来了:**没有会员卡的顾客,账单上赫然打了 9 折。**

豆豆:「共享是解了,可线程池的工人**复用**。上一单 VIP 的托盘,你擦了吗?」

---

## 二、漫画 · 托盘挂在谁身上

> **〔1〕** 后厨里,每个工人(线程)腰间挂一只专属托盘,互不伸手。
> 豆豆:「`ThreadLocal` 不是共享容器,是给**每个线程**发一只私有托盘——同一个变量,各存各的。」

> **〔2〕** 【剖面格】JVM 城主掀开工人制服:Thread 体内缝着一张 `ThreadLocalMap`;钥匙(key)是**虚线**(弱引用),货(value)用**铁链**拴着(强引用)。
> 豆豆:「注意方向:托盘挂在 Thread 上,`ThreadLocal` 只是钥匙。」

> **〔3〕** 线程池工人下班也不回家(核心线程常驻),旧货没人清;熟悉的 Memory Leak 藤蔓从托盘缝里探出头(回看第 44 话)。
> GC 清洁队:「虚线钥匙我收得走;铁链拴的货,线程不死碰不得!」

> **〔4〕** 【翻车格】VIP 走了,阿零没擦托盘;下一位普通顾客的小票印着「折扣:0.9」。
> 阿零:「我以为任务结束,托盘会自动清空……」

> **〔5〕** 豆豆叼着豆子叉腰,把「用完必 remove」的铁牌钉上后厨墙。
> 豆豆:「工人不下班,托盘不换新。想干净,只能自己擦。」

---

## 三、本话目标

- 用 `ThreadLocal` 给每线程一份独立副本,承载订单上下文;
- 讲清结构真相:`ThreadLocalMap` 挂在 Thread 上,key 弱、value 强;
- 顺出泄漏链条,养成「用完必 finally remove」的纪律;
- 认清 `InheritableThreadLocal` 在线程池不传递的坑;
- 望一眼虚拟线程时代的量级压力(第 78 话)。

---

## 四、原理图:托盘的真实挂法与泄漏链条

```text
Thread(工人)
 └─ threadLocals : ThreadLocalMap   ← 托盘缝在线程身上,不在 ThreadLocal 里
      Entry:
        key   ---弱引用--→ ThreadLocal 对象(钥匙)
        value ===强引用==→ 你 set 进去的值(货)

泄漏链条(线程池版):
  核心线程常驻不死 → ThreadLocalMap 不死 → Entry.value 永远可达 → GC 收不走
  就算 ThreadLocal 没人引用(key 回收成 null,成 stale entry),value 仍被拴着;
  set/get 只是顺手清一部分,不保证触发。
```

用途有二:**上下文透传**(折扣、登录态、traceId);**每线程一份非线程安全工具**(老项目的 `SimpleDateFormat`;Java 25 用不可变线程安全的 `DateTimeFormatter`)。

> **豆豆锐评**:remove 是礼貌,更是纪律。弱引用只救 key 救不了 value;线程池里不 remove 的每份 value,都在给第 44 话那颗 OOM 藤蔓浇水。

---

## 五、代码:给收银流程装上下文托盘

在上一话并发菜单之上,给收银线加会员上下文(计价沿用第 60 话 `BigDecimal` 纪律):

```java
import java.math.BigDecimal;
import java.math.RoundingMode;

/** 会员上下文:每线程一只托盘 */
final class OrderContext {
    private static final ThreadLocal<BigDecimal> DISCOUNT = new ThreadLocal<>();

    static void setDiscount(BigDecimal d) { DISCOUNT.set(d); }
    static BigDecimal discount() {              // 没设置 = 不打折
        BigDecimal d = DISCOUNT.get();
        return d == null ? BigDecimal.ONE : d;
    }
    static void clear() { DISCOUNT.remove(); }  // 用完必清
}

final class Cashier {
    /** 收银:按当前线程托盘里的折扣计价 */
    static BigDecimal charge(BigDecimal price) {
        return price.multiply(OrderContext.discount())
                    .setScale(2, RoundingMode.HALF_UP);
    }
}
```

再拆一个近亲:`InheritableThreadLocal` 只在 `new Thread()` **那一刻**拷贝父线程的托盘;线程池工人早就 new 好了,提交任务**不会再拷贝**——拿到的不是 `null` 就是建池时的旧值。池里传上下文,提交前把值捕获进任务对象。

---

## 六、故意制造一个 Bug:VIP 走了,托盘没擦

```java
var latte = new BigDecimal("18.00");
var pool  = Executors.newFixedThreadPool(1);   // 一个工人,复用看得清

pool.submit(() -> {
    OrderContext.setDiscount(new BigDecimal("0.9"));   // VIP:9 折
    IO.println("VIP  单:拿铁 → " + Cashier.charge(latte));
    // 故意:没 remove —— 托盘没擦
});

pool.submit(() ->                              // 普通顾客,什么都没设置
    IO.println("普通单:拿铁 → " + Cashier.charge(latte)));

pool.shutdown();
```

---

## 七、读懂现场:没有异常的事故最阴险

```text
VIP  单:拿铁 → 16.20
普通单:拿铁 → 16.20      ← 普通顾客也打了 9 折!
```

没有异常、没有堆栈——比 NPE 阴险,对账才发现少收钱。引用链:同一工人接两单 → 同一张 `ThreadLocalMap` → 上一单的 `0.9` 还拴在 value 上 → 下一单 `get` 中招。**串号与泄漏是同一条链的两张脸**:值被读到叫串号,收不走叫泄漏。

JUnit 质检员拍桌:「证据呢?」——先把它钉死在测试里:

```text
org.opentest4j.AssertionFailedError: expected: <18.00> but was: <16.20>
```

> **🎯 面试直击**:ThreadLocal 为什么会内存泄漏?key 为什么设计成弱引用?
> 泄漏在 value 不在 key:Map 挂在 Thread 上、value 强引用,池线程常驻,不 remove 则 value 永远可达。key 弱引用是止损:ThreadLocal 没人用时 key 可回收成 stale entry,set/get 才有机会顺手清——key 若也强引用,连这机会都没有。追问点:弱引用只救 key,`remove()` 才是唯一保险。

---

## 八、修复,并用测试证明

业务侧:set/remove **同层配对**,`finally` 保证抛异常也擦盘:

```java
static BigDecimal chargeVip(BigDecimal price, BigDecimal discount) {
    OrderContext.setDiscount(discount);
    try {
        return Cashier.charge(price);
    } finally {
        OrderContext.clear();       // 抛异常也擦盘
    }
}
```

框架侧再加一道兜底——Spring 管家在拦截器收尾统一清理:

```java
@Override   // 请求终点无条件清:业务忘了,这里也会擦
public void afterCompletion(HttpServletRequest req, HttpServletResponse res,
                            Object handler, Exception ex) {
    OrderContext.clear();
}
```

```java
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.concurrent.Executors;
import static org.junit.jupiter.api.Assertions.assertEquals;

class OrderContextTest {
    @Test
    void discount_never_leaks_to_next_order() throws Exception {
        var latte = new BigDecimal("18.00");
        try (var pool = Executors.newFixedThreadPool(1)) {   // 同一工人接两单
            pool.submit(() -> Cashier.chargeVip(latte, new BigDecimal("0.9"))).get();
            BigDecimal normal = pool.submit(() -> Cashier.charge(latte)).get();
            assertEquals(new BigDecimal("18.00"), normal);   // 全价
        }
    }
}
```

绿灯。望远一眼:虚拟线程(JEP 444,JDK 21)动辄**百万级**,「一人一托盘」就是百万只托盘;且虚拟线程用完即弃,池化复用前提不再。JDK 25 转正的 Scoped Values(JEP 506)正为此而生——第 78 话见。

---

## 九、项目检查点 · 豆豆咖啡站 v9.6

```text
咖啡站形态:每个工人一只私有托盘,会员上下文不再串号,擦盘写进店规
已具备  :ThreadLocal 独立副本;结构真相(Map 挂线程上,key 弱 value 强);
          泄漏链条与 finally remove 纪律;拦截器兜底;InheritableThreadLocal 池化坑
还没有  :开店要等 8 台设备自检齐,磨豆机只有 3 台要排队——「等齐」「限流」缺工具
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| ThreadLocal 使用与清理纪律 | 登录态 / traceId 透传是中间件标配,finally remove 是基本功 |
| ThreadLocalMap 结构(key 弱、value 强) | 八股高频,能画出完整引用链的候选人不多 |
| 线程池 + ThreadLocal 组合坑 | 串号与泄漏是生产事故重灾区,面试爱追问现场题 |

---

## 十一、下一话悬念

上下文隔离干净了。可开店仪式卡了壳:8 台设备各自自检,**全部就绪才能开门**;磨豆机只有 3 台,十个工人抢——谁等谁、几个人能同时上?阿零拿 `sleep` 硬凑,豆豆看不下去了。

> 下一话《并发工具箱:门闩·栅栏·信号量》:CountDownLatch 等齐所有人,CyclicBarrier 反复列队,Semaphore 发许可限流——排兵布阵,开工具箱。

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,中间3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. `ThreadLocal` 的值实际存储在哪里?
- A) `ThreadLocal` 对象内部的 Map 中　　B) 每个 `Thread` 对象的 `threadLocals` 字段(`ThreadLocalMap`)中　　C) JVM 方法区的静态 Map 中　　D) 堆上的全局 `ConcurrentHashMap` 中

2. `ThreadLocalMap` 中,Entry 的 key(`ThreadLocal`)是什么引用类型?
- A) 强引用　　B) 软引用　　C) 弱引用　　D) 虚引用

3. `ThreadLocalMap` 中,Entry 的 value 是什么引用类型?
- A) 强引用　　B) 弱引用　　C) 软引用　　D) 虚引用

4. 线程池中使用 `ThreadLocal` 未 `remove`,会导致什么问题?
- A) 编译错误　　B) 线程池中的线程是复用的——前一个任务在线程上 set 的值,后一个任务仍能看到,导致「串号」(张三看到李四的数据);同时 value 强引用永远不被 GC,造成内存泄漏　　C) 线程池中 `ThreadLocal` 会自动清理　　D) 只会造成轻微的内存浪费,不影响业务

5. `InheritableThreadLocal` 的「继承」发生在什么时机?
- A) 每次 `ThreadLocal.get()` 时自动从父线程拷贝　　B) 子线程创建时(new Thread 调用 init),JVM 把父线程的 `InheritableThreadLocal` 值浅拷贝到子线程的 `inheritableThreadLocals` 中　　C) 父线程 `set()` 时自动推送到所有子线程　　D) 线程间通过共享内存自动同步

6. 以下哪个场景最适合用 `ThreadLocal`?
- A) 全局缓存,多个线程共享同一份数据　　B) Web 应用中存储当前请求的用户信息——每个请求由线程池中的一个线程处理,`ThreadLocal` 保证同一线程处理的请求不串数据　　C) 多个线程汇总计算结果到同一个累加器　　D) 跨服务的会话共享

7. `ThreadLocal` 内存泄漏的根本链条是什么?
- A) `ThreadLocal` 对象本身太大　　B) Thread → `ThreadLocalMap` → Entry(key 弱引用→`ThreadLocal` 被 GC,value 强引用→value 还在 Map 中)→核心线程不死→`ThreadLocalMap` 不死→value 永不回收　　C) `ThreadLocal.get()` 返回的副本被 GC 回收　　D) `ThreadLocalMap` 的数组自动扩容导致旧引用丢失

8. 以下代码中,如果线程 t 执行完 run 后结束,会发生什么?

```java
Thread t = new Thread(() -> {
    ThreadLocal<byte[]> tl = new ThreadLocal<>();
    tl.set(new byte[10 * 1024 * 1024]); // 10MB
});
t.start(); t.join(); // 等待线程结束
// t 线程结束了
```

- A) 10MB 会被 GC 回收——线程 t 结束后,它的 `ThreadLocalMap` 随 `Thread` 对象一起被 GC,value 不可达,被回收　　B) 10MB 不会回收,因为 `ThreadLocal` 还在 main 线程的栈上　　C) 10MB 不回收,因为 `ThreadLocalMap` 是静态的　　D) 10MB 立即回收,不等 GC

9. `ThreadLocal` 如何避免线程池场景下的数据串号?最佳实践是:
- A) 每次任务开始时调 `ThreadLocal.set(null)`　　B) 在任务结束时,在 finally 块中调用 `ThreadLocal.remove()`——确保无论任务正常完成还是抛异常,`ThreadLocal` 都被清空　　C) 使用 `InheritableThreadLocal` 替代 `ThreadLocal`　　D) 给每个 `ThreadLocal` 设置一个过期时间

10. 关于 JDK 21 中 `ScopedValue` 相比 `ThreadLocal` 的优势,以下哪项描述最准确?
- A) `ScopedValue` 只是 `ThreadLocal` 的语法糖　　B) `ScopedValue` 是不可变的、有作用域的——一旦设置就被限定在 `where(...).run(...)` 的代码块内,块结束后值失效;且虚拟线程挂载/卸载时自动切换,特别适合虚拟线程场景;相比 `ThreadLocal` 不需要 `remove()` 也不会泄漏　　C) `ScopedValue` 比 `ThreadLocal` 更快,因为使用 CAS 实现　　D) `ScopedValue` 支持跨线程共享

### 解答题(5 道)

1. 画出 `Thread`、`ThreadLocalMap`、`ThreadLocal`、value 四者之间的引用关系图,标注每个引用的类型(强/弱),特别说明「key 弱引用」和「value 强引用」这个不对称设计的目的。

2. 为什么 `ThreadLocalMap` 的 key 设计为弱引用?如果 key 也是强引用会有什么问题?这个弱引用设计的副作用是什么?

3. 你和同事维护一个 Web 应用,线上出现 bug:用户 A 登录后看到了用户 B 的购物车。经排查,是 `ThreadLocal<UserContext>` 在某个未登录接口里忘了 `remove`,线程复用时串号了。请写出正确的代码模板(涵盖 try-finally-remove),并分析为什么「99% 的请求正确但 1% 串号」这种模式在生产上特别难排查。

4. `InheritableThreadLocal` 可以帮主线程把上下文传给子线程,但如果用线程池就无法实时传递(因为子线程在池中已创建好)。请分析这个限制的根因,并提出解决方案:① 如何向线程池中的线程传递更新的上下文?② 对于 JDK 21+,是否有更好的替代?

5. 你需要设计一个微服务的「请求上下文」组件,需求:① 每个请求需要存储 traceId、userId、tenantId;② 请求处理过程中可能异步执行(一个新的虚拟线程),上下文需要传递过去;③ 局部业务逻辑可能需要临时覆盖 userId(如管理员代客操作)。请设计这个组件——使用 `ThreadLocal` 还是 `ScopedValue`?如何解决异步传递和局部覆盖?写出核心设计决策和关键代码骨架。

> [!答案]
> **1-1** B(每个 Thread 内部持有一个 `ThreadLocalMap threadLocals` 字段,`ThreadLocal.set(value)` 实际是把值放入当前线程的这个 Map 中,key 是 `ThreadLocal` 对象本身)  
> **举一反三**:一句话记住——`ThreadLocal` 不存数据,它只是 key;数据存在 Thread 对象的 Map 里。同一个 `ThreadLocal` 对象在不同线程里 get 到的是不同的值。
>
> **1-2** C(弱引用——`ThreadLocalMap.Entry extends WeakReference<ThreadLocal<?>>`,entry 的 referent 是 `ThreadLocal` 对象)  
> **举一反三**:弱引用的语义:GC 时只要对象只剩下弱引用,就会被回收。这是特意设计的——当 `ThreadLocal` 对象本身没有外部引用时,让它被 GC 回收。
>
> **1-3** A(value 是强引用——`Entry` 中存的是 `Object value`,由 Entry 直接持有强引用)  
> **举一反三**:这就是泄漏的伏笔——key 被 GC 回收后,value 仍然被 Entry 强引用,无法回收。如果线程还活着(线程池),value 就一直占着内存。
>
> **1-4** B(复用+泄漏——线程池核心线程长期存活,`ThreadLocalMap` 不清空,前一个任务的上下文残留,后一个任务读到脏数据;且 value 强引用链不断,GC 无法回收)  
> **举一反三**:这是 ThreadLocal 在 Web 应用中排名第一的故障模式。表现症状:偶尔串号、内存缓慢增长、Full GC 后也不释放。排查方向:jstack 看线程 → 线程栈帧关联到业务操作,发现复用了不应该看到的数据。
>
> **1-5** B(子线程创建时,JVM 在 `Thread.init()` 中检查父线程的 `inheritableThreadLocals`,将其 Entry 浅拷贝到子线程的 `inheritableThreadLocals` 中。父子各有一份独立副本,互不影响)  
> **举一反三**:这意味着 `InheritableThreadLocal` 只在 `new Thread` 时有效——线程池的线程在任务提交前早就创建好了,不会再走 init 逻辑,所以线程池场景下 `InheritableThreadLocal` 不生效。这也是它逐渐被淘汰的原因之一。
>
> **1-6** B(Web 请求上下文是 `ThreadLocal` 的经典适用场景——一线程一请求,上下文绑定在线程上,`HandlerInterceptor` preHandle 时 set,afterCompletion 时 remove)  
> **举一反三**:判断场景是否适用 `ThreadLocal` 的三问:① 数据是否需要线程隔离?② 线程是否会被复用(如果是→必须 remove)?③ 是否有更好的传参方式(如方法参数、DI)?
>
> **1-7** B(四步链条:Thread 持有 ThreadLocalMap → ThreadLocalMap 持有 Entry[] → Entry.value 是强引用 → 线程长期存活(线程池中核心线程) → ThreadLocalMap 不被 GC → value 不被 GC → 泄漏)  
> **举一反三**:ThreadLocal 的 `get/set/remove` 方法在访问时有机会清理过期的 Entry(key 为 null 的)——这是设计上的「惰性清理」。但如果线程长期不访问该 ThreadLocal,清理不触发,泄漏累积。所以 `remove()` 不是推荐,是必须。
>
> **1-8** A(线程结束后,Thread 对象不再被 GC Root 引用,Thread → ThreadLocalMap → Entry[] → value 全链不可达,GC 回收。所以「普通线程 + ThreadLocal」不会泄漏——泄漏只发生在「线程池中线程长期存在」的情况)  
> **举一反三**:这个对比解释了为什么面试总强调「线程池中的 ThreadLocal 泄漏」——单次创建的线程,线程结束一切释放;线程池中的核心线程长生不老,value 就不死。理解这个区别是面试中展现深度的关键。
>
> **1-9** B(finally 块中 remove——try { tl.set(val); doWork(); } finally { tl.remove(); }——确保无论正常返回还是抛异常,上下文都被清除)  
> **举一反三**:更好的方式:在 Web 框架的拦截器(Interceptor)或 Filter 层统一 remove,而不是在每个业务方法里重复。这样只需一处维护,杜绝遗忘。Spring 的 `RequestContextHolder` 就是这种做法——在每个请求结束后由 `RequestContextFilter` 统一清理。
>
> **1-10** B(ScopedValue 的三重优势:不可变(不能 set 只能绑定,杜绝串号)、作用域(自动清理,不需要 remove)、虚拟线程友好(阻塞挂载时自动传递,不需要 InheritableThreadLocal 的拷贝)—这些特性让它在虚拟线程中替代 ThreadLocal 时无泄漏、无串号)  
> **举一反三**:`ScopedValue` 是目前 JDK 对 `ThreadLocal` 问题的官方答案。但它不是万能替代——只适用于「设置一次、在作用域内不可变」的场景。如果需要在线程内多次修改状态,仍需要 `ThreadLocal` 或其他方案。选型:不变上下文走 `ScopedValue`,可变上下文走 `ThreadLocal` + `remove`。
>
> **2-1** 引用关系图:
> ```
> Thread ──(强引用)──▶ ThreadLocalMap
>                            │
>                        Entry[]  ──▶ Entry ──(弱引用)──▶ ThreadLocal (key)
>                            │                  │
>                            │              (强引用)
>                            ▼                  ▼
>                                           Value (value)
> ```
> 关键:Thread → ThreadLocalMap(强),Entry → ThreadLocal(key,弱引用),Entry → Value(强引用)。不对称设计的目的:key 弱引用——当外部没有 `ThreadLocal` 对象的强引用时,让 `ThreadLocal` 可以被 GC 回收(避免 ThreadLocal 本身的内存泄漏);value 强引用——业务数据的生命周期不应由 ThreadLocal 的引用类型决定,而是由业务逻辑的 `remove()` 控制。如果 value 也变成弱引用,可能导致还在使用中的数据被 GC 回收。  
> **举一反三**:这个设计体现了「把内存管理的维度拆分开」的思想——key 的生命周期由 JVM 引用链 GC 管理,value 的生命周期由程序员 `remove()` 管理。两条线独立,各司其职。
>
> **2-2** key 为弱引用的目的:当 `ThreadLocal` 对象本身不再被引用时(如方法结束,局部变量 `ThreadLocal tl` 出栈),external 强引用消失,只剩 Entry 内的弱引用 → GC 回收 ThreadLocal。如果 key 强引用:只要线程不结束(HashMap 不销毁),ThreadLocal 对象就永远不会被 GC——即使业务代码已经不用它了。线程池场景下,几千个过期的 ThreadLocal 对象常驻内存。副作用:key 被 GC 回收后变成 null,但 value 仍被 Entry 强引用 → 出现 key=null,value 不为 null 的「僵尸 Entry」。ThreadLocalMap 有这个设计:在 get/set/remove 时触发 `expungeStaleEntry()` 清理僵尸 Entry。但惰性清理不能覆盖所有情况——如果线程长期不访问该 ThreadLocal,清理不会触发,value 一直滞留在 Map 中 → 内存泄漏。  
> **举一反三**:这个副作用就是 ThreadLocal 内存泄漏的根因——弱引用 key 让 ThreadLocal 可被 GC(好),但 value 强引用让业务数据赖在 Map 里不走(坏)。如果用 weak value + weak key 是完美的 GC 友好方案,但那需要 WeakValueMap(JDK 不提供,Guava `MapMaker` 有)。
>
> **2-3** 正确代码模板:
> ```java
> // 拦截器或 Filter 层
> public void doFilter(ServletRequest req, ServletResponse resp, FilterChain chain) {
>     UserContext ctx = extractUserFromRequest(req);
>     UserContextHolder.set(ctx);
>     try {
>         chain.doFilter(req, resp);
>     } finally {
>         UserContextHolder.remove(); // 必须 finally
>     }
> }
> ```
> 「99% 正确 1% 串号」难排查的原因:由于线程池中线程数量有限(如 200 个),大部分请求结束后都走了 `remove`,只有少数线程在未登录接口或异常路径上跳过了 `remove`。如果只有 2 个线程残留,用户 B 的请求恰好分配到线程 #42(脏数据)的概率很低——但一旦被调度到,就串号。这种偶发 bug 无法在开发环境复现,日志里也没有异常——因为业务逻辑本身是正确的,只是读到了「不是自己」的数据。排查方法:在 `ThreadLocal.set()` 时打日志(线程名+被覆盖的旧值),一旦出现旧值不为 null,就定位到未 remove 的代码路径。  
> **举一反三**:线程池复用引起的偶发性 bug 是生产环境最难排查的——因为需要「特定线程 + 特定请求 + 特定历史」三者同时满足。排查思路:线程维度 → 栈帧维度 → 请求历史维度,三者交叉验证。
>
> **2-4** 根因:`InheritableThreadLocal` 的拷贝只在 `new Thread()` 时发生——JVM 在 `Thread.init()` 中拷贝父线程的 `inheritableThreadLocals`,之后父线程的修改不会同步到已创建的子线程。线程池的核心线程在池启动时就创建好了,任务提交后只复用这些已存在的线程,不会再走 init 路径。解决方案:① 线程池场景下不依赖 `InheritableThreadLocal`,而是用阿里 `TransmittableThreadLocal`(TTL)——它拦截线程池的 `execute/submit` 方法,在任务提交时自动拷贝当前父线程的上下文到任务执行线程,执行完恢复。② JDK 21+ 的更好替代:`ScopedValue`——它通过 JVM 内置支持,在结构化并发 `StructuredTaskScope` 中自动传播到子虚拟线程,不需要拷贝,且作用域自动管理。如果必须用平台线程 + `InheritableThreadLocal`,加上 `ScopedValue.where(...).run(...)` 包裹也能自动传播。  
> **举一反三**:上下文传播经历了三代演进——v1:ThreadLocal(手动 set/remove) → v2:InheritableThreadLocal(仅 new Thread 时拷贝) → v3:TransmittableThreadLocal(线程池友好) → v4:ScopedValue(不可变 + 自动作用域)。了解这个演进线,就能理解为什么 JDK 社区花了十年才走到「正确的上下文传递方案」。
>
> **2-5** 设计决策:① 用 `ScopedValue` 而非 `ThreadLocal`——需求中的上下文是请求级别的不可变信息(traceId/userId/tenantId),天然适配 ScopedValue 的不可变和作用域自动清理。避免手动 `remove()` 和串号。② 异步传递:`ScopedValue` 在结构化并发(`StructuredTaskScope`)中自动传播——虚拟线程在 `where(...).run(...)` 内 fork 出的子虚拟线程自动继承 ScopedValue。如果用 CompletableFuture 异步编排,用 `ScopedValue.getWhere(...).thenRun(...)` 在异步方法里重新绑定。③ 局部覆盖:ScopedValue 不可变,不能 `set`。解决方案——在需要覆盖 userId 的地方,用新的 ScopedValue 嵌套:原始 ScopedValue 不变,创建 `ScopedValue.newInstance()` 存代客 userId。
> ```java
> // 定义三个 ScopedValue
> private static final ScopedValue<String> TRACE_ID = ScopedValue.newInstance();
> private static final ScopedValue<String> USER_ID  = ScopedValue.newInstance();
> private static final ScopedValue<String> TENANT_ID = ScopedValue.newInstance();
>
> // 入口:绑定请求上下文
> ScopedValue.where(TRACE_ID, traceId)
>           .where(USER_ID, userId)
>           .where(TENANT_ID, tenantId)
>           .run(() -> {
>               // 1. 正常业务,上下文可见
>               processRequest();
>               // 2. 异步执行,用 StructuredTaskScope 自动传播
>               try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
>                   scope.fork(() -> { asyncWork(); return null; });
>                   scope.join();
>               }
>               // 3. 局部覆盖:管理员代客操作
>               ScopedValue.where(USER_ID, customerUserId)
>                          .run(() -> doAsCustomer());
>           });
> // 出了 run() 自动清理,不需要 remove()
> ```
> 核心设计原则:① ScopedValue 存不可变上下文,ThreadLocal 存可变状态 ② 异步传递靠结构化并发或 ScopedValue API ③ 局部覆盖用嵌套 ScopedValue 而非修改。
> **举一反三**:从 ThreadLocal → ScopedValue 的本质思维转变:从「设置-使用-清理」的 imperative 模型转成「绑定-作用域-自动释放」的 declarative 模型。前者依赖程序员自律,后者靠 API 强制保证——可靠性从人治变成机制治。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
