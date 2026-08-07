---
title: "《从零开始学 Java》85 · MySQL 索引内幕:B+ 树"
date: 2026-07-26
summary: "同一个查会员接口,一次 12 毫秒,一次 2.1 秒。EXPLAIN 一照:type=ALL,近 200 万行全表扫。豆豆带阿零下到 InnoDB 地下档案塔:B+ 树为何矮胖、回表与覆盖、最左前缀断档,和一个数字字面量如何让索引报废。"
tags: [Java, Java漫画, MySQL, 索引, B+树, EXPLAIN, 番外, 阿零与豆豆]
---

![Java漫画：s10e06-mysql-index](/comics/java/s10e06-mysql-index.png)

# 《从零开始学 Java》85 · MySQL 索引内幕:B+ 树

> 连载特刊 · 番外卷三「引擎室」第 6 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——GC 全家福看完,JVM 引擎室通关;可数据库那边,同一条 SQL 有时飞快、有时全表扫,B+ 树的地下室该下去了(回看 #42)。

---

## 一、事故:同一条 SQL,时快时慢

监控把阿零拽回了数据库:联名活动导入后,会员表涨到近 200 万行,「按手机号查会员」大部分请求 12 ms,偶尔一条飙到 2.1 秒。同一张表、同一个接口,凭什么两副面孔?

豆豆合上账本:「#42 接 MySQL 时说过『细节见番外』。今天就是番外——SQL 快不快,看它在地下怎么走。」

---

## 二、漫画 · 下到 B+ 树档案塔

> **〔1〕** 监控上两条并排的请求:12 ms 和 2100 ms。豆豆推开机房角落一扇暗门,楼梯向下。
> 豆豆:「JVM 的引擎室看完了,今天下数据库的地下室。」

> **〔2〕** 地下大厅立着两座塔。左边红黑树塔细得像旗杆,200 万条记录叠了二十多层;右边 B+ 树塔只有 3 层,每层一排宽大的抽屉柜。
> 豆豆:「内存里随便爬,磁盘上**每下一层就是一次 IO**。B+ 树一个节点上千个叉,三层到底——矮胖,就是为了少 IO。」

> **〔3〕** 【特写格】B+ 树最底层,抽屉柜之间用链条串着。阿零要「3 到 5 级的会员」,管理员顺着链条一路平移,不回塔顶。
> 豆豆:「非叶子层只放导航牌,**数据全在叶子层,叶子之间是双向链表**——范围查询顺链走,这是 B 树给不了的。」

> **〔4〕** 两座 B+ 塔并排:主键塔抽屉里躺着**整行数据**;手机号塔抽屉里只有一张写着主键 id 的纸条。阿零拿着纸条又跑回主键塔。
> 豆豆:「聚簇索引,主键即数据;二级索引,叶子只存主键。拿纸条回主键塔再查一次,叫**回表**;纸条本身够答题,连回都不用——**覆盖索引**。」

> **〔5〕** 阿零敲下 `WHERE phone = 13812345678`,手机号塔大门「哐」地锁死,全馆抽屉一格格被拉开。JUnit 质检员抱臂堵在楼梯口:「你说索引在干活?**证据呢?**EXPLAIN 贴出来。」

> **〔6〕** 豆豆(叼着豆子叉腰):「phone 是 varchar,你塞个数字,MySQL 只好把**整列**转成数字再比——树上的排序当场作废。索引不是坏了,是被你亲手拆了导航。」

---

## 三、本话目标

- 看懂 InnoDB 为何选 B+ 树:矮胖少 IO、叶子链表扫范围;
- 分清聚簇与二级索引,讲清回表与覆盖索引;
- 掌握联合索引最左前缀的匹配与断档规则;
- 用 EXPLAIN 读 type / key / rows / Extra,背下 type 等级;
- 踩一次隐式转换让索引失效,从 SQL 与 Java 两层修好。

---

## 四、原理图:一张表,两座塔

```text
InnoDB 的 B+ 树(200 万行 ≈ 3 层,一个节点 = 一页 16KB):

    根节点  [ ≤70万 | ≤140万 | ≤200万 ]   ← 只放导航
   内层节点 [导航牌] [导航牌] [导航牌]     ← 还是导航
   叶子页 ⇄ 叶子页 ⇄ … ⇄ 叶子页          ← 数据只在叶子,双向链表

聚簇索引(PRIMARY) :叶子 = 整行数据(主键即数据)
二级索引(idx_phone):叶子 = phone + 主键 id
  SELECT *  WHERE phone=? → 拿 id 回聚簇索引取整行(回表)
  SELECT id WHERE phone=? → 索引里就有答案(覆盖索引,Extra: Using index)
```

> **豆豆旁白**:主键为什么建议自增?自增 = 新行永远追加在最右叶子页,写满开新页;随机主键(如 UUID)硬插进中间已满的页,触发**页分裂**——搬一半数据出去,碎片加写放大。

> **🎯 面试直击**:为什么 InnoDB 用 B+ 树,不用红黑树或哈希?
> 磁盘 IO 次数 ≈ 树高:红黑树二叉,200 万行二十多层;B+ 树扇出上千,千万行也只 3~4 层。哈希等值 O(1) 但不支持范围与排序。追问点:和 B 树比?——B 树每层带数据,扇出小、范围扫要回溯;B+ 树数据全在叶子且链表相连,顺链即扫。

---

## 五、回到 #42 那张会员表:补上索引的图纸

表还是 #42 建的那张 `member`;这一话给存储层画 X 光——补两条索引,立下规矩:

```sql
CREATE TABLE member (
  id    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,  -- 聚簇索引:主键即数据
  name  VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,                        -- 手机号是字符串!
  level TINYINT     NOT NULL DEFAULT 0,
  KEY idx_phone (phone),                             -- 二级索引:叶子只存主键
  KEY idx_level_name (level, name)                   -- 联合索引
) ENGINE = InnoDB;
```

联合索引按 `(a,b,c)` 从左到右排序,**最左前缀**决定用到几段:

| WHERE 条件(索引为 a,b,c) | 用到几段 | 说明 |
|---|---|---|
| `a=1 AND b=2 AND c=3` | a、b、c | 全命中,写乱顺序优化器会摆正 |
| `a=1 AND c=3` | 只有 a | b 断档,c 够不着 |
| `b=2` 或 `c=3` | 0 | 缺最左,整条作废 |
| `a=1 AND b>2 AND c=3` | a、b | 范围之后停止匹配 |

Java 侧走 JDBC 预编译(#42 的 DAO 继续长):

```java
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Optional;

record Member(long id, String name, String phone) {}

public class MemberDao {
    private final Connection conn;
    public MemberDao(Connection conn) { this.conn = conn; }

    public Optional<Member> findByPhone(String phone) throws SQLException {
        try (var ps = conn.prepareStatement(
                "SELECT id, name, phone FROM member WHERE phone = ?")) {
            ps.setString(1, phone);                     // 字符串进,字符串比
            try (var rs = ps.executeQuery()) {
                return rs.next()
                        ? Optional.of(new Member(rs.getLong(1),
                                rs.getString(2), rs.getString(3)))
                        : Optional.empty();
            }
        }
    }
}
```

---

## 六、故意制造一个 Bug:数字字面量查字符串列

阿零排查数据时随手一敲——手机号嘛,当然「是个数字」:

```sql
SELECT id, name, phone FROM member WHERE phone = 13812345678;
```

结果**完全正确**。可这条查询,就是监控里那条 2.1 秒。

---

## 七、EXPLAIN 抓现行

质检员要的证据,一条命令就有:

```text
mysql> EXPLAIN SELECT id, name, phone FROM member WHERE phone = 13812345678\G
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: member
   partitions: NULL
         type: ALL
possible_keys: idx_phone
          key: NULL
      key_len: NULL
          ref: NULL
         rows: 1982342
     filtered: 10.00
        Extra: Using where
1 row in set, 3 warnings (0.01 sec)
```

那 3 条警告里,`SHOW WARNINGS` 能翻出这句判词:`Warning 1739: Cannot use ref access on index 'idx_phone' due to type or collation conversion on field 'phone'`。

铁证:`possible_keys` 里明明有 `idx_phone`,`key` 却是 NULL——**看得见,用不上**;`type: ALL` 全表扫,预估近 200 万行。原因:字符串和数字比较,MySQL 会**把两边都转成数字**——等价于 `WHERE CAST(phone AS DOUBLE) = 13812345678`,给**列**套了函数,树上按字符串排的顺序作废。反过来「数字列 = 字符串字面量」只转字面量,索引照用——方向决定生死。

type 等级从好到差,背下来:

| type | 含义 | 一句话 |
|---|---|---|
| const | 主键/唯一索引等值 | 天花板 |
| eq_ref | 联表按主键/唯一索引匹配 | 联表最优 |
| ref | 普通索引等值 | 日常好查询 |
| range | 索引范围(BETWEEN、>、IN) | 可接受 |
| index | 扫整棵索引树 | 比 ALL 略强 |
| ALL | 全表扫描 | 大表见到就报警 |

---

## 八、修复,并用测试证明

SQL 层:给字面量加引号,让比较留在字符串世界。

```text
mysql> EXPLAIN SELECT id, name, phone FROM member WHERE phone = '13812345678'\G
*************************** 1. row ***************************
         type: ref
possible_keys: idx_phone
          key: idx_phone
      key_len: 82
          ref: const
         rows: 3
     filtered: 100.00
        Extra: NULL
(其余列与上文相同,略)
```

`type` 从 ALL 到 ref,`rows` 从 1982342 到 3,2.1 秒回到 12 ms。再抠一步:只查 `SELECT id, phone` 时 `Extra` 变成 `Using index`——覆盖索引,回表也省了。

Java 层根治:手机号在类型系统里就该是字符串,用 record 把关:

```java
record PhoneNo(String value) {
    PhoneNo {
        if (value == null || !value.matches("1\\d{10}"))
            throw new IllegalArgumentException("手机号须为 11 位数字字符串:" + value);
    }
}
```

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PhoneNoTest {
    @Test
    void phone_stays_a_string_and_is_validated() {
        assertEquals("13812345678", new PhoneNo("13812345678").value());
        assertThrows(IllegalArgumentException.class, () -> new PhoneNo("1381234"));
    }
}
```

隐式转换只是「索引失效七宗罪」之一,一次记全:

| # | 罪名 | 例子 |
|---|---|---|
| 1 | 对列用函数/运算 | `YEAR(created)=2026`、`id+1=10` |
| 2 | 隐式类型转换 | 本话:varchar 列 = 数字字面量 |
| 3 | 前导 % 的 LIKE | `LIKE '%5678'`(`'138%'` 可走 range) |
| 4 | OR 带上无索引列 | `phone='…' OR name='…'`(name 无索引) |
| 5 | 不等与取反 | `!=`、`NOT IN`,常被估成全表更便宜 |
| 6 | 违反最左前缀 | 见第五节断档表 |
| 7 | 优化器嫌你贵 | 命中行多、回表太贵,干脆全表扫 |

> **🔀 豆豆的多解台 · 深分页(第 5 万页)怎么翻?**

| 解法 | 代码要点 | 适合什么时候 | 坑 |
|---|---|---|---|
| 大 offset(反面教材) | `LIMIT 1000000, 20` | 只翻前几页 | 扫过前 100 万行再扔掉,越深越慢 |
| 游标续读 | `WHERE id > :上页末尾id ORDER BY id LIMIT 20` | 无限下拉、批量导出 | 只能顺序翻,不能跳页 |
| 延迟关联 | 先 `SELECT id … LIMIT 1000000,20` 走覆盖索引,再 JOIN 回表 | 后台必须支持跳页 | SQL 复杂;深翻仍扫索引 |

豆豆锐评:默认**游标续读**——把「翻到第几页」换成「接着上次读」,成本恒定;要跳页再上延迟关联。offset 是给人翻前三页的,不是给机器扫库的。

---

## 九、项目检查点 · 豆豆咖啡站 v10.6

```text
咖啡站形态:会员库 200 万行,手机号查询稳定 12 ms,EXPLAIN 进了上线检查单
已具备  :B+ 树三层直觉;聚簇/二级/回表/覆盖;最左前缀;type 等级;失效七宗罪;
          隐式转换从 SQL(加引号)与 Java(PhoneNo 把关)两层根治
还没有  :两台收银机同时改同一行,谁说了算 —— 事务那间地下室还没下去
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| B+ 树 / 聚簇与二级索引 / 回表与覆盖 | 「熟悉 MySQL 索引原理」的真实含义 |
| 最左前缀、索引失效七宗罪 | SQL 优化题第一关 |
| EXPLAIN(type/key/rows/Extra) | 「有调优经验」的入场券:先拿证据再动手 |

---

## 十一、下一话悬念

查得飞快了。可打烊对账时,两台收银机**同时**给同一位会员改余额,一台看到 80,一台看到 100——谁说了算?

> 下一话《MySQL 事务内幕:MVCC 与锁》:账本藏着一台「时间机器」,让每个事务看到自己那一刻的世界。豆豆会拆开 undo 版本链和 ReadView,而阿零将栽在「明明查过没有、一插入却说重复」的幽灵上。

---

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,中间3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. InnoDB 选用 B+ 树而非红黑树作为索引结构,最关键的原因是?
   - A) B+ 树实现更简单
   - B) B+ 树「矮胖」(扇出大、层数少),同等数据量下磁盘 IO 次数远少于红黑树
   - C) B+ 树支持范围查询,红黑树不支持
   - D) B+ 树内存占用更小

