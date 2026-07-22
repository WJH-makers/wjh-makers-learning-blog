---
title: "MySQL & Redis 高频命令速查"
date: 2026-07-21
summary: "MySQL SQL 索引锁 + Redis 五大数据类型缓存策略速查表"
tags: [MySQL, Redis, 命令速查, 数据库]
---


# MySQL & Redis 高频命令速查

> 从[全栈指令速查大全](/posts/2026-07-15-command-reference-cheatsheet)拆分。

## MySQL · S 极高频

| 难度 | 命令/SQL | 作用 | 示例 |
|------|----------|------|------|
| ★ | `mysql -u root -p` | 连接数据库 | `mysql -h 主机 -P 3306 -u 用户 -p` |
| ★ | `SHOW DATABASES;` | 列出所有库 | |
| ★ | `USE 库名;` | 切换数据库 | `USE mydb;` |
| ★ | `SHOW TABLES;` | 列出所有表 | |
| ★ | `DESC 表名;` | 查看表结构 | `DESC user;` |
| ★★ | `SELECT * FROM 表 WHERE 条件;` | 查询（核心） | `SELECT name, age FROM user WHERE age>18;` |
| ★★ | `SELECT 列 FROM 表 ORDER BY 列 DESC LIMIT 10;` | 排序分页 | `SELECT * FROM log ORDER BY id DESC LIMIT 0,20;` |
| ★★ | `INSERT INTO 表(列1,列2) VALUES(值1,值2);` | 插入 | `INSERT INTO user(name,age) VALUES('张三',25);` |
| ★★ | `UPDATE 表 SET 列=值 WHERE 条件;` | 更新（**务必带 WHERE**） | `UPDATE user SET age=26 WHERE id=1;` |
| ★★ | `DELETE FROM 表 WHERE 条件;` | 删除（**务必带 WHERE**） | `DELETE FROM user WHERE id=100;` |
| ★★ | `SELECT COUNT(*) FROM 表;` | 计数 | `SELECT COUNT(*) FROM user;` |
| ★★ | `SELECT ... GROUP BY 列;` | 分组 | `SELECT dept, COUNT(*) FROM user GROUP BY dept;` |
| ★★ | `LIKE '%关键字%'` | 模糊查询 | `SELECT * FROM user WHERE name LIKE '%张%';` |

**口诀**：增 INSERT 删 DELETE 改 UPDATE 查 SELECT，WHERE 条件别漏掉。

## MySQL · A 高频

| 难度 | 命令/SQL | 作用 | 示例 |
|------|----------|------|------|
| ★★ | `JOIN ... ON`（内连接） | 关联多表（两表匹配行） | `SELECT * FROM user u JOIN orders o ON u.id=o.user_id;` |
| ★★ | `LEFT JOIN` | 左连接（保留左表全部行） | `SELECT * FROM user u LEFT JOIN orders o ON u.id=o.user_id;` |
| ★★ | `CREATE TABLE 表(列 类型 约束,...);` | 建表 | `CREATE TABLE user(id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(30) NOT NULL);` |
| ★★★ | `EXPLAIN SELECT ...` | 分析执行计划（**调优核心**） | 关注 type(连接类型)、key(实际索引)、rows(扫描行数) |
| ★★★ | `CREATE INDEX idx_name ON 表(列);` | 创建索引 | `CREATE INDEX idx_age ON user(age);` |
| ★★★ | `SHOW INDEX FROM 表;` | 查看索引 | |
| ★★★ | `ALTER TABLE 表 ADD 列 类型;` | 加字段 | `ALTER TABLE user ADD email VARCHAR(50);` |
| ★★★ | `ALTER TABLE 表 DROP 列;` | 删字段 | `ALTER TABLE user DROP email;` |
| ★★★ | `ALTER TABLE 表 MODIFY 列 类型;` | 改字段类型 | |

## MySQL · B 中频

| 难度 | 命令/SQL | 作用 |
|------|----------|------|
| ★★ | `DROP TABLE 表;` / `DROP DATABASE 库;` | 删表/库（高危） |
| ★★ | `SHOW CREATE TABLE 表;` | 看建表 DDL |
| ★★★ | `START TRANSACTION;` → SQL → `COMMIT;` / `ROLLBACK;` | 事务 |
| ★★★ | `GRANT 权限 ON 库.表 TO '用户'@'主机';` | 授权 |
| ★★★ | `REVOKE 权限 ON 库.表 FROM '用户'@'主机';` | 收权 |
| ★★★ | `FLUSH PRIVILEGES;` | 刷新权限 |
| ★★ | `mysqldump -u root -p 库名 > backup.sql` | 导出备份（命令行） |
| ★★ | `source backup.sql;` | 导入（MySQL 内执行） |

