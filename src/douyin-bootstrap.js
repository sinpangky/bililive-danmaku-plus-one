(function bootstrapDanmakuEchoDouyin() {
  "use strict";

  if (globalThis.__danmakuEchoDouyinBootstrapLoaded) {
    return;
  }
  globalThis.__danmakuEchoDouyinBootstrapLoaded = true;

  const CONTENT_SOURCE = "danmaku-echo-douyin-content";
  const PAGE_SOURCE = "danmaku-echo-douyin-page";
  const startedAt = Date.now();
  const debug = {
    version: "douyin-bootstrap-v1",
    startedAt: new Date(startedAt).toISOString(),
    href: location.href,
    attempts: [],
    pageReady: false,
    pageVersion: "",
    instanceCount: 0,
    lastError: ""
  };
  globalThis.__danmakuEchoDouyinBootstrapDebug = debug;

  function syncMarker() {
    const root = document.documentElement;
    if (!root) {
      return;
    }
    let marker = document.getElementById("bcp-douyin-bootstrap-debug");
    if (!marker) {
      marker = document.createElement("script");
      marker.id = "bcp-douyin-bootstrap-debug";
      marker.type = "application/json";
      marker.hidden = true;
      root.appendChild(marker);
    }
    marker.dataset.pageReady = String(debug.pageReady);
    marker.dataset.pageVersion = debug.pageVersion;
    marker.textContent = JSON.stringify(debug);
  }

  function pingPage(attempt) {
    window.postMessage({
      source: CONTENT_SOURCE,
      type: "ping",
      requestId: 9_000_000 + attempt
    }, "*");
  }

  function requestInjection(attempt) {
    const entry = {
      attempt,
      at: Date.now(),
      sinceStart: Date.now() - startedAt,
      response: null
    };
    debug.attempts.push(entry);
    try {
      chrome.runtime.sendMessage({
        type: "danmaku-echo.ensure-douyin-page-hook",
        attempt,
        href: location.href
      }, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          debug.lastError = error.message || String(error);
          entry.response = { ok: false, error: debug.lastError };
          console.warn("[Danmaku Echo][Douyin bootstrap] injection request failed", entry.response);
        } else {
          entry.response = response || { ok: false, error: "empty-response" };
          if (!entry.response.ok) {
            debug.lastError = String(entry.response.error || "injection-failed");
          }
          console.debug("[Danmaku Echo][Douyin bootstrap] injection request", entry);
        }
        syncMarker();
        pingPage(attempt);
      });
    } catch (error) {
      debug.lastError = String(error && error.message || error);
      entry.response = { ok: false, error: debug.lastError };
      console.error("[Danmaku Echo][Douyin bootstrap] injection request threw", entry.response);
      syncMarker();
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.source !== PAGE_SOURCE
        || event.data.type !== "ready") {
      return;
    }
    debug.pageReady = true;
    debug.pageVersion = String(event.data.version || "legacy");
    debug.instanceCount = Number(event.data.instanceCount) || 0;
    console.info("[Danmaku Echo][Douyin bootstrap] page hook ready", {
      version: debug.pageVersion,
      instanceCount: debug.instanceCount,
      sinceStart: Date.now() - startedAt
    });
    syncMarker();
  });

  console.info("[Danmaku Echo][Douyin bootstrap] started", {
    href: location.href,
    readyState: document.readyState
  });
  if (!document.documentElement) {
    document.addEventListener("readystatechange", syncMarker, { once: true });
  }
  [0, 120, 600, 1800].forEach((delay, attempt) => {
    setTimeout(() => {
      if (!debug.pageReady || attempt === 0) {
        requestInjection(attempt + 1);
      }
    }, delay);
  });
  syncMarker();
})();
