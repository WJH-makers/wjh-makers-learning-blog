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

### MySQL · 索引类型与设计原则（InnoDB）

InnoDB 索引底层是 **B+ 树**：非叶子节点只存键、叶子节点存数据（聚簇索引）或主键（二级索引），因此二级索引查询需**回表**（先查二级索引拿主键，再回聚簇索引取整行）。

| 索引类型 | 语法 | 作用 / 场景 | 备注 / 坑 |
|----------|------|-------------|-----------|
| 主键/聚簇索引 | `PRIMARY KEY (id)` | 数据行本身按主键组织 | InnoDB 必有聚簇索引；无显式主键时用第一个非空唯一索引，再无则生成 6 字节隐藏 `_rowid`。主键应**单调递增**（`BIGINT AUTO_INCREMENT`），用 UUID/雪花字符串做主键会导致页分裂+索引膨胀 |
| 二级索引 | `CREATE INDEX idx ON t(col)` | 加速非主键列查询 | 每个二级索引叶子存主键值，主键过长会放大所有二级索引体积 |
| 唯一索引 | `CREATE UNIQUE INDEX ux ON t(col)` | 保证唯一 + 加速 | 唯一检查会关闭 change buffer，写入比普通索引略慢；NULL 不参与唯一约束（可多行 NULL） |
| 复合索引 | `CREATE INDEX idx ON t(a,b,c)` | 多列联合 | **最左前缀原则**：能命中 `a`、`a,b`、`a,b,c`，命中不了 `b`、`b,c`；范围列（`>`/`<`/`LIKE`）之后的列失效，故把等值列放前、范围列放后 |
| 覆盖索引 | `SELECT a,b FROM t WHERE a=?` 且有 `idx(a,b)` | 免回表 | `EXPLAIN` 的 Extra 出现 `Using index` 即命中；查询列尽量落在索引内可显著提速 |
| 前缀索引 | `CREATE INDEX idx ON t(name(10))` | 长文本列节省空间 | 前缀无法用于覆盖索引和 `ORDER BY`；前缀区分度不足时形同虚设，先用 `COUNT(DISTINCT LEFT(col,n))/COUNT(*)` 估区分度 |
| 函数索引 8.0.13+ | `CREATE INDEX idx ON t((YEAR(dt)))` | 让函数查询也能走索引 | 8.0.13 之前不支持，只能建虚拟生成列再索引 |
| 全文索引 | `CREATE FULLTEXT INDEX ...` + `MATCH() AGAINST()` | 文本搜索 | InnoDB 从 5.6 支持；中文需 ngram 解析器，能力有限，重搜索场景上 ES |

**设计口诀**：区分度高的列建索引；联合索引遵循最左前缀、等值在前范围在后；用覆盖索引免回表；单表索引控制在 5 个以内（每个索引都拖慢写入并占空间）。⚠ 在大表上 `CREATE INDEX` 会长时间持有元数据锁，务必用 `ALGORITHM=INPLACE, LOCK=NONE`（8.0 默认在线 DDL）或低峰期 + `pt-online-schema-change`。

### MySQL · 事务隔离级别（面试必背）

| 隔离级别 | 脏读 | 不可重复读 | 幻读 | 说明 |
|----------|:----:|:----------:|:----:|------|
| READ UNCOMMITTED | 可能 | 可能 | 可能 | 读未提交，几乎不用 |
| READ COMMITTED | 否 | 可能 | 可能 | 读已提交（Oracle/PG 默认） |
| **REPEATABLE READ** | 否 | 否 | **基本避免** | **InnoDB 默认**；靠 MVCC+间隙锁 |
| SERIALIZABLE | 否 | 否 | 否 | 串行化，读加共享锁，并发最差 |

```sql
SELECT @@transaction_isolation;                 -- 查当前级别（8.0，旧版是 @@tx_isolation）
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;  -- 改会话级
SET GLOBAL  TRANSACTION ISOLATION LEVEL READ COMMITTED;  -- 改全局（只对新连接生效）
```

