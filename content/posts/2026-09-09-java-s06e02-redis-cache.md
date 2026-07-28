---
title: "《从零开始学 Java》47 · Redis 高速取餐柜(穿透 · 击穿 · 雪崩三连)"
date: 2026-09-09
summary: "菜单几乎不变却被反复查库。这一话给咖啡站装上 Redis 高速取餐柜,用 Cache-Aside 把热门菜单缓存进内存,DB 压力立降;但阿零随即撞上缓存三大暴击——穿透、击穿、雪崩,并逐一配上解法:空值/布隆、互斥锁/逻辑过期、随机 TTL/多级缓存。"
tags: [Java, Java漫画, Redis, 缓存, 缓存穿透, 阿零与豆豆]
---

# 《从零开始学 Java》47 · Redis 高速取餐柜(穿透 · 击穿 · 雪崩三连)

> 连载特刊 · 第六季「分布式时代」第 2 话 · 基线 Java 25 · Spring Boot 4.x · 项目检查点:单体 v5 → 加缓存层。
> 承接:上一话压测确认瓶颈主要在数据库——菜单几乎不变,却被每个请求反复查库。这一话把它挡在 DB 前面。

---

## 一、需求:让不变的菜单别再反复查库

上一话的结论很扎心:菜单一天改不了几次,却被成千请求**每次都查一遍数据库**,连接池一大半耗在这。豆豆:「这种'读多写少、又不常变'的数据,是缓存的天选之子。给它装个**高速取餐柜**——第一次去后厨(DB)拿,拿到就摆进柜子(Redis);后面的人直接从柜子取,毫秒级,根本不惊动后厨。」

Redis 是跑在内存里的键值数据库,读写走内存 + 网络,比查 MySQL 快一到两个数量级。

---

## 二、漫画 · 取餐柜的甜头与三记暴击

> **〔1〕** 阿零装好 Redis,菜单接口第一次查库回填柜子,之后全走缓存。监控上 DB 的 QPS 唰地掉下来。
> 阿零:「爽!连接池松快了!豆豆我是不是天才?」豆豆(叼豆子):「先别急着飘,缓存有三记暗拳,你一个都没躲过。」

> **〔2〕** 有人疯狂查一杯**根本不存在**的「独角兽拿铁」。柜子里没有 → 每次都穿过柜子去问后厨 → 后厨被问崩。
> 豆豆:「这叫**缓存穿透**:查的数据 DB 里也没有,缓存永远挡不住,请求全穿到库。恶意刷一个不存在的 id,就能打垮你。」

> **〔3〕** 「美式」是顶流,缓存刚好到期失效的**那一瞬间**,几千人同时来买,全部同时扑向 DB。
> 豆豆:「这叫**缓存击穿**:一个**热点 key 过期的刹那**,并发全打到 DB。单个热点,瞬间破防。」

> **〔4〕** 半夜,整柜菜单是同一时间放进去的,于是**同一秒集体过期**,DB 被平地惊雷般的流量掀翻。
> 阿零瘫在椅子上:「……所以缓存不是装上就完事?」豆豆:「对。**穿透、击穿、雪崩**,面试必问,线上必踩。今天一个个拆。」

---

## 三、本话目标

- 用 Spring Data Redis 实现 **Cache-Aside(旁路缓存)**读流程;
- 讲透缓存**穿透 / 击穿 / 雪崩**的区别与成因;
- 给每种坑配上**对应解法**并给出默认推荐;
- 亲手复现一次缓存穿透,读懂 DB 被打崩的现象;
- 用测试证明"第二次读命中缓存、不再打库"。

---

## 四、原理图:Cache-Aside 与三个坑的位置

```text
读菜单请求
   │
   ▼
┌────────────┐  命中   ┌──────────────┐
│ Redis 取餐柜 │───────▶│  直接返回(快)  │
└─────┬──────┘         └──────────────┘
      │ 未命中(miss)
      ▼
┌────────────┐  查到    回填缓存(设 TTL)
│  MySQL 后厨  │────────────────────────▶ 返回
└────────────┘

三个坑各自的位置:
  穿透:查的 key 在 DB 里也不存在 → 永远 miss → 每次都穿到 DB
  击穿:某个热点 key 恰好 TTL 到期 → 那一刻并发全 miss → 全扑 DB
  雪崩:大量 key 在同一时间集体过期 → 同一秒全 miss → DB 瞬间过载
```

