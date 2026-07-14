"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const shared = require("../src/shared.js");

test("detects all supported live platforms", () => {
  assert.equal(shared.detectPlatform("www.huya.com"), "huya");
  assert.equal(shared.detectPlatform("live.bilibili.com"), "bilibili");
  assert.equal(shared.detectPlatform("live.douyin.com"), "douyin");
  assert.equal(shared.detectPlatform("example.com"), null);
});

test("normalizes a username-prefixed message", () => {
  assert.equal(shared.parseMessageText("某位观众：  主播晚上好  "), "主播晚上好");
  assert.equal(shared.parseMessageText("alice: nice shot"), "nice shot");
});

test("keeps a URL instead of treating its scheme as a username", () => {
  assert.equal(shared.parseMessageText("https://example.com/live"), "https://example.com/live");
});

test("uses the meaningful final line from a decorated chat row", () => {
  assert.equal(shared.parseMessageText("等级 12\n用户甲\n这波漂亮"), "这波漂亮");
});

test("merges partial settings with safe defaults", () => {
  assert.deepEqual(shared.mergeSettings({ autoSend: false, platforms: { douyin: false } }), {
    enabled: true,
    altClick: true,
    platforms: { huya: true, bilibili: true, douyin: false }
  });
});

test("rejects obvious system rows", () => {
  assert.equal(shared.isPlausibleMessage("直播已结束"), false);
  assert.equal(shared.isPlausibleMessage("真精彩"), true);
});
