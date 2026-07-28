---
title: "《从零开始学 Java》48 · 分布式锁(synchronized 只锁得住一个 JVM)"
date: 2026-09-10
summary: "缓存加好后水平扩展成三个实例,库存又超卖了——因为第五季那把 synchronized 只在单个 JVM 内有效。这一话把锁搬到 Redis 外面,从手写 SET NX 到 Redisson,并逐一拆掉三个致命坑:加锁非原子、锁误删、锁未续期。"
tags: [Java, Java漫画, 分布式锁, Redis, Redisson, 阿零与豆豆]
---

# 《从零开始学 Java》48 · 分布式锁(synchronized 只锁得住一个 JVM)

> 连载特刊 · 第六季「分布式时代」第 3 话 · 基线 Java 25 · Spring Boot 4.x · 项目检查点:加缓存层 → 分布式扣减。
> 承接:上一话缓存挡住读、DB 松了口气,阿零顺势把应用**水平扩展成 3 个实例**——然后库存又超卖了。

---

## 一、需求:三个实例卖同一份库存,别再超卖

第五季有一场"超卖事故",阿零用 `synchronized` 给扣库存加锁,单机测试稳如泰山。可这次一上三实例,最后一杯拿铁**卖给了两个人**。

阿零满脸不服:「我明明加锁了啊?!」豆豆敲了敲那三台机器:「`synchronized` 锁的是**一个 JVM 里的对象**。你现在有**三个 JVM**,就是三把各锁各的锁——A 实例的锁,管不了 B 实例。库存却是**共享的一份**。要锁,就得把锁放到三个实例**都能看见的地方**——比如 Redis。」

---

## 二、漫画 · 三把各管各的锁

> **〔1〕** 三台一模一样的咖啡站并排开张,门口各挂一把锁。可后厨的库存本子**只有一本**,三家共用。
> 豆豆(叼豆子):「`synchronized`、`ReentrantLock`——都是 JVM 进程内的锁。跨进程?它俩两眼一抹黑。」

> **〔2〕** 最后一杯拿铁。A 站和 B 站几乎同时查库存:都读到「剩 1」,都判断「够,扣!」——Race 双胞胎一边一个,坏笑着击掌。
> 阿零:「查的时候都是 1……然后各扣各的,变成 -1?」豆豆:「这就是**跨实例的超卖**。本地锁救不了你。」

> **〔3〕** 豆豆掏出一把挂在 Redis 上的**公共大锁**:「谁想扣库存,先来 Redis 抢这把锁;抢到的进后厨,没抢到的门口等。三个实例,一把锁。」
> 阿零:「`SET key value NX` 抢锁,我会!」豆豆:「会个开头。你还有**三个坑**没见过。」

> **〔4〕** 三个坑怪探头:一个把「抢锁」和「设过期」掰成两半(非原子);一个删掉了**别人**的锁;一个在业务还没干完时锁**自己过期**了。
> 豆豆:「分布式锁不是抢到就完事——**抢得原子、删得干净、扛得住超时**,一个都不能少。」

---

## 三、本话目标

- 想清楚 `synchronized` 为何在多实例下**必然失效**;
- 用 Redis `SET NX EX` 手写一把最朴素的分布式锁;
- 拆掉三个致命坑:**加锁非原子 / 锁误删 / 锁未续期**;
- 用 Redisson 拿到生产级的锁(含看门狗自动续期);
- 用并发测试证明"最后一杯只卖一次"。

---

## 四、原理图:把锁从 JVM 里搬出来

```text
【单机 · 第五季】                    【多实例 · 本话】
 一个 JVM                           实例A   实例B   实例C
 ┌─────────────┐                     │(锁?) │(锁?) │(锁?)
 │ synchronized │← 锁在堆里            └───┬──┴───┬──┴──┬──┘
 │  扣库存       │  只有这个进程看得见         └──────┼─────┘
 └─────────────┘                            ▼
                                    ┌──────────────────┐
                                    │  Redis 一把公共锁   │← 谁抢到谁进
                                    │  SET lock uuid NX  │
                                    └──────────────────┘
                                    锁在进程之外 → 三个实例都认它
```

---

## 五、代码:从手写 SET NX 起步

先看最朴素的一版——用 Redis 一条命令抢锁(`NX`=不存在才设,`EX`=顺带设过期,防死锁):

