import assert from "node:assert/strict";
import { test } from "node:test";
import { isSameOriginRequest } from "../lib/request-origin.ts";

test("same-origin requests pass when Origin matches the request host", () => {
  assert.equal(isSameOriginRequest(new Headers({
    origin: "https://wwjjhh.online",
    host: "wwjjhh.online",
  })), true);
});

test("cross-origin and null origins are rejected", () => {
  assert.equal(isSameOriginRequest(new Headers({
    origin: "https://evil.example",
    host: "wwjjhh.online",
  })), false);
  assert.equal(isSameOriginRequest(new Headers({ origin: "null", host: "wwjjhh.online" })), false);
});

test("客户端伪造 x-forwarded-host 不能单独扩大允许来源", () => {
  assert.equal(isSameOriginRequest(new Headers({
    origin: "https://evil.example",
    host: "127.0.0.1:3000",
    "x-forwarded-host": "evil.example",
  }), "https://wwjjhh.online"), false);
});
test("missing Origin remains compatible with authenticated non-browser clients", () => {
  assert.equal(isSameOriginRequest(new Headers({ host: "wwjjhh.online" })), true);
});

test("configured public host is accepted behind an internal proxy host", () => {
  assert.equal(isSameOriginRequest(new Headers({
    origin: "https://wwjjhh.online",
    host: "127.0.0.1:3000",
  }), "https://wwjjhh.online"), true);
});
