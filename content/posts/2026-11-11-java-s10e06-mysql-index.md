---
title: "《从零开始学 Java》85 · MySQL 索引内幕:B+ 树"
date: 2026-11-11
summary: "同一个查会员接口,一次 12 毫秒,一次 2.1 秒。EXPLAIN 一照:type=ALL,近 200 万行全表扫。豆豆带阿零下到 InnoDB 地下档案塔:B+ 树为何矮胖、回表与覆盖、最左前缀断档,和一个数字字面量如何让索引报废。"
tags: [Java, Java漫画, MySQL, 索引, B+树, EXPLAIN, 番外, 阿零与豆豆]
---

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

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