> [!WARNING]
> **不带 WHERE 的 UPDATE/DELETE 会更新/删除全表数据**，生产环境执行前务必复查。  
> **EXPLAIN 关注**：type 列（`ALL` 全表扫描最差 → `index` → `range` → `ref` → `const` 最优）、key 列（实际用的索引）、rows 列（预估扫描行数）。

### MySQL EXPLAIN 深度解析（面试 + 调优核心）

| 字段 | 含义 | 高频值与解读 |
|------|------|------------|
| **type** | 连接类型（查询效率标尺） | `ALL`（全表扫描，最差）→ `index`（索引全扫）→ `range`（索引范围）→ `ref`（非唯一索引匹配）→ `eq_ref`（唯一索引匹配）→ `const`（主键等值，最优） |
| **possible_keys** | 候选索引 | 若为空 → 没有可用索引 |
| **key** | 实际使用的索引 | 若为空 → 索引失效（最常见性能问题） |
| **rows** | 预估扫描行数 | 越大越危险，亿级表此值超百万即告警 |
| **Extra** | 额外信息（极其关键） | `Using filesort`（外部排序 → 需优化 ORDER BY）、`Using temporary`（临时表 → 需优化 GROUP BY/DISTINCT）、`Using index`（覆盖索引，最优） |

**索引失效常见原因（面试高频）**：
- 索引列上使用函数：`WHERE DATE(create_time) = '2026-01-01'` → 改为 `WHERE create_time >= '2026-01-01' AND create_time < '2026-01-02'`
- 隐式类型转换：`WHERE phone = 13800000000`（phone 是 VARCHAR） → 应 `WHERE phone = '13800000000'`
- 复合索引未满足最左前缀原则
- LIKE 以 `%` 开头：`LIKE '%关键字'`
- 负向查询：`!=`、`NOT IN`、`NOT EXISTS`

**MySQL 8.0+ EXPLAIN ANALYZE**：不仅输出理论计划，还**实际执行查询**并反馈每个算子的真实耗时（WallTime）和内存峰值（PeakMemory），精准定位慢算子。

**死锁与长事务排查**：

```sql
SHOW PROCESSLIST;
SHOW FULL PROCESSLIST;
SELECT * FROM information_schema.INNODB_TRX;
SELECT * FROM performance_schema.data_lock_waits;  -- 8.0.1+
SHOW ENGINE INNODB STATUS\G   -- S 级：LATEST DETECTED DEADLOCK
KILL <connection_id>;
```

### MySQL · 窗口函数 / CTE / DBA 深补（A–S）

| 频次/难度 | 能力 | 要点 |
|-----------|------|------|
| **A/★★★★** | 窗口函数 8.0+ | `ROW_NUMBER/RANK/DENSE_RANK/LAG/LEAD OVER(PARTITION BY … ORDER BY …)` |
| **A/★★★** | CTE | `WITH t AS (…) SELECT`；`WITH RECURSIVE` |
| **S/★★★★** | `SHOW ENGINE INNODB STATUS` | 死锁/缓冲池/事务 |
| **A/★★★** | 慢查询 | `slow_query_log` / `long_query_time` / `mysqldumpslow` |

```sql
SELECT * FROM (
  SELECT name, dept, score,
         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY score DESC) rn
  FROM emp
) t WHERE rn = 1;
```

---

# 七、Redis 命令（难度 × 频次）

## Redis · S 极高频

| 难度 | 命令 | 作用 | 示例 |
|:----:|------|------|------|
| ★ | `redis-cli` | 连接 Redis | `redis-cli -h 主机 -p 6379`，`redis-cli -a 密码` |
| ★ | `SET key value` | 设字符串 | `SET name "张三"` |
| ★ | `GET key` | 取字符串 | `GET name` |
| ★ | `DEL key` | 删除 key | `DEL name` |
| ★ | `EXISTS key` | 判断 key 是否存在 | `EXISTS name` |
| ★ | `EXPIRE key 秒` | 设过期时间（秒） | `EXPIRE session 3600` |
| ★ | `TTL key` | 查剩余生存时间 | `TTL session`（-1 永久，-2 不存在） |
| ★★ | `SETEX key 秒 value` | 设值并设过期 | `SETEX token 7200 abc123` |
| ★★ | `SETNX key value` | 不存在才设（分布式锁） | `SETNX lock:order 1` |
| ★★ | `INCR key` / `DECR key` | 自增/自减（计数器） | `INCR pageview` |
| ★★ | `SADD key member` | 集合添加 | `SADD tags "java"` |
| ★★ | `SMEMBERS key` | 集合全部成员 | `SMEMBERS tags` |
| ★★★ | `KEYS *` | 查所有 key（**生产禁用，阻塞**） | 用 `SCAN 0` 代替 |
| ★★★ | `SCAN 0` | 游标遍历 key（安全） | `SCAN 0 MATCH user:* COUNT 100` |

