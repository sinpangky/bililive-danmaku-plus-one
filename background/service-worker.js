"use strict";

const DOUYIN_LIVE_PATTERN = /^https:\/\/(?:live\.douyin\.com\/|www\.douyin\.com\/follow\/live(?:\/|[?#]|$))/i;
const recentRouteInjections = new Map();

function isDouyinLiveUrl(value) {
  return DOUYIN_LIVE_PATTERN.test(String(value || ""));
}

async function ensureDouyinContentRuntime(tabId, frameId) {
  const target = { tabId, frameIds: [frameId] };
  const [probe] = await chrome.scripting.executeScript({
    target,
    func: () => Boolean(globalThis.__danmakuEchoDouyinLoaded)
  });
  if (probe && probe.result) {
    return false;
  }

  await Promise.all([
    chrome.scripting.insertCSS({
      target,
      files: ["src/douyin-content.css"],
      origin: "AUTHOR"
    }),
    chrome.scripting.executeScript({
      target,
      files: ["src/shared.js", "src/douyin-content.js"],
      injectImmediately: true
    })
  ]);
  return true;
}

async function ensureDouyinRuntime({ tabId, frameId, attempt, reason }) {
  const target = { tabId, frameIds: [frameId] };
  const [pageResult, contentInjected] = await Promise.all([
    chrome.scripting.executeScript({
      target,
      files: ["src/douyin-page-hook.js"],
      world: "MAIN",
      injectImmediately: true
    }),
    ensureDouyinContentRuntime(tabId, frameId)
  ]);

  console.info("[Danmaku Echo][background] ensured Douyin runtime", {
    tabId,
    frameId,
    attempt: Number(attempt) || 0,
    reason: reason || "unknown",
    contentInjected,
    pageResultCount: pageResult.length
  });
  return { contentInjected };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || ![
    "danmaku-echo.ensure-douyin-runtime",
    "danmaku-echo.ensure-douyin-page-hook"
  ].includes(message.type)) {
    return false;
  }
  const tabId = sender.tab && sender.tab.id;
  const frameId = Number.isInteger(sender.frameId) ? sender.frameId : 0;
  const requestedUrl = String(message.href || sender.tab && sender.tab.url || sender.url || "");
  if (!Number.isInteger(tabId) || !isDouyinLiveUrl(requestedUrl)) {
    sendResponse({ ok: false, error: "invalid-douyin-sender" });
    return false;
  }

  ensureDouyinRuntime({
    tabId,
    frameId,
    attempt: message.attempt,
    reason: "bootstrap-request"
  }).then(({ contentInjected }) => {
    sendResponse({ ok: true, tabId, frameId, contentInjected });
  }).catch((error) => {
    const text = String(error && error.message || error);
    console.error("[Danmaku Echo][background] Douyin runtime injection failed", {
      tabId,
      frameId,
      error: text
    });
    sendResponse({ ok: false, error: text });
  });
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = String(changeInfo.url || tab && tab.url || "");
  if (!changeInfo.url || !isDouyinLiveUrl(url)) {
    return;
  }
  const now = Date.now();
  const recent = recentRouteInjections.get(tabId);
  if (recent && recent.url === url && now - recent.at < 500) {
    return;
  }
  recentRouteInjections.set(tabId, { url, at: now });
  ensureDouyinRuntime({
    tabId,
    frameId: 0,
    attempt: 0,
    reason: "tab-url-updated"
  }).catch((error) => {
    console.warn("[Danmaku Echo][background] SPA route injection failed", {
      tabId,
      url,
      error: String(error && error.message || error)
    });
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  recentRouteInjections.delete(tabId);
});