**关键点**：
- **MVCC**（多版本并发控制）：InnoDB 靠 undo log + 隐藏列 `DB_TRX_ID`/`DB_ROLL_PTR` 构建 ReadView，实现快照读（普通 `SELECT`）不加锁。RR 下事务首次快照读时生成 ReadView 并沿用；RC 下每次快照读都生成新 ReadView，故 RC 会不可重复读。
- **当前读**：`SELECT ... FOR UPDATE`、`SELECT ... LOCK IN SHARE MODE`、`UPDATE`、`DELETE` 读的是最新版本并加锁。
- **间隙锁（Gap Lock）+ Next-Key Lock**：RR 下 InnoDB 对当前读的范围加锁，锁住记录及记录间的"间隙"，从而避免幻读——这是 InnoDB RR 比标准 RR 更强的地方。⚠ 间隙锁是很多死锁的根源；RC 级别不加间隙锁，高并发写入场景（如电商）常主动降到 RC。

### MySQL · 常用运维 / DBA SQL

| 命令/SQL | 作用 | 备注 / 坑 |
|----------|------|-----------|
| `SELECT VERSION();` | 查版本 | 区分 5.7 / 8.0 行为差异 |
| `SHOW VARIABLES LIKE 'innodb_buffer_pool_size';` | 查缓冲池大小 | 生产建议设物理内存 50–70%；这是 InnoDB 最重要的性能参数 |
| `SHOW STATUS LIKE 'Threads_connected';` | 当前连接数 | 对比 `max_connections`，接近上限会报 "Too many connections" |
| `SHOW VARIABLES LIKE 'max_connections';` | 最大连接数 | 默认 151，云库常调至几千 |
| `SELECT table_schema, ROUND(SUM(data_length+index_length)/1024/1024,2) AS MB FROM information_schema.tables GROUP BY table_schema;` | 各库磁盘占用 | 定位大库 |
| `SELECT table_name, ROUND((data_length+index_length)/1024/1024,2) MB, table_rows FROM information_schema.tables WHERE table_schema='库名' ORDER BY MB DESC;` | 库内各表大小 | 找大表 |
| `SHOW ENGINE INNODB STATUS\G` | InnoDB 全景（死锁/缓冲/事务） | 看 `LATEST DETECTED DEADLOCK` 段定位死锁双方 SQL |
| `ANALYZE TABLE t;` | 重新统计索引基数 | 优化器选错索引时先做这个 |
| `OPTIMIZE TABLE t;` | 回收碎片空间 | ⚠ 会锁表重建（InnoDB 实为 `ALTER TABLE … FORCE`），大表在低峰做 |
| `CHECK TABLE t;` | 检查表损坏 | |
| `SELECT * FROM performance_schema.data_locks;` | 当前持有的锁（8.0） | 排查锁等待，配合 `data_lock_waits` |
| `RESET MASTER;` ⚠ | 清空 binlog | 破坏性：清掉所有二进制日志，从库会失联，仅在初始化时用 |
| `PURGE BINARY LOGS BEFORE '2026-07-01';` | 清理指定日期前 binlog | 释放磁盘，比 RESET 安全 |
| `SHOW REPLICA STATUS\G` | 查主从状态（8.0.22+ 术语） | 旧版 `SHOW SLAVE STATUS`；看 `Seconds_Behind_Source` 复制延迟、`Replica_IO/SQL_Running` 是否 Yes |

**在线备份（推荐现代方式）**：

```bash
# 逻辑备份：加 --single-transaction 保证一致性快照（InnoDB 不锁表）
mysqldump -u root -p --single-transaction --routines --triggers --events \
  --set-gtid-purged=OFF 库名 > backup_$(date +%F).sql

# 物理备份（大库首选，热备不停机）：Percona XtraBackup
xtrabackup --backup --target-dir=/data/bak --user=root --password=***
```

> ⚠ 直接 `mysqldump` 不加 `--single-transaction` 会隐式 `LOCK TABLES` 锁全库，生产严禁。

### MySQL · 慢查询定位实操

