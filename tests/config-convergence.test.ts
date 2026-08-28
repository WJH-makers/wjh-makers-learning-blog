/**
 * 配置单一事实源的契约。
 *
 * 收敛（2026-08-19）把站点身份、安全头、缓存策略、会话 cookie 属性各自集中到一个模块。
 * 但「集中过一次」不等于「保持集中」——真实的退化方式是下一次改动图省事，在某个页面里
 * 直接写一个域名字面量或第五档 revalidate，其余地方仍然正确，评审时看不出来。
 *
 * 本文件就是拦这件事的。它不测行为，只测「有没有第二处定义」。
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import {
  IMMUTABLE_ASSET_CACHE_CONTROL,
  PUBLIC_POSTS_REVALIDATE_SECONDS,
  REVALIDATE_TIERS,
} from "../lib/cache-policy.ts";
import { contentSecurityPolicy, STATIC_SECURITY_HEADERS } from "../lib/security-headers.ts";
import { ALLOWED_HOSTS, PRIMARY_HOST, SITE_NAME, SITE_URL } from "../lib/site-config.ts";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/**
 * 让 node --test 能 import next.config.ts。
 *
 * 两处不兼容：next.config.ts 用无扩展名的相对路径 import（`./lib/cache-policy`，
 * 这是 bundler 解析，Node ESM 要求写全扩展名），且 `import type { NextConfig }`
 * 会解析到 next 包。补上扩展名即可 —— 于是下面的缓存档位断言拿到的是**真实配置对象**，
 * 不是拿正则去扒配置文本。后者一旦格式微调就静默失配，本文件的注释里已记过三次教训。
 */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      const resolved = new URL(specifier, context.parentURL);
      if (!/\.[a-z]+$/.test(resolved.pathname)) {
        for (const extension of [".ts", ".tsx"]) {
          const candidate = new URL(resolved.href + extension);
          if (fs.existsSync(candidate)) return { url: candidate.href, shortCircuit: true };
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

const nextConfig = (await import(pathToFileURL(path.join(ROOT, "next.config.ts")).href)).default;

/**
 * 剥掉注释后再断言。
 *
 * 本仓库的注释里大量引用配置值本身（说明「为什么是这个值」「为什么曾经不是」），
 * 拿全文做 includes/正则必然误判。tests/seo-contract.test.ts 早就为此绕过一次，
 * 这里把那条经验做成公共函数 —— 本文件初版就因为没剥注释，把自己写的解释性注释
 * 当成了代码残留，报了两个假阳性。
 *
 * 只处理行注释与块注释这两种；字符串里出现 `//` 的情况本仓库不存在（URL 都在
 * 模板串或双引号里且带协议，被下面的行注释规则命中时整行已是注释）。
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

/** 递归收集 .ts/.tsx 源文件。node:test 没有 glob，这里手写遍历。 */
function sourceFiles(dirs: string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(path.relative(ROOT, full).replaceAll("\\", "/"));
      }
    }
  };
  for (const dir of dirs) walk(path.join(ROOT, dir));
  return out;
}

const APP_SOURCES = sourceFiles(["app", "lib"]);

/** env.d.ts 里声明的变量名。单处提取，四个测试共用，免得正则各写一遍再各自失配。 */
function declaredEnvNames(): string[] {
  return [...read("env.d.ts").matchAll(/^\s+([A-Z_][A-Z_0-9]*)\?:\s*string;/gm)].map((m) => m[1]);
}

/** 应用侧源文件（不含 tests）：测试可以合法改写 env，应用代码不可以。 */
const RUNTIME_SOURCES = [...APP_SOURCES, "next.config.ts", "proxy.ts"].filter((f) =>
  fs.existsSync(path.join(ROOT, f)),
);

/** 应用侧实际读取的环境变量名。 */
function usedEnvNames(): Set<string> {
  const used = new Set<string>();
  for (const file of RUNTIME_SOURCES) {
    for (const m of read(file).matchAll(/process\.env\.([A-Z_][A-Z_0-9]*)/g)) used.add(m[1]);
  }
  return used;
}

