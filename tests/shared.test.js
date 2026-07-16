"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const shared = require("../src/shared.js");

test("detects all supported live platforms", () => {
  assert.equal(shared.detectPlatform("www.huya.com"), "huya");
  assert.equal(shared.detectPlatform("live.bilibili.com"), "bilibili");
  assert.equal(shared.detectPlatform("live.douyin.com"), "douyin");
  assert.equal(shared.detectPlatform("www.douyin.com", "/follow/live/751561170106"), "douyin");
  assert.equal(shared.detectPlatform("www.douyin.com", "/video/751561170106"), null);
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
  const settings = shared.mergeSettings({ autoSend: false, platforms: { douyin: false } });
  assert.equal(settings.enabled, true);
  assert.equal(settings.altClick, true);
  assert.deepEqual(settings.platforms, { huya: true, bilibili: true, douyin: false });
  assert.deepEqual(settings.colors.huya, Object.fromEntries(
    shared.COLOR_SETTING_KEYS.map((key) => [key, ""])
  ));
});

test("keeps valid platform colors independent and ignores invalid values", () => {
  const settings = shared.mergeSettings({
    colors: {
      bilibili: { actionStart: "#12abEF", error: "red" },
      douyin: { actionStart: "#334455" }
    }
  });
  assert.equal(settings.colors.bilibili.actionStart, "#12ABEF");
  assert.equal(settings.colors.bilibili.error, "");
  assert.equal(settings.colors.douyin.actionStart, "#334455");
  assert.equal(settings.colors.huya.actionStart, "");
});

test("applies only validated platform color variables", () => {
  const values = new Map();
  const root = {
    style: {
      setProperty(name, value) {
        values.set(name, value);
      },
      removeProperty(name) {
        values.delete(name);
      }
    }
  };
  shared.applyPlatformColors(root, { actionStart: "#abcdef", error: "invalid" });
  assert.equal(values.get("--bcp-action-start"), "#ABCDEF");
  assert.equal(values.has("--bcp-error"), false);
  shared.applyPlatformColors(root, {});
  assert.equal(values.size, 0);
});

test("Douyin bootstrap requests the full runtime after an SPA live-route entry", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "src", "douyin-bootstrap.js"),
    "utf8"
  );
  const sent = [];
  const timers = [];
  const intervals = [];
  const listeners = new Map();
  const location = { href: "https://www.douyin.com/" };
  const context = {
    chrome: {
      runtime: {
        lastError: null,
        sendMessage(message, callback) {
          sent.push(message);
          callback({ ok: true });
        }
      }
    },
    console: {
      debug() {},
      error() {},
      info() {},
      warn() {}
    },
    Date,
    document: {
      addEventListener(type, listener) {
        listeners.set(`document:${type}`, listener);
      },
      documentElement: null,
      getElementById() {
        return null;
      },
      hidden: false,
      readyState: "loading"
    },
    location,
    setInterval(callback, delay) {
      intervals.push({ callback, delay });
      return intervals.length;
    },
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
    window: {
      addEventListener(type, listener) {
        listeners.set(`window:${type}`, listener);
      },
      postMessage() {}
    }
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: "douyin-bootstrap.js" });

  assert.equal(sent.length, 0);
  assert.equal(intervals.length, 1);
  assert.equal(intervals[0].delay, 50);

  location.href = "https://www.douyin.com/follow/live/123456";
  intervals[0].callback();
  timers.sort((left, right) => left.delay - right.delay).forEach(({ callback }) => callback());

  assert.ok(sent.length >= 1);
  assert.equal(sent[0].type, "danmaku-echo.ensure-douyin-runtime");
  assert.equal(sent[0].href, location.href);
});

test("rejects obvious system rows", () => {
  assert.equal(shared.isPlausibleMessage("直播已结束"), false);
  assert.equal(shared.isPlausibleMessage("真精彩"), true);
});