---

## 五、代码:装上 Redis,先跑通 Cache-Aside

加依赖(依赖铁律:用到才引):

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

配置(注意 Spring Boot 3.x 起前缀从 `spring.redis` 改成了 `spring.data.redis`,老项目别抄错):

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
```

菜单查询改成"先柜子、后后厨、再回填":

```java
@Service
public class MenuService {
    private final StringRedisTemplate redis;   // Spring 管家注入,底层连着 Redis 连接池
    private final MenuMapper mapper;
    private final ObjectMapper json = new ObjectMapper();
    public MenuService(StringRedisTemplate redis, MenuMapper mapper) {
        this.redis = redis; this.mapper = mapper;
    }

    public Coffee getCoffee(long id) throws Exception {
        String key = "menu:coffee:" + id;
        String cached = redis.opsForValue().get(key);     // 1. 先查柜子
        if (cached != null) return json.readValue(cached, Coffee.class);

        Coffee c = mapper.findById(id);                   // 2. miss 才去后厨
        if (c != null)
            redis.opsForValue().set(key, json.writeValueAsString(c),
                    Duration.ofMinutes(30));              // 3. 回填,带 TTL
        return c;
    }
}
```

> **豆豆旁白**:为什么用 Cache-Aside(应用自己读/回填),而不是让缓存自动同步 DB?因为它**简单、可控、容错好**——Redis 挂了大不了全走 DB,业务不至于崩。它也是工业界最主流的缓存模式。

---

## 六、故意制造一个 Bug:查一个不存在的咖啡

不做任何防护,循环查一个 DB 里根本没有的 `id=99999`(模拟被人恶意刷):

```java
for (int i = 0; i < 10000; i++) menuService.getCoffee(99999L);  // 独角兽拿铁,DB 里没有
```

---

## 七、读懂现象:每一次都穿到了数据库

`id=99999` 查 DB 是 `null`,于是**回填那步被跳过**(代码里 `if (c != null)` 才回填),缓存里永远没有它。结果:一万次请求,一万次 miss,一万次打到 MySQL。开着 SQL 日志能看到刷屏:

```text
==>  Preparing: SELECT * FROM coffee WHERE id = ?
==> Parameters: 99999(Long)
<==      Total: 0
...(以上重复一万遍,DB QPS 直接拉满)
```

配合监控:Redis 命中率是 0%,MySQL 的 QPS 却和请求量一比一——**缓存形同虚设,这就是穿透**。恶意用户只要一直刷不存在的 id,就能绕过缓存直接压垮你的库。

> **🔀 豆豆的多解台 · 缓存三连怎么破?**

| 坑 | 一句话本质 | 解法(可叠加) | 权衡 / 坑 |
|---|---|---|---|
| **穿透** | 查 DB 里也没有的数据,缓存挡不住 | ① **缓存空值**(把 null 也缓存,设短 TTL)② **布隆过滤器**(先问"这 id 可能存在吗",不存在直接拒) | 空值占内存、需在写入时清理;布隆有极小误判率、且不好删元素 |
| **击穿** | 单个**热点 key** 过期瞬间并发全打 DB | ① **互斥锁**(只放一个线程去重建,其余等)② **逻辑过期**(不设真 TTL,值里存过期时间,过期后异步重建、旧值先顶着) | 互斥锁牺牲一点吞吐;逻辑过期实现复杂但不阻塞读 |
| **雪崩** | **大量 key** 同一时间集体过期 / Redis 宕机 | ① **TTL 加随机值**(打散过期时间)② **多级缓存**(本地 Caffeine + Redis)③ Redis **高可用集群** + 服务端**限流降级** | 随机 TTL 最省事必配;多级缓存要处理一致性 |

豆豆锐评:**穿透看"数据存不存在",击穿看"单个热点 key",雪崩看"大批 key 同时失效"**——三者常被背混,记住这三个关键词就不会错。工程上最低成本的一套标配:**空值缓存 + TTL 加随机 + 互斥锁重建热点**,足够挡住绝大多数场景。

---

## 八、修复,并用测试证明缓存真的命中

对穿透,补上"空值也缓存"(设一个很短的 TTL,避免长期占内存),并在原代码回填分支保持随机 TTL:

```java
Coffee c = mapper.findById(id);
if (c != null) {
    redis.opsForValue().set(key, json.writeValueAsString(c),
            Duration.ofMinutes(30).plusSeconds(new Random().nextInt(300)));  // 随机 TTL 防雪崩
} else {
    redis.opsForValue().set(key, "", Duration.ofMinutes(2));  // 空值缓存 2 分钟,挡住穿透
}
```

（读取处相应加一句:取到空串就直接返回 `null`,不再查库。）

用测试证明"第二次读走缓存、不再打库"——mock DAO,断言它只被调用一次:

```java
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@Test
void second_read_should_hit_cache_not_db() throws Exception {
    when(mapper.findById(1L)).thenReturn(new Coffee(1L, "美式", 15, 100));
    menuService.getCoffee(1L);          // 第一次:miss,查库 + 回填
    menuService.getCoffee(1L);          // 第二次:应命中缓存
    verify(mapper, times(1)).findById(1L);   // DB 只被查了一次 —— 证据确凿
}
```

JUnit 质检员点头:「**证据呢?** ——`times(1)`,缓存确实生效了。」

---

## 九、项目检查点 · 豆豆咖啡站(加缓存层)

```text
新增:Redis 取餐柜,菜单走 Cache-Aside;DB 读压力大幅下降
防护:穿透(空值缓存)· 雪崩(随机 TTL)· 击穿(热点互斥重建)
用到:Spring Data Redis、StringRedisTemplate、TTL、JSON 序列化
还没有:多实例部署下的一致性 —— 库存扣减马上要出事
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| Redis 缓存 / Cache-Aside | "熟悉 Redis"的第一层,几乎所有后端 JD |
| 穿透 / 击穿 / 雪崩及解法 | 缓存八股头号高频题,必须能区分 + 给方案 |
| 缓存 TTL / 空值 / 布隆 | 体现"踩过坑"的细节分 |
| Spring Data Redis 落地 | 从"知道概念"到"写得出来"的分水岭 |

