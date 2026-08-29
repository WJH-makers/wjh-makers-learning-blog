/**
 * 全部环境变量的类型声明。
 *
 * 收敛前这里只声明了 NEXT_PUBLIC_SITE_URL 一个，其余 23 个全靠 ProcessEnv 的索引签名
 * 兜着 —— 把 MONGODB_URI 拼成 MONOGDB_URI 编译器不会报错，表现是「数据库静默降级读
 * Markdown」，而降级路径本身是刻意设计的正常行为，所以看不出异常。
 *
 * 全部 optional：本站的设计是「缺配置 = 该功能诚实关闭」，不是启动时崩。
 * 因此类型上不能写成必填，那会与实际的 fail-closed 语义相矛盾。
 *
 * 值的读取仍留在各自 feature 模块（lib/db.ts 读 MONGODB_*、lib/comments.ts 读
 * TURNSTILE_*），本文件只管名字与类型。把 24 个无关领域的读取集中到一个模块才是
 * 低内聚 —— 那会让评论功能被迫依赖 Judge0 的配置模块。
 */
declare namespace NodeJS {
  interface ProcessEnv {
    // ── 站点身份（构建期内联，见 lib/site-config.ts）────────────────────────
    /** 站点公开根地址。docker-compose 以 build args 传入，不是运行期变量。 */
    NEXT_PUBLIC_SITE_URL?: string;
    /** /_next/static/ 的 CDN 前缀。空值 = 静态资源仍走本域。 */
    NEXT_PUBLIC_ASSET_PREFIX?: string;

    // ── 数据库 ────────────────────────────────────────────────────────────
    MONGODB_URI?: string;
    /** 部分平台只给 DATABASE_URL；优先用 MONGODB_URI。 */
    DATABASE_URL?: string;
    MONGODB_DB_NAME?: string;
    MONGODB_COLLECTION?: string;
    MONGODB_COMMENTS_COLLECTION?: string;

    // ── 鉴权 ──────────────────────────────────────────────────────────────
    /** /write 写入密钥。未配置时写作台整体 404，不是降级。 */
    BLOG_ADMIN_TOKEN?: string;
    MONITOR_USER?: string;
    MONITOR_PASS?: string;
    /**
     * 会话 cookie 的 HMAC 签名密钥，与上面两个登录凭据分离。
     *
     * 未配置时回落到对应的登录凭据（BLOG_ADMIN_TOKEN / MONITOR_PASS），行为与
     * 引入本变量前完全一致 —— 但**回落状态下拿不到它的收益**：那时 cookie 是一组
     * 「已知明文 + 单轮无盐 HMAC」，外泄后可离线跑字典恢复登录口令原文。
     * 设一个独立的高熵随机值（32 字节足够）才真正生效。
     */
    SESSION_SIGNING_KEY?: string;

    // ── 评论（Turnstile 人机验证）──────────────────────────────────────────
    /** 必须字面为 "true" 才开启；其它值一律视为关闭。 */
    COMMENTS_ENABLED?: string;
    TURNSTILE_SECRET_KEY?: string;
    NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
    /** 评论者 IP 的哈希盐。未配置时用内置回退值。 */
    COMMENT_IP_SALT?: string;

    // ── Java 沙箱（Judge0）─────────────────────────────────────────────────
    JAVA_JUDGE0_URL?: string;
    /** 必须对应服务端实际装的 Java 运行时，照抄其它实例的 ID 会跑错版本。 */
    JAVA_JUDGE0_LANGUAGE_ID?: string;
    JAVA_JUDGE0_TOKEN?: string;

    // ── 资源分发（R2）──────────────────────────────────────────────────────
    /** R2 自定义域。刻意只在服务端读，S3 凭据绝不进浏览器 bundle。 */
    R2_PUBLIC_URL?: string;

    // ── 运维与部署 ────────────────────────────────────────────────────────
    CLOUDFLARE_TOKEN?: string;
    CLOUDFLARE_ZONE_ID?: string;
    /** 构建期注入的 commit sha，供 /api/version 核对部署产物。 */
    APP_GIT_SHA?: string;
    DEPLOY_VERIFICATION_TOKEN?: string;
    GOOGLE_SITE_VERIFICATION?: string;
    /** Vercel 运行时标记。为 "1" 时 proxy.ts 一律 403，封死绕过 CF 的链路。 */
    VERCEL?: string;
  }
}
