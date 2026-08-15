import assert from "node:assert/strict";
import { test } from "node:test";
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
