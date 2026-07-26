/**
 * 《从零开始守江山》· 攻防修行录(第三部连载,slug 前缀 sec)。
 *
 * 与 Java / CLI 线同宇宙:咖啡站(Java 线 v7 上线的电商系统)生意火爆后,
 * 评论区被刷屏、订单接口被薅羊毛、后台差点被越权登入 —— 安全第一次从
 * "课本名词"变成"我的站真的被打了"。新导师「阿穹」(Armor,盾牌犰狳)登场:
 * 背甲是层层可开合的钛合金鳞片(纵深防御的拟人化),退役自某跨国 CA 安全响应队,
 * 口头禅「先假设它已经破了。」(Assume Breach),随身一把画信任边界的粉笔。
 *
 * 长期项目:把被黑客盯上的豆豆咖啡站守下来 —— 每个攻击都真的打在自己站上。
 * 本线独有深度栏目:🛡️ 攻防推演台(每话结尾红队视角 ↔ 蓝队视角并排对决)。
 * 联动钩子:CLI 线企鹅「特米」在卷四「城墙与哨兵」客串 grep 审计日志;
 * 豆豆的固件更新通道是供应链攻击与密钥管理的具体载体;博客评论区防刷真实
 * 事故直接入戏(卷四·刷屏大军);卷终 v-secN 检查点与 Java 线 v0→v7 并列时光轴。
 * 结构复用 lib/series.ts 的类型;蓝图先行(planned),周更翻 published。
 */

import type { JavaEpisode, JavaSeason } from "@/lib/series";

export const SEC_SERIES_META = {
  slug: "sec-academy",
  title: "从零开始守江山",
  alias: "阿零与阿穹 · 攻防修行录",
  tagline: "生意火爆的那一夜,黑客也来了。跟着阿零和盾牌犰狳阿穹,把 OWASP Top 10 与认证密码学打成看得见的攻防对决,亲手把咖啡站从「能跑」守成「能扛」。",
  project: "把被黑客盯上的豆豆咖啡站守下来",
  storageKey: "sec-academy:completed",
} as const;