---

## 十一、下一话悬念

缓存挡住了读,DB 松了口气。阿零趁热打铁,把应用**水平扩展成 3 个实例**分摊流量——菜单确实更快了。可库存一扣就出事:两个实例同时卖最后一杯,又**超卖**了。

> 下一话《分布式锁》:阿零一脸委屈——「第五季我明明用 `synchronized` 修好了超卖啊?」豆豆冷笑:「那把锁只在**一个 JVM** 里管用。三个实例,就是三把各管各的锁。」这一话把锁**搬到 Redis 外面去**,还要防三个致命坑:非原子、锁误删、未续期。

---

## 随堂练习
先独立作答，再展开参考要点核对思路。

### 一、选择题（10 道）

**1.** Cache-Aside（旁路缓存）模式下，一次读操作的流程是什么？
- A) 先查数据库 → 再写缓存 → 返回　B) 先查缓存 → 命中返回 / miss 查数据库 → 回填缓存 → 返回　C) 先查缓存 → miss 则直接返回 null　D) 数据库更新时自动同步缓存

**2.** 以下哪种场景属于**缓存穿透**？
- A) 大量缓存 key 在同一时刻集体过期　B) 反复查询 DB 中不存在的数据，缓存永远 miss，每次直穿到数据库　C) Redis 进程宕机　D) 一个热点 key 过期瞬间，数千并发请求同时去数据库加载

**3.** 缓存击穿与缓存雪崩的核心区别是什么？
- A) 击穿是 Redis 宕机，雪崩是 key 过期　B) 击穿是单个热点 key 过期瞬间并发冲击 DB，雪崩是大量 key 同时过期集体冲击 DB　C) 两者完全相同　D) 击穿是查询不存在的数据

**4.** 以下哪种方案**不能**解决缓存穿透？
- A) 缓存空值（把 null 也存进 Redis，设短 TTL）　B) 布隆过滤器　C) TTL 加随机值　D) 在写入数据时同时更新缓存

**5.** 布隆过滤器用于防御缓存穿透时，核心原理是什么？
- A) 精确判断某个 key 是否存在　B) 快速判断某个 key 一定不存在或可能存在（允许极小误判）　C) 自动将不存在的数据写入缓存　D) 限制用户查询频率

**6.** Redis 五大数据类型**不包括**以下哪项？
- A) String　B) Hash　C) Table　D) Sorted Set

**7.** 防止缓存雪崩最简单必配的措施是什么？
- A) 给所有缓存的 TTL 加随机偏移量　B) 部署 Redis 集群　C) 使用布隆过滤器　D) 禁止设置 TTL，让缓存永不过期