**口诀**：SET 设 GET 取，DEL 删 EXISTS 查，EXPIRE 定时 TTL 看，INCR 计数 SETNX 锁。

## Redis · A 高频（五种数据类型）

| 难度 | 类型 | 核心命令 | 场景 |
|------|------|----------|------|
| ★★ | **String** | `SET` `GET` `MSET` `MGET` `APPEND` `STRLEN` | 缓存、计数器、分布式锁 |
| ★★ | **Hash** | `HSET key field value` `HGET` `HGETALL` `HDEL` `HMGET` `HINCRBY` | 存对象（购物车、用户信息） |
| ★★ | **List** | `LPUSH`/`RPUSH` `LPOP`/`RPOP` `LRANGE key 0 -1` `LLEN` | 消息队列、最新列表 |
| ★★ | **Set** | `SADD` `SREM` `SISMEMBER` `SINTER`（交集）`SUNION`（并集）`SDIFF`（差集） | 去重、共同好友 |
| ★★ | **ZSet** | `ZADD key 分数 member` `ZRANGE key 0 -1 WITHSCORES` `ZREVRANGE` `ZRANK` `ZINCRBY` | 排行榜、优先级队列 |

## Redis · B 中频

| 难度 | 命令/概念 | 作用 |
|------|-----------|------|
| ★★★ | `MULTI` → 命令 → `EXEC` / `DISCARD` | 事务（非原子回滚，仅保证顺序） |
| ★★★ | `WATCH key` | 乐观锁监视 |
| ★★★ | `SUBSCRIBE 频道` / `PUBLISH 频道 消息` | 发布订阅 |
| ★★★ | `SELECT 0~15` 切换库 / `DBSIZE` | 多库、key 数量 |
| ★★ | `PERSIST key` | 移除过期时间 |
| ★★ | `TYPE key` | 查看 key 类型 |
| ★ | `FLUSHDB` / `FLUSHALL` | 清空当前库/所有库（**高危**；库数默认 16） |
| ★★★ | RDB（定时快照）/ AOF（追加日志）持久化 | `INFO` 查看状态 |
| ★★★ | `MONITOR` | 实时监控命令（**生产慎用**） |

> [!WARNING]
> **`KEYS *` 生产禁用**——O(N) 复杂度会阻塞整个 Redis 实例。用 `SCAN` 代替。  
> **`FLUSHALL` 高危**——清空**所有库**（默认 16 个，`databases` 可配置），不可逆。

### Redis 生产环境高危操作与替代方案

Redis 核心读写模块为**单线程事件循环模型**，执行耗时 O(N) 命令会阻塞整个实例，导致雪崩。

| 危险命令（生产禁/限） | 原因 | 安全替代 |
|----------------------|------|---------|
| `KEYS *` | O(N) 全量遍历，百万 key 阻塞数十秒 | `SCAN 0 MATCH pattern COUNT 100`（游标迭代） |
| `FLUSHALL` / `FLUSHDB` | 清空所有数据，不可逆 | 配置文件 `rename-command FLUSHALL ""` 禁用 |
| `HGETALL big_hash` | 哈希元素过多时阻塞 | `HSCAN key 0 COUNT 100` |
| `SMEMBERS big_set` | 集合元素过多时阻塞 | `SSCAN key 0 COUNT 100` |
| `ZRANGE big_zset 0 -1` | 有序集合全量返回 | `ZSCAN key 0 COUNT 100` |
| `CONFIG SET` | 热修改配置可能导致崩溃 | 配置文件 `rename-command CONFIG ""` 禁用 |

**Pipeline（管道）优化**：多条命令打包发送，减少网络 RTT，但单次建议 ≤ 500 条以防阻塞。

**Lua 脚本集群环境注意**：所有操作的 Key 必须通过 `KEYS` 数组传递，且须落在同一 Slot（CRC16 哈希槽），否则集群拒绝执行。

### Redis · 特殊结构 / 运维深补（A–S）

| 频次/难度 | 结构/命令 | 要点 |
|-----------|-----------|------|
| **A/★★★** | Bitmap `SETBIT/GETBIT/BITCOUNT` | 签到、活跃位图 |
| **A/★★★** | HyperLogLog `PFADD/PFCOUNT` | UV；约 12KB，误差约 0.81% |
| **B/★★★** | GEO `GEOADD/GEOSEARCH` | 附近的人；ZSet+GeoHash |
| **B/★★★★** | Stream `XADD/XREADGROUP/XACK` | 消息队列+消费者组 |
| **S/★★★** | `SCAN` 替 `KEYS` | 生产禁止 KEYS |
| **A/★★★** | `--bigkeys`/`--hotkeys`/`SLOWLOG`/`MEMORY USAGE` | 运维剖析 |

---
