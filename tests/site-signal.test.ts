import assert from "node:assert/strict";
import test from "node:test";
import { PUBLIC_SIGNAL_TERMS, publicSiteSignal } from "../lib/site-signal.ts";

test("公开状态在没有独立样本前保持观察中，并明确访问统计边界", () => {
  const signal = publicSiteSignal(12, 34);

  assert.equal(signal.state, "observing");
  assert.equal(signal.label, "观察中");
  assert.match(signal.content, /12 篇文章、34 话课程/);
  assert.match(signal.audience, /不追踪/);
  assert.equal(PUBLIC_SIGNAL_TERMS.visitor, "边缘估算独立来源");
  assert.equal(PUBLIC_SIGNAL_TERMS.notPerson, "不等同于真人");
});
