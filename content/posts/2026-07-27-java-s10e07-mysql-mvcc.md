---
title: "《从零开始学 Java》86 · MySQL 事务内幕:MVCC 与锁"
date: 2026-07-27
summary: "双十一日志里一行 Duplicate entry:阿零明明先查后插,还是撞了车。豆豆带他下到 InnoDB 地下账房——undo 版本链、ReadView、快照读与当前读、临键锁一夜讲透:查不见,不等于不存在。"
tags: [Java, Java漫画, MySQL, 事务, MVCC, 番外, 阿零与豆豆]
---

![Java漫画：s10e07-mysql-mvcc](/comics/java/s10e07-mysql-mvcc.png)

# 《从零开始学 Java》86 · MySQL 事务内幕:MVCC 与锁

> 连载特刊 · 番外卷三「引擎室」第 7 话 · 基线 Java 25(最新 LTS)
> 长期项目:**豆豆咖啡站**。承接上一话——查询飞快了;可两台收银机同时改同一行,谁说了算?下到账本的「时间机器」——MVCC。

---

## 一、事故:先查后插,还是撞了车

冬歇复盘,阿零从双十一错误日志里挖出红字:会员注册偶发 `Duplicate entry`。他不服:代码明明「先 SELECT 确认不存在,再 INSERT」,怎么还能重?

豆豆:「InnoDB 默认的 REPEATABLE READ 下,**你查的是『你开始时的世界』,插的却是『现在的世界』**——中间别人提交了什么,你的 SELECT 看不见。」

---

## 二、漫画 · 下到 InnoDB 地下账房

> **〔1〕** 冬歇深夜,阿零对着日志抓头发,屏上一行红字:`Duplicate entry '13812345678'`。
> 阿零:「注册前我明明 SELECT 过,没这个人!查了再插,天衣无缝啊?」

> **〔2〕** 豆豆按下暗钮,地板滑开——MySQL 地下账房:每行数据拖着一串盖着事务编号章的旧版本,像糖葫芦。
> 豆豆:「隐藏列 `trx_id` 记着『谁改的』,`roll_pointer` 牵着上一版——这串 undo 版本链,就是账本的时间机器。」

> **〔3〕** 阿零戴上刻着「ReadView」的眼镜,镜片上浮着活跃事务名单;看向账本,新墨迹自动隐形。
> 豆豆:「开镜那一刻的世界,就是你的世界。名单上还活跃的、比你晚出生的,写的版本一律对你隐身。」

> **〔4〕** Race 双胞胎的另一半在隔壁柜台「唰」地插入同一手机号并 COMMIT;阿零镜中账本依旧空白,自信落笔 INSERT——「哐」,撞上 `uk_phone` 砖墙。
> Race 双胞胎(齐声):「你看不见我们,不代表我们不存在~」
> 豆豆(叼着豆子叉腰):「查了再插?你查的是旧世界,插的是新世界。」

---

## 三、本话目标

- 讲清 ACID 分别靠什么扛(undo/锁+MVCC/redo+binlog);
- 认识四大隔离级别与三种读异常;
- 拆开 MVCC(隐藏列/版本链/ReadView),分清快照读与当前读;
- 理解 RR 防幻读的「两条腿」与行锁的索引本质;
- 踩一次「查了再插」的坑,用唯一约束修好并证明。

---

## 四、原理图:一行数据的时间机器

ACID 四个字母,不是一人扛的:

| 字母 | 谁来扛 | 一句话 |
|---|---|---|
| A 原子性 | undo log | 回滚 = 沿版本链把改动反着做一遍 |
| I 隔离性 | 锁 + MVCC | 本话主角:写靠锁,读靠多版本 |
| D 持久性 | redo log(物理)+ binlog(逻辑,主从复制用) | 日志先落盘,崩了照放;两本靠**两阶段提交**(prepare→写 binlog→commit)绑定不劈叉 |
| C 一致性 | 上面三位 + 约束 | 是结果,不是手段 |

