---
title: "免登录评论系统的反垃圾纵深:蜜罐、Turnstile、三层限流与不可反解的 IP"
date: 2026-07-26
summary: "一个不要求登录、也不裸奔的博客评论系统怎么防刷。从五层防线的取舍讲起,重点拆一个真实的隐私安全 bug:IP 盐既不能有仓库默认值(公开即穷举反解),也不能返回 undefined(Mongo 里会一人发言全站禁言),以及为什么 Turnstile 的 fetch 必须 fail-closed 超时。"
tags: [工程实录, 安全, 反垃圾]
---

# 免登录评论系统的反垃圾纵深:蜜罐、Turnstile、三层限流与不可反解的 IP

> 我给博客加了个不需要注册登录的评论框——填昵称、写内容、提交,就这么简单。可越是把门槛降到最低,越不能裸奔:没有账号体系兜底,每一条防线都得自己在 Server Action 里手写。这篇是 `lib/comments.ts` 这 170 行代码的完整复盘,包括一个差点把访客 IP 变成明文的隐私 bug。

## 1. 为什么"不做登录"反而更需要纵深防御

登录系统天然是一道反垃圾闸门:注册要邮箱、要验证码、要养号,机器人刷一条评论的边际成本被账号成本摊高了。我主动放弃了这道闸门——博客评论就该是路过留一句话,逼人注册等于劝退真实读者。

代价是:攻击面完全敞开。任何人 POST 一个表单就能写库。所以我的原则很简单——**不收集身份,就用行为特征和成本来筛**。`comments.ts` 顶部的注释把这套思路定死了:

```ts
// 免登录评论:昵称 + 内容,不收集邮箱,不存原始 IP(仅存 salted hash 用于限流)。
// 反垃圾多层防线:蜜罐 → 内容校验/敏感词 → Cloudflare Turnstile 人机验证 → 同 IP 限流。
```

注意这里有个隐含的自我约束:既然对读者承诺了"不存 IP",那限流所依赖的 IP 就必须以不可反解的形式存储。这句承诺后面会变成一个真实的安全陷阱,先记住它。

## 2. 五层防线,按成本从低到高排

`submitComment` 的执行顺序是精心排的——**越便宜的检查越靠前**,把绝大多数垃圾挡在最贵的操作(Turnstile 网络请求、数据库查询)之前。

### 2.1 蜜罐:免费的第一道

表单里藏一个 CSS 隐藏的 `honeypot` 字段,真人看不见、不会填,自动化脚本却倾向于把所有 input 填满。

```ts
// 1) 蜜罐:机器人往往会填满所有字段,填了就静默丢弃、伪装成功
if (input.honeypot.trim()) {
  return { ok: true, comment: { id: "0", slug: input.slug, name: input.name.trim(), body: "", createdAt: new Date().toISOString() } };
}
```

关键细节:命中蜜罐时我**返回 `ok: true`**,伪装成功。如果这里返回错误,爬虫作者会立刻知道蜜罐的存在并绕过它;返回成功、静默丢弃,它以为得手了,不会来调优。这层是纯 CPU、零 IO,放第一位。

### 2.2 内容校验 + 敏感词:仍然是本地计算

```ts
if (name.length < 1 || name.length > 24) return { ok: false, error: "昵称需 1–24 个字符。" };
if (body.length < 2 || body.length > 1000) return { ok: false, error: "评论需 2–1000 个字符。" };
if ((body.match(/https?:\/\//gi) ?? []).length > 2) return { ok: false, error: "链接过多,疑似广告。" };
const haystack = `${name}\n${body}`.toLowerCase();
if (BANNED_WORDS.some((w) => haystack.includes(w.toLowerCase()))) {
  return { ok: false, error: "内容包含不被允许的词汇。" };
}
```

长度、链接数、敏感词表(`加微信`、`代开`、`t.me/`、`兼职日结`……都是中文博客垃圾评论的高频词)。敏感词把昵称和正文拼进同一个 `haystack` 一起查——垃圾佬爱把广告塞昵称里绕过正文检测,这里一并覆盖。仍然全是本地字符串操作,不碰网络不碰库。

### 2.3 Cloudflare Turnstile:第一个"贵"操作,且能优雅降级

到这才发起外部请求。这一层的设计有两个我很在意的点。

```ts
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true;      // 未配 secret → 跳过,不阻断
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(3000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;               // 超时/异常 → fail-closed
  }
}
```

**优雅降级**:`if (!secret) return true`。我不是所有环境都配了 Turnstile——本地开发、刚 clone 下来的实例没有 secret,这时不该把评论功能整个锁死。没配就跳过人机验证,靠蜜罐/限流/敏感词继续兜底。这是"少一层但不塌"的降级,而不是"缺配置就 500"。

