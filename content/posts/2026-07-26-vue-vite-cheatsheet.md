---
title: "Vue 与 Vite 速查 · 脚手架到预览的全周期"
date: 2026-07-26
summary: "覆盖 Vue 3.5+ 与 Vite 7 全生命周期:脚手架选项、HMR、组合式 API、响应式取舍、路由状态、产物分析、预览部署与代理,TypeScript 基线,照卡在的那一步直接查。"
tags: [命令速查, Vue, Vite, 前端]
---


# Vue 与 Vite 速查 · 脚手架到预览的全周期

> 基线:Vue 3.5+、Vite 7(需 Node 20.19+ / 22.12+)、TypeScript。命令以 npm 为例,pnpm/yarn 把 `npm run` 换成 `pnpm` / `yarn` 即可;配置片段均写在 `vite.config.ts`。

## 快速导航

| 阶段 | 一句话 |
|------|--------|
| 1、创建项目 | create-vue 交互勾选,还是 create-vite 最小模板 |
| 2、目录结构与约定 | 入口在 index.html;public 与 assets 处理方式不同 |
| 3、开发服务器与 HMR | 起服务、暴露局域网、热更新与强制预构建 |
| 4、组件基础 | `<script setup>` 与 defineProps/Emits/Model |
| 5、响应式速查 | ref / reactive 怎么选,computed 与 watch 边界 |
| 6、路由与状态 | vue-router 4 与 pinia 的最小闭环 |
| 7、调试 | DevTools、应用内浮层、source map 档位 |
| 8、构建与产物分析 | build、类型检查、体积可视化、分包 |
| 9、预览与部署 | preview 自检、history 回退、子路径 base |
| 10、环境变量与代理 | VITE_ 前缀、mode 叠加、dev 代理绕跨域 |
| 11、清理与升级 | 清缓存、重装、跨大版本升级自检 |

## 1、创建项目(脚手架怎么选)

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `npm create vue@latest` | 官方脚手架 create-vue,交互勾选 TS/Router/Pinia | **首选**;预置 vue-tsc 与推荐 ESLint |
| `npm create vue@latest my-app -- --ts --router --pinia` | 非交互(CI)按 flag 生成 | `--` 后才是传给脚手架的参数,漏了被 npm 吞;`--default` 一键默认 |
| `npm create vite@latest my-app -- --template vue-ts` | 更轻的 create-vite,最小 Vue+TS 骨架 | 不含 Router/Pinia/测试;模板名 `vue` / `vue-ts` |
| `pnpm create vue@latest` / `yarn create vue` | 换包管理器 | pnpm 最快最省盘;仓库只留一个 lockfile |
| `cd my-app && npm install && npm run dev` | 装依赖、起服务 | 起不来先查 Node:Vite 7 要 ≥ 20.19 或 ≥ 22.12 |

**脚手架提示项怎么勾**:

| 提示项 | 建议 | 说明 |
|--------|------|------|
| TypeScript | 是 | 协作/中大型必上,享受 vue-tsc 与 IDE 类型 |
| JSX | 按需 | 写 render 函数、高阶组件才需要 |
| Vue Router | 多页 SPA 选是 | 会顺带配好懒加载骨架 |
| Pinia | 需跨组件共享状态选是 | 官方状态库,已取代 Vuex |
| Vitest / E2E | 单测选是,E2E 按需 | Vitest 与 Vite 同管线零配;E2E 推 Playwright |
| ESLint / Prettier | 都选是 | Prettier 管格式、ESLint 管质量,别互相打架 |
| Vue DevTools 插件 | 推荐 | 即 vite-plugin-vue-devtools,应用内浮层 |

## 2、目录结构与约定