```sql
-- 1) 开启慢查询日志（运行时动态开，重启失效；永久生效写 my.cnf）
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;                 -- 超过 1 秒记录（改后需重连生效）
SET GLOBAL log_queries_not_using_indexes = ON;  -- 未走索引的也记（慎开，日志暴涨）
SHOW VARIABLES LIKE 'slow_query_log_file';      -- 日志位置

-- 2) performance_schema 直接查 TOP 慢 SQL（免翻日志，8.0 推荐）
SELECT DIGEST_TEXT, COUNT_STAR, ROUND(AVG_TIMER_WAIT/1e9,2) AS avg_ms,
       ROUND(SUM_TIMER_WAIT/1e12,2) AS total_s
FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC LIMIT 10;
```

```bash
# 3) 离线聚合慢日志：mysqldumpslow 按平均耗时排序取 Top10
mysqldumpslow -s t -t 10 /var/lib/mysql/slow.log
# 更强的第三方：pt-query-digest（Percona Toolkit），输出指纹聚合 + 采样
pt-query-digest /var/lib/mysql/slow.log
```

**定位流程**：慢日志/`performance_schema` 找出慢 SQL → `EXPLAIN`/`EXPLAIN ANALYZE` 看执行计划 → 检查 `type=ALL`、`key=NULL`、`Extra` 有无 `Using filesort/temporary` → 补索引或改写 SQL（拆分、避免 `SELECT *`、分页深翻用游标 `WHERE id>上次最大id LIMIT n` 代替 `LIMIT 大偏移`）→ 再验证。

---

# Redis 命令（难度 × 频次）

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

### Redis · 数据类型选型（别只会 String）

| 需求 | 该用的类型 | 原因 / 备注 |
|------|-----------|------------|
| 缓存对象、且要**改单个字段** | Hash | 用 String 存 JSON 改一个字段要整体反序列化+写回；Hash 可 `HSET` 改单 field。但 Hash 无法对单 field 设 TTL |
| 计数器 / 限流 | String `INCR` | 原子自增；限流配合 `EXPIRE` 或用 `INCR` + Lua 滑动窗口 |
| 排行榜 / 带分数排序 | ZSet | `ZADD`+`ZREVRANGE`；`ZRANGEBYSCORE` 范围查；分页排行首选 |
| 最新 N 条 / 消息流 | List 或 Stream | List 简单但无消费确认；需消费者组+ACK 用 Stream |
| 去重统计（精确） | Set | `SADD`+`SCARD`；元素多时内存大 |
| UV 等海量去重（可容误差） | HyperLogLog | 固定约 12KB，误差 0.81%，不能取出成员 |
| 签到 / 布尔状态海量 | Bitmap | `SETBIT`；1 亿用户签到仅约 12MB |
| 附近的人 / 地理 | GEO | 底层是 ZSet+GeoHash |
| 布隆过滤 / 防穿透 | Bitmap 或 RedisBloom 模块 | 判断"一定不存在" |

> ⚠ **大 key 陷阱**：单个 Hash/Set/List/ZSet 元素过多（万级以上）或 String 过大（>10KB），会导致 `HGETALL`/`DEL` 阻塞、集群迁移卡顿、内存分布不均。用 `redis-cli --bigkeys` 扫描，`DEL` 大 key 改用 `UNLINK`（4.0+，后台异步回收，不阻塞主线程）。

### Redis · 持久化（RDB / AOF 深度）

| 维度 | RDB（快照） | AOF（追加日志） |
|------|------------|-----------------|
| 原理 | 定时 fork 子进程把内存 dump 成二进制 `dump.rdb` | 记录每条写命令到 `appendonly.aof` |
| 触发 | `save 900 1`（900秒内≥1次写）/ 手动 `SAVE`(⚠阻塞) / `BGSAVE`(后台 fork) | `appendfsync` 策略持续追加 |
| 恢复速度 | 快（直接加载内存镜像） | 慢（重放命令） |
| 数据安全 | 差（两次快照间宕机会丢） | 好（`always` 几乎不丢，`everysec` 最多丢 1 秒） |
| 文件体积 | 小（压缩二进制） | 大（AOF 重写 `BGREWRITEAOF` 可压缩） |
| 适用 | 允许分钟级丢失、要快速恢复/迁移 | 要求高数据安全 |

