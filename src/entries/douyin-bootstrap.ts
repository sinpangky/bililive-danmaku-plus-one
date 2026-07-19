import type { DouyinRuntimeRequest } from "../core/types";
import { DOUYIN_CONTENT_SOURCE, DOUYIN_PAGE_SOURCE } from "../platforms/douyin/protocol";

(() => {
  "use strict";

  interface InjectionResponse {
    error?: unknown;
    ok?: boolean;
  }

  interface InjectionAttempt {
    at: number;
    attempt: number;
    response: InjectionResponse | null;
    sinceStart: number;
  }

  interface RouteChange {
    at: number;
    href: string;
    reason: string;
  }

  interface BootstrapDebug {
    attempts: InjectionAttempt[];
    href: string;
    instanceCount: number;
    lastError: string;
    pageReady: boolean;
    pageVersion: string;
    routeChanges: RouteChange[];
    routeGeneration: number;
    startedAt: string;
    version: string;
  }

  interface PageReadyMessage {
    instanceCount?: unknown;
    source: string;
    type: string;
    version?: unknown;
  }

  type BootstrapGlobal = typeof globalThis & {
    __danmakuEchoDouyinBootstrapDebug?: BootstrapDebug;
    __danmakuEchoDouyinBootstrapLoaded?: boolean;
  };

  const runtimeGlobal = globalThis as BootstrapGlobal;
  if (runtimeGlobal.__danmakuEchoDouyinBootstrapLoaded) {
    return;
  }
  runtimeGlobal.__danmakuEchoDouyinBootstrapLoaded = true;

  const LIVE_ROUTE_PATTERN = /^https:\/\/(?:live\.douyin\.com\/|www\.douyin\.com\/follow\/live(?:\/|[?#]|$))/i;
  const startedAt = Date.now();
  let currentHref = location.href;
  let routeGeneration = 0;
  const debug: BootstrapDebug = {
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
  runtimeGlobal.__danmakuEchoDouyinBootstrapDebug = debug;

  function isPageReadyMessage(value: unknown): value is PageReadyMessage {
    if (!value || typeof value !== "object") {
      return false;
    }
    const message = value as { source?: unknown; type?: unknown };
    return message.source === DOUYIN_PAGE_SOURCE && message.type === "ready";
  }

  function normalizeInjectionResponse(value: unknown): InjectionResponse {
    return value && typeof value === "object"
      ? value as InjectionResponse
      : { ok: false, error: "empty-response" };
  }

  function syncMarker(): void {
    const root = document.documentElement;
    if (!root) {
      return;
    }
    let marker = document.getElementById("bcp-douyin-bootstrap-debug");
    if (!marker) {
      marker = document.createElement("script");
      marker.id = "bcp-douyin-bootstrap-debug";
      marker.setAttribute("type", "application/json");
      marker.hidden = true;
      root.append(marker);
    }
    marker.dataset.pageReady = String(debug.pageReady);
    marker.dataset.pageVersion = debug.pageVersion;
    marker.textContent = JSON.stringify(debug);
  }

  function pingPage(attempt: number): void {
    window.postMessage({
      source: DOUYIN_CONTENT_SOURCE,
      type: "ping",
      requestId: 9_000_000 + attempt
    }, "*");
  }

  function requestInjection(attempt: number): void {
    if (!LIVE_ROUTE_PATTERN.test(location.href)) {
      return;
    }
    const entry: InjectionAttempt = {
      attempt,
      at: Date.now(),
      sinceStart: Date.now() - startedAt,
      response: null
    };
    debug.attempts.push(entry);
    const request: DouyinRuntimeRequest = {
      type: "danmaku-echo.ensure-douyin-runtime",
      attempt,
      href: location.href
    };
    try {
      chrome.runtime.sendMessage(request, (response: unknown) => {
        const error = chrome.runtime.lastError;
        if (error) {
          debug.lastError = error.message || String(error);
          entry.response = { ok: false, error: debug.lastError };
          console.warn("[Danmaku Echo][Douyin bootstrap] injection request failed", entry.response);
        } else {
          entry.response = normalizeInjectionResponse(response);
          if (!entry.response.ok) {
            debug.lastError = String(entry.response.error || "injection-failed");
          }
          console.debug("[Danmaku Echo][Douyin bootstrap] injection request", entry);
        }
        syncMarker();
        pingPage(attempt);
      });
    } catch (error: unknown) {
      debug.lastError = String(error instanceof Error ? error.message : error);
      entry.response = { ok: false, error: debug.lastError };
      console.error("[Danmaku Echo][Douyin bootstrap] injection request threw", entry.response);
      syncMarker();
    }
  }

  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (event.source !== window || !isPageReadyMessage(event.data)) {
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

  function scheduleLiveRuntime(reason: string): void {
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
    [0, 80, 300, 900, 2200].forEach((delay, index) => {
      setTimeout(() => {
        if (generation !== routeGeneration || !LIVE_ROUTE_PATTERN.test(location.href)) {
          return;
        }
        if (!debug.pageReady || index === 0) {
          requestInjection(index + 1);
        }
      }, delay);
    });
    syncMarker();
  }

  function checkRoute(reason: string): void {
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