export const SEC_SEASONS: JavaSeason[] = [
  {
    season: 1,
    code: "G1",
    title: "破防",
    subtitle: "当咖啡站第一次被打",
    goal: "建立威胁模型与 OWASP Top 10·2025 全景,亲历注入 / XSS / CSRF / SSRF 四大经典攻击,给咖啡站钉上第一排甲片。",
    covers: ["威胁模型", "OWASP Top 10·2025", "四大经典攻击"],
    episodes: [
      { season: 1, episode: 1, title: "深夜的异常订单", summary: "CIA 三性与信任边界:凌晨有人 0 元下单 999 杯,阿穹卷成球滚进机房 ——「先假设它已经破了。」", chapterType: "incident", projectStage: "第一次意识到站被打了", technologies: ["CIA 三性", "信任边界", "Assume Breach"], jobSkills: ["安全思维"], status: "planned" },
      { season: 1, episode: 2, title: "甲片哲学:一层不够", summary: "纵深防御与最小权限:阿穹展开背甲一片片讲防线,摊开 OWASP Top 10·2025 榜单地图。", chapterType: "comic", projectStage: "有了防御路线图", technologies: ["纵深防御", "最小权限", "OWASP Top 10"], jobSkills: ["安全思维"], status: "planned" },
      { season: 1, episode: 3, title: "拼出来的灾难", summary: "SQL 注入:黑客一句 ' OR '1'='1 把整库端走,阿穹用 ? 占位符重铸查询 —— 数据别进语法的客厅。", chapterType: "incident", projectStage: "查询全部参数化", technologies: ["注入", "SQL 注入", "PreparedStatement"], jobSkills: ["Web 安全"], status: "planned" },
      { season: 1, episode: 4, title: "评论区里的幽灵脚本", summary: "XSS 三型:有人在咖啡评价里贴 <script> 偷登录态;输出编码 + CSP + HttpOnly 三连拦截。", chapterType: "comic", projectStage: "评论区输出编码", technologies: ["XSS", "输出编码", "CSP", "HttpOnly"], jobSkills: ["Web 安全"], status: "planned" },
      { season: 1, episode: 5, title: "一键帮你转账的链接", summary: "CSRF:阿零点了张「免费咖啡券」,管理员密码悄悄被改;SameSite + Token + Origin 校验兜底。", chapterType: "comic", projectStage: "表单带上 CSRF Token", technologies: ["CSRF", "SameSite", "CSRF Token"], jobSkills: ["Web 安全"], status: "planned" },
      { season: 1, episode: 6, title: "服务器帮黑客跑腿", summary: "SSRF:头像上传被诱导去读云内网元数据 169.254 差点吐出密钥;出站白名单 + 禁内网段。", chapterType: "comic", projectStage: "出站请求上白名单", technologies: ["SSRF", "出站白名单", "云元数据"], jobSkills: ["Web 安全"], status: "planned" },
      { season: 1, episode: 7, title: "卷一检查点:第一排甲片", summary: "复盘注入 / XSS / CSRF / SSRF:阿穹给咖啡站钉上第一排甲片,信任边界粉笔线首次画满全图。", chapterType: "project", projectStage: "咖啡站城防 v-sec1", technologies: ["综合"], jobSkills: ["Web 安全"], status: "planned" },
    ],
  },
  {
    season: 2,
    code: "G2",
    title: "门锁",
    subtitle: "你是谁,你能干嘛",
    goal: "吃透认证与授权全链:密码存储、JWT、OAuth/OIDC、Passkey 与 RBAC/ABAC,给后台装上多因素门禁。",
    covers: ["认证与授权", "密码存储", "JWT / OAuth / OIDC", "Passkey", "RBAC / ABAC"],
    episodes: [
      { season: 2, episode: 1, title: "认证与授权,别搞混", summary: "AuthN vs AuthZ 与会话管理:阿穹画两道门 —— 一道验脸(你是谁),一道验令牌(你能进哪)。", chapterType: "comic", projectStage: "分清两道门", technologies: ["AuthN", "AuthZ", "Session", "Cookie"], jobSkills: ["认证授权"], status: "planned" },
      { season: 2, episode: 2, title: "明文密码的原罪", summary: "哈希 + 盐 + 慢函数:黑客脱库,别家密码明文躺平,阿零的库靠 Argon2id 扛住 —— 存密码的影子。", chapterType: "comic", projectStage: "密码只存影子", technologies: ["bcrypt", "Argon2id", "加盐"], jobSkills: ["认证授权"], status: "planned" },
      { season: 2, episode: 3, title: "改个数字就看别人订单", summary: "IDOR 与越权:阿零把 URL 里 orderId 加 1 竟看到隔壁桌订单 —— 服务端必须校验数据归属。", chapterType: "incident", projectStage: "订单归属服务端校验", technologies: ["IDOR", "访问控制"], jobSkills: ["认证授权", "Web 安全"], status: "planned" },
      { season: 2, episode: 4, title: "无状态的通行证", summary: "JWT 三段结构与经典坑:阿穹演示把 alg 改成 none 就能伪造令牌 —— 签名一松,令牌是废纸。", chapterType: "comic", projectStage: "JWT 验签不留后门", technologies: ["JWT", "alg:none", "HS256", "RS256"], jobSkills: ["认证授权"], status: "planned" },
      { season: 2, episode: 5, title: "短命令牌与刷新术", summary: "Token 刷新与撤销:被盗 token 泼出去的水收不回,短 TTL + refresh 旋转 + 黑名单来补课。", chapterType: "comic", projectStage: "令牌短命可撤销", technologies: ["refresh token", "黑名单", "短 TTL"], jobSkills: ["认证授权"], status: "planned" },
      { season: 2, episode: 6, title: "借别人的钥匙:OAuth", summary: "OAuth2 四种授权流:咖啡站接第三方登录,阿穹讲授权码流,点名 OAuth 2.1 强制 PKCE、废隐式流。", chapterType: "comic", projectStage: "第三方登录接入", technologies: ["OAuth 2.0", "OAuth 2.1", "PKCE"], jobSkills: ["认证授权"], status: "planned" },
      { season: 2, episode: 7, title: "登录这件事该谁管", summary: "OpenID Connect:阿零发现 OAuth 只授权不认证,OIDC 才发「身份证」(ID Token)。", chapterType: "comic", projectStage: "登录走 OIDC", technologies: ["OIDC", "ID Token"], jobSkills: ["认证授权"], status: "planned" },
      { season: 2, episode: 8, title: "没有密码的未来", summary: "Passkey / WebAuthn / FIDO2 与 MFA/TOTP:私钥锁在设备芯片里,指纹一按无密码登录、抗钓鱼。", chapterType: "comic", projectStage: "支持无密码登录", technologies: ["Passkey", "WebAuthn", "MFA", "TOTP"], jobSkills: ["认证授权"], status: "planned" },
      { season: 2, episode: 9, title: "角色还是属性", summary: "RBAC vs ABAC:店长/店员/顾客分权,阿穹对比角色制与属性制 —— 先想清楚谁能碰什么,再写 if。", chapterType: "comic", projectStage: "后台分角色授权", technologies: ["RBAC", "ABAC"], jobSkills: ["认证授权"], status: "planned" },
      { season: 2, episode: 10, title: "卷二检查点:多因素门禁", summary: "复盘认证授权全链:阿零给后台装上多因素门禁,阿穹甲片再叠一层 —— 锁好门,再谈里面的宝贝。", chapterType: "project", projectStage: "咖啡站城防 v-sec2", technologies: ["综合"], jobSkills: ["认证授权"], status: "planned" },
    ],
  },
  {
    season: 3,
    code: "G3",
    title: "密语",
    subtitle: "加密、证书与传输",
    goal: "从哈希/加密/编码三兄弟到 TLS 1.3 与证书链,再到安全响应头与密钥托管 —— 让咖啡站敢在明网上说话。",
    covers: ["密码学基础", "TLS / HTTPS", "证书链", "安全响应头", "密钥管理"],
    episodes: [
      { season: 3, episode: 1, title: "哈希、加密、编码三兄弟", summary: "阿零把 Base64 当加密用被阿穹敲头:哈希不可逆、加密可逆、编码只是换马甲,不叫穿盔甲。", chapterType: "comic", projectStage: "分清三兄弟", technologies: ["哈希", "加密", "Base64"], jobSkills: ["密码学"], status: "planned" },
      { season: 3, episode: 2, title: "两把钥匙的舞蹈", summary: "对称 vs 非对称:阿穹演示「非对称换密钥、对称传数据」的混合舞步 —— 慢的握手,快的搬货。", chapterType: "comic", projectStage: "理解混合加密", technologies: ["AES", "RSA", "ECC"], jobSkills: ["密码学"], status: "planned" },
      { season: 3, episode: 3, title: "绿锁背后的握手", summary: "TLS 1.3 握手:咖啡站上 HTTPS,阿穹把握手演成两人对暗号建密道,1-RTT/0-RTT 更快更狠。", chapterType: "comic", projectStage: "全站 HTTPS", technologies: ["TLS 1.3", "HTTPS"], jobSkills: ["密码学", "网络安全"], status: "planned" },
      { season: 3, episode: 4, title: "谁给证书作担保", summary: "证书链与 CA 信任:阿零自签证书被浏览器打红叉,阿穹讲根 CA → 中间 CA → 站点的担保链。", chapterType: "comic", projectStage: "证书链看得懂", technologies: ["证书链", "CA", "自签证书"], jobSkills: ["密码学", "网络安全"], status: "planned" },
      { season: 3, episode: 5, title: "强制上锁与自动续签", summary: "证书半夜过期站挂了:阿穹上 ACME 自动续期 + HSTS 防降级 —— 别让一张过期的纸毁了整座站。", chapterType: "incident", projectStage: "证书自动续期", technologies: ["HSTS", "ACME", "Let's Encrypt"], jobSkills: ["网络安全", "运维部署"], status: "planned" },
      { season: 3, episode: 6, title: "一排头的守护", summary: "HTTP 安全响应头速查:CSP 进阶 nonce 干掉内联 JS,顺带演示 Allow-Origin:* + 凭证的 CORS 翻车。", chapterType: "reference", projectStage: "响应头贴满护身符", technologies: ["CSP", "HSTS", "X-Frame-Options", "CORS"], jobSkills: ["Web 安全"], status: "planned" },
      { season: 3, episode: 7, title: "会呼吸的密钥", summary: "阿零把密钥写死在代码推上了 GitHub:阿穹搬来 Vault 集中托管 + 轮换 —— 写进代码的密钥等于贴在门上。", chapterType: "incident", projectStage: "密钥进托管库", technologies: ["KMS", "Vault", "密钥轮换"], jobSkills: ["安全工程"], status: "planned" },
      { season: 3, episode: 8, title: "卷三检查点:密语通了", summary: "复盘密码学与传输安全:全站 HTTPS + 密钥托管,阿穹甲片泛起金属光泽 —— 才敢在明网上说话。", chapterType: "project", projectStage: "咖啡站城防 v-sec3", technologies: ["综合"], jobSkills: ["密码学", "安全工程"], status: "planned" },
    ],
  },
  {
    season: 4,
    code: "G4",
    title: "城防",
    subtitle: "供应链、防刷与未来战场",
    goal: "供应链安全、限流防刷、WAF 与审计,再到零信任、抗量子与 LLM 安全 —— 江山不是打下来的,是天天守下来的。",
    covers: ["供应链安全", "限流防刷", "WAF / 审计", "零信任", "PQC", "LLM 安全"],
    episodes: [
      { season: 4, episode: 1, title: "你没写的代码也会咬人", summary: "供应链攻击:阿零引的一个日志库爆 0day 全站沦陷(Log4Shell 复盘)—— 第三方也是你的攻击面。", chapterType: "incident", projectStage: "依赖全量扫 CVE", technologies: ["供应链攻击", "SCA", "Log4Shell"], jobSkills: ["安全工程"], status: "planned" },
      { season: 4, episode: 2, title: "清点你的每一块砖", summary: "SBOM 与依赖混淆:阿穹让阿零列物料清单,当场揪出一个抢注的仿冒内部包 —— 不知道用了什么,就守不住什么。", chapterType: "lab", projectStage: "有 SBOM 且锁版本", technologies: ["SBOM", "CycloneDX", "依赖混淆", "typosquatting"], jobSkills: ["安全工程"], status: "planned" },
      { season: 4, episode: 3, title: "评论区的刷屏大军", summary: "速率限制:咖啡站评论区被机器人刷屏(博主真实痛点入戏),阿穹上令牌桶/滑动窗口限流网关。", chapterType: "incident", projectStage: "接口全线限流", technologies: ["Rate Limiting", "令牌桶", "滑动窗口"], jobSkills: ["安全工程", "Web 安全"], status: "planned" },
      { season: 4, episode: 4, title: "你是人吗", summary: "验证码演进:图形码被打码平台秒破,阿穹换隐形风控 Turnstile —— 拦机器人,别为难真人。", chapterType: "comic", projectStage: "隐形风控上线", technologies: ["验证码", "行为验证", "Turnstile"], jobSkills: ["安全工程"], status: "planned" },
      { season: 4, episode: 5, title: "城墙与哨兵", summary: "WAF 与审计追踪:阿穹在边界立 WAF 哨塔,特米客串用 tail -f + grep 抓异常请求 ——「man 一下审计日志」。", chapterType: "lab", projectStage: "有城墙有哨兵", technologies: ["WAF", "ModSecurity", "审计日志"], jobSkills: ["安全工程", "可观测性"], status: "planned" },
      { season: 4, episode: 6, title: "从不信任,始终验证", summary: "零信任架构与 STRIDE 威胁建模:阿穹拆掉「内网默认可信」的旧城墙 —— 内网也不该是免检通道。", chapterType: "comic", projectStage: "内网不再免检", technologies: ["零信任", "STRIDE", "威胁建模"], jobSkills: ["安全架构"], status: "planned" },
      { season: 4, episode: 7, title: "存下来,等以后再解", summary: "抗量子密码:黑客囤积今天的密文等量子机成熟(Harvest Now, Decrypt Later),咖啡站抢先上 TLS 混合抗量子密钥。", chapterType: "comic", projectStage: "TLS 混合抗量子", technologies: ["PQC", "ML-KEM", "X25519MLKEM768"], jobSkills: ["密码学", "前沿安全"], status: "planned" },
      { season: 4, episode: 8, title: "当 AI 也会被骗", summary: "LLM 应用安全:咖啡站 AI 客服被一句提示注入诱导吐出后台数据,阿穹上最后一课 —— 教它聪明,也教它戒备。", chapterType: "incident", projectStage: "AI 客服有护栏", technologies: ["OWASP LLM Top 10", "提示注入", "Agent 越权"], jobSkills: ["前沿安全"], status: "planned" },
      { season: 4, episode: 9, title: "全线检查点:天天守下来", summary: "全书 30 话总复盘:甲片全满、绿锁常亮、评论区清朗,阿穹卷成球满意打盹 —— 江山是天天守下来的。", chapterType: "project", projectStage: "咖啡站城防 v-sec-final", technologies: ["综合"], jobSkills: ["安全工程", "安全架构"], status: "planned" },
    ],
  },
];

export function secAllEpisodes(): JavaEpisode[] {
  return SEC_SEASONS.flatMap((s) => s.episodes);
}

export function secPublishedEpisodes(): JavaEpisode[] {
  return secAllEpisodes().filter((e) => e.status === "published" && e.slug);
}
