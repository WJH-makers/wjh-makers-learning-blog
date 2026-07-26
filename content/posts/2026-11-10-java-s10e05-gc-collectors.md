---
title: "《从零开始学 Java》84 · GC 收集器家族选型"
date: 2026-11-10
summary: "GC 清洁队的全家福终于摊开:从 Serial 到分代 ZGC,谁被淘汰、谁当默认、凭什么。阿零把报表机的吞吐参数照抄给延迟敏感的下单服务,P99 毛刺当场爆表——一张选型决策表加两段真实 GC 日志,把「选收集器」算成明白账。"
tags: [Java, Java漫画, GC, JVM, G1, ZGC, 番外, 阿零与豆豆]
---

# 《从零开始学 Java》84 · GC 收集器家族选型

> 连载特刊 · 番外卷三「引擎室」第 5 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——JIT 加速工厂看完了,隔壁 GC 清洁队还欠一张「全家福」:主线里只见过它出事故的样子(#44/#45)。

---

## 一、需求:两份启动脚本,一套参数?

从加速工厂出来,豆豆指着隔壁大院:「清洁队的全家福,今天补上。」正说着,运维群甩来任务:冬歇维护窗口,**下单服务**和**夜间报表任务**要各配一套 JVM 参数。阿零手一挥:「参数嘛,抄一份能跑的不就行了?」

豆豆(面试官脸):「先回答:你抄的那套参数,当初是为**谁**设计的?」

---

## 二、漫画 · 清洁队全家福

> **〔1〕** GC 清洁队大院,JVM 城主亲自带路。墙上一排「历代队长」画像:Serial、Parallel、CMS(相框挂着黑纱)、G1(现任,佩胸牌)、ZGC(照片是糊的——快门跟不上他)。
> 城主:「堆城区的垃圾,历来都是他们收的。」

> **〔2〕** 回忆画面:Serial 老队长独自扫全场,门口拉着「全场静止(Stop-The-World)」警戒线;Parallel 带一队壮汉齐扫,警戒线还在,只是挂得短了。
> 阿零:「人多就是快!那全都换人最多的呗?」

> **〔3〕** 豆豆敲了敲 CMS 的黑纱相框:「这位第一个尝试『边营业边打扫』,可碎片扫不干净、并发失败还得全场加时——JDK 9 被弃用,JDK 14 正式除名。」

> **〔4〕** 现任队长 G1 展开一张棋盘地图:堆城区被切成一格格 **Region**,每格标着「垃圾含量」。
> G1:「限我 50 毫秒,我就只挑最脏的格子扫——垃圾优先(Garbage First),说的就是我。」

> **〔5〕** ZGC 从人群里飘过,顾客照常点单,没人察觉他扫过。
> 阿零:「他……刚才干活了?」
> 豆豆(叼着豆子叉腰):「着色指针,读一下顺手修一下,停顿论微秒。先别激动——回答城主的问题:你的下单服务,该请哪位?」

---

## 三、本话目标

- 记住回收算法三板斧与分代假说的对应;
- 讲清家族史:谁被淘汰、谁当默认,时间点精确到 JDK 版本;
- 会按「服务画像」查选型决策表配收集器;
- 用 `-Xlog:gc*` 日志抓出 P99 毛刺元凶并验证修复;
- 建立三色标记与写屏障的直觉。

---

## 四、原理图:三板斧、分代与家族史

```text
回收算法三板斧(分代假说回看 #45):
  标记-清除   标出活的,清走死的 —— 不搬家,留一地碎片
  复制        活的整体搬去空地,旧地推平 —— 无碎片,代价是留一块空地
  标记-整理   活的统一往一端挪 —— 无碎片不浪费,但搬家慢

分代假说:绝大多数对象朝生夕死 → 新生代用「复制」薄利多销;
熬过多轮晋升老年代 → 用「整理/清除」伺候。

家族史(版本事实,一个不许编):
  Serial     单人清扫,全程 STW —— 单核小堆容器仍合理
  Parallel   多人齐扫,全程 STW —— 吞吐优先,JDK 8 时代的默认
  CMS        首个并发收集器 —— JDK 9 弃用,JDK 14 移除(JEP 363)
  G1         JDK 9 起默认(JEP 248)—— Region 化 + 停顿目标 + Mixed GC
  ZGC        JDK 15 转正 —— 着色指针;JDK 21 分代(JEP 439),
             JDK 23 起分代为默认,JDK 24 移除非分代模式
  Shenandoah 另一支低延迟流派,路数不同,知道名字即可
```

**三色标记一分钟直觉**:并发收集 = 清洁队与顾客同场。对象染三色:白(没查)、灰(自己查了邻居没查完)、黑(查完)。若用户线程把白对象挂到**黑**对象名下、又剪断它与灰对象的旧连接,这个活对象就会被漏标误删。补救靠**写屏障**:引用一变动就记账,收尾照账补扫——G1 与 ZGC 的并发底气全押在这。

**选型决策表**(按服务画像查):

| 服务画像 | 选择 | 一句话理由 |
|---|---|---|
| 小堆(百 MB 级)/ 单核容器 | Serial | 没多核可用,省掉协调开销最划算 |
| 批处理 / 报表:吞吐第一,不在乎单次停顿 | Parallel | 用整段 STW 换最高吞吐 |
| 通用后端,堆几 G 到几十 G | G1(默认) | 停顿目标可调,吞吐延迟两头兼顾 |
| 大堆 + 延迟敏感,P99 按毫秒考核 | 分代 ZGC | 停顿亚毫秒级,基本不随堆变大而变长 |

```text
参数速查:
-Xms4g -Xmx4g              初始堆=最大堆,避免运行中伸缩抖动
-XX:+UseSerialGC / +UseParallelGC / +UseG1GC / +UseZGC   指定收集器
-XX:MaxGCPauseMillis=50    G1 停顿目标(软目标,不是合同)
-Xlog:gc*                  统一 GC 日志,排障第一现场
```

> **⏳ 版本时光机 · 默认收集器怎么换的班**

| JDK 版本 | 默认/大事 | 关键变化 |
|---|---|---|
| JDK 8 | Parallel 默认 | 吞吐优先时代;CMS 是低延迟的少数派 |
| JDK 9 | G1 上位默认(JEP 248) | 「可预测停顿」成主流;CMS 同版弃用,JDK 14 移除 |
| JDK 15 → 21 → 23 | ZGC 转正 → 分代 ZGC(JEP 439)→ 分代为默认 | 停顿进入亚毫秒;JDK 24 移除非分代模式 |

一句演进小结:默认收集器的换班史,就是从「吞吐最大」滑向「停顿可控」的历史。

---

## 五、从上一话继续改代码

上一话给下单服务配好了 JIT 观测;今天在同一套启动脚本前,先把决策表写成一个「选型器」:

```java
/** 咖啡站 v10.5:服务画像 → GC 参数 */
enum ServiceProfile { TINY_CONTAINER, THROUGHPUT_BATCH, LATENCY_SENSITIVE, HUGE_HEAP_LOW_LATENCY }

public class GcAdvisor {
    public static String advise(ServiceProfile p) {
        return switch (p) {   // 现代 switch:穷尽性检查,漏一档编译不过
            case TINY_CONTAINER        -> "-XX:+UseSerialGC";
            case THROUGHPUT_BATCH      -> "-XX:+UseParallelGC";
            case LATENCY_SENSITIVE     -> "-XX:+UseG1GC -XX:MaxGCPauseMillis=50";
            case HUGE_HEAP_LOW_LATENCY -> "-XX:+UseZGC";   // JDK 23 起即分代
        };
    }
}
```

---

## 六、故意制造一个 Bug:把吞吐套餐抄给下单服务

阿零没等选型器上线,先把夜间报表机那套「实测能跑」的参数原样贴给了下单服务:

```text
# order-service 启动参数(照抄自 report-job —— 错!)
java -XX:+UseParallelGC -Xms4g -Xmx4g -XX:NewRatio=1 -Xlog:gc* -jar order-service.jar
```

`-XX:NewRatio=1` 把新生代撑到 2G——报表机上这套确实吞吐漂亮。可下单服务是给活人点单的。

---

## 七、观察真实现象:GC 日志抓现行

晚高峰,监控 P99 从 80ms 飙到 400ms,毛刺每几秒一根。翻 `-Xlog:gc*`:

```text
[0.003s][info][gc] Using Parallel
[312.518s][info][gc] GC(96) Pause Young (Allocation Failure) 2214M->186M(3925M) 236.512ms
```

毛刺周期和 `GC(n)` 严丝合缝:Parallel 的「快」是吞吐的快——攒满 2G 新生代再全场 STW 大扫除,**单次停顿和新生代大小正相关**。报表夜里停 240ms 没人知道;下单接口停 240ms,顾客已经在骂街。

> **豆豆锐评**:参数不看服务画像就复制,等于把货车发动机装进跑车——马力没错,错的是用途。

> **🎯 面试直击**:G1 凭什么做到「可预测停顿」?
> 堆切成等大 Region 而非物理连续两代,持续统计每格回收价值;每次按 `MaxGCPauseMillis` 预算,优先挑「垃圾最多、性价比最高」的一批 Region 回收(Mixed GC 连老年代格子一起挑)——Garbage First 由此得名。追问点:这是**软目标**,预算压到 1ms 做不到,只会缩小单次回收量、推高频率。

---

## 八、修复,并用测试证明

按画像换 G1,给出停顿预算:

```text
# order-service 启动参数(修复:延迟敏感 → G1 + 停顿目标)
java -XX:+UseG1GC -XX:MaxGCPauseMillis=50 -Xms4g -Xmx4g -Xlog:gc* -jar order-service.jar
```

```text
[0.004s][info][gc] Using G1
[295.410s][info][gc] GC(83) Pause Young (Normal) (G1 Evacuation Pause) 812M->146M(4096M) 11.437ms
```

停顿从 240ms 级掉到 12ms 级,P99 回到 90ms 以内。JUnit 把选型固化成纪律:

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class GcAdvisorTest {
    @Test
    void latency_sensitive_service_must_not_use_parallel() {
        String flags = GcAdvisor.advise(ServiceProfile.LATENCY_SENSITIVE);
        assertTrue(flags.contains("UseG1GC"));
        assertTrue(flags.contains("MaxGCPauseMillis"));
        assertFalse(flags.contains("UseParallelGC"));   // 再有人抄报表参数,这里先红
    }

    @Test
    void batch_job_prefers_throughput() {
        assertEquals("-XX:+UseParallelGC", GcAdvisor.advise(ServiceProfile.THROUGHPUT_BATCH));
    }
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v10.5

```text
咖啡站形态:每类服务的 GC 参数按画像配置,GC 日志常开
已具备  :三板斧与分代假说;家族史精确到版本;选型决策表;-Xlog:gc* 抓毛刺;三色标记与写屏障直觉
还没有  :数据库那头,同一条 SQL 时而 3ms 时而全表扫,EXPLAIN 还不会看
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| 收集器家族史(CMS 弃用/移除、G1 默认、分代 ZGC 时间线) | 「熟悉 JVM/GC」JD 的必答题,版本说准即加分 |
| G1 的 Region / 停顿目标 / Mixed GC | 中高级面试 GC 环节的核心追问 |
| 按服务画像选收集器 + 读 -Xlog:gc* 日志 | 线上 P99 毛刺排障的第一现场能力 |

---

## 十一、下一话悬念

引擎室四站——类加载站、字节码、JIT 工厂、GC 清洁队——到此通关。阿零刚想庆祝,监控又弹一条:会员查询接口,同一条 SQL,有时 3 毫秒,有时 2 秒外加全表扫描。

> 下一话《MySQL 索引内幕:B+ 树》:为什么 InnoDB 选 B+ 树而不是红黑树,回表、覆盖索引、最左前缀,再用 EXPLAIN 把慢查询抓个现行——B+ 树的地下室(回看 #42),该下去了。

---

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
