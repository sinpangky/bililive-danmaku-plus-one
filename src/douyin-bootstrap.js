(function bootstrapDanmakuEchoDouyin() {
  "use strict";

  if (globalThis.__danmakuEchoDouyinBootstrapLoaded) {
    return;
  }
  globalThis.__danmakuEchoDouyinBootstrapLoaded = true;

  const CONTENT_SOURCE = "danmaku-echo-douyin-content";
  const PAGE_SOURCE = "danmaku-echo-douyin-page";
  const LIVE_ROUTE_PATTERN = /^https:\/\/(?:live\.douyin\.com\/|www\.douyin\.com\/follow\/live(?:\/|[?#]|$))/i;
  const startedAt = Date.now();
  let currentHref = location.href;
  let routeGeneration = 0;
  const debug = {
    version: "douyin-bootstrap-v2-spa-entry",
    startedAt: new Date(startedAt).toISOString(),
    href: location.href,
    attempts: [],
    pageReady: false,
    pageVersion: "",
    instanceCount: 0,
    routeGeneration: 0,
    routeChanges: [],
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
    if (!LIVE_ROUTE_PATTERN.test(location.href)) {
      return;
    }
    const entry = {
      attempt,
      at: Date.now(),
      sinceStart: Date.now() - startedAt,
      response: null
    };
    debug.attempts.push(entry);
    try {
      chrome.runtime.sendMessage({
        type: "danmaku-echo.ensure-douyin-runtime",
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

  function scheduleLiveRuntime(reason) {
    if (!LIVE_ROUTE_PATTERN.test(location.href)) {
      return;
    }
    routeGeneration += 1;
    const generation = routeGeneration;
    debug.href = location.href;
    debug.routeGeneration = generation;
    debug.pageReady = false;
    debug.routeChanges.push({
      at: Date.now(),
      href: location.href,
      reason
    });
    if (debug.routeChanges.length > 20) {
      debug.routeChanges.splice(0, debug.routeChanges.length - 20);
    }
    [0, 80, 300, 900, 2200].forEach((delay, attempt) => {
      setTimeout(() => {
        if (generation !== routeGeneration || !LIVE_ROUTE_PATTERN.test(location.href)) {
          return;
        }
        if (!debug.pageReady || attempt === 0) {
          requestInjection(attempt + 1);
        }
      }, delay);
    });
    syncMarker();
  }

  function checkRoute(reason) {
    if (currentHref === location.href) {
      return;
    }
    currentHref = location.href;
    debug.href = currentHref;
    debug.pageReady = false;
    debug.pageVersion = "";
    debug.instanceCount = 0;
    scheduleLiveRuntime(reason);
    syncMarker();
  }

  if (LIVE_ROUTE_PATTERN.test(location.href)) {
    scheduleLiveRuntime("initial-live-route");
  }
  window.addEventListener("popstate", () => checkRoute("popstate"), true);
  window.addEventListener("hashchange", () => checkRoute("hashchange"), true);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      checkRoute("document-visible");
      if (LIVE_ROUTE_PATTERN.test(location.href) && !debug.pageReady) {
        scheduleLiveRuntime("document-visible-retry");
      }
    }
  });
  setInterval(() => checkRoute("url-poll"), 50);
  syncMarker();
})();
