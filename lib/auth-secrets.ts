/**
 * 鉴权密钥的读取入口。
 *
 * 收敛前：`process.env.BLOG_ADMIN_TOKEN?.trim()` 在 app/api/auth、app/write（两处）、
 * lib/blog-auth、proxy.ts 共 5 处各写一遍，MONITOR_USER/MONITOR_PASS 各 2 处。
 *
 * 失效模式很具体：env 值末尾多一个换行（`.env` 手工编辑、CI 变量粘贴都会），
 * 漏写 `.trim()` 的那一处鉴权恒失败，其余几处正常 —— 表现为「同一个口令，
 * 从 /write 表单能进、走 /api/auth 却 401」，而两条路径的代码看上去都对。
 *
 * 零依赖是硬要求：proxy.ts 跑 Edge 运行时，不能引 lib/blog-auth.ts（它依赖
 * next/headers）。本模块因此只做「读 env + 归一化」，不碰 cookie、不碰 crypto。
 *
 * 一律返回 "" 而非抛错：本站的设计是「缺配置 = 该功能诚实关闭」（写作台 404、
 * 监控台拒绝登录），不是启动时崩。调用方用真值判断即可。
 */

/** 写作台管理密钥。空串 = 未配置，写作台整体不可用（返回 404 而非 401）。 */
export function blogAdminSecret(): string {
  return process.env.BLOG_ADMIN_TOKEN?.trim() ?? "";
}

/**
 * 会话签名密钥。**与登录凭据分离**，这是它存在的全部理由。
 *
 * 未解耦时（BLOG_ADMIN_TOKEN 兼任 HMAC 密钥）的问题：会话 cookie 是一组
 * 「已知明文 + MAC」——消息完全可预测、单轮 HMAC、无盐无迭代。cookie 经浏览器扩展、
 * 代理日志、共享设备、备份任一途径外泄后，攻击者就能离线以 GPU 速率跑字典，
 * 命中即恢复登录口令原文。对 MONITOR_PASS 尤其致命：那个值本身就是登录口令。
 * 解耦后 cookie 泄露只能伪造会话（且有 30 天/8 小时上限），推不回登录口令；
 * 轮换会话密钥也不再需要改登录口令。
 *
 * **未配置时回落到传入的登录凭据**，行为与解耦前完全一致 —— 这样上线不需要先设环境变量，
 * 站点不会因为缺一个变量而登不上。但**回落状态下拿不到上面那个收益**：
 * 要真正生效必须在生产 env 里设一个独立的高熵随机值（32 字节即可）。
 *
 * 回落而非抛错，与本模块「缺配置 = 该功能诚实关闭」的既有原则一致：
 * 会话签名不是可关闭的功能，它没有「关闭」态，只有「共用密钥」与「独立密钥」两档。
 */
export function sessionSigningKey(loginSecret: string): string {
  return process.env.SESSION_SIGNING_KEY?.trim() || loginSecret;
}

/**
 * 监控台账号口令。任一为空即视为未配置 —— 调用方必须两者都非空才放行（fail-closed），
 * 否则「只配了用户名」会退化成空口令可登录。
 */
export function monitorCredentials(): { user: string; pass: string } {
  return {
    user: process.env.MONITOR_USER?.trim() ?? "",
    pass: process.env.MONITOR_PASS?.trim() ?? "",
  };
}

/** 监控台是否已配置。两个值都非空才算。 */
export function hasMonitorCredentials(): boolean {
  const { user, pass } = monitorCredentials();
  return Boolean(user && pass);
}