| 路径 / 文件 | 作用 | 备注 / 坑 |
|-------------|------|-----------|
| `index.html` | 应用真正入口(不在 public) | Vite 以它为构建入口,`<script type="module" src="/src/main.ts">` 别删 |
| `src/main.ts` | 创建并挂载应用 | `createApp(App).use(router).use(pinia).mount('#app')` |
| `src/views/`、`src/components/` | 页面 / 可复用组件 | 组件用 PascalCase;views 与路由表一一对应,是分包边界 |
| `src/stores/` | Pinia store | 一个业务域一个 defineStore,别做成上帝 store |
| `src/assets/` | 会被打包处理的资源 | import 引用,产物带 hash、可 tree-shaking |
| `public/` | 原样拷贝的静态资源 | 用绝对路径 `/xxx` 引用,不经 Vite 处理、不带 hash |
| `vite.config.ts` | 构建 / 开发配置 | plugins、server、build、`resolve.alias` 都在这 |
| `env.d.ts` | 环境类型声明 | 顶部 `/// <reference types="vite/client" />` 才有 import.meta.env 类型 |
| `node_modules/.vite/` | 依赖预构建缓存 | 出幽灵问题先清它(见第 11 节) |

## 3、开发服务器与 HMR

| 命令 / 配置 | 作用 | 备注 / 坑 |
|-------------|------|-----------|
| `npm run dev` | 启动开发服务器,默认 `http://localhost:5173` | 首次慢在依赖预构建,之后走 `.vite` 缓存 |
| `vite --host` | 绑 0.0.0.0,同网设备可访问 | 或配 `server.host: true`;⚠ 公网机器别裸开 |
| `vite --port 3000 --strictPort` | 指定端口;被占用则报错退出 | 不加 strictPort 会自动 +1,导致端口漂移 |
| `vite --force` | 忽略缓存,强制重新预构建依赖 | 换依赖/改 optimizeDeps 后用;会变慢 |
| HMR(自动) | 保存即热更新,保留组件状态 | `<script setup>` 顶层 state 保留;改到无法热更时整页刷新 |
| `server.proxy` | 代理 `/api` 到后端,绕跨域 | 详见第 10 节;只在 dev / preview 生效 |

## 4、组件基础(SFC、组合式 API)

| 写法 / API | 作用 | 备注 / 坑 |
|-----------|------|-----------|
| `<script setup lang="ts">` | 组合式 API 编译糖,顶层变量自动暴露给模板 | 首选,比 `setup()` 少大量样板 |
| `defineProps<{ msg: string }>()` | 类型式声明 props | 3.5+ 解构 `const { msg } = defineProps(...)` 仍响应(编译器改写),默认值 `{ msg = '' }` |
| `defineEmits<{ change: [id: number] }>()` | 类型式声明事件 | 元组即参数签名;`emit('change', 1)` |
| `defineModel<string>()` | 双向绑定 v-model(3.4+ 稳定) | 省去 props + emit 样板;可 `defineModel('title')` |
| `useTemplateRef('el')` | 拿模板引用(3.5+) | 取代旧「同名 ref 变量」写法,参数对应 `ref="el"` |
| `onMounted` / `onUnmounted` | 生命周期钩子 | 必须在 setup 同步调用,别放异步回调 |

## 5、响应式速查(ref / reactive / computed / watch)

| API | 作用 | 备注 / 坑 |
|-----|------|-----------|
| `ref(v)` | 包装任意值,JS 里 `.value`、模板自动解包 | 原始值 / 要整体替换 / 组合函数返回值都用它 |
| `reactive(obj)` | 深响应代理,仅对象/数组/Map/Set | ⚠ 整体重新赋值断响应;解构丢响应(配 `toRefs`) |
| `computed(() => ...)` | 带缓存的派生值 | 依赖不变不重算;可写用 `{ get, set }`。⚠ 别写副作用 |
| `watch(src, cb, opts)` | 侦听指定源,惰性执行 | 源可为 ref/getter/数组;深层要 `{ deep: true }`,先跑加 `{ immediate: true }` |
| `watchEffect(fn)` | 自动收集依赖,立即执行一次 | 读到啥就侦听啥,精确依赖不好控 |
| `onWatcherCleanup(fn)` | 侦听副作用清理(3.5+) | 竞态请求取消上一次;须在侦听器内同步注册 |
| `toRefs` / `toRef` | 把 reactive 解构成 ref 而不丢响应 | 组合函数 return 前常用 |
| `storeToRefs(store)` | Pinia 里同理保持响应 | 直接解构 store 的 state/getter 会丢响应 |
| `shallowRef` / `shallowReactive` | 只在顶层响应,深层不代理 | 大对象、第三方实例、图表数据,省深代理开销 |

