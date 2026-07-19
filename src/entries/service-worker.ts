import type { DouyinRuntimeRequest } from "../core/types";

const DOUYIN_LIVE_PATTERN = /^https:\/\/(?:live\.douyin\.com\/|www\.douyin\.com\/follow\/live(?:\/|[?#]|$))/i;
const recentRouteInjections = new Map<number, { at: number; url: string }>();

function isDouyinLiveUrl(value: unknown): boolean {
  return DOUYIN_LIVE_PATTERN.test(String(value || ""));
}

async function ensureDouyinContentRuntime(tabId: number, frameId: number): Promise<boolean> {
  const target: chrome.scripting.InjectionTarget = { tabId, frameIds: [frameId] };
  const [probe] = await chrome.scripting.executeScript({
    target,
    func: () => Boolean((globalThis as typeof globalThis & {
      __danmakuEchoDouyinLoaded?: boolean;
    }).__danmakuEchoDouyinLoaded)
  });
  if (probe?.result) {
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

async function ensureDouyinRuntime(options: {
  attempt?: number;
  frameId: number;
  reason: string;
  tabId: number;
}): Promise<{ contentInjected: boolean }> {
  const { attempt, frameId, reason, tabId } = options;
  const target: chrome.scripting.InjectionTarget = { tabId, frameIds: [frameId] };
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
    reason,
    contentInjected,
    pageResultCount: pageResult.length
  });
  return { contentInjected };
}

function isDouyinRuntimeRequest(value: unknown): value is DouyinRuntimeRequest {
  if (!value || typeof value !== "object") {
    return false;
  }
  const type = (value as { type?: unknown }).type;
  return type === "danmaku-echo.ensure-douyin-runtime"
    || type === "danmaku-echo.ensure-douyin-page-hook";
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (!isDouyinRuntimeRequest(message)) {
    return false;
  }
  const tabId = sender.tab?.id;
  const frameId = typeof sender.frameId === "number" && Number.isInteger(sender.frameId)
    ? sender.frameId
    : 0;
  const requestedUrl = String(message.href || sender.tab?.url || sender.url || "");
  if (typeof tabId !== "number" || !Number.isInteger(tabId) || !isDouyinLiveUrl(requestedUrl)) {
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
  }).catch((error: unknown) => {
    const text = String(error instanceof Error ? error.message : error);
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
  const url = String(changeInfo.url || tab.url || "");
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
  }).catch((error: unknown) => {
    console.warn("[Danmaku Echo][background] SPA route injection failed", {
      tabId,
      url,
      error: String(error instanceof Error ? error.message : error)
    });
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  recentRouteInjections.delete(tabId);
});