**8.** Spring Boot 3.x 中 Redis 的配置前缀是什么？
- A) `spring.redis`　B) `spring.data.redis`　C) `redis.datasource`　D) `spring.cache.redis`

**9.** 以下关于互斥锁解决缓存击穿的描述，正确的是？
- A) 互斥锁让所有请求排队等缓存重建　B) 只放一个线程去查 DB 重建缓存，其余等待或返回旧值，牺牲一点吞吐换 DB 安全　C) 互斥锁能完全消除击穿，无任何代价　D) 互斥锁是穿透的解法

**10.** Cache-Aside 模式下 Redis 宕机，业务会发生什么？
- A) 整个应用崩溃，全部 500　B) 缓存 miss 后全打到数据库，业务仍能正常返回（只是变慢）　C) 前端页面显示空白　D) Redis 自动切换备份节点，零影响

> [!答案]
> **1-B**　Cache-Aside 核心：应用自行管理缓存——先查 Redis，命中返回；miss 查 MySQL 后手动回填并设 TTL。　举一反三：Redis 挂了全走 DB 业务不崩，这是 Cache-Aside 被工业界广泛采用的根本原因。
> 
> **2-B**　穿透本质：查询数据 DB 里也不存在，`if (c != null)` 才回填，null 永远不进缓存。本话恶意刷 `id=99999` 一万次全打 DB。　举一反三：记住三个关键词——穿透看"数据存不存在"，击穿看"单个热点 key 过期的瞬间"，雪崩看"大批 key 同时失效"。
> 
> **3-B**　击穿聚焦"一个热点 key"（如美式过期瞬间几千人全扑 DB）；雪崩聚焦"大量 key"（整柜菜单同一秒集体过期）。　举一反三：击穿用互斥锁或逻辑过期；雪崩用 TTL 加随机偏移。解法不同，必须区分。
> 
> **4-C**　TTL 加随机值是防雪崩（打散过期时间），对穿透无效——穿透是数据不存在，跟 TTL 无关。A（空值缓存）、B（布隆过滤器）是穿透标准解法。　举一反三：工程最低成本三件套——空值缓存 + TTL 加随机 + 互斥锁重建热点，分别对应穿透、雪崩、击穿。
> 
> **5-B**　布隆过滤器是概率型数据结构——说"一定不存在"100%准确可拒请求；说"可能存在"有极小误判率（通常 <1%）。　举一反三：主要缺点是难以删除元素（需计数布隆），且数据写入时需同步更新过滤器。
> 
> **6-C**　Redis 五大数据类型：String、Hash、List、Set、Sorted Set（ZSet）。"Table"不是——Redis 是键值存储，无表结构。　举一反三：Hash 适合存对象字段，Sorted Set 适合排行榜，根据场景选类型才能发挥最大价值。
> 
> **7-A**　雪崩根因是大批 key 同时过期。最简单的解法：TTL 加随机偏移（如 30min + random 0~300s），打散过期时间。　举一反三：随机 TTL 只防"过期引起的雪崩"，Redis 宕机引起的雪崩需高可用集群 + 限流降级。
> 
> **8-B**　Spring Boot 3.x 将 Redis 配置前缀改为 `spring.data.redis`。本话特意提醒老项目别抄错。　举一反三：这是 Boot 3.0 统一数据访问配置命名的一部分，升级老项目所有 Redis 配置项都要加 `.data`。
> 
> **9-B**　互斥锁方案：第一个 miss 线程拿锁去查 DB 重建，其他等或返回旧值——DB 只承受一次查询而非数千次。　举一反三：逻辑过期方案是进阶版——值里存逻辑过期时间，key 不设真 TTL，过期后异步刷新，旧值先顶着，读请求完全不阻塞。
> 
> **10-B**　Cache-Aside 容错优势：Redis 只是缓存层，挂了全走 DB，业务逻辑正常，只是响应变慢。　举一反三：若用"缓存即数据库"模式（数据只写 Redis 没写 DB），Redis 宕机就丢数据——务必清楚"缓存"和"主存储"的边界。

### 二、解答题（3 道）

**1.** 用自己的话分别描述缓存穿透、缓存击穿、缓存雪崩的成因和本质区别，并给出各自的推荐解法。

