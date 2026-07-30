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

## 🎯 随堂练习

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. 为什么 `synchronized` 在三个实例下必然防不住超卖?
   - A) 它性能不够　B) 它的锁在**堆里**,只有当前 JVM 进程看得见;三个实例就是三把各管各的锁　C) 它不支持高并发　D) 它需要配置才生效
2. `SET key token NX EX 10` 里,`NX` 和 `EX` 分别是?
   - A) NX = 覆盖写,EX = 过期　B) **NX = 不存在才设(抢锁),EX = 顺带设过期(防死锁)**,一条命令原子完成　C) NX = 新建,EX = 独占　D) 两者都是过期设置
3. 如果把 `setnx` 和 `expire` 拆成两条命令写,风险是?
   - A) 性能差　B) 两条之间若宕机,锁**永远不过期** → 永久死锁　C) 会误删　D) 没有风险
4. 「锁误删」是怎么发生的?
   - A) 手动删错了 key　B) A 的业务比 TTL 长,锁自动过期后 B 抢到;A 醒来 `finally` 里无脑 `delete`,删掉的是 **B 的锁**　C) Redis 主从同步延迟　D) token 重复
5. 锁 value 存一个 UUID token 的作用是?
   - A) 便于统计　B) 证明「这把锁是我的」,释放前先比对　C) 防止 key 冲突　D) 加密
6. 为什么释放锁必须用 Lua 脚本?
   - A) Lua 更快　B) 「比对 token + 删除」两步必须**原子**,否则中间锁可能过期被别人拿走,仍会误删　C) Redis 只支持 Lua 删除　D) 为了兼容集群
7. Redisson 的「看门狗」解决的是哪个坑?
   - A) 锁误删　B) 加锁非原子　C) **锁未续期** —— 默认 30s TTL,每 10s 自动续期,业务没结束锁不会掉　D) 可重入
8. 生产环境分布式锁的推荐选型是?
   - A) 自己从零手撸 SET NX　B) **Redisson** —— 可重入、自动续期、Lua 释放都封好了　C) 一律用 ZooKeeper　D) 用数据库行锁
9. ZooKeeper 实现分布式锁的特点是?
   - A) 最轻最快　B) 强一致(CP),临时节点掉线锁自动释放,但更重、写性能低于 Redis　C) 不需要运维　D) 不支持超时
10. `finally` 里直接 `redis.delete(key)` 的问题在于?
    - A) 可能抛异常　B) 不验证锁的归属,可能删掉别人正持有的锁　C) 删除太慢　D) 没有问题

> [!答案]
> **1-B**　锁在进程内,进程之间互不相认。**举一反三**:所以「本地测试没问题,一上集群就超卖」是极其经典的事故模式。
> **2-B**　一条命令同时完成抢锁和设过期。**举一反三**:原子性是分布式锁的第一要求 —— 任何「分两步」的地方都是潜在的坑。
> **3-B**　中间宕机就锁死了。**举一反三**:这也是为什么早期教程里的两步写法被淘汰 —— Redis 后来把 `EX` 参数直接并进了 `SET`。
> **4-B**　业务超时是罪魁。**举一反三**:这个坑说明「给锁设 TTL」本身也有代价 —— TTL 太短会误删,太长会在宕机时长时间锁死。
> **5-B**　token 是所有权凭证。**举一反三**:没有 token 就无法区分「我的锁」和「别人的锁」,误删无法避免。
> **6-B**　判断和删除之间存在时间窗。**举一反三**:这是并发编程里 check-then-act 竞态的又一次出现 —— 和第 42 话的 `stock--` 同构。
> **7-C**　看门狗自动续期。**举一反三**:它也解释了为什么手写锁很难做对 —— 续期要另起线程、还要处理线程死亡时的清理。
> **8-B**　别自己从零手撸生产锁。**举一反三**:Redisson 还支持公平锁、读写锁、信号量,把并发原语整套搬到了分布式环境。
> **9-B**　CP 方案,强一致但更重。**举一反三**:选型本质是 CAP 取舍 —— Redis 偏 AP(可用性优先),ZooKeeper 偏 CP。
> **10-B**　它不验明正身。**举一反三**:正确写法是「验 token + Lua 原子删」,或者直接用 Redisson 的 `unlock()`。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*