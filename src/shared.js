(function initShared(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.BulletPlusOneShared = api;
})(typeof globalThis === "object" ? globalThis : this, function createShared() {
  "use strict";

  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    altClick: true,
    platforms: Object.freeze({
      huya: true,
      bilibili: true,
      douyin: true
    })
  });

  function detectPlatform(hostname, pathname) {
    const host = String(hostname || "").toLowerCase().replace(/:\d+$/, "");
    const path = String(pathname || "");

    if (/(^|\.)huya\.com$/.test(host)) {
      return "huya";
    }

    if (host === "live.bilibili.com" || host.endsWith(".live.bilibili.com")) {
      return "bilibili";
    }

    if (host === "live.douyin.com" || host.endsWith(".live.douyin.com")) {
      return "douyin";
    }

    if (host === "www.douyin.com" && /^\/follow\/live(?:\/|$)/.test(path)) {
      return "douyin";
    }

    return null;
  }

  function normalizeWhitespace(value) {
    return String(value == null ? "" : value)
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
      .replace(/\u00A0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .trim();
  }

  function parseMessageText(value, maxLength) {
    const limit = Number.isFinite(maxLength) ? maxLength : 200;
    const normalized = normalizeWhitespace(value);

    if (!normalized) {
      return "";
    }

    const lines = normalized
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !/^(举报|屏蔽|回复|复制|更多|关注)$/.test(line));

    let text = lines.length > 1 ? lines[lines.length - 1] : lines[0] || "";
    const userPrefix = text.match(/^([^：:\n]{1,32})[：:]\s*(.+)$/);

    if (userPrefix && !/^(https?|ftp)$/i.test(userPrefix[1].trim())) {
      text = userPrefix[2].trim();
    }

    return Array.from(text).slice(0, limit).join("");
  }

  function isPlausibleMessage(value, maxLength) {
    const text = normalizeWhitespace(value);
    const limit = Number.isFinite(maxLength) ? maxLength : 200;
    const length = Array.from(text).length;

    if (length < 1 || length > limit) {
      return false;
    }

    return !/^(欢迎来到直播间|系统消息|直播已结束|主播暂时离开|登录后即可发言)$/.test(text);
  }

  function mergeSettings(saved) {
    const value = saved && typeof saved === "object" ? saved : {};
    const savedPlatforms = value.platforms && typeof value.platforms === "object"
      ? value.platforms
      : {};

    return {
      enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULT_SETTINGS.enabled,
      altClick: typeof value.altClick === "boolean" ? value.altClick : DEFAULT_SETTINGS.altClick,
      platforms: {
        huya: typeof savedPlatforms.huya === "boolean" ? savedPlatforms.huya : true,
        bilibili: typeof savedPlatforms.bilibili === "boolean" ? savedPlatforms.bilibili : true,
        douyin: typeof savedPlatforms.douyin === "boolean" ? savedPlatforms.douyin : true
      }
    };
  }

  return Object.freeze({
    DEFAULT_SETTINGS,
    detectPlatform,
    isPlausibleMessage,
    mergeSettings,
    normalizeWhitespace,
    parseMessageText
  });
});