隔离级别 × 三种读异常:

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|---|---|---|---|
| READ UNCOMMITTED | 可能 | 可能 | 可能 |
| READ COMMITTED(RC) | 免 | 可能 | 可能 |
| REPEATABLE READ(RR,InnoDB 默认) | 免 | 免 | 基本免(见面试直击) |
| SERIALIZABLE | 免 | 免 | 免(代价:大量加锁) |

MVCC 的三个零件:

```text
一行数据 = 最新版本 + undo 版本链
  [ id=7 | phone=138… | trx_id=105 | roll_pointer ]─→ [trx_id=98 旧版] → [trx_id=90 旧版] → …

ReadView(开镜时拍的快照):m_ids 活跃事务名单 / min_trx_id / max_trx_id / creator(我)

判版本可见否(沿链从新到旧,取第一个可见的):
  trx_id <  min_trx_id → 早提交,可见       trx_id ∈ m_ids    → 拍照时没提交,不可见
  trx_id >= max_trx_id → 比拍照晚,不可见   trx_id == creator → 我自己改的,可见

RC:每条 SELECT 现拍一张 → 别人一提交就看见(不可重复读)
RR:整个事务只用第一张   → 从头到尾一个世界(可重复读)
```

> **豆豆锐评**:快照读给你看的是「你开始时的世界」,不是「现在的世界」。拿它当实时真相做决定,是事务类 Bug 的头号来源。

---

## 五、从上一话继续:两种读,锁的真实形状

上一话建好了 `member` 表和索引;本话加一道**唯一索引**,再看两种读:

```sql
ALTER TABLE member ADD UNIQUE KEY uk_phone (phone);  -- 防重的真正守门员

SELECT * FROM member WHERE phone = '13812345678';             -- 快照读:不加锁,读 ReadView 裁定的版本
SELECT * FROM member WHERE phone = '13812345678' FOR UPDATE;  -- 当前读:读最新版本并给命中记录加锁
```

UPDATE/DELETE/INSERT 全是**当前读**。而锁,加在**索引记录**上——

```sql
UPDATE member SET level = level + 1 WHERE name = '阿零';
-- name 无索引:定位不到"某一行",只能全表逐条上锁 ≈ 锁全表(回看第 85 话:索引还管锁粒度)
```

死锁也演一个:事务 A 按 `id=1→2` 加锁,B 反着来,互等对方,一方立刻收到:

```text
ERROR 1213 (40001): Deadlock found when trying to get lock; try restarting transaction
```

InnoDB 自带死锁检测(等待图找环),自动挑回滚代价小的当牺牲者(`SHOW ENGINE INNODB STATUS` 可查现场)。最有效预防:**所有事务按同一顺序拿锁**。

---

## 六、故意制造一个 Bug:查了再插

阿零在 RR 事务里复现双十一的写法:

```sql
-- 会话 A
START TRANSACTION;
SELECT id FROM member WHERE phone = '13812345678';   -- Empty set:放心插

-- 此刻会话 B 插入同一手机号并 COMMIT

INSERT INTO member (phone, name) VALUES ('13812345678', '阿零');
```

---

## 七、读懂真实报错

```text
ERROR 1062 (23000): Duplicate entry '13812345678' for key 'member.uk_phone'
```

阿零回头再 SELECT——**还是查不到**（RR 的第一次一致性读建立 ReadView,之后的快照读复用它,B 的提交对他隐身）,可 INSERT 是当前读,一头撞上 B 刚写进唯一索引的记录。Java 侧 JDBC 抛 `SQLIntegrityConstraintViolationException`,消息一模一样。

为什么「查了再插」防不住?数据库版 **check-then-act 竞态**(回看第 79 话):SELECT 到 INSERT 之间没人替你冻结世界——隔离级别只保证「读得一致」,不保证「读完别人不动」。守门员只有**唯一约束**。