test("正式域名只在 lib/site-config.ts 里作为字面量出现", () => {
  // 收敛前 `?? "https://wwjjhh.online"` 这条 fallback 在 layout / posts / proxy 各有一份，
  // Host 白名单又独立硬编码一遍。漏改一处的表现是「SEO 正常但同源校验静默失效」。
  const offenders: string[] = [];
  for (const file of APP_SOURCES) {
    if (file === "lib/site-config.ts") continue;
    const source = read(file);
    // 逐行看，跳过注释行：注释里写域名是说明，不是配置副本。
    for (const [index, line] of source.split("\n").entries()) {
      const code = line.trim();
      if (code.startsWith("//") || code.startsWith("*") || code.startsWith("/*")) continue;
      if (code.includes(PRIMARY_HOST)) offenders.push(`${file}:${index + 1}`);
    }
  }
  assert.deepEqual(offenders, [], `域名字面量应改为 import lib/site-config：\n${offenders.join("\n")}`);
});

test("站点根地址与 Host 白名单从同一个常量派生", () => {
  assert.equal(SITE_URL, `https://${PRIMARY_HOST}`, "未设 NEXT_PUBLIC_SITE_URL 时应回落到正式域名");
  assert.ok(!SITE_URL.endsWith("/"), "末尾斜杠必须剥掉，否则 `${SITE_URL}/path` 拼出双斜杠");
  assert.deepEqual([...ALLOWED_HOSTS].sort(), [PRIMARY_HOST, `www.${PRIMARY_HOST}`].sort());
  // 白名单必须是字面常量派生，不能读环境变量 —— 否则改一个 env 就能扩大可信来源集合。
  const config = read("lib/site-config.ts");
  const allowedLine = config.split("\n").find((l) => l.includes("export const ALLOWED_HOSTS")) ?? "";
  assert.doesNotMatch(allowedLine, /process\.env/, "Host 白名单不得由环境变量决定");
});

/**
 * 本节替换了原来那条「路由段 revalidate 只用文档化的那几档」。
 *
 * 那条测试在 cacheComponents 迁移后已经空转：全仓库 `^export const revalidate` 出现 0 次，
 * matchAll 对每个文件都零命中，offenders 恒为 []，assert.deepEqual([], []) 恒真。
 * 它保护不了任何东西，却让「缓存档位已被契约钉住」这个印象继续成立 —— 恒真断言比没有
 * 断言更糟，因为它占着位置。
 *
 * 取而代之的机制是 `'use cache'` + `cacheLife('档位')`，档位定义在 next.config.ts。
 * 新机制有两个各自独立的失效点，下面三条分别守：
 *   1. cacheLife 的实参是字符串字面量，拼错（'nearStataic'）时 Next 回落而**不报错**，
 *      tsc 也不管 —— 页面静默用上默认档位。
 *   2. next.config.ts:24 的注释声称四档「与 REVALIDATE_TIERS 一一对应」。两边分叉后
 *      文章页的刷新窗口会静默偏离文档，没有任何迹象。
 *   3. 声明了 'use cache' 却没声明 cacheLife 的路由段，拿的是 Next 的默认档位而非本站分层。
 */
const CACHE_LIFE_PROFILES: Record<string, { stale: number; revalidate: number; expire: number }> =
  nextConfig.cacheLife;