```java
public void deductStock(long coffeeId) {
    String key = "lock:stock:" + coffeeId;
    String token = UUID.randomUUID().toString();   // 唯一标识:证明"这把锁是我的"
    // SET key token NX EX 10 —— 一条命令同时"抢锁 + 设过期",原子
    Boolean ok = redis.opsForValue().setIfAbsent(key, token, Duration.ofSeconds(10));
    if (!Boolean.TRUE.equals(ok)) throw new BizException("手慢了,稍后再试");  // 没抢到
    try {
        Coffee c = mapper.findById(coffeeId);
        if (c.stock() <= 0) throw new BizException("已售罄");
        mapper.deductStock(coffeeId);              // 临界区:只有持锁者能进
    } finally {
        redis.delete(key);                         // ← 释放锁(先埋个雷,下一节引爆)
    }
}
```

---

## 六、故意制造一个 Bug:锁误删

场景:A 抢到锁,业务却卡了 11 秒(比 10 秒 TTL 还长)。第 10 秒锁**自动过期**,B 立刻抢到同一把锁进了后厨;第 11 秒 A 醒来,`finally` 里一句 `redis.delete(key)`——**把 B 正持有的锁删了**。于是 C 又能抢锁进来……锁形同虚设。

```java
} finally {
    redis.delete(key);   // ← 致命:不判断这把锁到底是不是自己的,直接删
}
```

---

## 七、读懂现象:锁被"别人"删掉了

打上日志跑并发,能看到诡异的一幕:

```text
[实例A] 抢到锁 token=aaa, 开始扣库存(慢)...
[Redis] lock:stock:1 到期自动删除            ← A 还没干完,锁没了
[实例B] 抢到锁 token=bbb, 开始扣库存...
[实例A] 业务结束, redis.delete(lock:stock:1)  ← A 删掉的其实是 B 的锁!
[实例C] 抢到锁 token=ccc ...                  ← 锁失控,又超卖
```

三个坑一次暴露:① 早期若把 `setnx` 和 `expire` 分两条写,中间宕机就**永久死锁**(所以第五节用 `SET NX EX` 一条搞定,原子);② `finally` 无脑 `delete` → **锁误删**;③ 业务比 TTL 长 → 锁**提前过期**,续期缺失。

> **豆豆锐评 · 释放锁必须"验明正身 + 原子"**
> 正确的释放要**先比对 token 是不是自己的,再删**,而且这两步必须**原子**——否则"比对通过"到"删除"之间锁又可能过期被别人拿走,还是误删。原子地做"判断 + 删除",Redis 里就得靠 **Lua 脚本**一次执行。

---

## 八、修复:Lua 原子释放 + Redisson 看门狗,并测试

**手写版**的正确释放——一段 Lua 脚本原子完成"是我的才删":

```java
private static final String UNLOCK =
    "if redis.call('get', KEYS[1]) == ARGV[1] " +
    "then return redis.call('del', KEYS[1]) else return 0 end";

public void unlock(String key, String token) {
    redis.execute(new DefaultRedisScript<>(UNLOCK, Long.class),
                  List.of(key), token);   // 判断+删除,一次原子执行
}
```

但"未续期"这个坑手写起来很烦(要另起线程定时给锁续命)。生产环境直接上 **Redisson**,它把这些都封装好了:

```java
RLock lock = redisson.getLock("lock:stock:" + coffeeId);
lock.lock();   // 抢锁;默认 30s TTL,内置"看门狗"每 10s 自动续期,业务没结束锁不会掉
try {
    Coffee c = mapper.findById(coffeeId);
    if (c.stock() <= 0) throw new BizException("已售罄");
    mapper.deductStock(coffeeId);
} finally {
    lock.unlock();   // 内部就是"验 token + Lua 原子删",还支持可重入
}
```

并发测试:100 个线程抢 1 份库存,断言**只成功一次、不超卖**:

```java
@Test
void only_one_wins_the_last_cup() throws Exception {
    seedStock(1L, 1);                      // 只剩 1 杯
    var success = new AtomicInteger();
    try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
        var futures = new java.util.ArrayList<Future<?>>();
        for (int i = 0; i < 100; i++) futures.add(pool.submit(() -> {
            try { orderService.deductStock(1L); success.incrementAndGet(); }
            catch (BizException ignore) {}   // 抢不到锁 / 售罄
        }));
        for (var f : futures) f.get(10, TimeUnit.SECONDS);
    }
    assertEquals(1, success.get());                 // 恰好一人成功
    assertEquals(0, mapper.findById(1L).stock());   // 库存 0,绝不 -1
}
```