**超时是硬要求,见第 4 节。**

### 2.4 三层限流(数据库) + 2.5 落库

这两层放最后,因为它们查库最贵,详见第 3 节。

## 3. 同 IP 三层限流:为什么是三层而不是一层

限流全部围绕 `ipHash` 展开(不是原始 IP,原因见第 5 节)。我没有用一个简单的"每分钟 N 条"就了事,而是三个正交维度叠加:

```ts
// 4a) 60 秒内最多 1 条
const recent = await col.findOne({ ipHash, createdAt: { $gte: new Date(Date.now() - 60_000) } });
if (recent) return { ok: false, error: "评论太频繁,请稍后再试。" };
// 4b) 1 小时内最多 10 条
const hourCount = await col.countDocuments({ ipHash, createdAt: { $gte: new Date(Date.now() - 3_600_000) } });
if (hourCount >= 10) return { ok: false, error: "发言太多啦,休息一下再来。" };
// 4c) 5 分钟内不允许相同内容(防刷屏)
const dup = await col.findOne({ ipHash, body, createdAt: { $gte: new Date(Date.now() - 300_000) } });
if (dup) return { ok: false, error: "请勿重复发送相同内容。" };
```

- **60s 节流**挡的是手速/脚本连发;
- **1h 配额**挡的是"每分钟规规矩矩发一条"的慢速刷量——单看 60s 窗口它永远合规,但一小时 10 条封顶让它无利可图;
- **5 分钟去重**挡的是同一句广告在不同文章刷屏——它可能没触发前两层(比如换着文章发),但内容一样就拦。

三个维度对应三种攻击节奏,单独任何一层都有缝。这些查询能便宜是因为建了复合索引:

```ts
col.createIndex({ ipHash: 1, createdAt: -1 }, { name: "idx_comments_ip_time" }),
```

`4c` 的 `{ ipHash, body, createdAt }` 查询用不满这个索引的 `body` 字段,但 `ipHash + createdAt` 已经把候选集缩到极小,可接受。

后面还有第 4d 层——每篇文章 500 条上限,防单页无限膨胀。而且这个 `MAX_COMMENTS_PER_POST = 500` 被落库门槛和渲染取数**共用**,源码注释特意点了这个坑:

```ts
/** 单文章评论上限:落库门槛(submitComment 4d)与渲染取数(getComments 默认 limit)共用,
 *  两处若不一致会出现「被受理却永不渲染」的缝隙。 */
```

如果落库允许 500 而渲染只取 200,第 201 条起就会"存进去了却永远不显示"——用户以为发失败了会重发,雪上加霜。同一个常量锁死两端。

## 4. Turnstile 的 fetch 必须 fail-closed 超时——这是被容器规格逼出来的

回到 2.3 那行 `signal: AbortSignal.timeout(3000)`。它不是可有可无的健壮性装饰,是**部署环境的硬约束**。源码注释写得很直白:

```ts
// 无超时的话,CF 一次慢响应就把整个评论 Server Action 挂住;
// 1cpu/512m 上会放大成全站卡顿。超时按校验失败处理(fail-closed)。
```

我这博客跑在 1 vCPU / 512MB 的小容器上。Server Action 是同步阻塞在请求生命周期里的:一次 `verifyTurnstile` 如果卡在 CF 的慢响应上,这个 worker 就被占着。1 核意味着并发能力极其有限,几个挂住的请求就能把整台机器的响应槽位吃光——一次第三方慢请求被放大成**全站卡顿**。

所以两点:一是 3 秒硬超时,`AbortSignal.timeout` 到点直接 abort;二是超时后 `catch` 里 `return false`,即 **fail-closed**——验证服务挂了/超时,宁可拒绝这条评论,也不能放行,更不能挂死。安全默认值永远是"拒绝",不是"放行"。

## 5. 不可反解的 IP:一个盐没配好就等于明文存 IP 的 bug

这是整篇最值得写的一段。我要"不存原始 IP",于是存 salted sha256:

```ts
function hashIp(ip: string): string {
  const salt = process.env.COMMENT_IP_SALT?.trim() || FALLBACK_IP_SALT;
  return createHash("sha256").update(salt + ip).digest("hex").slice(0, 16);
}
```

问题出在 `salt` 兜底值怎么取。最初我图省事,在仓库里写死了一个默认盐字符串。看起来无害——直到我意识到:**IPv4 地址空间只有 2^32 ≈ 43 亿个**。对现代 CPU 而言,把 43 亿个 IP 各拼一次固定盐做 sha256,是几分钟就能跑完的彩虹表。盐一旦随开源仓库公开,任何人都能预计算出全部 `ip → hash` 映射,拿库里的 `ipHash` 一查就反解出原始 IP。**公开的默认盐 = 明文存 IP**,直接违背我对读者的隐私承诺。

