import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { isHomeActive, isSiteNavItemActive, SITE_NAV_ITEMS } from "../lib/navigation.ts";

function nav(label: string) {
  const item = SITE_NAV_ITEMS.find((candidate) => candidate.label === label);
  assert.ok(item, `missing nav item: ${label}`);
  return item;
}

test("global navigation marks the home page and grouped series routes", () => {
  assert.equal(isHomeActive("/"), true);
  assert.equal(isHomeActive("/posts"), false);
  assert.equal(isSiteNavItemActive("/java/", nav("连载")), true);
  assert.equal(isSiteNavItemActive("/posts/lesson", nav("连载")), true);
  assert.equal(isSiteNavItemActive("/coffee-station", nav("咖啡站")), true);
});

test("ARC Lab is no longer exposed in global navigation", () => {
  assert.equal(SITE_NAV_ITEMS.some((item) => item.label === "ARC Lab"), false);
});

test("注册表里每条系列路由都能被某个导航项点亮", () => {
  // 「连载」项的 matches 是一份**手写清单**。原先只写了 4 条,另外 23 条系列页
  // 停留时整条导航栏没有 is-active、也不下发 aria-current —— 读者与读屏都看不出
  // 自己在哪一层。补全之后必须有测试钉住,否则新开第 28 条线时又会静默漏一条。
  //
  // 路由从 series-registry.ts 的**源码文本**里抽,而不是 import SERIES_LIST:
  // 该模块内部用 `@/lib/*` 别名,而 node --test 不解析 tsconfig 的 paths
  // (实测 `Cannot find package '@/lib'`),import 进来测试自己就跑不起来。
  const registrySource = fs.readFileSync(
    path.join(import.meta.dirname, "..", "lib", "series-registry.ts"),
    "utf8",
  );
  const routes = [...registrySource.matchAll(/defineSeries\([A-Z_]+,\s*"([^"]+)"/g)].map((m) => m[1]);

  // 下限兜底:正则一旦因写法变化而失配,上面会得到空数组,循环零次、断言恒真。
  assert.ok(routes.length >= 27, `只解析出 ${routes.length} 条系列路由,正则可能已失配`);

  const unmatched = routes.filter(
    (route) => !SITE_NAV_ITEMS.some((item) => isSiteNavItemActive(route, item)),
  );
  assert.deepEqual(unmatched, [], `这些系列路由点不亮任何导航项:\n${unmatched.join("\n")}`);
});
