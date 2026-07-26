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

## 九、项目检查点 · 并发特训 6/10

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

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
