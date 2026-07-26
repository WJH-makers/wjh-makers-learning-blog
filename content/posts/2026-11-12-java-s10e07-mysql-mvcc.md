---
title: "《从零开始学 Java》86 · MySQL 事务内幕:MVCC 与锁"
date: 2026-11-12
summary: "双十一日志里一行 Duplicate entry:阿零明明先查后插,还是撞了车。豆豆带他下到 InnoDB 地下账房——undo 版本链、ReadView、快照读与当前读、临键锁一夜讲透:查不见,不等于不存在。"
tags: [Java, Java漫画, MySQL, 事务, MVCC, 番外, 阿零与豆豆]
---

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
UPDATE member SET points = points + 10 WHERE name = '阿零';
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

阿零回头再 SELECT——**还是查不到**(RR 全程一张 ReadView,B 的提交对他隐身),可 INSERT 是当前读,一头撞上 B 刚写进唯一索引的记录。Java 侧 JDBC 抛 `SQLIntegrityConstraintViolationException`,消息一模一样。

为什么「查了再插」防不住?数据库版 **check-then-act 竞态**(回看第 79 话):SELECT 到 INSERT 之间没人替你冻结世界——隔离级别只保证「读得一致」,不保证「读完别人不动」。守门员只有**唯一约束**。

> **🎯 面试直击**:InnoDB 的 RR 怎么防幻读?
> 两条腿:**快照读靠 MVCC**——全事务一张 ReadView,后来者插入的行不可见;**当前读靠临键锁(Next-Key Lock=行锁+间隙锁)**——记录连同「缝隙」一起锁,不许往范围里插。追问点:先快照读再 `FOR UPDATE`,结果可能不同——非 RR 破功,两种读本就看不同的世界。

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

## 九、项目检查点 · 豆豆咖啡站 · 技术债第三页

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

*本话属于连载《从零开始学 Java》。世界观与角色设定见仓库 `docs/java-comic-academy/handbook.md`;完整季次地图与番外见 [/java](/java)。*