> **🔀 豆豆的多解台 · 分布式锁三种实现**

| 实现 | 怎么锁 | 优点 | 坑 / 代价 |
|---|---|---|---|
| **Redis 手写 SET NX** | `SET k v NX EX` + Lua 释放 | 轻、快、无额外中间件 | 要自己处理续期/可重入;主从切换极端下锁可能丢 |
| **Redisson**(推荐) | `RLock`,看门狗自动续期 | 开箱即用:可重入、续期、公平锁、Lua 封好 | 引入依赖;仍受 Redis 主从一致性限制 |
| **ZooKeeper** | 临时顺序节点 + Watch | 强一致(CP),节点掉线锁自动释放 | 重、写性能低于 Redis,运维成本高 |

豆豆锐评:**绝大多数业务用 Redisson**——省心、性能好、坑都替你填了。对"绝对不能出错"的金融级场景,才考虑 ZooKeeper 这种 CP 方案。**别自己从零手撸生产锁,续期和主从边界很容易写错。**

---

## 九、项目检查点 · 豆豆咖啡站(分布式扣减)

```text
新增:Redisson 分布式锁,三实例共抢一把锁,库存扣减一致
填掉:非原子(SET NX EX 一条命令)· 锁误删(验 token + Lua)· 未续期(看门狗)
用到:Redis、Lua 脚本、Redisson RLock、UUID token
还没有:下单还在同步等制作/发券/加积分,链路太长 —— 早高峰要堵
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 分布式锁原理与实现 | 高并发岗必考,"超卖怎么解"标准题 |
| 本地锁 vs 分布式锁 | 理解"多实例一致性"的入门槛 |
| Redisson / Lua 原子操作 | 体现真正落地过、踩过坑 |
| 锁续期 / 锁误删的规避 | 区分"背过概念"和"写对了"的细节分 |

---

## 十一、下一话悬念

锁虽然保住了库存,却让扣减变成了"排队进后厨",高峰期一样慢。更要命的是:下单接口里塞着一长串——扣库存、通知后厨制作、发优惠券、加积分……**同步一条条干完才返回**,顾客等到花儿都谢了。

> 下一话《MQ 派单站》:阿零把下单和制作**拆开**——下单只管把"派单"丢进消息队列就立刻返回,后厨那头慢慢消费制作。异步、解耦、削峰一次到位。但消息这东西会**丢、会重、会乱序**,阿零的咖啡马上要被做两遍。

---

## 随堂练习
先独立作答，再展开参考要点核对思路。

### 一、选择题（10 道）

**1.** Redis 分布式锁核心命令 `SET lock_key value NX EX 30` 中，`NX` 和 `EX` 分别表示什么？
- A) NX=键不存在时设置，EX=过期时间单位是秒　B) NX=键存在时设置，EX=过期时间单位是毫秒　C) NX=永不超时，EX=额外参数　D) NX=数值递增，EX=扩展模式

**2.** `synchronized` 在多实例部署下为什么必然失效？
- A) synchronized 在 Java 25 中被废弃　B) synchronized 的锁是 JVM 进程内对象锁，不同 JVM 各锁各的互不感知　C) synchronized 不支持网络通信　D) 多实例部署时线程数太多导致死锁

**3.** 分布式锁中"锁误删"描述的是什么场景？
- A) 用户手动删了 Redis 的 lock key　B) A 的锁到期后被 B 抢到，A 在 finally 里无脑 `delete(key)` 把 B 的锁删了　C) 多个实例同时抢锁导致 Redis 崩溃　D) Redis 主从切换导致锁数据丢失

**4.** 解决"锁误删"的正确方式是什么？
- A) 把 TTL 设得足够长　B) 用 Lua 脚本原子地执行"比对 token 是否匹配 → 匹配则删除"　C) 用 `ThreadLocal` 传递 token　D) 在 `finally` 里先 `get(key)` 判断 token 再 `del(key)`

**5.** Redisson 的"看门狗"（watchdog）解决的是什么问题？
- A) 防止 Redis 主从切换丢锁　B) 业务未结束时自动给锁续期，防止锁提前过期　C) 检测并清理死锁　D) 限制同时持有锁的线程数量

**6.** Redisson 默认锁 TTL 和看门狗续期间隔是多少？
- A) 10 秒 / 3 秒　B) 30 秒 / 10 秒　C) 60 秒 / 20 秒　D) 无默认值，必须手动指定

**7.** 手写 SET NX 分布式锁时如果不设过期时间（不加 EX/PX），会发生什么？
- A) 锁永不过期，持锁进程崩溃后其他线程永远抢不到——死锁　B) Redis 60 秒后自动清理　C) 每次释放后 key 自动过期　D) 没有任何问题

**8.** ZooKeeper 分布式锁相比 Redis 分布式锁（Redisson）的核心优势是什么？
- A) 性能更高　B) 强一致性（CP），极端场景下不会丢锁　C) 代码更简单　D) 不需要额外部署中间件

**9.** 释放 Redisson 锁时，为什么要判断 `lock.isHeldByCurrentThread()`？
- A) 防止在未持有锁的线程中调用 unlock 抛出异常　B) 防止因 tryLock 超时返回 false 后，finally 中释放了别人的锁　C) Redisson 要求释放锁前必须调用此方法　D) 这是 Java 语法要求

**10.** 手写 Redis 分布式锁的**三个致命坑**是哪三个？
- A) 慢查询、大 key、热 key　B) 加锁非原子、锁误删、锁未续期　C) 内存溢出、CPU 飙升、网络断开　D) 连接池耗尽、序列化失败、超时

> [!答案]
> **1-A**　`NX`（Not eXists）= 不存在才 SET 成功（抢锁语义）；`EX 30`=30 秒过期（防死锁）。　举一反三：老版本 `SETNX`+`EXPIRE` 分两条命令，中间宕机就死锁——`SET NX EX` 一条命令解决了原子性问题。
> 
> **2-B**　`synchronized` 和 `ReentrantLock` 是 JVM 进程内锁，锁在堆内存对象头里。三实例=三 JVM=三把各锁各的锁，A 锁管不了 B 线程。　举一反三：分布式锁把锁从 JVM 内部搬到进程外共享存储（Redis），三个实例都认同一把锁。
> 
> **3-B**　完整链条：A 抢到锁，业务耗时 11s 超出 10s TTL→第 10s 锁过期，B 抢到→第 11s A 醒来 `finally` 里 `delete(key)` 删掉的是 B 的锁。　举一反三：解决需两点：① 唯一 token（UUID）标识持有者；② 比对+删除必须原子——用 Lua 脚本一条执行。
> 
> **4-B**　D 有致命时序窗口——`get` 和 `del` 之间锁又可能过期被抢走，还是误删。必须用 Lua 脚本原子执行。　举一反三：这就是生产不手写锁的原因——Lua、续期、可重入不封装好，随便一个时序窗口就是线上事故。
> 
> **5-B**　看门狗机制：默认 TTL=30s，看门狗每 10s 检查，若业务未结束且锁仍被持有，自动续回 30s。　举一反三：如果手动指定 `leaseTime`（如 `lock(10, SECONDS)`），看门狗不启动——适用于能精确估算耗时的场景。
> 
> **6-B**　默认锁 TTL=30s，看门狗续期间隔=10s（TTL/3）。　举一反三：Redisson 实现可重入锁——同一线程多次 `lock()` 内部计数器记录重入次数，`unlock()` 减到 0 才真正释放。
> 
> **7-A**　不设过期，持锁进程崩溃或被 kill 后 `finally` 的 `delete` 不执行，lock key 永远留在 Redis，所有实例抢不到——死锁。　举一反三：即使设了过期也要考虑续期——业务耗时可超 TTL 就需要看门狗，单纯 SET NX EX 只适合极短任务。
> 
> **8-B**　ZooKeeper 基于 ZAB 协议（CP 系统），临时顺序节点+Watch 机制理论上更安全——节点掉线锁自动释放。　举一反三：ZK 写性能远低于 Redis、运维重。绝大多数业务 Redisson 够用，只有"绝对不能出错"的金融场景才上 ZK。
> 
> **9-B**　`tryLock(waitTime, SECONDS)` 超时返回 false（没抢到锁），`try` 块抛异常后 `finally` 里 `unlock()` 会去释放一把不属于自己的锁。`isHeldByCurrentThread()` 确保只有持锁者才释放。　举一反三：`lock.lock()`（阻塞等锁）则 `finally` 里可放心 `unlock()`——`lock()` 要么拿到锁才返回，要么被中断。
> 
> **10-B**　① 非原子——`SETNX`+`EXPIRE` 分开写中间宕机就死锁（解决：`SET NX EX` 一条）；② 锁误删——不判断 token 直接删（解决：UUID+Lua 原子比对删除）；③ 未续期——业务比 TTL 长导致锁提前过期（解决：看门狗）。　举一反三：这三个坑是分布式锁面试核心考点，能完整说出且给方案 = 真上过手。

### 二、解答题（3 道）

**1.** 为什么分布式锁需要"锁续期"？描述 Redisson 看门狗的工作机制。

**2.** 对比 Redis（手写 SET NX）、Redisson、ZooKeeper 三种分布式锁方案，说明各自适用场景和核心权衡。

**3.** "锁误删"是怎么发生的？为什么说用 Java 代码在 `finally` 里先 `get` 判断 token 再 `del` 仍然可能出错？

> [!答案]
> **1**　锁续期解决"业务执行时间超过锁过期时间"——若 TTL=10s 但业务跑 15s，第 10s 锁自动过期→另一线程抢到→两个线程同时执行临界区。Redisson 看门狗：默认 TTL=30s，每 10s（TTL/3）检查，若业务未结束且锁仍被持有，自动将 TTL 续回 30s；`unlock()` 后看门狗停止。　举一反三：手动指定 `leaseTime` 时看门狗不启动，适用于能精确估算耗时的场景。
> 
> **2**　① Redis 手写 SET NX：最轻，无额外依赖，但需自处理续期/可重入——只适合极短排他场景（如秒杀），不建议生产手写。② Redisson：开箱即用——看门狗续期、可重入、公平锁全封装，大部分业务的默认选择；仍受 Redis 主从异步复制的极端丢锁风险。③ ZooKeeper：CP 强一致，临时节点+Watch 机制，节点掉线锁自动释放——适合金融级"绝不能出错"场景；写性能低、运维重。　举一反三：选择顺序——大多数业务 Redisson 够用；一致性要求极高才上 ZK；手写只用于理解原理。
> 
> **3**　锁误删的时序窗口：A 持有锁（token=aaa），业务执行中→锁 TTL 到期自动删除→B `SET NX` 拿到锁（token=bbb）→A 业务结束 `finally` 里 `redis.delete(key)` 删掉了 B 的锁。Java 代码 `get(key)+equals(token)+del(key)` 三步非原子：`get` 发现 token=aaa→但在 `del` 之前锁又过期→B 拿到锁→A 还是删了 B 的锁。　举一反三：必须用 Lua 脚本在 Redis 服务端一条 EVAL 原子执行 get+比对+del，中间不会有其他命令插入。

### 三、代码题（2 道）

**1.** 用 Redisson 实现带分布式锁的扣库存方法：锁 key 为 `lock:stock:{coffeeId}`，确保异常时也能正确释放锁且判断 `isHeldByCurrentThread()`。

**2.** 写一段 Lua 脚本和 Java 调用方法，实现"原子地判断 token 是否匹配，匹配则删除 key"的分布式锁释放逻辑。

> [!答案]
> **1 验收**　```java
> public void deductStock(Long coffeeId) {
>     RLock lock = redisson.getLock("lock:stock:" + coffeeId);
>     lock.lock();  // 阻塞等锁，看门狗自动续期
>     try {
>         Coffee c = mapper.findById(coffeeId);
>         if (c == null || c.stock() <= 0) throw new BizException("已售罄");
>         mapper.deductStock(coffeeId);
>     } finally {
>         if (lock.isHeldByCurrentThread()) lock.unlock(); // 防误释放
>     }
> }
> ```　举一反三：若希望等待超时就返回（不阻塞），用 `lock.tryLock(3, TimeUnit.SECONDS)`——3 秒内抢不到返回 false，提示"手慢了"。
> 
> **2 验收**　```java
> private static final String UNLOCK_SCRIPT =
>     "if redis.call('get', KEYS[1]) == ARGV[1] " +
>     "then return redis.call('del', KEYS[1]) else return 0 end";
> 
> public void unlock(String lockKey, String token) {
>     var script = new DefaultRedisScript<>(UNLOCK_SCRIPT, Long.class);
>     Long result = redis.execute(script, List.of(lockKey), token);
>     // result==0→token不匹配(别人的锁或已过期)，静默处理
> }
> ```　举一反三：调用方在 `finally` 中始终调用 `unlock(lockKey, token)`，持锁时存的 UUID token 释放时用同一个 token 比对，保证只有持锁者能释放。

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