2. InnoDB 聚簇索引的叶子节点存放的是?
   - A) 主键值 + 指向数据页的指针
   - B) 整行数据
   - C) 索引列 + 主键值
   - D) 仅主键值

3. 「回表」指的是?
   - A) 从二级索引回到聚簇索引查询完整行数据
   - B) 从聚簇索引回到二级索引
   - C) 删除索引后重新建表
   - D) 查询优化器切换索引

4. `EXPLAIN` 输出的 `type` 列,从好到差的排序是?
   - A) ALL > index > range > ref > const
   - B) const > ref > range > index > ALL
   - C) const > eq_ref > ref > range > index > ALL
   - D) ALL > range > ref > eq_ref > const

5. 联合索引 `(a, b, c)` 中,`WHERE a=1 AND c=3` 能用到索引的几段?
   - A) 全部三段(a, b, c)
   - B) 只有 a
   - C) a 和 c
   - D) 一段也用不上

6. `WHERE phone = 13812345678`(phone 列是 VARCHAR)导致全表扫描,因为?
   - A) phone 列没有索引
   - B) 数字字面量与字符串列比较,MySQL 将整列 `CAST` 为数字,索引顺序作废
   - C) MySQL 不支持字符串索引
   - D) 索引已损坏

7. 以下哪种写法**不会**导致索引失效?
   - A) `WHERE YEAR(created_at) = 2026`
   - B) `WHERE phone LIKE '138%'`
   - C) `WHERE phone LIKE '%5678'`
   - D) `WHERE id + 1 = 10`