```bash
# 关键配置（redis.conf）
save 900 1                 # RDB 触发规则，多条并存；save "" 关闭 RDB
appendonly yes             # 开启 AOF
appendfsync everysec       # always(每命令刷盘,最安全最慢) / everysec(默认,均衡) / no(交OS)
aof-use-rdb-preamble yes   # 4.0+ 混合持久化：AOF 文件头部是 RDB 全量 + 增量命令，恢复快又安全
```

**要点**：
- ⚠ `SAVE` 在主线程执行，会**阻塞所有客户端**，生产只用 `BGSAVE`。
- `BGSAVE` / AOF 重写靠 `fork` 子进程 + 写时复制（COW），fork 瞬间若内存大且写入频繁会造成延迟毛刺；`INFO persistence` 看 `latest_fork_usec`。
- 生产**推荐 RDB + AOF 同开**（`aof-use-rdb-preamble yes` 混合模式）：兼顾快速恢复与低丢失。
- 云 Redis / 主从场景，从库还可靠 `INFO replication` 的复制流做冗余；但复制不能替代持久化。

### Redis · 缓存三大问题（穿透 / 击穿 / 雪崩）

| 问题 | 定义 | 典型场景 | 应对方案 |
|------|------|----------|----------|
| **缓存穿透** | 查一个**数据库里也不存在**的 key，请求每次都打到 DB | 恶意用非法 ID 刷接口 | ① 缓存空值 `SET id "" EX 60`（短 TTL）；② **布隆过滤器**前置拦截"一定不存在"的 key；③ 接口层参数校验 |
| **缓存击穿** | 某个**热点 key 到期瞬间**，大量并发同时穿透到 DB | 秒杀商品、热搜词缓存过期 | ① **互斥锁**：`SET lock nx ex` 抢到锁的线程回源，其余等待/重试；② 热点 key **逻辑过期**（不设物理 TTL，value 里存过期时间，异步重建）；③ 热点数据永不过期 |
| **缓存雪崩** | **大量 key 同一时刻集中过期**，或 Redis 宕机，流量瞬间压垮 DB | 批量预热的缓存设了相同 TTL | ① TTL 加**随机抖动** `EX (3600 + rand(0,300))`；② 多级缓存（本地 Caffeine + Redis）；③ Redis 高可用（哨兵/集群）；④ DB 侧限流+熔断降级 |

```bash
# 击穿：互斥锁回源（伪代码）
val = GET key
if val is nil:
    if SET lock:key 1 NX EX 10:      # 抢锁，NX 保证只有一个线程回源
        val = 查DB; SET key val EX 300
        DEL lock:key
    else:
        sleep(50ms); 重试 GET        # 未抢到锁，短暂等待后读缓存
```

> **区分记忆**：穿透 = 查不存在的数据（打空气）；击穿 = 单个热点 key 失效（一个点被打穿）；雪崩 = 大面积 key 同时失效（一整片塌方）。

### Redis · 分布式锁（生产正确姿势）

```bash
# ✅ 加锁：一条命令原子完成"不存在才设 + 带过期"，value 用唯一标识（如 UUID）
SET lock:order UUID_xxx NX EX 10
# ❌ 反例：SETNX + EXPIRE 两条命令，中间宕机会造成锁永不释放（死锁）

# ✅ 解锁：必须用 Lua 保证"判断是自己的锁 + 删除"原子，防误删别人的锁
EVAL "if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end" 1 lock:order UUID_xxx
```

**要点**：
- ⚠ 解锁必须校验 value（是不是自己加的锁）：否则 A 的锁超时自动释放、B 拿到锁后，A 执行完直接 `DEL` 会误删 B 的锁。
- 锁过期时间要 > 业务执行时间，否则业务没跑完锁就没了；生产用 **Redisson** 的看门狗（watchdog）自动续期。
- 单机 Redis 主从切换有丢锁风险（主宕机时锁未同步到从）；强一致场景用 **RedLock**（多独立节点）或改用 etcd/ZooKeeper。

---