那就别给默认值,`COMMENT_IP_SALT` 没配时返回 `undefined` 呗?这是第二个、更隐蔽的坑。`hashIp` 里如果 salt 是 undefined,或者干脆让 `ipHash` 字段变成 undefined 存进去——**Mongo 里 `{ ipHash: undefined }` 会匹配所有缺该字段的文档**。第 3 节那三条限流查询 `col.findOne({ ipHash, ... })` 会命中彼此:一个人发了评论,下一个 undefined-hash 的人来查"60s 内有没有我发的",查到了前一个人的,于是被拒。结果是**一个人发言就把全站限流卡死**,人人互相触发节流。

两条路都堵死了。最终方案是进程内随机盐:

```ts
// 未配置 COMMENT_IP_SALT 时的兜底盐:进程启动时随机生成,永不落盘。
// 不能像原来那样在仓库里写死默认值 —— IPv4 空间只有 2^32,盐一旦公开就能穷举反解,
// 等于明文存 IP,与前端「仅加密存储」的承诺不符。
// 也不能返回 undefined:{ipHash: undefined} 在 Mongo 里会匹配所有缺该字段的文档,
// 一个人发言就会把全站限流卡死。随机盐同时守住隐私与限流,代价只是重启后限流窗口重置。
const FALLBACK_IP_SALT = randomBytes(32).toString("hex");
```

`randomBytes(32)` 在进程启动时生成、只在内存里、永不落盘。它同时满足两个约束:盐不公开(仓库里没有,别人无从穷举)、盐非空(同进程内哈希稳定,限流正常工作)。唯一代价是**重启后盐变了、限流窗口重置**——对一个博客评论系统,这个代价可以忽略。当然生产环境我还是配了 `COMMENT_IP_SALT` 环境变量走稳定盐,随机盐只是兜底不塌的下限。

顺带一提,同一套"防侧信道"的洁癖也体现在鉴权路径。后台密码比对没用 `===`,而是走 `lib/safe-compare.ts` 的常数时间比较:

```ts
export function safeCompare(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
```

先比字节长度、等长再 `timingSafeEqual` 全量比对,避免用响应时间猜密码——和 IP 哈希是同一种"默认值就得是安全的"思路。

## 6. 内存回收:512MB 容器容不下一张无限增长的表

`lib/rate-limit.ts` 是登录等场景用的内存限流(注意它和评论的 DB 限流是两套:评论限流靠 Mongo 存活于重启,这张 Map 靠内存快但会被冷启动清零)。它的核心不是限流逻辑,而是**这张 Map 不能无限长**:

```ts
// 512m 容器里长驻进程不能让这张表无限长:每个来过的 IP 都会留一条永不回收的记录。
const MAX_ENTRIES = 10_000;

function sweep(now: number): void {
  for (const [key, entry] of hits) {
    if (now > entry.resetAt) hits.delete(key);   // 先扔掉所有过期条目
  }
  if (hits.size <= MAX_ENTRIES) return;
  const victims = [...hits.entries()]
    .sort((a, b) => a[1].resetAt - b[1].resetAt)   // 仍超限:按 resetAt 最早批量淘汰
    .slice(0, hits.size - MAX_ENTRIES);
  for (const [key] of victims) hits.delete(key);
}
```

每个来访 IP 都会留一条记录,不回收就是一条稳定的内存泄漏,在 512MB 机器上迟早 OOM。策略是惰性清扫:表超阈值时先顺手删掉所有已过期条目(免费的),还超就按 `resetAt` 最早的批量淘汰。清扫只在 `hits.size >= MAX_ENTRIES` 时触发,平时零开销。文件顶部还诚实标注了边界——Serverless 冷启动会清空这张表,要可靠限流得上 KV/Redis;当前实现只保证 Docker 长驻 + 低频 Serverless 够用。

## 7. 一句话总结

免登录不是"不设防",是把身份这道闸换成一叠更便宜、更透明的行为闸——而每一道闸的**默认值都必须自己是安全的**:蜜罐默认伪装成功、Turnstile 默认拒绝且超时、IP 盐默认随机不可反解、内存表默认有上界。可迁移的那条经验是:**当你选择"降低门槛"时,你不是删掉了防御,而是把防御从系统边界搬进了每一行代码——尤其是那些你以为无所谓的 fallback 值。** 那个仓库默认盐的坑提醒我:安全 bug 最爱藏在"随便给个默认值"里。