8. 「覆盖索引」的判断依据是 EXPLAIN 的 Extra 列显示?
   - A) `Using where`
   - B) `Using index`
   - C) `Using filesort`
   - D) `Using temporary`

9. 阿零执行 `SELECT * FROM member WHERE level=3 AND name LIKE '张%'`,索引是 `(level, name)`。关于索引使用,描述正确的是?
   - A) 只能用到 level,因为 LIKE 是范围查询
   - B) level 和 name 都用到了(level 等值 + name 前缀 LIKE 可走 range 后的匹配)
   - C) 完全用不到索引
   - D) 需要回表才能拿到 name

精判:最左前缀匹配下,`level=3`(等值)命中第一段;`name LIKE '张%'`(前缀 LIKE)在范围条件内,优化器可能将其视为等值范围,因此**两段都可能用到**。但严谨地说:等值后跟范围,范围列之后的列停用;如果 `name` 是范围,则只用 level 和 name(name 为范围扫描)。实际 EXPLAIN 的 key_len 才能确证。

10. 关于主键设计,建议使用自增 ID 而非 UUID 的主要原因是?
   - A) UUID 占用空间更大
   - B) 自增 ID 新行永远追加在最右叶子页,UUID 随机插入触发页分裂和碎片
   - C) 自增 ID 查询更快
   - D) UUID 不支持 B+ 树索引