**2.** 布隆过滤器的原理简述——为什么它适合防御缓存穿透但不适合精确查询？

**3.** 什么是 Cache-Aside 模式？它和"由缓存系统自动同步数据库"的方案相比有何优缺点？

> [!答案]
> **1**　① 穿透：查的数据 DB 里不存在，缓存永远挡不住→解法：缓存空值（短 TTL）+ 布隆过滤器。② 击穿：单个热点 key 过期瞬间，大规模并发 miss 同时扑向 DB→解法：互斥锁（只放一个线程重建）+ 逻辑过期。③ 雪崩：大量 key 同一时间过期或 Redis 宕机，DB 被集体冲击→解法：TTL 加随机偏移 + 多级缓存 + 高可用集群。　举一反三：牢记三个关键词——穿透看"数据存不存在"，击穿看"单个热点"，雪崩看"大批 key 同时"。面试先说出关键词再展开，不会混淆。
> 
> **2**　布隆过滤器由多个哈希函数和位数组组成——添加元素时多个哈希映射的位全置 1；查询时任一位为 0 则"一定不存在"，全为 1 则"可能存在"。适合防穿透：查缓存前先过布隆，"一定不存在"的直接拒，省掉 Redis + DB 两次查询。不适合精确查询：有误判率（可控制在 <1%），且标准布隆不支持删除元素。　举一反三：误判率可通过调整位数组大小和哈希函数数量控制，空间效率与误判率需权衡。
> 
> **3**　Cache-Aside：应用自己管缓存——读时先查 Redis、miss 查 DB 后手动回填；写时更新 DB 后手动删除缓存。优点：简单可控、容错好（Redis 挂了走 DB）、灵活动态设置 TTL。缺点：代码侵入、高并发下可能短暂不一致。与自动同步方案对比：自动方案对应用透明但 Redis 成"必经之路"，一挂全站崩——不如 Cache-Aside 的降级能力。　举一反三：本话采用 Cache-Aside 读模式，写入/更新时记得同步删除缓存，否则会出现不一致。

### 三、代码题（2 道）

**1.** 写一个 MenuService 的 `getCoffee(long id)` 方法，用 `StringRedisTemplate` 实现完整的 Cache-Aside 读流程，包含空值缓存（防穿透）和随机 TTL（防雪崩）。

**2.** 用 Mockito 写单元测试，验证"第二次读命中缓存、不再查数据库"，通过 `verify(mapper, times(1)).findById(1L)` 证明缓存生效。

> [!答案]
> **1 验收**　```java
> public Coffee getCoffee(long id) throws Exception {
>     String key = "menu:coffee:" + id;
>     String cached = redis.opsForValue().get(key);
>     if (cached != null) {
>         if (cached.isEmpty()) return null;  // 空值缓存→DB也没有
>         return json.readValue(cached, Coffee.class);
>     }
>     Coffee c = mapper.findById(id);
>     if (c != null) {
>         redis.opsForValue().set(key, json.writeValueAsString(c),
>             Duration.ofMinutes(30).plusSeconds(random.nextInt(300))); // 随机TTL防雪崩
>     } else {
>         redis.opsForValue().set(key, "", Duration.ofMinutes(2)); // 空值缓存2分钟防穿透
>     }
>     return c;
> }
> ```　举一反三：写入/更新时需同步 `redis.delete(key)`，否则缓存与 DB 不一致。Cache-Aside 读模式是最常见的用法。
> 
> **2 验收**　```java
> @Test
> void second_read_should_hit_cache_not_db() throws Exception {
>     when(redis.opsForValue().get("menu:coffee:1")).thenReturn(null);
>     when(mapper.findById(1L)).thenReturn(new Coffee(1L, "美式", 15, 100));
>     menuService.getCoffee(1L);  // 第一次 miss,查DB+回填
>     String cached = new ObjectMapper().writeValueAsString(new Coffee(1L, "美式", 15, 100));
>     when(redis.opsForValue().get("menu:coffee:1")).thenReturn(cached);
>     menuService.getCoffee(1L);  // 第二次命中缓存
>     verify(mapper, times(1)).findById(1L); // 关键:DB只被查了一次
> }
> ```　举一反三：`verify(mapper, times(1))` 是缓存生效的硬证据——面试中能写出这个测试 = 真正落地过缓存，不是只背概念。

*本话属于连载《从零开始学 Java》。世界观与创作规范见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图见 [/java](/java)。*
