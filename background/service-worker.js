"use strict";

const DOUYIN_LIVE_PATTERN = /^https:\/\/live\.douyin\.com\//i;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "danmaku-echo.ensure-douyin-page-hook") {
    return false;
  }
  const tabId = sender.tab && sender.tab.id;
  const frameId = Number.isInteger(sender.frameId) ? sender.frameId : 0;
  const url = String(sender.url || sender.tab && sender.tab.url || "");
  if (!Number.isInteger(tabId) || !DOUYIN_LIVE_PATTERN.test(url)) {
    sendResponse({ ok: false, error: "invalid-douyin-sender" });
    return false;
  }

  chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    files: ["src/douyin-page-hook.js"],
    world: "MAIN",
    injectImmediately: true
  }).then(() => {
    console.info("[Danmaku Echo][background] ensured Douyin page hook", {
      tabId,
      frameId,
      attempt: Number(message.attempt) || 0
    });
    sendResponse({ ok: true, tabId, frameId });
  }).catch((error) => {
    const text = String(error && error.message || error);
    console.error("[Danmaku Echo][background] Douyin page hook injection failed", {
      tabId,
      frameId,
      error: text
    });
    sendResponse({ ok: false, error: text });
  });
  return true;
});