> **🎯 面试直击**:InnoDB 的 RR 怎么防幻读?
> 两条腿:**快照读靠 MVCC**——RR 中通常由**第一次一致性读**建立并复用 ReadView,后来者插入的行不可见;`START TRANSACTION WITH CONSISTENT SNAPSHOT` 可在事务开始时显式建立快照。**当前读靠临键锁(Next-Key Lock=行锁+间隙锁)**——记录连同「缝隙」一起锁,不许往范围里插。追问点:先快照读再 `FOR UPDATE`,结果可能不同——非 RR 破功,两种读本就看不同的世界。

---

## 八、修复,并用测试证明

修法:唯一约束兜底,应用层把「撞车」译成幂等注册;纯 SQL 也可 `INSERT ... ON DUPLICATE KEY UPDATE` 一步到位。

```java
import java.sql.SQLIntegrityConstraintViolationException;
import java.util.Optional;

interface MemberDao {
    long insert(String phone, String name) throws SQLIntegrityConstraintViolationException;
    Optional<Long> findIdByPhone(String phone);
}

public class MemberService {
    // 幂等注册:不"查了再插",直接插;撞唯一约束就取已存在的那位
    public static long registerIdempotent(MemberDao dao, String phone, String name) {
        try {
            return dao.insert(phone, name);
        } catch (SQLIntegrityConstraintViolationException dup) {
            return dao.findIdByPhone(phone)
                      .orElseThrow(() -> new IllegalStateException("撞车后又查不到", dup));
        }
    }
}
```

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class MemberServiceTest {
    @Test
    void duplicate_falls_back_to_existing_id() {
        MemberDao dao = new MemberDao() {
            public long insert(String phone, String name) throws SQLIntegrityConstraintViolationException {
                throw new SQLIntegrityConstraintViolationException(
                        "Duplicate entry '" + phone + "' for key 'member.uk_phone'");
            }
            public Optional<Long> findIdByPhone(String phone) { return Optional.of(42L); }
        };
        assertEquals(42L, MemberService.registerIdempotent(dao, "13812345678", "阿零"));
    }
}
```

---

## 九、项目检查点 · 豆豆咖啡站 v10.7

```text
咖啡站形态:会员注册在并发下幂等,账本的时间机器看得懂、锁的形状摸得清
已具备  :ACID 分工/隔离级别/版本链+ReadView/两种读/临键锁/行锁基于索引/死锁检测
还没有  :那台"单线程还快过所有人"的 Redis 取餐柜,内幕还没掀
```

---

## 十、对应招聘技能

| 本话技能 | 在招聘里的样子 |
|---|---|
| ACID 实现机制(undo/redo/binlog) | JD 里「熟悉 MySQL 事务原理」就是这层 |
| MVCC:版本链 + ReadView,RC vs RR | 数据库八股 Top 3,能画版本链是分水岭 |
| 快照读/当前读、临键锁、死锁排查、幂等写入 | 并发写事故定位与防重设计的基本功;「查了再插」是劝退项 |

---

## 十一、下一话悬念

磁盘账本讲透了。可阿零想起第 47 话那台 Redis 取餐柜——号称**单线程**,却快过所有多线程的家伙。

> 下一话《Redis 内幕:单线程为什么快》:一个人干活还最快,凭什么?掀开取餐柜:内存、免锁、IO 多路复用。

---

## 🎯 随堂练习

先自己做,再对答案。难度递进:前3题基础识记,中间3题理解应用,最后4题分析判断与综合。

### 选择题(10 道)

1. MVCC 中,undo 版本链的「糖葫芦」结构依赖哪两个隐藏列?
   - A) row_id 和 db_ver
   - B) trx_id 和 roll_pointer
   - C) create_time 和 update_time
   - D) lock_bit 和 version_num

2. InnoDB 默认的隔离级别是?
   - A) READ UNCOMMITTED
   - B) READ COMMITTED(RC)
   - C) REPEATABLE READ(RR)
   - D) SERIALIZABLE

3. 「快照读」和「当前读」的区别是?
   - A) 快照读是 `SELECT`,当前读是 `UPDATE`/`DELETE`
   - B) 快照读读的是 ReadView 裁定的版本(不加锁),当前读读最新版本并加锁
   - C) 快照读在读已提交级别生效,当前读在可重复读级别生效
   - D) 快照读性能更好,当前读结果更准确(两个永远不同)

4. ACID 中,持久性(D)由什么保证?
   - A) undo log
   - B) 锁 + MVCC
   - C) redo log + binlog(两阶段提交绑定)
   - D) 外键约束

5. RR 隔离级别下,ReadView 的生成时机是?
   - A) 每条 SELECT 语句执行时新生成一个
   - B) 整个事务开始时生成,之后所有 SELECT 共用同一份
   - C) 每次 UPDATE 时生成
   - D) 由用户手动指定

6. 「查了再插」在 RR 隔离级别下也会出现 Duplicate,原因是?
   - A) SELECT 是快照读,看到的是「开始时的世界」;中间别人提交了,SLEECT 看不见但 INSERT 的当前读撞到了
   - B) MySQL 不支持唯一约束
   - C) 索引失效导致的
   - D) 事务未提交

7. 以下关于 InnoDB 行锁的描述,正确的是?
   - A) 行锁直接锁在数据行上
   - B) 行锁加在**索引记录**上;若 WHERE 条件无索引,退化为锁全表
   - C) 行锁只在主键索引上加
   - D) 行锁不会产生死锁

8. 死锁的两个必要条件是?
   - A) 两个事务同时修改同一行
   - B) 两个事务以不同顺序获取同一组资源,形成循环等待
   - C) 两个事务都使用 `SELECT FOR UPDATE`
   - D) 隔离级别是 SERIALIZABLE

9. 以下关于「幂等注册」的描述,**错误**的是?
   - A) 直接 INSERT,捕获 Duplicate 异常后转查询已存在的 id
   - B) 可替代「先 SELECT 再 INSERT」的并发不安全写法
   - C) 必须依赖唯一约束(uk_phone)作为守门员
   - D) 幂等注册可以不用唯一约束,仅靠 SELECT 防重

10. RR 隔离级别防幻读靠的是?
   - A) 只靠 MVCC 快照读
   - B) 快照读靠 MVCC(全事务一张 ReadView,新插入行不可见) + 当前读靠临键锁(记录锁 + 间隙锁,不许往范围里插)
   - C) 只靠间隙锁
   - D) InnoDB 的 RR 级别无法防幻读

### 解答题(5 道)

**Q1(概念)** 解释 MVCC 的三大零件(隐藏列/undo 版本链/ReadView)各自的作用,并画出一行数据在经历三次 UPDATE 后的版本链示意图。

**Q2(解释)** RC 和 RR 隔离级别在 ReadView 生成策略上有何不同?这一差异如何导致「不可重复读」在 RC 上可能发生,在 RR 上不会?

**Q3(场景)** 咖啡站会员注册:两个收银员同时注册同一手机号。请复现 RR 级别下「先 SELECT 查不到→INSERT 时撞 Duplicate」的完整时序,并说明为什么「查了再插」无法防重。

**Q4(分析)** 死锁日志 `ERROR 1213: Deadlock found` 出现后,你作为 DBA/开发者应如何排查?请写出从日志到根源再到修复的完整排查思路。

**Q5(设计)** 你需要设计一个「优惠券秒杀」系统:多用户并发抢有限数量的券,要求不超发、不少发、高并发。请设计核心表结构 + 扣减 SQL + 死锁预防策略。

> [!答案]
> **选择题**
> 1-B。InnoDB 每行有 2~3 个隐藏列:`DB_TRX_ID`(最后修改的事务 ID)、`DB_ROLL_PTR`(指向 undo log 中上一版本的指针)、`DB_ROW_ID`(无主键时自动生成)。★举一反三:trx_id 是 MVCC 判断「谁改的」的关键,roll_pointer 串起了糖葫芦。
>
> 2-C。InnoDB 默认 REPEATABLE READ。★举一反三:Oracle 默认 RC,PostgreSQL 默认 RC——面试中别搞混数据库的默认隔离级别。
>
> 3-B。快照读(`SELECT` 不加锁)读 ReadView 裁定的历史版本;当前读(`SELECT FOR UPDATE`/`UPDATE`/`DELETE`/`INSERT`)读最新版本并加锁。★举一反三:同一个事务里先普通 SELECT 读到旧数据,再 `SELECT FOR UPDATE` 读到新数据——不是 bug,是两种读看不同的世界。
>
> 4-C。redo log(物理日志,崩溃恢复) + binlog(逻辑日志,主从复制),两阶段提交使二者一致。★举一反三:A 靠 undo,C 靠上面三位联合保障,I 靠锁+MVCC。
>
> 5-B。RR 下通常由第一次一致性读生成一张 ReadView,之后的快照读共用;`START TRANSACTION WITH CONSISTENT SNAPSHOT` 可提前生成。RC 下每条一致性读都新建 ReadView。★举一反三:因为 RR 一张到底,所以「可重复读」;因为 RC 每 SELECT 都刷新,所以能看到别人提交的更新(不可重复读)。
>
> 6-A。RR 的第一次一致性读生成 ReadView,中途别人提交的数据对后续快照读不可见,但 INSERT 是当前读,要写数据,发现唯一索引已有记录→Duplicate。★举一反三:隔离性只保证「读得一致」,不保证「读后别人不动」。唯一约束才是防重写入的守门员。
>
> 7-B。锁加在索引记录上。`UPDATE … WHERE name='阿零'` 若 name 无索引,无法定位到某一行,只能全表每行的索引记录逐条上锁≈锁全表。★举一反三:这解释了为什么 WHERE 条件列必须有索引——不仅为查询快,也为锁粒度合理。
>
> 8-B。死锁必要条件:互斥 + 持有等待 + 不可剥夺 + 循环等待。事务 A 按 id=1→2 加锁,B 按 id=2→1 加锁,同时持有对方要的——死锁。★举一反三:最简单的预防:所有事务按同一顺序(如 id 升序)加锁,永远不会有循环等待。
>
> 9-D。幂等注册必须依赖唯一约束——它是数据库层面唯一的原子守门员。纯 SELECT 检查再 INSERT 有 check-then-act 竞态,无法保证。★举一反三:数据库的保证(约束) > 应用层的逻辑(先查后插)。
>
> 10-B。快照读:全事务一张 ReadView,后来者插入的行 trx_id 大于 max_trx_id 不可见→**读层面防幻读**。当前读:临键锁(Next-Key Lock=行锁+间隙锁)把记录和缝隙一起锁→**写层面防幻读**。★举一反三:仅靠 MVCC 无法防止当前读的幻读(你查不到但别人能插入),必须配合锁。
>
> **解答题**
>
> **Q1** 隐藏列:trx_id(事务 ID,记录谁改的)和 roll_pointer(指向上一个版本的 undo 指针)。undo 版本链:从当前最新版本顺着 roll_pointer 往回串,每版标注了 trx_id。ReadView:事务启动时拍的快照,包含活跃事务名单——用于判断哪个版本对当前事务可见。三次 UPDATE 后的链:`[行当前:trx=300]→roll_ptr→[trx=250]→roll_ptr→[trx=100 初始]→roll_ptr=NULL`。★举一反三:ReadView 通过 trx_id 在版本链上从新到旧找到第一个「可见」的版本——这就是「时间机器」的运转方式。
>
> **Q2** RC:每条 SELECT 语句重新生成 ReadView → 别人提交的更新对后续 SELECT 可见 → 同一事务内两次读同一行可能读到不同值(不可重复读)。RR:事务开始时生成一张 ReadView,之后所有 SELECT 共用 → 别人提交的更新对该事务全程不可见 → 可重复读。★举一反三:这个差异从代码看只是「ReadView 创建时机的不同」——原理越简单,区分越重要。
>
> **Q3** 时序:①T1 时刻,收银员 A 开启事务,SELECT phone='138…'→Empty(A 的 ReadView 生成,活跃事务={A});②T2 时刻,收银员 B INSERT phone='138…' 并 COMMIT(trx_id=B);③T3 时刻,A 执行 INSERT phone='138…'——INSERT 是当前读,检查 uk_phone 发现 B 已写入→Duplicate key error;④A 再 SELECT 依然 Empty(因为 ReadView 没刷新,trx_id=B > A 的 max_trx_id,不可见)。结论:SELECT 是快照读,看到的是 T1 的快照,INSERT 是当前读,必须面对当下的物理现实——两者之间的时间差就是竞态窗口。★举一反三:防重的正确方式:不管是先查后插,直接 INSERT + 捕获 Duplicate + 幂等回退。
>
> **Q4** 排查思路:①读错误日志,记下发生时间、涉及的事务和语句(`SHOW ENGINE INNODB STATUS` 的 LATEST DETECTED DEADLOCK 段是核心现场,列出两个事务各自的锁持有和等待);②还原死锁环:事务 A 持有哪些锁、在等什么锁;事务 B 持有哪些锁、在等 A 的什么锁——画出等待图;③找到根因:通常两个事务以不同顺序访问同一组资源;④修复:统一各个业务入口的加锁顺序(如规定所有涉及「订单→库存→账户」的流程必须按这个顺序);⑤治标选项:死锁重试(捕获 DeadlockLoserDataAccessException,自动重新执行事务)。★举一反三:InnoDB 的死锁检测是自动的——发现环后挑回滚代价最小的当牺牲者。所以「偶尔死锁报错」不算事故,「频繁死锁」才是问题。
>
> **Q5** 核心表:
> ```sql
> CREATE TABLE coupon (
>   id    BIGINT AUTO_INCREMENT PRIMARY KEY,
>   name  VARCHAR(50) NOT NULL,
>   total INT NOT NULL,
>   stock INT NOT NULL  -- 剩余数量
> );
> ```
> 扣减 SQL(原子扣):
> ```sql
> UPDATE coupon SET stock = stock - 1
> WHERE id = ? AND stock > 0;
> ```
> 在 Java 中判断 `affected rows`:0=已抢完,1=成功。死锁预防:①所有抢券请求按 coupon id 升序加锁(统一的顺序防循环等待);②高并发下,扣减 SQL 本身在 InnoDB 行级锁下几乎不会死锁(单行 update,无交叉);③若同时更新用户账户(扣积分等),规定先扣券、再扣账户,顺序固定;④应用层加乐观锁 `WHERE stock = :oldStock` 配合 CAS 自旋。★举一反三:秒杀的四种经典手段:①单一 UPDATE 原子扣(本解);②Redis 预减库存+异步落库(性能更高);③乐观锁 CAS;④悲观锁 SELECT … FOR UPDATE(最重,少用)。
>
> ---

---

## 运行环境、验证与依据

- **运行环境**:示例默认以 Java SE 25 为审计基线;若代码使用较早语法或框架版本,以文章中明确写出的最低版本为准。运行前用 `java --version`、`javac --version` 与项目构建工具的版本输出确认实际环境。
- **最后验证**:独立片段用声明的 JDK 编译/运行;依赖 Maven、JUnit、Spring、数据库或 Redis 的片段必须在相应项目、服务和测试数据具备时执行。未给出完整依赖的代码仅作示意,不能直接当作生产配置。
- **官方依据**:[Java SE 25 JLS](https://docs.oracle.com/javase/specs/jls/se25/html/index.html)、[Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/index.html) 与 [OpenJDK JEP](https://openjdk.org/jeps/0)。语言规范、库 API 与 HotSpot 实现细节必须分开理解。
- **面试边界**:先说明结论属于规范、特定 JDK 版本还是 HotSpot 实现;不要把性能数字、锁状态或调优阈值当作跨版本保证。
*本话属于连载《从零开始学 Java》。完整季次地图与番外见 [/java](/java)。*
