---
title: "《从零开始学 Java》47 · Redis 高速取餐柜(穿透 · 击穿 · 雪崩三连)"
date: 2026-06-18
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
┌──────────────┐  查到    回填缓存(设 TTL)
│  MySQL 后厨  │────────────────────────▶ 返回
└──────────────┘

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

## 🎯 随堂练习

先自己做,再对答案。每道答案都带一句「举一反三」,帮你把这一个点连成一片。

### 选择题(10 道)

1. Cache-Aside(旁路缓存)的读流程是?
   - A) 先查 DB 再写缓存　B) **先查缓存,miss 才查 DB,查到后回填缓存并设 TTL**　C) 缓存自动同步 DB　D) 只查缓存,不查 DB
2. 为什么工业界主流选 Cache-Aside?
   - A) 性能最高　B) 简单、可控、容错好 —— Redis 挂了大不了全走 DB,业务不至于崩　C) 框架强制　D) 不需要设 TTL
3. **缓存穿透**的本质是?
   - A) 缓存过期了　B) 查的 key 在 **DB 里也不存在**,永远 miss,每次都穿到 DB　C) 缓存被打满　D) Redis 宕机
4. 穿透的两种典型解法是?
   - A) 加大缓存、加机器　B) **缓存空值(短 TTL)** + **布隆过滤器**　C) 互斥锁 + 逻辑过期　D) 随机 TTL + 多级缓存
5. **缓存击穿**指的是?
   - A) 大批 key 同时过期　B) **单个热点 key** 恰好过期的那一刻,并发请求全部扑向 DB　C) 缓存数据被改错　D) Redis 内存不足
6. 击穿的解法是?
   - A) 缓存空值　B) **互斥锁**(只放一个线程重建)或**逻辑过期**(旧值先顶着,异步重建)　C) 随机 TTL　D) 分库分表
7. **缓存雪崩**指的是?
   - A) 单个热点 key 过期　B) **大量 key 在同一时间集体过期**(或 Redis 宕机),DB 瞬间过载　C) 数据不一致　D) 缓存命中率低
8. 雪崩最低成本的防护是?
   - A) 换更大的 Redis　B) **TTL 加随机值**打散过期时间　C) 关闭缓存　D) 增大连接池
9. Spring Boot 3.x 起 Redis 的配置前缀是?
   - A) `spring.redis`　B) `spring.data.redis`　C) `redis.config`　D) `spring.cache.redis`
10. 布隆过滤器的代价是?
    - A) 内存占用巨大　B) 有极小**误判率**(可能说「存在」其实不存在),且元素**不好删除**　C) 需要额外的数据库　D) 只能存数字

> [!答案]
> **1-B**　查缓存 → miss → 查库 → 回填。**举一反三**:注意回填必须设 TTL,否则数据一旦变更就永远脏着。
> **2-B**　容错好是关键 —— 缓存只是加速层,不是必需层。**举一反三**:好的缓存设计应该「拿掉它系统仍能工作,只是慢」。
> **3-B**　数据本来就不存在,缓存无从挡起。**举一反三**:所以恶意用户只要一直刷不存在的 id,就能绕过缓存直压数据库。
> **4-B**　空值缓存最省事,布隆过滤器更彻底。**举一反三**:空值缓存要设短 TTL,并在该数据被真正写入时主动清除,否则新数据会被空值挡住。
> **5-B**　单个热点 key 的瞬间失效。**举一反三**:「热点」是关键词 —— 冷 key 过期没人查,压根不会击穿。
> **6-B**　只放一个线程去重建。**举一反三**:互斥锁牺牲一点吞吐,逻辑过期不阻塞读但实现复杂,按场景取舍。
> **7-B**　大批 key 同时失效。**举一反三**:常见诱因是「服务启动时批量预热、TTL 设成了同一个值」—— 一小时后集体到期。
> **8-B**　随机 TTL 几乎零成本,应该成为默认写法。**举一反三**:进一步可加本地 Caffeine 做多级缓存,再加 Redis 高可用与服务端限流降级。
> **9-B**　前缀从 `spring.redis` 改成了 `spring.data.redis`。**举一反三**:配置项改名不会报错,只会「配了但不生效」—— 升级时最难查的一类问题。
> **10-B**　误判 + 难删。**举一反三**:布隆过滤器只会「误报存在」不会「漏报不存在」,所以它能可靠地挡掉一定不存在的 key。

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*