### 解答题(5 道)

**Q1(概念)** 画出 InnoDB 的聚簇索引与二级索引的 B+ 树结构,标注叶子节点内容,并标注一次「回表查询」的完整路径。

**Q2(解释)** 为什么 `WHERE phone LIKE '%5678'` 不走索引,而 `WHERE phone LIKE '138%'` 可以走 range 类型的索引扫描?

**Q3(场景)** 你的会员表有 500 万行,业务需要支持「按手机号模糊搜索(前几位匹配)」和「按注册时间范围 + 会员等级」查询。请设计索引方案,并写出对应的 EXPLAIN 期望输出。

**Q4(分析)** 分析「索引失效七宗罪」中,「优化器嫌你贵」这一条的本质:什么情况下优化器会主动放弃索引而选全表扫描?如何判断是优化器的策略还是索引问题?

**Q5(设计)** 你需要为「深分页」(如跳到第 10 万页)设计查询方案。请对比 OFFSET 分页、游标续读、延迟关联三种方案,并给出你的推荐选择及理由。

> [!答案]
> **选择题**
> 1-B。B+ 树一个节点存储上千个键值(利用磁盘页 16KB),出度极大,树高极低(200 万行只需 3 层)。红黑树二叉,同样数据量需要 20+ 层——每层一次磁盘 IO,差距 6~7 倍。★举一反三:B+ 树的「矮胖」是为磁盘设计的——内存中红黑树可能更适合。
>
> 2-B。聚簇索引的叶子节点直接存放整行数据(InnoDB 的表即索引组织表)。★举一反三:这意味着 InnoDB 表**必须有主键**——找不到用户定义的,自动生成隐藏的 6 字节 row_id。
>
> 3-A。二级索引叶子只存索引列 + 主键值;查询需要其他列时,拿主键去聚簇索引再查一次——回表。★举一反三:覆盖索引就是「只查索引列或主键」,省掉回表。
>
> 4-C。const(主键/唯一等值)→eq_ref(联表唯一匹配)→ref(普通等值)→range(范围)→index(扫全索引)→ALL(全表)。★举一反三:生产环境中 `type=ALL` 且 rows>万——立即优化。
>
> 5-B。最左前缀:b 断档,c 够不着。★举一反三:如果索引是 `(a,c,b)` 而条件是 `a=1 AND c=3`,则 a 和 c 都能用到——索引列顺序应与查询条件匹配。
>
> 6-B。VARCHAR 列与数字比较时,MySQL 会 `CAST(phone AS DOUBLE)`,等价于对列用函数,索引失效。★举一反三:**反过来的情况**(INT 列 = '123' 字符串字面量)只转字面量,索引照用——方向决定生死。
>
> 7-B。前缀 LIKE(如 `'138%'`)可以做 range 扫描,索引有效。A 对列用了函数;C 前置模糊,索引失效;D 对列运算。★举一反三:索引对字符串是按字典序排列的,前置模糊无法利用这种顺序。
>
> 8-B。`Using index` 表示查询只需要索引中的信息,不需要回表——覆盖索引的标志。★举一反三:`Using index condition`(ICP)则是索引条件下推,不同于覆盖索引。
>
> 9-A/B 皆有理。`level=3` 等值命中第一段;`name LIKE '张%'` 如果优化器视作范围,则第二段停用;如果视作前缀等值,则两段都用。**实际看 key_len**。★举一反三:面试中不要给绝对答案——说「看 EXPLAIN 的 key_len」才是实战派。
>
> 10-B。自增 ID 永远在 B+ 树最右侧叶子页追加,写满即开新页;UUID 随机插入已满页中间,触发**页分裂**:搬一半数据出去,产生碎片和写入放大的开销。★举一反三:如果业务必须用分布式 ID(雪花算法等),趋势递增的雪花 ID 比纯随机 UUID 友好得多。
>
> **解答题**
>
> **Q1** 聚簇索引 B+ 树:根节点[≤500|≤1000]→内层节点→叶子节点[整行数据](id=1, name='阿零', phone='138…')。二级索引 B+ 树(phone):根节点→内层→叶子节点[phone='138…'|id=1]。回表路径:`SELECT * WHERE phone='138…'`→①从二级索引定位叶子,拿到 id=1;②带 id=1 去聚簇索引再查,拿到整行。★举一反三:如果把 `SELECT *` 改成 `SELECT id, phone`,查询在二级索引叶子就全有了——覆盖索引,不回表。
>
> **Q2** B+ 树叶子节点按字典序从小到大排列。`LIKE '138%'`:定位到 '138' 开头的第一个 key,然后顺着叶子链表向右扫,直到不匹配——这是 **range 扫描**,利用了有序性。`LIKE '%5678'`:前导通配符,要匹配所有以 '5678' 结尾的字符串,它们在字典序中散落各处,无法利用索引的顺序跳过任何一段——只能全索引扫描或全表扫描。★举一反三:如果业务必须支持后缀搜索,可以建**反向索引**(`REVERSE(phone)` 列 + `LIKE REVERSE('%5678')` = `LIKE '8765%'`)——把后缀搜索转成前缀搜索。
>
> **Q3** 索引方案:①联合索引 `(phone)`:覆盖 `phone LIKE '138%'` 前缀搜索;②联合索引 `(level, created_at)`:覆盖「按等级 + 时间范围」查询。EXPLAIN 期望:对查询 `WHERE phone LIKE '138%'`→`type: range, key: idx_phone, rows: ~几千`。对查询 `WHERE level=3 AND created_at BETWEEN '2026-01-01' AND '2026-06-01'`→`type: range, key: idx_level_created, rows: ~几万`。★举一反三:如果查询需要同时筛选 `phone` 和 `level`、`created_at`,MySQL 只能选一个索引,可能触发 index merge 或全表——这类多条件需要评估建更多维度的联合索引。
>
> **Q4** 「优化器嫌你贵」的本质:使用二级索引→拿到大量主键→回表(随机 IO)→优化器估算发现「回表成本 > 直接全表扫的成本」,于是主动放弃索引。判断方法:①`EXPLAIN` 的 `possible_keys` 有候选但 `key` 是 NULL→优化器主动放弃;②`rows` 很大 + `filtered` 很低→索引选择性差;③`FORCE INDEX` 强制用索引后比较实际执行时间→如果确实更慢,说明优化器判断正确,应调整索引或 SQL 而非强用索引。★举一反三:这种情况的根治手段不是加大索引,而是**提升索引选择性**(如调整联合索引列的组合)或**改写 SQL** 缩小结果集。
>
> **Q5** 三种方案对比:①OFFSET 分页(`LIMIT 1000000,20`):扫过前 100 万行再扔掉,越深越慢,时间随页码线性增长——适合前几页。②游标续读(`WHERE id > :lastId ORDER BY id LIMIT 20`):每次只扫 20 行,成本恒定——适合无限下拉/批量导出,但只能顺序翻,不能跳页。③延迟关联:先 `SELECT id FROM table WHERE … ORDER BY … LIMIT 1000000,20` 在覆盖索引上完成扫描(无需回表),拿到 20 个 id 后 JOIN 回表取完整数据——需要跳页的场景。推荐:默认游标续读(Cursor-based pagination),把「翻到第几页」改成「接着上次读」;必须支持跳页再用延迟关联;OFFSET 是给人翻前三页准备的。★举一反三:前端交互设计影响后端性能——无限滚动比页码翻页更「后端友好」,因为可以走游标。
>
> ---

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*