test("cacheLife 的实参都是 next.config.ts 里声明过的档位", () => {
  // 拼错档位名不报错、只静默回落，是这条断言存在的唯一理由。
  const declared = new Set(Object.keys(CACHE_LIFE_PROFILES));
  assert.ok(declared.size > 0, "next.config.ts 必须声明 cacheLife 档位");

  const offenders: string[] = [];
  let calls = 0;
  for (const file of APP_SOURCES) {
    for (const match of stripComments(read(file)).matchAll(/cacheLife\(\s*(["'])([^"']*)\1\s*\)/g)) {
      calls += 1;
      if (!declared.has(match[2])) offenders.push(`${file}: cacheLife("${match[2]}")`);
    }
  }
  // 匹配失配时这条会先红，避免整个测试退化成又一个恒真断言。
  assert.ok(calls >= 15, `应扫到 15+ 处 cacheLife 调用，实际 ${calls}（匹配规则可能已失效）`);
  assert.deepEqual(
    offenders,
    [],
    `档位名必须是 ${[...declared].join(" / ")} 之一（拼错不会报错，只会静默回落到默认档）：\n${offenders.join("\n")}`,
  );
  // 非字面量实参（变量、模板串）会让上面的扫描看不见真实档位。
  for (const file of APP_SOURCES) {
    const dynamic = [...stripComments(read(file)).matchAll(/cacheLife\(\s*([^"')\s][^)]*)\)/g)];
    assert.deepEqual(
      dynamic.map((m) => `${file}: cacheLife(${m[1]})`),
      [],
      "cacheLife 实参必须是字符串字面量，否则本契约扫不到",
    );
  }
});

test("cacheLife 三档的 revalidate 与 REVALIDATE_TIERS 逐项相等", () => {
  // next.config.ts:24 白纸黑字写着「与 REVALIDATE_TIERS 一一对应」。这条就是那句注释的执行版。
  // 只能比数值不能改成 import 常量：路由段配置必须可静态分析（见 lib/cache-policy.ts 顶部
  // 引用的官方原文，连 `60 * 10` 都非法），所以两边注定是两份字面量，只能靠测试锁住。
  for (const [tier, expected] of Object.entries(REVALIDATE_TIERS)) {
    const profile = CACHE_LIFE_PROFILES[tier];
    assert.ok(profile, `next.config.ts 的 cacheLife 缺少 ${tier} 档`);
    assert.equal(
      profile.revalidate,
      expected,
      `${tier} 档的 revalidate 与 REVALIDATE_TIERS.${tier} 分叉（配置 ${profile.revalidate} vs 文档 ${expected}）`,
    );
    // stale/expire 没有第二处定义，只要求单调：revalidate 超过 expire 的档位等于「还没到
    // 刷新时间就已经转动态」，配上去不报错但档位形同虚设。
    assert.ok(profile.expire >= profile.revalidate, `${tier}: expire 不得小于 revalidate`);
  }
  // publicPosts 不在 REVALIDATE_TIERS 里（它是数据层窗口而非路由段档位），单独对一次。
  assert.equal(
    CACHE_LIFE_PROFILES.publicPosts?.revalidate,
    PUBLIC_POSTS_REVALIDATE_SECONDS,
    "publicPosts 档必须等于 PUBLIC_POSTS_REVALIDATE_SECONDS",
  );
});

test("声明了 'use cache' 的文件都声明了 cacheLife 档位", () => {
  // 漏掉 cacheLife 的缓存作用域拿的是 Next 默认档，不是本站分层里的任何一档 ——
  // 表现是「这一页的刷新窗口和同类页不一样」，肉眼看不出来。
  const offenders: string[] = [];
  for (const file of APP_SOURCES) {
    const source = stripComments(read(file));
    // 必须锚成「独占一行的指令语句」。只匹配 `use cache` 三个字会把正文数据也算进来：
    // lib/series-web.ts:112 有个话次的 summary 与 technologies 里就写着 `'use cache'`
    // ——它是课程标题，不是指令。剥注释挡不住这类字符串字面量。
    const scopes = [...source.matchAll(/^\s*["']use cache["'];/gm)].length;
    if (scopes === 0) continue;
    const lifes = [...source.matchAll(/^\s*cacheLife\(/gm)].length;
    if (lifes < scopes) offenders.push(`${file}: ${scopes} 个 'use cache' 作用域但只有 ${lifes} 处 cacheLife`);
  }
  assert.deepEqual(offenders, [], `每个缓存作用域都要显式声明档位：\n${offenders.join("\n")}`);
});

test("cacheComponents 下不得再出现路由段缓存配置", () => {
  // 开了 cacheComponents，`export const revalidate/dynamic/fetchCache` 一律构建期报错。
  // 这条取代了原先那句同名断言 —— 原先扫的是「取值是否在白名单里」，在 0 个命中的前提下
  // 恒真；现在扫的是「有没有出现」，出现即红。它同时是一道迁移完整性的闸：
  // 从别处照抄旧写法的新页面会在这里先红，而不是等到 next build 才发现。
  const offenders: string[] = [];
  for (const file of APP_SOURCES) {
    for (const match of stripComments(read(file)).matchAll(
      /^export const (revalidate|dynamic|fetchCache|dynamicParams)\s*=/gm,
    )) {
      offenders.push(`${file}: export const ${match[1]}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `cacheComponents 已开启，缓存语义改由 'use cache' + cacheLife 表达：\n${offenders.join("\n")}`,
  );
  assert.equal(nextConfig.cacheComponents, true, "本条断言的前提是 cacheComponents 开启");
});

test("安全头与缓存串不在 next.config.ts 里第二次定义", () => {
  // 必须剥注释：本文件里「nosniff 已由上面的全站规则覆盖」这句说明就含 nosniff 一词。
  const config = stripComments(read("next.config.ts"));
  // 值来自模块，next.config.ts 只负责挂路径。任何一个头的值重新出现在这里，
  // 就意味着又有了第二处定义。
  for (const header of STATIC_SECURITY_HEADERS) {
    assert.ok(
      !config.includes(header.value),
      `${header.key} 的值不应再出现在 next.config.ts，应由 lib/security-headers.ts 提供`,
    );
  }
  assert.ok(!config.includes("default-src"), "CSP 指令不应再出现在 next.config.ts");
  assert.match(config, /securityHeaders\(assetPrefix\)/, "全站头必须由 securityHeaders() 生成");
  assert.match(config, /IMMUTABLE_ASSET_CACHE_CONTROL/, "immutable 缓存串必须引用常量");
  // 同一个串在本文件出现两次（/comics 与 /images）是挂载，不是重复定义；
  // 但字面量一次都不该有。
  assert.ok(!config.includes("max-age=31536000"), "不得内联 immutable 缓存串");
});

test("R2 同步脚本的缓存元数据与 TS 常量逐字节一致", () => {
  // Python 不能 import TS，跨语言一致性只能靠测试比对。两边不一致的表现是
  // 「同一张图经 R2 与经源站拿到不同 Cache-Control」，肉眼极难发现。
  const sync = read("ops/sync-r2-assets.py");
  assert.ok(
    sync.includes(`CACHE_CONTROL = "${IMMUTABLE_ASSET_CACHE_CONTROL}"`),
    `ops/sync-r2-assets.py 的 CACHE_CONTROL 必须等于 "${IMMUTABLE_ASSET_CACHE_CONTROL}"`,
  );
});

test("机器可读出版实体名只有一处定义", () => {
  // 只查「一定指出版实体」的字段：siteName（OG）、author / publisher（JSON-LD）、alt（OG 图）。
  //
  // 刻意不查裸 name: —— 它的语义随上下文变。lib/projects.ts 里 name: "咖啡站技术志" 是
  // 作品清单里的一个 CreativeWork 条目，恰好与刊名同字；让它引用 SITE_NAME 会把「出版者」
  // 与「作品条目」两个概念绑死，以后改刊名会连带改作品名。同字不等于同一实体。
  //
  // 正文、导航、页脚、页面标题里的同名文字属于文案，允许「咖啡站技术志 · 原创技术故事」
  // 这类上下文变体，一律不查。
  // 两种形态都要抓：对象属性 `alt: "…"` 与模块导出 `export const alt = "…"`。
  // 初版只写了前者，漏掉 app/opengraph-image.tsx 与 app/posts/[slug]/opengraph-image.tsx
  // 的三处 `export const alt`（OG 图的 alt 会被搜索引擎读取，属机器可读身份）。
  const IDENTITY_FIELDS = /^\s*(?:export\s+const\s+)?(siteName|author|publisher|alt|name)\s*[:=]\s*["'`]/;
  const offenders: string[] = [];
  for (const file of APP_SOURCES) {
    if (file === "lib/site-config.ts") continue;
    for (const [index, line] of stripComments(read(file)).split("\n").entries()) {
      if (!line.includes(SITE_NAME)) continue;
      if (IDENTITY_FIELDS.test(line)) offenders.push(`${file}:${index + 1} ${line.trim()}`);
    }
  }
  assert.deepEqual(offenders, [], `出版实体字段应引用 SITE_NAME：\n${offenders.join("\n")}`);
});

test("JSON-LD 不再各页复制匿名 publisher 节点", () => {
  // 收敛前 4 个连载落地页各写一份 author: {"@type":"Person", name:<刊物名>}，
  // 与 layout 的 Organization 同 @id 却异 @type —— 刊物不是自然人，这是自相矛盾。
  const offenders: string[] = [];
  for (const file of APP_SOURCES) {
    // 剥注释：改动处留了「原先写成 "@type": "Person"」这类说明，不剥就会自撞。
    if (/"@type":\s*"Person"/.test(stripComments(read(file)))) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `应改用 publisherRef() 引用同一实体：\n${offenders.join("\n")}`);
});

test("每个被读取的环境变量都在 env.d.ts 里声明", () => {
  // 没声明的变量拼错名字编译器不报错。最阴的例子是 MONGODB_URI 拼成 MONOGDB_URI：
  // 表现是「数据库静默降级读 Markdown」，而降级本身是刻意设计的正常行为，看不出异常。
  const declared = new Set(declaredEnvNames());
  // NODE_ENV 由 Next 自带的 next-env.d.ts 声明，不该在本仓库重复声明。
  const builtin = new Set(["NODE_ENV"]);

  const undeclared = [...usedEnvNames()].filter((name) => !declared.has(name) && !builtin.has(name)).sort();
  assert.deepEqual(undeclared, [], `以下变量被读取但未在 env.d.ts 声明：\n${undeclared.join("\n")}`);
});

test("env.d.ts 声明的变量都还在被使用", () => {
  // 反向检查：功能下线后声明留着，会让下一个人以为该配置仍然生效。
  const declared = declaredEnvNames();
  const used = usedEnvNames();
  const stale = declared.filter((name) => !used.has(name)).sort();
  assert.deepEqual(stale, [], `以下声明已无人读取，应删除：\n${stale.join("\n")}`);
});

test("应用代码不改写 process.env", () => {
  // env.d.ts 里曾把这些声明标成 readonly 来强制这件事，但那会连测试一起锁死 ——
  // tests/assets.test.ts 需要改写 R2_PUBLIC_URL 才能测「取值非法时回退本地路径」
  // 这条 fail-closed 路径（typecheck 报 TS2540/TS2704）。
  // 所以保护改放在这里：只约束应用代码，测试不受影响。
  //
  // 运行期改写 env 的危害：Next 会把 NEXT_PUBLIC_* 在构建期内联，改写对已内联的
  // 前端代码完全无效，只会让服务端与客户端看到不同的值。
  const offenders: string[] = [];
  for (const file of RUNTIME_SOURCES) {
    for (const [index, line] of stripComments(read(file)).split("\n").entries()) {
      if (/process\.env\.[A-Z_][A-Z_0-9]*\s*=[^=]/.test(line) || /delete\s+process\.env\./.test(line)) {
        offenders.push(`${file}:${index + 1} ${line.trim()}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `应用代码不得改写环境变量：\n${offenders.join("\n")}`);
});

test("鉴权密钥只从统一入口读取", () => {
  // 收敛前 BLOG_ADMIN_TOKEN 在 4 个文件共 5 处各写一遍 `?.trim()`，
  // MONITOR_USER/PASS 各 2 处且**不对称**（登录侧不 trim、校验侧也不 trim，
  // 但客户端提交值是 trim 过的 → env 带尾空白时口令恒不匹配）。
  // Turnstile site key 三处，客户端那处不 trim、服务端两处 trim → 服务端认为评论已启用、
  // 客户端 widget 静默不渲染。这类不对称是最难查的一类：每处单看都对。
  const GATED = [
    { env: "BLOG_ADMIN_TOKEN", accessor: "lib/auth-secrets.ts" },
    { env: "MONITOR_USER", accessor: "lib/auth-secrets.ts" },
    { env: "MONITOR_PASS", accessor: "lib/auth-secrets.ts" },
    { env: "NEXT_PUBLIC_TURNSTILE_SITE_KEY", accessor: "lib/turnstile-config.ts" },
  ];
  const offenders: string[] = [];
  for (const { env, accessor } of GATED) {
    for (const file of RUNTIME_SOURCES) {
      if (file === accessor) continue;
      for (const [index, line] of stripComments(read(file)).split("\n").entries()) {
        if (line.includes(`process.env.${env}`)) offenders.push(`${file}:${index + 1} 应改用 ${accessor}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `鉴权密钥必须走统一入口：\n${offenders.join("\n")}`);
});

test("Turnstile 密钥不进客户端 bundle", () => {
  // lib/turnstile-config.ts 会被客户端组件 import。它一旦读了 TURNSTILE_SECRET_KEY，
  // 密钥就直接进前端 bundle —— 而且没有任何运行期报错提示。
  // 剥注释：模块顶部的说明里就写着「TURNSTILE_SECRET_KEY 绝不进本模块」。
  // 本文件已因未剥注释误报过三次，一律先剥再断言。
  const source = stripComments(read("lib/turnstile-config.ts"));
  assert.doesNotMatch(source, /TURNSTILE_SECRET_KEY/, "site key 模块不得触碰 secret");
  assert.equal(source.match(/^import /gm), null, "必须零依赖：客户端与服务端共用");
});

test(".env.example 覆盖全部应用侧变量", () => {
  // .env.example 是新部署者唯一的配置清单。漏一项的表现不是报错，而是「某个功能
  // 静默不存在」——监控台打不开、评论区不显示，而这些都是刻意设计的 fail-closed 行为，
  // 看不出是配置漏了还是功能没做。
  const declared = declaredEnvNames();
  const example = read(".env.example");
  // 注释掉的示例行（# FOO=）也算已记录：它表达「可选，按需开启」。
  const documented = new Set(
    [...example.matchAll(/^#?\s*([A-Z_][A-Z_0-9]*)=/gm)].map((m) => m[1]),
  );
  // 这两项不由人工配置：VERCEL 由平台注入，APP_GIT_SHA 由构建期注入。
  const injected = new Set(["VERCEL", "APP_GIT_SHA"]);
  const missing = declared.filter((n) => !documented.has(n) && !injected.has(n)).sort();
  assert.deepEqual(missing, [], `.env.example 缺以下变量：\n${missing.join("\n")}`);
});

test("公开与私密变量的边界：NEXT_PUBLIC_ 前缀不得用于凭据", () => {
  // NEXT_PUBLIC_* 会被 next build 内联进浏览器 bundle。凭据一旦带上这个前缀，
  // 就是把密钥公开发布，且没有任何运行期报错提示。
  const declared = declaredEnvNames().filter((name) => name.startsWith("NEXT_PUBLIC_"));
  const secretish = declared.filter((name) => /SECRET|TOKEN|PASS|KEY_ID|URI|SALT/.test(name));
  // TURNSTILE_SITE_KEY 是 Cloudflare 明确设计为公开的 site key，不在此列。
  const allowed = new Set(["NEXT_PUBLIC_TURNSTILE_SITE_KEY"]);
  const offenders = secretish.filter((name) => !allowed.has(name));
  assert.deepEqual(offenders, [], `凭据类变量不得带 NEXT_PUBLIC_ 前缀：\n${offenders.join("\n")}`);
});

test("CSP 随资源前缀参数化，且不接受带前导空格的入参", () => {
  const withoutPrefix = contentSecurityPolicy();
  const withPrefix = contentSecurityPolicy("https://cdn.example.com");
  assert.ok(!withoutPrefix.includes("undefined"), "空前缀不应留下 undefined");
  assert.ok(withPrefix.includes("script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://cdn.example.com"));
  // 前导空格由函数内部补。调用方传带空格的值会拼出双空格 —— 钉住这个约定，
  // 因为收敛前 next.config.ts 里的 assetOrigin 恰好是「已带前导空格」的形态。
  assert.ok(!withPrefix.includes("  "), "不应出现双空格");
});