**什么时候用 ref、什么时候用 reactive**:

| 场景 | 选 | 为什么 |
|------|:--:|--------|
| 原始值(string / number / boolean) | `ref` | reactive 不接受原始值 |
| 需要整体替换(如 `data = await fetch()`) | `ref` | reactive 重新赋值会断开响应 |
| 要把值解构出来单独用 | `ref`(或 reactive + `toRefs`) | 直接解构 reactive 丢响应 |
| 组合式函数(composable)的返回值 | `ref` | 调用方能自由解构且保持响应 |
| 深层嵌套对象、只改内部不整体换 | 两者皆可 | 团队统一即可,官方默认倾向 ref |
| Map / Set / 数组集合 | 两者皆可 | ref 也能包,内部仍是深响应 |
| 大对象 / 第三方实例 / 只换引用 | `shallowRef` | 避免深代理的性能开销 |
| 拿不准时 | **默认 ref** | 心智负担小,`.value` 显式、易组合 |

## 6、路由与状态

| 命令 / API | 作用 | 备注 / 坑 |
|-----------|------|-----------|
| `npm i vue-router@4` | 装路由(脚手架没勾时) | Vue 3 必须配 Router **4**,别装到 3.x |
| `createRouter({ history, routes })` | 建路由实例 | 在 `src/router/index.ts` 统一导出 |
| `createWebHistory(import.meta.env.BASE_URL)` | HTML5 history 模式(无 #) | ⚠ 需服务器 SPA 回退(第 9 节),否则刷新 404 |
| `createWebHashHistory()` | hash 模式(`#/`) | 纯静态托管、配不了服务器回退时用 |
| `component: () => import('./views/X.vue')` | 路由懒加载 | 拆包让首屏更小,这正是分包边界 |
| `useRouter()` / `useRoute()` | 拿路由器 / 当前路由 | route 是响应式,别解构后再用而丢响应 |
| `router.push(...)` / `router.beforeEach(g)` | 编程式跳转 / 全局前置守卫 | 守卫记得放行(return true 或调用 next) |
| `createPinia()` + `app.use(pinia)` | 装并注册 Pinia | `npm i pinia`;写在 main.ts、挂载前;取代 Vuex |
| `defineStore('id', () => {...})` | 定义 store(setup 写法) | ref=state、computed=getter、function=action,记得 return |
| `storeToRefs(store)` | 解构 state/getter 保持响应 | action 直接从 store 取,不用包 |

## 7、调试(devtools、source map)

| 命令 / 配置 | 作用 | 备注 / 坑 |
|-------------|------|-----------|
| Vue DevTools 浏览器扩展 | 看组件树 / 状态 / 路由 / Pinia 时间线 | Vue 3 用新版扩展;生产构建默认禁用 |
| `npm i -D vite-plugin-vue-devtools` | 应用内浮层 DevTools(加进 plugins) | 官方插件,含组件检查器与「跳转源码」 |
| dev source map | 开发默认开,报错直达 `.vue` 源码行 | 无需配置 |
| `build.sourcemap: true` | 生产也生成 map | `'hidden'` 生成不引用(给错误上报);`'inline'` 体积大 |

## 8、构建与产物分析

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `npm run build` | 生产构建(类型检查 + `vite build` → `dist`) | create-vue 的 build 先跑 vue-tsc,类型错即中断 |
| `npx vue-tsc --noEmit` | 只做类型检查、不产出 | ⚠ 普通 `tsc` 不认 `.vue`,必须用 vue-tsc |
| `vite build --mode staging` | 用 staging 模式构建,加载 `.env.staging` | mode 决定加载哪套 env;默认 production |
| `vite build --outDir build --emptyOutDir` | 改输出目录 | ⚠ emptyOutDir 会**清空目标目录**,别指到源码/系统目录 |
| `vite build --base=/app/` | 设子路径基址 | 部署到 `域名/app/` 时必设,否则资源 404 |
| `npx vite-bundle-visualizer` | 零配置一次性生成产物体积图 | 最快看谁占体积,底层即 rollup-plugin-visualizer |
| `npm i -D rollup-plugin-visualizer` | 常驻分析插件,每次 build 出报告 | 放 plugins 数组**最后一个**(见下方片段) |
| `build.rollupOptions.output.manualChunks` | 手动分包 | 把大依赖(如 echarts)拆出,利用浏览器缓存 |
| `build.target` | 产物语法目标 | ⚠ Vite 7 默认改为 `'baseline-widely-available'`,兼容老浏览器需显式降级 + legacy 插件 |

```ts
// vite.config.ts —— 产物体积可视化
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    vue(),
    // 必须放最后:打包结束时才 emit 报告
    visualizer({ open: true, gzipSize: true, brotliSize: true, filename: 'stats.html' }),
  ],
})
```

## 9、预览与部署

| 命令 / 配置 | 作用 | 备注 / 坑 |
|-------------|------|-----------|
| `npm run preview` | 本地起静态服务器预览 `dist`(默认 `:4173`) | ⚠ 只为验产物,**不是生产服务器**,别扛线上流量 |
| `vite preview --host --port 5000` | 暴露到局域网 + 指定端口 | 要先 `build` 过,否则预览的是旧产物 |
| Nginx:`try_files $uri $uri/ /index.html;` | SPA history 回退,修「刷新 404」 | history 模式必配;hash 模式不需要 |
| `base` + `createWebHistory(import.meta.env.BASE_URL)` | 子路径部署两处保持一致 | ⚠ 只改一处会导致资源或路由错乱 |
| 静态托管(Netlify/外部托管平台/GH Pages) | 上传 `dist` 即可 | 平台侧配 SPA 回退;GH Pages 注意仓库子路径 base |

## 10、环境变量与代理

| 命令 / 用法 | 作用 | 备注 / 坑 |
|-------------|------|-----------|
| `.env` / `.env.local` / `.env.[mode]` | 环境变量文件,按 mode 与 local 叠加 | ⚠ `.local` 必进 `.gitignore`;优先级 local > 指定 mode > 通用 |
| `VITE_API=xxx` → `import.meta.env.VITE_API` | 暴露给客户端的变量 | ⚠ 只有 `VITE_` 前缀会打进包,**别放真密钥**(前端可见) |
| `import.meta.env.MODE / PROD / DEV / BASE_URL` | 内置变量 | 判断环境、拼资源基址,无需自己声明 |
| `envPrefix` | 改暴露前缀 | ⚠ 别设成 `''`,会把**所有**环境变量注入前端 |
| `loadEnv(mode, process.cwd(), '')` | 在 config 里读 env(含无前缀) | 第三参 `''` 读全部;仅构建期用,别把秘密写进产物 |
| `server.proxy`(见下) | 开发期代理后端、绕跨域 | ⚠ 只在 dev / preview 生效,生产靠 Nginx / 网关 |

```ts
// vite.config.ts —— 开发代理
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,               // 改写 Host 头,后端按虚拟主机匹配时必需
      rewrite: (p) => p.replace(/^\/api/, ''),  // 去掉 /api 前缀;要保留就删这行
      // ws: true,                       // 代理 WebSocket 时打开
    },
  },
}
```

## 11、清理与升级

| 命令 | 作用 | 备注 / 坑 |
|------|------|-----------|
| `rm -rf node_modules/.vite` | 清 Vite 依赖预构建缓存 | 「改了没生效 / import 报幽灵错」先清它。Windows:`Remove-Item -Recurse -Force node_modules\.vite` |
| `vite --force` | 强制重建依赖预构建 | 等价于清缓存后重跑 dev |
| `rm -rf node_modules dist && npm install` | 全量重装 | ⚠ 删依赖与产物,确认在项目根目录再执行 |
| `npm outdated` / `npm update` | 列出可升级 / 范围内升级 | update 不跨大版本;跨大版本看 Latest 列 |
| `npx npm-check-updates -u && npm install` | 把 package.json 升到最新(含大版本) | ⚠ 可能破坏;升完必跑测试 + 读 Vue/Vite 迁移指南 |
| `git clean -xdf -n` | 预演清理未跟踪文件(含被忽略的) | ⚠ 去掉 `-n` 才真删,先 `-n` 看清单再动手 |
| `npx vue-tsc --noEmit` | 升级后类型自检 | 大版本升级最容易在这里暴露不兼容 |

## 常见错误速判

| 症状 | 多半是 | 先试这条 |
|------|--------|----------|
| `npm run dev` 直接崩 / 语法报错 | Node 版本过低 | 升到 Node ≥ 20.19 或 ≥ 22.12(Vite 7 门槛) |
| 改了代码浏览器不更新 | HMR 断 / 缓存脏 | 清 `node_modules/.vite` 后 `vite --force` |
| `import.meta.env.VITE_X` 是 undefined | 没加 `VITE_` 前缀 / 没重启 | 改 env 后**必须重启 dev server** |
| 刷新页面 404、首页却正常 | history 模式无服务器回退 | Nginx 配 `try_files … /index.html`,或改 hash 模式 |
| 打包后白屏、资源 404 | base 子路径没设对 | 配 `base` 且 router 用 `import.meta.env.BASE_URL` |
| 解构 props / store 后不再响应 | 丢了响应式 | props 用 3.5 解构或 `toRefs`;store 用 `storeToRefs` |
| `reactive` 对象重新赋值后失效 | 整体替换断了代理 | 改用 ref,或只改属性、不换引用 |
| `tsc` 报「不认识 .vue」 | 用错类型检查器 | 换 `vue-tsc --noEmit` |
| 代理不生效 / 还是跨域 | proxy 只在 dev 生效 / 前缀没对上 | 核对 `server.proxy` 的 key 与 rewrite;生产走网关 |
| 打包体积异常大 | 某依赖没拆 | `npx vite-bundle-visualizer` 看谁占,再 manualChunks |

## 一页纸口诀

1. 起手 `npm create vue@latest`,TS/Router/Pinia/ESLint 按需勾;Node 不够先升级。
2. `index.html` 才是入口不在 public;`public/` 原样拷贝、`assets/` 才被处理并带 hash。
3. 默认用 `ref`:原始值、要整体替换、要解构、组合函数返回值,一律 ref。
4. `reactive` 只配对象且别整体重新赋值;解构一律 `toRefs` / `storeToRefs`。
5. `computed` 只做纯派生别塞副作用;副作用交给 `watch` / `watchEffect`。
6. history 模式 = 服务器必配 `try_files … /index.html`,否则一刷新就 404。
7. 只有 `VITE_` 前缀进前端包,里面别放真密钥;代理只在 dev 生效。
8. 看体积用 `npx vite-bundle-visualizer`,大依赖用 `manualChunks` 拆。
9. 怪问题三连:清 `node_modules/.vite` → `vite --force` → 重装 `node_modules`。
