(function installDanmakuEchoDouyinTracker() {
  "use strict";

  if (globalThis.__bulletPlusOneDouyinCanvasHook) {
    return;
  }
  globalThis.__bulletPlusOneDouyinCanvasHook = true;

  const CONTENT_SOURCE = "danmaku-echo-douyin-content";
  const PAGE_SOURCE = "danmaku-echo-douyin-page";
  const DEBUG_VERSION = "douyin-dom-renderer-v8-track-hover";
  const DOM_ACTION_WIDTH = 50;
  const DOM_ACTION_GAP = 8;
  const DOM_ACTION_TRAILING_SPACE = 12;
  const DOM_BARRAGE_PADDING_X = 8;
  const DOM_BARRAGE_PADDING_Y = 4;
  const DOM_NODE_LIMIT = 160;
  const RENDERER_HEARTBEAT_TIMEOUT = 15_000;
  const RENDERER_RESULT_TIMEOUT = 8_000;
  const FROZEN_TRACK_TIMEOUT = 20_000;
  const HOVER_LEAVE_GRACE = 220;
  const CANVAS_MOUNT_GRACE = 8_000;
  const CANVAS_MOUNT_RETRY = 100;
  const OWN_MESSAGE_TTL = 12_000;
  const OWN_MESSAGE_LIMIT = 24;
  const instances = new Map();
  const offscreenSources = new WeakMap();
  const canvasIds = new WeakMap();
  const orphanMessages = new Map();
  let nextCanvasId = 1;
  let nextTrackId = 1;
  let measurementContext = null;
  let debugMarkerTimer = 0;
  let nextActivationRequestId = 1;
  let rendererEnabled = false;
  let rendererHeartbeatAt = 0;
  function rendererRouteKey(value) {
    try {
      const url = new URL(value, location.href);
      const pathname = url.pathname.replace(/\/+$/, "") || "/";
      return `${url.origin}${pathname}`;
    } catch (_error) {
      return String(value || "").split(/[?#]/, 1)[0];
    }
  }

  let rendererLocationHref = location.href;
  let rendererLocationRouteKey = rendererRouteKey(location.href);
  const activationRequests = new Map();
  const ownMessages = [];

  const debugState = {
    version: DEBUG_VERSION,
    installedAt: new Date().toISOString(),
    installedAtMs: Date.now(),
    href: location.href,
    readyState: document.readyState,
    counters: {
      canvasTransfers: 0,
      workerMessages: 0,
      instancesCreated: 0,
      instancesRecovered: 0,
      barragesObserved: 0,
      barragesStarted: 0,
      rendererTakeovers: 0,
      rendererRestores: 0,
      rendererNodesCreated: 0,
      rendererActivations: 0,
      rendererResults: 0,
      ownMessagesQueued: 0,
      ownBarragesMatched: 0,
      skippedBarrages: 0,
      probes: 0,
      probeHits: 0,
      probeMisses: 0
    },
    lastProbe: null,
    lastError: "",
    events: []
  };
  globalThis.__danmakuEchoDouyinDebug = debugState;

  function conciseDebugValue(value, depth) {
    if (depth > 3) {
      return "[depth-limit]";
    }
    if (value == null || typeof value === "boolean" || typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      return value.slice(0, 240);
    }
    if (Array.isArray(value)) {
      return value.slice(0, 12).map((item) => conciseDebugValue(item, depth + 1));
    }
    if (typeof value === "object") {
      const result = {};
      Object.keys(value).slice(0, 20).forEach((key) => {
        result[key] = conciseDebugValue(value[key], depth + 1);
      });
      return result;
    }
    return String(value).slice(0, 120);
  }

  function instanceDebugSummary(instance) {
    const rect = instance.canvas instanceof HTMLCanvasElement
      ? instance.canvas.getBoundingClientRect()
      : null;
    return {
      id: instance.id,
      canvasId: instance.canvasId,
      recovered: Boolean(instance.recovered),
      active: Boolean(instance.active),
      connected: Boolean(instance.canvas && instance.canvas.isConnected),
      canvasRect: rect ? [rect.left, rect.top, rect.width, rect.height] : null,
      config: {
        width: numberOr(instance.config.width, 0),
        height: numberOr(instance.config.height, 0),
        devicePixelRatio: numberOr(instance.config.devicePixelRatio, 1),
        fontSize: numberOr(instance.config.fontSize, 20),
        channelHeight: numberOr(instance.config.channelHeight, 40),
        duration: numberOr(instance.config.duration, 15_000),
        gap: numberOr(instance.config.gap, 100)
      },
      pendingCount: instance.pending ? instance.pending.length : 0,
      trackCount: instance.tracks.size,
      channelCount: instance.channels ? instance.channels.length : 0,
      renderer: {
        safe: Boolean(instance.rendererSafeSync)
          || Date.now() >= numberOr(instance.rendererSafeAfter, Infinity),
        blocked: Boolean(instance.rendererBlocked),
        takeover: Boolean(instance.rendererTakeover),
        nodeCount: instance.rendererNodes ? instance.rendererNodes.size : 0,
        layerConnected: Boolean(instance.rendererLayer && instance.rendererLayer.isConnected)
      }
    };
  }

  function debugSnapshot() {
    return {
      version: debugState.version,
      installedAt: debugState.installedAt,
      installedAtMs: debugState.installedAtMs,
      href: location.href,
      readyState: document.readyState,
      counters: Object.assign({}, debugState.counters),
      lastProbe: debugState.lastProbe,
      lastError: debugState.lastError,
      instanceCount: instances.size,
      orphanCount: orphanMessages.size,
      renderer: {
        enabled: rendererEnabled,
        heartbeatAge: rendererHeartbeatAt ? Date.now() - rendererHeartbeatAt : null,
        activationRequestCount: activationRequests.size
      },
      instances: Array.from(instances.values()).map(instanceDebugSummary),
      events: debugState.events.slice(-80)
    };
  }

  function syncDebugMarker() {
    debugMarkerTimer = 0;
    const root = document.documentElement;
    if (!root) {
      return;
    }
    let marker = document.getElementById("bcp-douyin-page-debug");
    if (!marker) {
      marker = document.createElement("script");
      marker.id = "bcp-douyin-page-debug";
      marker.type = "application/json";
      marker.hidden = true;
      root.appendChild(marker);
    }
    const snapshot = debugSnapshot();
    marker.dataset.version = DEBUG_VERSION;
    marker.dataset.instanceCount = String(snapshot.instanceCount);
    marker.dataset.orphanCount = String(snapshot.orphanCount);
    marker.textContent = JSON.stringify(snapshot);
  }

  function scheduleDebugMarker() {
    if (!debugMarkerTimer) {
      debugMarkerTimer = setTimeout(syncDebugMarker, 80);
    }
  }

  function debugEvent(type, details, level) {
    const entry = {
      at: Date.now(),
      sinceInstall: Date.now() - debugState.installedAtMs,
      type,
      details: conciseDebugValue(details || {}, 0)
    };
    debugState.events.push(entry);
    if (debugState.events.length > 240) {
      debugState.events.splice(0, debugState.events.length - 240);
    }
    if (level === "error") {
      debugState.lastError = String(details && (details.message || details.error) || type).slice(0, 500);
      console.error("[Danmaku Echo][Douyin page]", type, entry.details);
    } else if (level === "info") {
      console.info("[Danmaku Echo][Douyin page]", type, entry.details);
    } else if (level === "warn") {
      console.warn("[Danmaku Echo][Douyin page]", type, entry.details);
    } else {
      console.debug("[Danmaku Echo][Douyin page]", type, entry.details);
    }
    scheduleDebugMarker();
  }

  function numberOr(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function normalizeText(value) {
    return String(value == null ? "" : value)
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function plausibleText(value) {
    const text = normalizeText(value);
    const length = Array.from(text).length;
    return length > 0
      && length <= 1000
      && !/^(高清|超清|蓝光|原画|自动|流畅|发送|设置|退出全屏|直播已结束)$/.test(text);
  }

  function boxEdges(value) {
    if (Array.isArray(value)) {
      const top = numberOr(value[0], 0);
      const right = numberOr(value[1], top);
      const bottom = numberOr(value[2], top);
      const left = numberOr(value[3], right);
      return { top, right, bottom, left };
    }
    const edge = numberOr(value, 0);
    return { top: edge, right: edge, bottom: edge, left: edge };
  }

  function ensureMeasurementContext() {
    if (measurementContext) {
      return measurementContext;
    }
    try {
      measurementContext = document.createElement("canvas").getContext("2d");
    } catch (_error) {
      measurementContext = null;
    }
    return measurementContext;
  }

  function measureTextItem(item, style) {
    const text = normalizeText(item.text);
    const fontSize = Math.max(8, numberOr(style.fontSize, 20));
    const fontWeight = style.fontWeight || 400;
    const fontFamily = style.fontFamily || "Arial";
    const context = ensureMeasurementContext();
    let width = Array.from(text).length * fontSize;
    if (context) {
      try {
        context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        width = context.measureText(text).width;
      } catch (_error) {
        // The character estimate remains usable when a site font is unavailable.
      }
    }
    const margin = boxEdges(item.margin);
    const padding = boxEdges(item.padding);
    const border = Math.max(0, numberOr(item.borderWidth, 0));
    return {
      width: width + margin.left + margin.right + padding.left + padding.right + border * 2,
      height: fontSize + margin.top + margin.bottom + padding.top + padding.bottom + border * 2,
      text,
      imageCount: 0,
      firstText: {
        fontSize,
        fontWeight,
        fontFamily,
        color: style.color,
        strokeColor: style.strokeColor,
        strokeWidth: numberOr(style.strokeWidth, 1)
      }
    };
  }

  function measureImageItem(item, style, imageRatios) {
    const fontSize = Math.max(8, numberOr(style.fontSize, 20));
    const height = Math.max(1, numberOr(item.height, fontSize));
    const ratio = imageRatios && typeof item.src === "string"
      ? imageRatios.get(item.src)
      : null;
    const width = Math.max(1, Number.isFinite(ratio) && ratio > 0
      ? height * ratio
      : numberOr(item.width, numberOr(item.height, fontSize)));
    const margin = boxEdges(item.margin);
    const padding = boxEdges(item.padding);
    const border = Math.max(0, numberOr(item.borderWidth, 0));
    return {
      width: width + margin.left + margin.right + padding.left + padding.right + border * 2,
      height: height + margin.top + margin.bottom + padding.top + padding.bottom + border * 2,
      text: "",
      imageCount: 1,
      firstText: null
    };
  }

  function mergeMeasurement(target, child, inline) {
    target.text += child.text;
    target.imageCount += child.imageCount;
    target.firstText = target.firstText || child.firstText;
    if (inline) {
      target.width += child.width;
      target.height = Math.max(target.height, child.height);
    } else {
      target.width = Math.max(target.width, child.width);
      target.height += child.height;
    }
  }

  function inheritableTextStyle(style) {
    return {
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontFamily: style.fontFamily,
      color: style.color,
      strokeColor: style.strokeColor,
      strokeWidth: style.strokeWidth
    };
  }

  function measureContent(item, inherited, imageRatios) {
    if (!item || typeof item !== "object") {
      return { width: 0, height: 0, text: "", imageCount: 0, firstText: null };
    }
    const style = Object.assign({}, inherited, item);
    if (item.type === "text") {
      return measureTextItem(item, style);
    }
    if (item.type === "image") {
      return measureImageItem(item, style, imageRatios);
    }

    const result = { width: 0, height: 0, text: "", imageCount: 0, firstText: null };
    const content = Array.isArray(item.content) ? item.content : [];
    const childStyle = inheritableTextStyle(style);
    content.forEach((child) => {
      const childResult = measureContent(child, childStyle, imageRatios);
      const isBlock = !child.type || child.type === "block";
      mergeMeasurement(result, childResult, !isBlock || Boolean(child.isInline));
    });
    const margin = boxEdges(item.margin);
    const padding = boxEdges(item.padding);
    const border = Math.max(0, numberOr(item.borderWidth, 0));
    result.width += margin.left + margin.right + padding.left + padding.right + border * 2;
    result.height += margin.top + margin.bottom + padding.top + padding.bottom + border * 2;
    return result;
  }

  function describeBarrage(options, config, imageRatios) {
    const result = measureContent(options, {
      fontSize: numberOr(config.fontSize, 20),
      fontWeight: 400,
      fontFamily: "Arial",
      color: "#ffffff",
      strokeColor: "rgba(0, 0, 0, 0.8)",
      strokeWidth: 1
    }, imageRatios);
    result.width = Math.max(4, result.width);
    result.height = Math.max(8, result.height || numberOr(config.fontSize, 20));
    result.text = normalizeText(result.text);
    return result;
  }

  function safePaint(value) {
    if (typeof value === "string") {
      return value.slice(0, 200);
    }
    if (!value || typeof value !== "object" || !Array.isArray(value.gradientPieces)) {
      return "";
    }
    return {
      type: value.type === "radial" ? "radial" : "linear",
      gradientPieces: value.gradientPieces.slice(0, 12)
        .filter((piece) => Array.isArray(piece) && piece.length >= 2)
        .map((piece) => [numberOr(piece[0], 0), String(piece[1]).slice(0, 100)])
    };
  }

  function safeBox(value) {
    if (Array.isArray(value)) {
      return value.slice(0, 4).map((edge) => numberOr(edge, 0));
    }
    return numberOr(value, 0);
  }

  function serializeContent(item, depth, budget) {
    if (!item || typeof item !== "object" || depth > 5 || budget.remaining <= 0) {
      return null;
    }
    budget.remaining -= 1;
    const type = item.type === "text" || item.type === "image" || item.type === "block"
      ? item.type
      : "block";
    const result = { type };
    if (type === "text") {
      result.text = String(item.text == null ? "" : item.text).slice(0, 1000);
    } else if (type === "image" && typeof item.src === "string") {
      result.src = item.src.slice(0, 4096);
    }
    ["width", "height", "fontSize", "strokeWidth", "borderWidth", "borderRadius", "borderRadiusRatio", "opacity"]
      .forEach((key) => {
        if (Number.isFinite(Number(item[key]))) {
          result[key] = Number(item[key]);
        }
      });
    ["fontFamily", "fontWeight"].forEach((key) => {
      if (typeof item[key] === "string" || typeof item[key] === "number") {
        result[key] = String(item[key]).slice(0, 100);
      }
    });
    ["color", "strokeColor", "backgroundColor", "borderColor"].forEach((key) => {
      const value = safePaint(item[key]);
      if (value) {
        result[key] = value;
      }
    });
    if (item.margin != null) {
      result.margin = safeBox(item.margin);
    }
    if (item.padding != null) {
      result.padding = safeBox(item.padding);
    }
    if (item.isInline != null) {
      result.isInline = Boolean(item.isInline);
    }
    if (Array.isArray(item.content)) {
      result.content = item.content
        .map((child) => serializeContent(child, depth + 1, budget))
        .filter(Boolean);
    }
    return result;
  }

  function serializeBarrage(options) {
    const budget = { remaining: 80 };
    const content = Array.isArray(options.content) ? options.content : [];
    return content.map((item) => serializeContent(item, 0, budget)).filter(Boolean);
  }

  function pruneOwnMessages(now) {
    const cutoff = now - OWN_MESSAGE_TTL;
    while (ownMessages.length && ownMessages[0].at < cutoff) {
      ownMessages.shift();
    }
  }

  function rememberOwnMessage(data) {
    const text = normalizeText(data && data.text);
    if (!plausibleText(text)) {
      return;
    }
    const now = Date.now();
    pruneOwnMessages(now);
    ownMessages.push({
      id: String(data.intentId || "").slice(0, 80),
      text,
      at: now,
      source: String(data.sourceType || "unknown").slice(0, 40)
    });
    if (ownMessages.length > OWN_MESSAGE_LIMIT) {
      ownMessages.splice(0, ownMessages.length - OWN_MESSAGE_LIMIT);
    }
    debugState.counters.ownMessagesQueued += 1;
    debugEvent("own-message-queued", {
      text,
      source: String(data.sourceType || "unknown").slice(0, 40),
      queueLength: ownMessages.length
    });
  }

  function cancelOwnMessage(data) {
    const id = String(data && data.intentId || "").slice(0, 80);
    if (!id) {
      return;
    }
    const index = ownMessages.findIndex((item) => item.id === id);
    if (index >= 0) {
      ownMessages.splice(index, 1);
      debugEvent("own-message-cancelled", { intentId: id });
    }
  }

  function consumeOwnMessage(text) {
    const normalized = normalizeText(text);
    if (!normalized) {
      return false;
    }
    pruneOwnMessages(Date.now());
    const index = ownMessages.findIndex((item) => item.text === normalized);
    if (index < 0) {
      return false;
    }
    const matched = ownMessages.splice(index, 1)[0];
    debugState.counters.ownBarragesMatched += 1;
    debugEvent("own-barrage-matched", {
      text: normalized,
      source: matched.source,
      age: Date.now() - matched.at
    });
    return true;
  }

  function elementMarker(element) {
    if (!(element instanceof Element)) {
      return "";
    }
    const className = typeof element.className === "string" ? element.className : "";
    return [element.id, className, element.getAttribute("data-e2e")].filter(Boolean).join(" ");
  }

  function isDanmakuCanvas(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      return false;
    }
    let current = canvas;
    for (let depth = 0; current && depth < 7; depth += 1, current = current.parentElement) {
      if (/(danmaku|danmu|barrage|bullet)/i.test(elementMarker(current))) {
        return true;
      }
    }
    return false;
  }

  function canvasId(canvas) {
    if (!canvasIds.has(canvas)) {
      canvasIds.set(canvas, nextCanvasId);
      nextCanvasId += 1;
    }
    return canvasIds.get(canvas);
  }

  function observeCanvasTransfers() {
    const prototype = globalThis.HTMLCanvasElement && globalThis.HTMLCanvasElement.prototype;
    const original = prototype && prototype.transferControlToOffscreen;
    if (typeof original !== "function" || original.__danmakuEchoObserved) {
      return;
    }
    function danmakuEchoTransferControlToOffscreen() {
      const offscreen = Reflect.apply(original, this, arguments);
      if (offscreen && typeof offscreen === "object") {
        offscreenSources.set(offscreen, this);
        debugState.counters.canvasTransfers += 1;
        debugEvent("canvas-transferred", {
          canvasId: canvasId(this),
          connected: this.isConnected,
          marker: elementMarker(this.parentElement),
          width: this.width,
          height: this.height
        });
      }
      return offscreen;
    }
    danmakuEchoTransferControlToOffscreen.__danmakuEchoObserved = true;
    Object.defineProperty(prototype, "transferControlToOffscreen", {
      configurable: true,
      writable: true,
      value: danmakuEchoTransferControlToOffscreen
    });
  }

  function findUnclaimedCanvas() {
    const claimed = new Set(Array.from(instances.values()).map((instance) => instance.canvas));
    return Array.from(document.querySelectorAll("canvas")).reverse()
      .find((canvas) => isDanmakuCanvas(canvas) && !claimed.has(canvas)) || null;
  }

  function modelDpr(instance) {
    const devicePixelRatio = Math.max(0.25, numberOr(instance.config.devicePixelRatio, 1));
    const fontSize = Math.max(1, numberOr(instance.config.fontSize, 20));
    return devicePixelRatio * fontSize / 20;
  }

  function canvasPixelSize(instance, rect) {
    const devicePixelRatio = Math.max(0.25, numberOr(instance.config.devicePixelRatio, 1));
    return {
      width: Math.max(20, numberOr(instance.config.width, rect.width)) * devicePixelRatio,
      height: Math.max(20, numberOr(instance.config.height, rect.height)) * devicePixelRatio
    };
  }

  function channelInfo(instance, rect) {
    const pixels = canvasPixelSize(instance, rect);
    const channelHeight = Math.max(1, numberOr(instance.config.channelHeight, 40)) * modelDpr(instance);
    const allChannels = Math.max(1, Math.floor(pixels.height / channelHeight));
    const limits = [pixels.height / channelHeight];
    const maxHeightRate = numberOr(instance.config.maxHeightRate, 1);
    if (maxHeightRate * pixels.height) {
      limits.push(maxHeightRate * pixels.height / channelHeight);
    }
    const configured = numberOr(instance.config.maxChannelCount, 0);
    if (configured > 0) {
      limits.push(configured);
    }
    return {
      maxCanUse: allChannels,
      maxDisplay: Math.max(1, Math.floor(Math.min(...limits)) || 1)
    };
  }

  function ensureChannels(instance, count) {
    while (instance.channels.length < count) {
      instance.channels.push([]);
    }
    if (instance.channels.length > count) {
      instance.channels.length = count;
    }
  }

  function trackDuration(track) {
    return Math.max(1000, numberOr(
      track.options.duration,
      numberOr(track.instance.config.duration, 15_000)
    ));
  }

  function trackInternalWidth(track) {
    return track.description.width * modelDpr(track.instance);
  }

  function trackInternalHeight(track) {
    return track.description.height * modelDpr(track.instance);
  }

  function trackRightPosition(track, rect) {
    const pixels = canvasPixelSize(track.instance, rect);
    return pixels.width - track.deltaXWithoutDpr * modelDpr(track.instance)
      + trackInternalWidth(track);
  }

  function trackIsExpired(track, rect) {
    const state = track.renderer;
    if (state && Number.isFinite(state.visualLeft)
        && (state.hovered || Math.abs(numberOr(state.resumeOffset, 0)) > 0.1)) {
      return state.visualLeft + Math.max(1, numberOr(state.visualWidth, track.description.width)) <= 0;
    }
    return trackRightPosition(track, rect) <= 0;
  }

  function trackRightEdgeVisible(track, rect) {
    const pixels = canvasPixelSize(track.instance, rect);
    const gap = Math.max(0, numberOr(track.instance.config.gap, 100)) * modelDpr(track.instance);
    return trackRightPosition(track, rect) <= pixels.width - gap;
  }

  function trackSpeed(track, rect) {
    const pixels = canvasPixelSize(track.instance, rect);
    return (pixels.width + trackInternalWidth(track))
      / trackDuration(track)
      / modelDpr(track.instance);
  }

  function usesSpecialRange(track, maxDisplay) {
    const range = track.options && track.options.channelRange;
    return Boolean(range && numberOr(range.startIndex, -1) >= 0
      && maxDisplay > Math.max(1, Math.floor(numberOr(range.len, maxDisplay))));
  }

  function realChannelRange(track, maxDisplay, maxCanUse) {
    const range = track.options && track.options.channelRange;
    if (!usesSpecialRange(track, maxDisplay)) {
      return { start: 0, end: Math.min(maxCanUse - 1, maxDisplay - 1) };
    }
    const start = Math.max(0, Math.floor(numberOr(range.startIndex, 0)));
    const length = Math.max(1, Math.floor(numberOr(range.len, maxDisplay)));
    return {
      start: Math.min(maxCanUse - 1, start),
      end: Math.min(maxCanUse - 1, start + length - 1)
    };
  }

  function trackPriority(track, maxDisplay) {
    const base = numberOr(track.options.prior, 0);
    const range = track.options && track.options.channelRange;
    return usesSpecialRange(track, maxDisplay)
      ? base + numberOr(range && range.additionalPriority, 100)
      : base;
  }

  function trackNeedsReserve(track, maxDisplay) {
    const range = track.options && track.options.channelRange;
    const additional = usesSpecialRange(track, maxDisplay)
      ? numberOr(range && range.additionalReserveDuration, 0)
      : 0;
    const reserve = numberOr(track.options.reserveDuration, 0);
    const startTime = numberOr(track.options.startTime, Date.now());
    return startTime + reserve + additional > Date.now();
  }

  function trackRect(track, _now, canvasRect) {
    if (!track.bookedChannel) {
      return null;
    }
    const instance = track.instance;
    const pixels = canvasPixelSize(instance, canvasRect);
    const dpr = modelDpr(instance);
    const scaleX = canvasRect.width / pixels.width;
    const scaleY = canvasRect.height / pixels.height;
    const internalLeft = pixels.width - track.deltaXWithoutDpr * dpr;
    const internalTop = track.bookedChannel.start
      * Math.max(1, numberOr(instance.config.channelHeight, 40)) * dpr + 2;
    return {
      left: canvasRect.left + internalLeft * scaleX,
      top: canvasRect.top + internalTop * scaleY,
      width: trackInternalWidth(track) * scaleX,
      height: trackInternalHeight(track) * scaleY
    };
  }

  function rendererInstanceSafe(instance) {
    return Boolean(instance.rendererSafeSync)
      || Date.now() >= numberOr(instance.rendererSafeAfter, Infinity);
  }

  function rendererMount(instance) {
    const fullscreen = document.fullscreenElement;
    if (fullscreen instanceof Element && fullscreen !== instance.canvas
        && fullscreen.contains(instance.canvas)) {
      return fullscreen;
    }
    return document.documentElement || document.body;
  }

  function rendererPaint(value, background) {
    if (typeof value === "string") {
      return value.slice(0, 200);
    }
    if (!value || typeof value !== "object" || !Array.isArray(value.gradientPieces)) {
      return "";
    }
    const pieces = value.gradientPieces
      .filter((piece) => Array.isArray(piece) && piece.length >= 2)
      .slice(0, 12);
    if (!pieces.length) {
      return "";
    }
    if (!background) {
      return String(pieces[0][1]).slice(0, 100);
    }
    const stops = pieces.map((piece) => {
      const offset = Math.max(0, Math.min(1, numberOr(piece[0], 0))) * 100;
      return `${String(piece[1]).slice(0, 100)} ${offset}%`;
    });
    return `${value.type === "radial" ? "radial-gradient(circle" : "linear-gradient(90deg"}, ${stops.join(", ")})`;
  }

  function rendererBox(value) {
    const edges = boxEdges(value);
    return [edges.top, edges.right, edges.bottom, edges.left]
      .map((edge) => `${Math.max(-100, Math.min(200, numberOr(edge, 0)))}px`)
      .join(" ");
  }

  function applyRendererContentStyle(element, item) {
    if (!element || !item || typeof item !== "object") {
      return;
    }
    if (Number.isFinite(Number(item.fontSize))) {
      element.style.fontSize = `${Math.max(8, Math.min(96, Number(item.fontSize)))}px`;
    }
    if (item.type !== "image" && Number.isFinite(Number(item.width))) {
      element.style.width = `${Math.max(0, Math.min(1000, Number(item.width)))}px`;
    }
    if (item.type !== "image" && Number.isFinite(Number(item.height))) {
      element.style.height = `${Math.max(0, Math.min(500, Number(item.height)))}px`;
    }
    if (item.fontWeight != null) {
      element.style.fontWeight = String(item.fontWeight).slice(0, 100);
    }
    if (item.fontFamily != null) {
      element.style.fontFamily = String(item.fontFamily).slice(0, 100);
    }
    const color = rendererPaint(item.color, false);
    if (color) {
      element.style.color = color;
    }
    const background = rendererPaint(item.backgroundColor, true);
    if (background) {
      if (/gradient\(/i.test(background)) {
        element.style.backgroundImage = background;
      } else {
        element.style.backgroundColor = background;
      }
    }
    const stroke = rendererPaint(item.strokeColor, false);
    const strokeWidth = Math.max(0, Math.min(8, numberOr(item.strokeWidth, 0)));
    if (stroke && strokeWidth) {
      element.style.webkitTextStroke = `${strokeWidth}px ${stroke}`;
      element.style.paintOrder = "stroke fill";
    }
    const borderColor = rendererPaint(item.borderColor, false);
    const borderWidth = Math.max(0, Math.min(12, numberOr(item.borderWidth, 0)));
    if (borderColor && borderWidth) {
      element.style.border = `${borderWidth}px solid ${borderColor}`;
    }
    if (item.margin != null) {
      element.style.margin = rendererBox(item.margin);
    }
    if (item.padding != null) {
      element.style.padding = rendererBox(item.padding);
    }
    if (Number.isFinite(Number(item.borderRadius))) {
      element.style.borderRadius = `${Math.max(0, Math.min(100, Number(item.borderRadius)))}px`;
    }
    if (Number.isFinite(Number(item.opacity))) {
      element.style.opacity = String(Math.max(0, Math.min(1, Number(item.opacity))));
    }
  }

  function createRendererContent(item, depth) {
    if (!item || typeof item !== "object" || depth > 6) {
      return null;
    }
    let element;
    if (item.type === "image" && typeof item.src === "string") {
      element = document.createElement("img");
      element.src = item.src;
      element.alt = "";
      element.draggable = false;
      element.style.display = "inline-block";
      element.style.objectFit = "contain";
      const fallbackSize = Math.max(8, Math.min(96, numberOr(item.fontSize, 20)));
      const width = numberOr(item.width, numberOr(item.height, fallbackSize));
      const height = numberOr(item.height, numberOr(item.width, fallbackSize));
      element.style.width = `${Math.max(1, Math.min(500, width))}px`;
      element.style.height = `${Math.max(1, Math.min(200, height))}px`;
    } else {
      element = document.createElement("span");
      if (item.type === "text") {
        element.textContent = String(item.text == null ? "" : item.text).slice(0, 1000);
        element.style.display = "inline-block";
      } else {
        element.style.display = item.isInline ? "inline-flex" : "flex";
        element.style.alignItems = "center";
        const children = Array.isArray(item.content) ? item.content : [];
        children.forEach((child) => {
          const childElement = createRendererContent(child, depth + 1);
          if (childElement) {
            element.appendChild(childElement);
          }
        });
      }
    }
    element.style.boxSizing = "border-box";
    element.style.flexShrink = "0";
    applyRendererContentStyle(element, item);
    return element;
  }

  function setRendererMetadata(element, track) {
    const message = track.description.text;
    const messageId = String(track.options.id == null ? track.id : track.options.id);
    element.dataset.track = String(track.id);
    element.dataset.trackId = String(track.id);
    element.dataset.instance = String(track.instance.id);
    element.dataset.instanceId = String(track.instance.id);
    element.dataset.message = message;
    element.dataset.messageId = messageId;
  }

  function ensureRendererLayer(instance, canvasRect) {
    let layer = instance.rendererLayer;
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "bcp-douyin-dom-layer";
      layer.dataset.instance = String(instance.id);
      layer.dataset.instanceId = String(instance.id);
      layer.dataset.canvas = String(instance.canvasId);
      layer.dataset.canvasId = String(instance.canvasId);
      layer.dataset.bcpDouyinOwned = "true";
      layer.style.position = "fixed";
      layer.style.margin = "0";
      layer.style.padding = "0";
      layer.style.overflow = "hidden";
      layer.style.pointerEvents = "none";
      layer.style.contain = "layout style paint";
      layer.style.isolation = "isolate";
      layer.style.zIndex = "2147483000";
      layer.style.visibility = "hidden";
      layer.hidden = true;
      instance.rendererLayer = layer;
      instance.rendererGeometryKey = "";
      instance.rendererBorderRadius = null;
    }
    const mount = rendererMount(instance);
    if (!(mount instanceof Element)) {
      throw new Error("renderer mount is unavailable");
    }
    if (layer.parentElement !== mount) {
      mount.appendChild(layer);
      instance.rendererGeometryKey = "";
    }
    if (instance.rendererBorderRadius == null) {
      try {
        instance.rendererBorderRadius = getComputedStyle(instance.canvas).borderRadius || "";
      } catch (_error) {
        instance.rendererBorderRadius = "";
      }
      layer.style.borderRadius = instance.rendererBorderRadius;
    }
    const geometryKey = [canvasRect.left, canvasRect.top, canvasRect.width, canvasRect.height]
      .map((value) => Math.round(numberOr(value, 0) * 100) / 100)
      .join("|");
    if (geometryKey !== instance.rendererGeometryKey) {
      layer.style.left = `${canvasRect.left}px`;
      layer.style.top = `${canvasRect.top}px`;
      layer.style.width = `${canvasRect.width}px`;
      layer.style.height = `${canvasRect.height}px`;
      instance.rendererGeometryKey = geometryKey;
    }
    return layer;
  }

  function restoreRendererCanvas(instance, reason) {
    const canvas = instance.canvas;
    if (instance.rendererOwnsCanvasVisibility && canvas instanceof HTMLCanvasElement) {
      canvas.style.visibility = instance.rendererCanvasVisibility || "";
      delete canvas.dataset.bcpDouyinDomTakeover;
      instance.rendererOwnsCanvasVisibility = false;
      debugState.counters.rendererRestores += 1;
      debugEvent("renderer-canvas-restored", { instanceId: instance.id, reason });
    }
    instance.rendererTakeover = false;
    if (instance.rendererLayer) {
      instance.rendererLayer.style.visibility = "hidden";
      instance.rendererLayer.hidden = true;
    }
  }

  function takeOverRendererCanvas(instance) {
    if (instance.rendererTakeover) {
      return;
    }
    const canvas = instance.canvas;
    const layer = instance.rendererLayer;
    if (!(canvas instanceof HTMLCanvasElement) || !canvas.isConnected
        || !layer || !layer.isConnected || !instance.rendererNodes.size) {
      return;
    }
    instance.rendererCanvasVisibility = canvas.style.visibility;
    instance.rendererOwnsCanvasVisibility = true;
    layer.hidden = false;
    layer.style.visibility = "visible";
    canvas.style.visibility = "hidden";
    canvas.dataset.bcpDouyinDomTakeover = "true";
    instance.rendererTakeover = true;
    debugState.counters.rendererTakeovers += 1;
    debugEvent("renderer-takeover", {
      instanceId: instance.id,
      canvasId: instance.canvasId,
      nodeCount: instance.rendererNodes.size
    }, "info");
  }

  function removeRendererTrack(track) {
    const state = track && track.renderer;
    if (!state) {
      return;
    }
    if (state.hoverTimer) {
      clearTimeout(state.hoverTimer);
    }
    if (state.releaseTimer) {
      clearTimeout(state.releaseTimer);
    }
    if (state.node && state.node.isConnected) {
      state.node.remove();
    }
    if (track.instance.rendererNodes) {
      track.instance.rendererNodes.delete(track.id);
    }
    track.renderer = null;
  }

  function clearActivationRequests(instance) {
    for (const [requestId, request] of activationRequests) {
      if (request.track.instance !== instance) {
        continue;
      }
      clearTimeout(request.timer);
      activationRequests.delete(requestId);
    }
  }

  function shutdownInstanceRenderer(instance, reason) {
    clearActivationRequests(instance);
    Array.from(instance.tracks.values()).forEach(removeRendererTrack);
    if (instance.rendererNodes) {
      instance.rendererNodes.clear();
    }
    restoreRendererCanvas(instance, reason);
    if (instance.rendererLayer) {
      instance.rendererLayer.remove();
      instance.rendererLayer = null;
    }
    instance.rendererGeometryKey = "";
    instance.rendererBorderRadius = null;
  }

  function failInstanceRenderer(instance, reason, error) {
    instance.rendererBlocked = true;
    shutdownInstanceRenderer(instance, reason);
    debugEvent("renderer-failed", {
      instanceId: instance.id,
      reason,
      message: error ? String(error && error.message || error) : ""
    }, "error");
  }

  function releaseRendererTrack(track) {
    const state = track.renderer;
    if (!state) {
      return;
    }
    if (state.hoverTimer) {
      clearTimeout(state.hoverTimer);
      state.hoverTimer = 0;
    }
    if (state.releaseTimer) {
      clearTimeout(state.releaseTimer);
      state.releaseTimer = 0;
    }
    if (state.hovered && Number.isFinite(state.visualLeft) && Number.isFinite(state.targetLeft)) {
      // Preserve the distance accumulated while the ghost trajectory kept
      // moving. A constant offset means this DOM node now travels at exactly
      // the same speed as before the hold instead of springing back to ghost.
      state.resumeOffset = state.visualLeft - state.targetLeft;
    }
    state.hovered = false;
    delete state.node.dataset.hovered;
    if (Math.abs(numberOr(state.resumeOffset, 0)) > 0.1) {
      state.node.dataset.resuming = "true";
    } else {
      delete state.node.dataset.resuming;
    }
  }

  function holdRendererTrack(track) {
    const state = track.renderer;
    if (!state) {
      return;
    }
    state.hovered = true;
    state.node.dataset.hovered = "true";
    delete state.node.dataset.resuming;
    if (state.releaseTimer) {
      clearTimeout(state.releaseTimer);
      state.releaseTimer = 0;
    }
    if (state.hoverTimer) {
      clearTimeout(state.hoverTimer);
    }
    state.hoverTimer = setTimeout(() => {
      if (track.renderer === state && state.hovered) {
        releaseRendererTrack(track);
      }
    }, FROZEN_TRACK_TIMEOUT);
  }

  function scheduleRendererTrackRelease(track) {
    const state = track.renderer;
    if (!state) {
      return;
    }
    if (state.releaseTimer) {
      clearTimeout(state.releaseTimer);
    }
    state.releaseTimer = setTimeout(() => {
      state.releaseTimer = 0;
      if (track.renderer === state) {
        releaseRendererTrack(track);
      }
    }, HOVER_LEAVE_GRACE);
  }

  function settleRendererActivation(requestId, ok, reason) {
    const request = activationRequests.get(requestId);
    if (!request) {
      return;
    }
    activationRequests.delete(requestId);
    clearTimeout(request.timer);
    const state = request.track.renderer;
    if (!state || state.button !== request.button) {
      return;
    }
    state.sending = false;
    delete state.node.dataset.sending;
    state.button.disabled = false;
    state.button.textContent = ok ? "✓" : "!";
    state.button.dataset.result = ok ? "success" : "failure";
    if (ok) {
      state.node.dataset.sendOk = "true";
      releaseRendererTrack(request.track);
    } else {
      delete state.node.dataset.sendOk;
    }
    state.button.title = ok ? "已发送 +1" : `发送失败${reason ? `：${reason}` : ""}`;
    debugState.counters.rendererResults += 1;
    setTimeout(() => {
      if (request.track.renderer === state) {
        state.button.textContent = "+1";
        state.button.title = "发送相同弹幕（+1）";
        delete state.button.dataset.result;
        delete state.node.dataset.sendOk;
      }
    }, ok ? 900 : 1200);
  }

  function activateRendererTrack(track, event) {
    const state = track.renderer;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!state || state.sending || !rendererEnabled) {
      return;
    }
    const button = state.button;
    if (button.dataset.track !== String(track.id)
        || button.dataset.instance !== String(track.instance.id)
        || button.dataset.message !== track.description.text) {
      failInstanceRenderer(track.instance, "activation-metadata-mismatch");
      return;
    }
    const requestId = nextActivationRequestId;
    nextActivationRequestId += 1;
    state.sending = true;
    state.node.dataset.sending = "true";
    button.disabled = true;
    button.textContent = "…";
    const timer = setTimeout(() => {
      settleRendererActivation(requestId, false, "timeout");
    }, RENDERER_RESULT_TIMEOUT);
    activationRequests.set(requestId, { track, button, timer });
    debugState.counters.rendererActivations += 1;
    window.postMessage({
      source: PAGE_SOURCE,
      type: "renderer-activate",
      requestId,
      trackId: track.id,
      instanceId: track.instance.id,
      messageId: String(track.options.id == null ? track.id : track.options.id),
      text: track.description.text,
      content: track.content
    }, "*");
  }

  function createRendererTrack(track, layer) {
    const instance = track.instance;
    if (instance.rendererNodes.size >= DOM_NODE_LIMIT) {
      throw new Error(`renderer node limit exceeded (${DOM_NODE_LIMIT})`);
    }
    const node = document.createElement("div");
    node.className = "bcp-douyin-dom-track";
    node.dataset.bcpDouyinOwned = "true";
    setRendererMetadata(node, track);

    const barrage = document.createElement("div");
    barrage.className = "bcp-douyin-dom-barrage";
    barrage.dataset.bcpDouyinOwned = "true";
    if (track.own) {
      barrage.dataset.own = "true";
    }
    setRendererMetadata(barrage, track);
    node.style.position = "absolute";
    node.style.left = "0";
    node.style.top = "0";
    node.style.display = "flex";
    node.style.alignItems = "center";
    node.style.boxSizing = "border-box";
    node.style.whiteSpace = "nowrap";
    node.style.columnGap = `${DOM_ACTION_GAP}px`;
    node.style.paddingRight = `${DOM_ACTION_TRAILING_SPACE}px`;
    node.style.pointerEvents = "auto";
    node.style.userSelect = "none";
    node.style.webkitUserSelect = "none";
    node.style.willChange = "transform";
    node.style.contain = "layout style paint";

    barrage.style.display = "flex";
    barrage.style.alignItems = "center";
    barrage.style.flex = "1 1 auto";
    barrage.style.minWidth = "0";
    barrage.style.height = "100%";
    barrage.style.boxSizing = "border-box";
    barrage.style.pointerEvents = "none";
    barrage.style.padding = rendererBox(track.description.rendererPadding);

    const content = document.createElement("span");
    content.className = "bcp-douyin-dom-content";
    content.style.display = "flex";
    content.style.alignItems = "center";
    content.style.flex = "1 1 auto";
    content.style.minWidth = "0";
    content.style.height = "100%";
    content.style.overflow = "visible";
    content.style.pointerEvents = "auto";
    const fragment = document.createDocumentFragment();
    track.content.forEach((item) => {
      const child = createRendererContent(item, 0);
      if (child) {
        fragment.appendChild(child);
      }
    });
    if (!fragment.childNodes.length) {
      content.textContent = track.description.text;
    } else {
      content.appendChild(fragment);
    }
    const firstText = track.description.firstText || {};
    applyRendererContentStyle(content, firstText);

    const button = document.createElement("button");
    button.className = "bcp-douyin-dom-action";
    button.type = "button";
    button.textContent = "+1";
    button.title = "发送相同弹幕（+1）";
    button.setAttribute("aria-label", `发送相同弹幕：${track.description.text}`);
    setRendererMetadata(button, track);
    button.style.flex = `0 0 ${DOM_ACTION_WIDTH}px`;
    button.style.width = `${DOM_ACTION_WIDTH}px`;
    button.style.maxWidth = `${DOM_ACTION_WIDTH}px`;
    button.style.boxSizing = "border-box";

    barrage.appendChild(content);
    node.append(barrage, button);
    const state = {
      node,
      barrage,
      content,
      button,
      hovered: false,
      sending: false,
      visualLeft: null,
      targetLeft: null,
      resumeOffset: 0,
      visualWidth: 0,
      visualHeight: 0,
      hoverTimer: 0,
      releaseTimer: 0
    };
    track.renderer = state;
    instance.rendererNodes.set(track.id, node);
    node.addEventListener("pointerenter", () => holdRendererTrack(track));
    node.addEventListener("pointerleave", () => scheduleRendererTrackRelease(track));
    node.addEventListener("click", (event) => event.stopPropagation());
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    button.addEventListener("click", (event) => activateRendererTrack(track, event));
    layer.appendChild(node);
    debugState.counters.rendererNodesCreated += 1;
    return state;
  }

  function syncRendererTrack(track, barrageRect, canvasRect) {
    const state = track.renderer;
    if (!state) {
      return;
    }
    const targetLeft = barrageRect.left - canvasRect.left;
    const targetTop = barrageRect.top - canvasRect.top;
    state.targetLeft = targetLeft;
    if (!Number.isFinite(state.visualLeft)) {
      state.visualLeft = targetLeft;
    } else if (!state.hovered) {
      state.visualLeft = targetLeft + numberOr(state.resumeOffset, 0);
    }
    if (!state.hovered) {
      const width = Math.max(
        DOM_ACTION_WIDTH + DOM_ACTION_GAP + DOM_ACTION_TRAILING_SPACE + 1,
        barrageRect.width
      );
      const height = Math.max(24, barrageRect.height);
      if (Math.abs(width - state.visualWidth) > 0.1) {
        state.node.style.width = `${width}px`;
        state.visualWidth = width;
      }
      if (Math.abs(height - state.visualHeight) > 0.1) {
        state.node.style.height = `${height}px`;
        state.visualHeight = height;
      }
    }
    state.node.style.transform = `translate3d(${state.visualLeft}px, ${targetTop}px, 0)`;
  }

  function updateRendererFrame(instance, canvasRect) {
    if (document.fullscreenElement === instance.canvas) {
      if (instance.rendererLayer || instance.rendererTakeover) {
        shutdownInstanceRenderer(instance, "canvas-is-fullscreen-element");
      }
      return;
    }
    if (!rendererEnabled || !instance.active || instance.rendererBlocked
        || !rendererInstanceSafe(instance)) {
      if (instance.rendererLayer || instance.rendererTakeover) {
        shutdownInstanceRenderer(instance, !rendererEnabled ? "disabled" : "unsafe-instance");
      }
      return;
    }
    if (instance.rendererPreparing > 0) {
      if (instance.rendererTakeover) {
        restoreRendererCanvas(instance, "barrage-preparing");
      }
      return;
    }
    const layer = ensureRendererLayer(instance, canvasRect);
    for (const track of instance.tracks.values()) {
      if (!track.bookedChannel) {
        continue;
      }
      const barrageRect = trackRect(track, 0, canvasRect);
      if (!barrageRect) {
        continue;
      }
      const state = track.renderer || createRendererTrack(track, layer);
      if (!state.node.isConnected) {
        throw new Error("renderer barrage detached before takeover");
      }
      syncRendererTrack(track, barrageRect, canvasRect);
    }
    if (instance.rendererNodes.size) {
      takeOverRendererCanvas(instance);
    }
  }

  function stopAnimation(instance) {
    if (instance.animationFrame) {
      cancelAnimationFrame(instance.animationFrame);
      instance.animationFrame = 0;
    }
  }

  function channelsEmpty(instance) {
    return instance.channels.every((channel) => channel.length === 0);
  }

  function removeExpiredTracks(instance, rect) {
    const expired = new Set();
    instance.channels = instance.channels.map((channel) => channel.filter((track) => {
      if (trackIsExpired(track, rect)) {
        expired.add(track.id);
        return false;
      }
      return true;
    }));
    expired.forEach((id) => {
      const track = instance.tracks.get(id);
      if (track) {
        removeRendererTrack(track);
      }
      instance.tracks.delete(id);
      if (instance.frameState) {
        instance.frameState.previousIds.delete(id);
      }
    });
  }

  function modelFrame(instance) {
    try {
      advanceModelFrame(instance);
    } catch (error) {
      instance.animationFrame = 0;
      failInstanceRenderer(instance, "animation-frame-error", error);
    }
  }

  function advanceModelFrame(instance) {
    instance.animationFrame = 0;
    if (!instance.active || !(instance.canvas instanceof HTMLCanvasElement)
        || !instance.canvas.isConnected) {
      return;
    }
    const rect = instance.canvas.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) {
      instance.animationFrame = requestAnimationFrame(() => modelFrame(instance));
      return;
    }
    ensureChannels(instance, channelInfo(instance, rect).maxCanUse);
    const now = Date.now();
    const rawDelta = instance.lastFrameAt ? now - instance.lastFrameAt : 16;
    const deltaTime = Math.max(0, Math.min(rawDelta, 300_000));
    instance.lastFrameAt = now;
    removeExpiredTracks(instance, rect);
    if (channelsEmpty(instance)) {
      updateRendererFrame(instance, rect);
      return;
    }

    const frameState = instance.frameState;
    const speeds = frameState.speeds;
    const rightPositions = frameState.rightPositions;
    const previousIds = frameState.previousIds;
    const moved = frameState.moved;
    speeds.clear();
    rightPositions.clear();
    moved.clear();
    previousIds.forEach((items) => { items.length = 0; });
    instance.channels.forEach((channel) => {
      let channelSpeed = Infinity;
      channel.forEach((track, index) => {
        const barrageId = String(track.options.id || track.id);
        const ownSpeed = trackSpeed(track, rect);
        channelSpeed = Math.min(channelSpeed, speeds.get(barrageId) || ownSpeed, ownSpeed);
        speeds.set(barrageId, channelSpeed);
        rightPositions.set(barrageId, trackRightPosition(track, rect));
        if (!previousIds.has(track.id)) {
          previousIds.set(track.id, []);
        }
        if (index > 0) {
          previousIds.get(track.id).push(
            String(channel[index - 1].options.id || channel[index - 1].id)
          );
        }
      });
    });

    instance.channels.forEach((channel, channelIndex) => {
      channel.forEach((track) => {
        if (moved.has(track.id) || !track.bookedChannel
            || track.bookedChannel.start !== channelIndex) {
          return;
        }
        moved.add(track.id);
        const barrageId = String(track.options.id || track.id);
        const predecessors = previousIds.get(track.id) || [];
        const gap = Math.max(0, numberOr(instance.config.gap, 100)) * modelDpr(instance);
        let preRightEdge = -Infinity;
        predecessors.forEach((id) => {
          preRightEdge = Math.max(preRightEdge, numberOr(rightPositions.get(id), -Infinity));
        });
        if (Number.isFinite(preRightEdge)) {
          preRightEdge += gap;
        }
        const pixels = canvasPixelSize(instance, rect);
        const dpr = modelDpr(instance);
        const speed = numberOr(speeds.get(barrageId), trackSpeed(track, rect));
        if (deltaTime > 1000) {
          track.deltaXWithoutDpr += deltaTime * speed;
          rightPositions.set(barrageId, trackRightPosition(track, rect));
          return;
        }
        const nextLeft = pixels.width - (track.deltaXWithoutDpr + deltaTime * speed) * dpr;
        if (!Number.isFinite(preRightEdge) || nextLeft >= preRightEdge) {
          track.deltaXWithoutDpr += deltaTime * speed;
        } else {
          track.deltaXWithoutDpr = (pixels.width - preRightEdge) / dpr;
        }
        rightPositions.set(barrageId, trackRightPosition(track, rect));
      });
    });
    updateRendererFrame(instance, rect);
    instance.animationFrame = requestAnimationFrame(() => modelFrame(instance));
  }

  function startAnimation(instance) {
    if (!instance.animationFrame && instance.active) {
      instance.lastFrameAt = 0;
      instance.animationFrame = requestAnimationFrame(() => modelFrame(instance));
    }
  }

  function assignPendingTracks(instance) {
    instance.pushTimer = 0;
    if (!(instance.canvas instanceof HTMLCanvasElement)) {
      return;
    }
    if (!instance.canvas.isConnected) {
      if (!instance.canvasEverConnected && instances.get(instance.id) === instance && instance.active
          && Date.now() < instance.mountGraceUntil) {
        instance.pushTimer = setTimeout(() => assignPendingTracks(instance), CANVAS_MOUNT_RETRY);
      }
      return;
    }
    instance.canvasEverConnected = true;
    const rect = instance.canvas.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) {
      instance.pushTimer = setTimeout(() => assignPendingTracks(instance), 300);
      return;
    }
    const wasEmpty = channelsEmpty(instance);
    const info = channelInfo(instance, rect);
    ensureChannels(instance, info.maxCanUse);
    instance.pending.sort((first, second) =>
      trackPriority(first, info.maxDisplay) - trackPriority(second, info.maxDisplay));
    const blockedPriorities = new Set();

    instance.pending.forEach((track) => {
      const priority = trackPriority(track, info.maxDisplay);
      if (track.bookedChannel
          || Array.from(blockedPriorities).some((blocked) => blocked > priority)) {
        return;
      }
      const needed = Math.max(1, Math.ceil(
        trackInternalHeight(track)
        / (Math.max(1, numberOr(instance.config.channelHeight, 40)) * modelDpr(instance))
      ));
      const range = realChannelRange(track, info.maxDisplay, info.maxCanUse);
      let consecutive = 0;
      for (let index = range.start; index < info.maxCanUse; index += 1) {
        const channel = instance.channels[index];
        const last = channel && channel[channel.length - 1];
        if (!last || trackRightEdgeVisible(last, rect)) {
          consecutive += 1;
        } else {
          consecutive = 0;
          if (index >= range.end) {
            break;
          }
        }
        if (consecutive >= needed) {
          const start = index - consecutive + 1;
          const end = index;
          track.bookedChannel = { start, end };
          track.startedAt = Date.now();
          for (let channelIndex = start; channelIndex <= end; channelIndex += 1) {
            instance.channels[channelIndex].push(track);
          }
          debugState.counters.barragesStarted += 1;
          debugEvent("barrage-started", {
            instanceId: instance.id,
            trackId: track.id,
            text: track.description.text,
            channel: [start, end],
            pendingDelay: track.startedAt - track.observedAt
          });
          return;
        }
      }
      blockedPriorities.add(priority);
    });

    const remaining = [];
    instance.pending.forEach((track) => {
      if (track.bookedChannel) {
        return;
      }
      if (trackNeedsReserve(track, info.maxDisplay)) {
        remaining.push(track);
      } else {
        removeRendererTrack(track);
        instance.tracks.delete(track.id);
        instance.frameState.previousIds.delete(track.id);
        debugEvent("barrage-dropped", {
          instanceId: instance.id,
          trackId: track.id,
          text: track.description.text,
          reason: "reserve-expired"
        });
      }
    });
    instance.pending = remaining;
    if (instance.active && wasEmpty && !channelsEmpty(instance)) {
      startAnimation(instance);
    }
    if (remaining.length) {
      instance.pushTimer = setTimeout(() => assignPendingTracks(instance), 300);
    }
    scheduleDebugMarker();
  }

  function prepareBarrage(instance, options, observedAt, rendererGeneration) {
    if (!instances.has(instance.id) || instances.get(instance.id) !== instance
        || instance.rendererGeneration !== rendererGeneration) {
      return;
    }
    // Never wait for remote image metadata before deciding whether Canvas can
    // be hidden. Douyin usually provides image dimensions; missing dimensions
    // use the same deterministic square fallback in both measurement and DOM.
    const description = describeBarrage(options, instance.config, null);
    const content = serializeBarrage(options);
    const interactive = plausibleText(description.text);
    if (!interactive) {
      debugState.counters.skippedBarrages += 1;
      debugEvent("barrage-skipped", {
        instanceId: instance.id,
        reason: "no-interactive-text",
        barrageId: String(options.id == null ? "" : options.id),
        imageCount: description.imageCount
      });
      return false;
    }
    const sourcePadding = boxEdges(options.padding);
    description.rendererPadding = [
      Math.max(DOM_BARRAGE_PADDING_Y, sourcePadding.top),
      Math.max(DOM_BARRAGE_PADDING_X, sourcePadding.right),
      Math.max(DOM_BARRAGE_PADDING_Y, sourcePadding.bottom),
      Math.max(DOM_BARRAGE_PADDING_X, sourcePadding.left)
    ];
    description.width += description.rendererPadding[1] + description.rendererPadding[3]
      - sourcePadding.right - sourcePadding.left;
    description.height += description.rendererPadding[0] + description.rendererPadding[2]
      - sourcePadding.top - sourcePadding.bottom;
    description.contentWidth = description.width;
    description.width += DOM_ACTION_WIDTH + DOM_ACTION_GAP + DOM_ACTION_TRAILING_SPACE;
    description.height = Math.max(24, description.height);
    const maxCount = Math.max(1, numberOr(instance.config.maxCount, 200));
    if (instance.pending.length >= maxCount) {
      debugState.counters.skippedBarrages += 1;
      debugEvent("barrage-skipped", { instanceId: instance.id, reason: "pending-limit" });
      return false;
    }
    const track = {
      id: nextTrackId,
      instance,
      options,
      description,
      content,
      own: consumeOwnMessage(description.text),
      deltaXWithoutDpr: 0,
      bookedChannel: null,
      observedAt,
      startedAt: 0
    };
    const canvasRect = instance.canvas instanceof HTMLCanvasElement
      ? instance.canvas.getBoundingClientRect()
      : null;
    if (canvasRect && canvasRect.width >= 20 && canvasRect.height >= 20) {
      const optionStart = numberOr(options.startTime, 0);
      const now = Date.now();
      const credibleStart = optionStart > now - 60_000 && optionStart < now + 5_000
        ? optionStart
        : observedAt;
      const preparationDelay = Math.max(0, Math.min(trackDuration(track), now - credibleStart));
      track.deltaXWithoutDpr = preparationDelay * trackSpeed(track, canvasRect);
    }
    nextTrackId += 1;
    instance.tracks.set(track.id, track);
    const wasEmpty = instance.pending.length === 0;
    instance.pending.push(track);
    if (wasEmpty) {
      if (instance.pushTimer) {
        clearTimeout(instance.pushTimer);
        instance.pushTimer = 0;
      }
      assignPendingTracks(instance);
    } else if (!instance.pushTimer) {
      instance.pushTimer = setTimeout(() => assignPendingTracks(instance), 300);
    }
    return true;
  }

  function queueBarrage(instance, options) {
    if (!options || typeof options !== "object") {
      return;
    }
    if (instance.rendererCleanClearObserved) {
      instance.rendererSafeSync = true;
      instance.rendererCleanClearObserved = false;
      instance.rendererBlocked = false;
      debugEvent("renderer-clean-sync", { instanceId: instance.id });
    }
    debugState.counters.barragesObserved += 1;
    const observedAt = Date.now();
    const rendererGeneration = instance.rendererGeneration;
    instance.rendererPreparing += 1;
    try {
      prepareBarrage(instance, options, observedAt, rendererGeneration);
    } catch (error) {
      if (instances.get(instance.id) === instance
          && instance.rendererGeneration === rendererGeneration) {
        failInstanceRenderer(instance, "prepare-barrage-error", error);
      }
      debugEvent("prepare-barrage-error", {
        instanceId: instance.id,
        message: String(error && error.message || error)
      }, "error");
    } finally {
      if (instances.get(instance.id) !== instance
          || instance.rendererGeneration !== rendererGeneration) {
        return;
      }
      instance.rendererPreparing = Math.max(0, instance.rendererPreparing - 1);
      if (instance.active && !channelsEmpty(instance)) {
        startAnimation(instance);
      }
    }
  }

  function clearInstance(instance, reason) {
    if (instance.pushTimer) {
      clearTimeout(instance.pushTimer);
      instance.pushTimer = 0;
    }
    shutdownInstanceRenderer(instance, reason || "instance-cleared");
    instance.rendererGeneration += 1;
    instance.rendererPreparing = 0;
    stopAnimation(instance);
    instance.pending.length = 0;
    instance.tracks.clear();
    instance.channels = [];
    instance.frameState.speeds.clear();
    instance.frameState.rightPositions.clear();
    instance.frameState.previousIds.clear();
    instance.frameState.moved.clear();
    instance.lastFrameAt = 0;
  }

  function looksLikeDanmakuConfig(config, canvas) {
    return isDanmakuCanvas(canvas)
      || (config && numberOr(config.channelHeight, 0) > 0 && numberOr(config.duration, 0) > 0);
  }

  function defaultConfigForCanvas(canvas) {
    const rect = canvas instanceof HTMLCanvasElement
      ? canvas.getBoundingClientRect()
      : { width: 0, height: 0 };
    return {
      width: Math.max(20, rect.width || 0),
      height: Math.max(20, rect.height || 0),
      devicePixelRatio: Math.max(0.25, numberOr(globalThis.devicePixelRatio, 1)),
      fontSize: 20,
      channelHeight: 40,
      duration: 15_000,
      gap: 100,
      maxCount: 200,
      maxHeightRate: 1
    };
  }

  function createTrackedInstance(id, canvas, config, recovered) {
    const previous = instances.get(id);
    if (previous) {
      clearInstance(previous, "instance-replaced");
    }
    const mergedConfig = Object.assign(defaultConfigForCanvas(canvas), config || {});
    const instance = {
      id,
      canvas,
      canvasId: canvasId(canvas),
      config: mergedConfig,
      tracks: new Map(),
      pending: [],
      channels: [],
      frameState: {
        speeds: new Map(),
        rightPositions: new Map(),
        previousIds: new Map(),
        moved: new Set()
      },
      pushTimer: 0,
      animationFrame: 0,
      lastFrameAt: 0,
      active: true,
      recovered: Boolean(recovered),
      createdAt: Date.now(),
      mountGraceUntil: Date.now() + CANVAS_MOUNT_GRACE,
      canvasEverConnected: Boolean(canvas.isConnected),
      rendererLayer: null,
      rendererNodes: new Map(),
      rendererTakeover: false,
      rendererOwnsCanvasVisibility: false,
      rendererCanvasVisibility: "",
      rendererPreparing: 0,
      rendererGeneration: 1,
      rendererSafeSync: !recovered,
      rendererSafeAfter: recovered
        ? Date.now() + Math.max(1000, numberOr(mergedConfig.duration, 15_000)) + 1000
        : Infinity,
      rendererCleanClearObserved: false,
      rendererBlocked: false
    };
    instances.set(id, instance);
    if (recovered) {
      debugState.counters.instancesRecovered += 1;
    } else {
      debugState.counters.instancesCreated += 1;
    }
    debugEvent(recovered ? "instance-recovered" : "instance-created", {
      instanceId: id,
      canvasId: instance.canvasId,
      marker: elementMarker(canvas.parentElement),
      config: instance.config
    }, recovered ? "warn" : "info");
    return instance;
  }

  function roughBarrageText(item) {
    if (!item || typeof item !== "object") {
      return "";
    }
    if (item.type === "text") {
      return normalizeText(item.text);
    }
    return (Array.isArray(item.content) ? item.content : [])
      .map(roughBarrageText)
      .join("");
  }

  let recoveryTimer = 0;

  function scheduleRecovery() {
    if (!recoveryTimer && orphanMessages.size) {
      recoveryTimer = setTimeout(recoverOrphans, 120);
    }
  }

  function rememberOrphan(id, method, params) {
    if (!id) {
      return;
    }
    let orphan = orphanMessages.get(id);
    if (!orphan) {
      orphan = {
        id,
        createdAt: Date.now(),
        config: {},
        barrages: []
      };
      orphanMessages.set(id, orphan);
    }
    if (method === "createInstance" || method === "updateConfig") {
      const config = method === "createInstance" && params.config
        ? params.config
        : params;
      if (config && typeof config === "object") {
        Object.assign(orphan.config, config);
      }
      if (method === "createInstance" && Array.isArray(params.barrages)) {
        orphan.barrages.push(...params.barrages);
      }
    } else if (method === "addBarrage" && Array.isArray(params.content)
        && plausibleText(roughBarrageText(params))) {
      orphan.barrages.push(params);
    }
    debugEvent("orphan-observed", {
      instanceId: id,
      method,
      barrageCount: orphan.barrages.length
    }, "warn");
    scheduleRecovery();
  }

  function recoverOrphans() {
    recoveryTimer = 0;
    for (const [id, orphan] of orphanMessages) {
      if (Date.now() - orphan.createdAt > 12_000) {
        orphanMessages.delete(id);
        debugEvent("orphan-expired", { instanceId: id }, "warn");
        continue;
      }
      const canvas = findUnclaimedCanvas();
      if (!(canvas instanceof HTMLCanvasElement)) {
        continue;
      }
      const instance = createTrackedInstance(id, canvas, orphan.config, true);
      orphanMessages.delete(id);
      orphan.barrages.forEach((barrage) => queueBarrage(instance, barrage));
    }
    scheduleRecovery();
  }

  function observeWorkerMessage(message) {
    if (!message || typeof message !== "object" || !message.method) {
      return;
    }
    debugState.counters.workerMessages += 1;
    const id = String(message._uniqueId == null ? "" : message._uniqueId);
    const params = message.params && typeof message.params === "object" ? message.params : {};
    if (message.method === "createInstance") {
      const offscreen = params.offscrrenCanvas || params.offscreenCanvas;
      const mappedCanvas = offscreenSources.get(offscreen);
      const canvas = mappedCanvas || findUnclaimedCanvas();
      const config = params.config && typeof params.config === "object" ? params.config : {};
      if (!(canvas instanceof HTMLCanvasElement) || !id || !looksLikeDanmakuConfig(config, canvas)) {
        rememberOrphan(id, "createInstance", params);
        return;
      }
      // Missing transfer metadata means the hook arrived after OffscreenCanvas
      // ownership changed or matched heuristically. Treat it as recovered so a
      // guessed Canvas can never be hidden before a clean sync boundary.
      const instance = createTrackedInstance(id, canvas, config, !mappedCanvas);
      orphanMessages.delete(id);
      const barrages = Array.isArray(params.barrages) ? params.barrages : [];
      barrages.forEach((barrage) => queueBarrage(instance, barrage));
      return;
    }

    const instance = instances.get(id);
    if (!instance) {
      if (message.method === "addBarrage" || message.method === "updateConfig") {
        rememberOrphan(id, message.method, params);
      }
      return;
    }
    if (message.method === "addBarrage") {
      queueBarrage(instance, params);
    } else if (message.method === "updateConfig") {
      Object.assign(instance.config, params);
      debugEvent("config-updated", { instanceId: id, config: params });
    } else if (message.method === "clear") {
      clearInstance(instance, "worker-clear");
      instance.rendererSafeSync = false;
      instance.rendererSafeAfter = Infinity;
      instance.rendererCleanClearObserved = true;
      instance.rendererBlocked = false;
      debugEvent("instance-cleared", { instanceId: id });
    } else if (message.method === "destroy") {
      clearInstance(instance, "worker-destroy");
      instances.delete(id);
      debugEvent("instance-destroyed", { instanceId: id }, "info");
    } else if (message.method === "stop" && instance.active) {
      instance.active = false;
      if (instance.pushTimer) {
        clearTimeout(instance.pushTimer);
        instance.pushTimer = 0;
      }
      stopAnimation(instance);
      shutdownInstanceRenderer(instance, "worker-stop");
      debugEvent("instance-stopped", { instanceId: id });
    } else if (message.method === "start" && !instance.active) {
      instance.active = true;
      assignPendingTracks(instance);
      if (!channelsEmpty(instance)) {
        startAnimation(instance);
      }
      debugEvent("instance-started", { instanceId: id });
    }
  }

  function patchMessageSender(prototype) {
    const original = prototype && prototype.postMessage;
    if (typeof original !== "function" || original.__danmakuEchoObserved) {
      return;
    }
    function danmakuEchoPostMessage(message) {
      try {
        observeWorkerMessage(message);
      } catch (error) {
        // Reading metadata must never interfere with Douyin's own worker call.
        debugEvent("observe-message-error", {
          method: message && message.method,
          message: String(error && error.message || error)
        }, "error");
      }
      return Reflect.apply(original, this, arguments);
    }
    danmakuEchoPostMessage.__danmakuEchoObserved = true;
    Object.defineProperty(prototype, "postMessage", {
      configurable: true,
      writable: true,
      value: danmakuEchoPostMessage
    });
    debugEvent("message-sender-patched", {
      prototype: prototype === (globalThis.Worker && globalThis.Worker.prototype)
        ? "Worker"
        : "MessagePort"
    }, "info");
  }

  function hitPayload(track, rect, canvasRect) {
    const firstText = track.description.firstText || {};
    return {
      trackId: track.id,
      instanceId: track.instance.id,
      canvasId: track.instance.canvasId,
      text: track.description.text,
      imageCount: track.description.imageCount,
      rect,
      canvasRect: {
        left: canvasRect.left,
        top: canvasRect.top,
        width: canvasRect.width,
        height: canvasRect.height
      },
      style: {
        fontSize: firstText.fontSize || 20,
        fontWeight: firstText.fontWeight || 400,
        fontFamily: firstText.fontFamily || "Arial",
        color: safePaint(firstText.color) || "#ffffff",
        strokeColor: safePaint(firstText.strokeColor) || "rgba(0, 0, 0, 0.8)",
        strokeWidth: numberOr(firstText.strokeWidth, 1)
      },
      content: track.content,
      model: {
        channel: track.bookedChannel
          ? [track.bookedChannel.start, track.bookedChannel.end]
          : null,
        observedAt: track.observedAt,
        startedAt: track.startedAt,
        recoveredInstance: Boolean(track.instance.recovered)
      }
    };
  }

  function probeAt(x, y) {
    const candidates = [];
    for (const instance of instances.values()) {
      const canvas = instance.canvas;
      if (!(canvas instanceof HTMLCanvasElement) || !canvas.isConnected) {
        continue;
      }
      const canvasRect = canvas.getBoundingClientRect();
      if (canvasRect.width < 20 || canvasRect.height < 20
          || x < canvasRect.left - 8 || x > canvasRect.right + 8
          || y < canvasRect.top - 8 || y > canvasRect.bottom + 8) {
        continue;
      }
      for (const track of instance.tracks.values()) {
        const rect = trackRect(track, 0, canvasRect);
        if (!rect) {
          continue;
        }
        const right = rect.left + rect.width;
        const bottom = rect.top + rect.height;
        const visible = right > canvasRect.left && rect.left < canvasRect.right
          && bottom > canvasRect.top && rect.top < canvasRect.bottom;
        const strict = x >= rect.left && x <= right && y >= rect.top && y <= bottom;
        if (!visible || x < rect.left - 3 || x > right + 3 || y < rect.top - 3 || y > bottom + 3) {
          continue;
        }
        const score = Math.abs(x - (rect.left + rect.width / 2))
          + Math.abs(y - (rect.top + rect.height / 2)) * 2
          + (strict ? 0 : 100);
        candidates.push({ track, rect, canvasRect, score, strict });
      }
    }
    candidates.sort((first, second) => first.score - second.score);
    const best = candidates[0] || null;
    const second = candidates[1] || null;
    const ambiguous = Boolean(best && second
      && best.strict === second.strict
      && Math.abs(second.score - best.score) < 10);
    const hit = best && !ambiguous
      ? hitPayload(best.track, best.rect, best.canvasRect)
      : null;
    debugState.counters.probes += 1;
    if (hit) {
      debugState.counters.probeHits += 1;
    } else {
      debugState.counters.probeMisses += 1;
    }
    debugState.lastProbe = {
      at: Date.now(),
      x,
      y,
      ambiguous,
      hit: hit ? {
        trackId: hit.trackId,
        text: hit.text,
        rect: hit.rect,
        model: hit.model
      } : null,
      candidates: candidates.slice(0, 5).map((candidate) => ({
        trackId: candidate.track.id,
        text: candidate.track.description.text,
        score: candidate.score,
        strict: candidate.strict,
        rect: candidate.rect,
        channel: candidate.track.bookedChannel
          ? [candidate.track.bookedChannel.start, candidate.track.bookedChannel.end]
          : null
      }))
    };
    scheduleDebugMarker();
    return hit;
  }

  function postReady(requestId) {
    window.postMessage({
      source: PAGE_SOURCE,
      type: "ready",
      requestId: requestId || 0,
      instanceCount: instances.size,
      version: DEBUG_VERSION,
      orphanCount: orphanMessages.size,
      rendererEnabled
    }, "*");
  }

  function postRendererReady(requestId) {
    window.postMessage({
      source: PAGE_SOURCE,
      type: "renderer-ready",
      requestId: Number(requestId) || 0,
      enabled: rendererEnabled,
      instanceCount: instances.size,
      takeoverCount: Array.from(instances.values())
        .filter((instance) => instance.rendererTakeover).length,
      version: DEBUG_VERSION
    }, "*");
  }

  function updateRendererSettings(data) {
    const wasEnabled = rendererEnabled;
    rendererHeartbeatAt = Date.now();
    rendererEnabled = Boolean(data.enabled);
    if (!rendererEnabled) {
      for (const instance of instances.values()) {
        shutdownInstanceRenderer(instance, "settings-disabled");
      }
    } else {
      for (const instance of instances.values()) {
        if (instance.active && !channelsEmpty(instance)) {
          startAnimation(instance);
        }
      }
    }
    if (rendererEnabled !== wasEnabled) {
      debugEvent("renderer-settings", {
        enabled: rendererEnabled,
        instanceCount: instances.size
      }, "info");
    }
    postRendererReady(data.requestId);
  }

  observeCanvasTransfers();
  patchMessageSender(globalThis.Worker && globalThis.Worker.prototype);
  patchMessageSender(globalThis.MessagePort && globalThis.MessagePort.prototype);

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.source !== CONTENT_SOURCE) {
      return;
    }
    if (event.data.type === "ping") {
      postReady(event.data.requestId);
      return;
    }
    if (event.data.type === "debug-request") {
      window.postMessage({
        source: PAGE_SOURCE,
        type: "debug-snapshot",
        requestId: Number(event.data.requestId) || 0,
        snapshot: debugSnapshot()
      }, "*");
      return;
    }
    if (event.data.type === "renderer-settings") {
      updateRendererSettings(event.data);
      return;
    }
    if (event.data.type === "own-message-intent") {
      rememberOwnMessage(event.data);
      return;
    }
    if (event.data.type === "own-message-cancel") {
      cancelOwnMessage(event.data);
      return;
    }
    if (event.data.type === "renderer-result") {
      const requestId = Number(event.data.requestId) || 0;
      const request = activationRequests.get(requestId);
      if (request && event.data.trackId != null
          && String(event.data.trackId) !== String(request.track.id)) {
        settleRendererActivation(requestId, false, "track-mismatch");
      } else {
        settleRendererActivation(requestId, event.data.ok === true,
          String(event.data.reason || "").slice(0, 120));
      }
      return;
    }
    if (event.data.type !== "probe") {
      return;
    }
    const x = Number(event.data.x);
    const y = Number(event.data.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }
    window.postMessage({
      source: PAGE_SOURCE,
      type: "probe-result",
      requestId: Number(event.data.requestId) || 0,
      hit: probeAt(x, y)
    }, "*");
  });

  setInterval(() => {
    const now = Date.now();
    if (rendererEnabled && !document.hidden
        && now - rendererHeartbeatAt > RENDERER_HEARTBEAT_TIMEOUT) {
      rendererEnabled = false;
      for (const instance of instances.values()) {
        shutdownInstanceRenderer(instance, "heartbeat-timeout");
      }
      debugEvent("renderer-heartbeat-timeout", {
        age: now - rendererHeartbeatAt
      }, "warn");
    }
    if (location.href !== rendererLocationHref) {
      const previousHref = rendererLocationHref;
      rendererLocationHref = location.href;
      debugState.href = location.href;
      const nextRouteKey = rendererRouteKey(location.href);
      if (nextRouteKey !== rendererLocationRouteKey) {
        const previousRouteKey = rendererLocationRouteKey;
        rendererLocationRouteKey = nextRouteKey;
        for (const instance of instances.values()) {
          shutdownInstanceRenderer(instance, "route-change");
          instance.rendererSafeSync = false;
          instance.rendererCleanClearObserved = false;
          instance.rendererSafeAfter = now
            + Math.max(1000, numberOr(instance.config.duration, 15_000)) + 1000;
        }
        debugEvent("renderer-route-reset", {
          previousHref,
          href: location.href,
          previousRouteKey,
          routeKey: nextRouteKey
        });
      }
    }
    for (const [id, instance] of instances) {
      if (!instance.canvas.isConnected) {
        if (!instance.canvasEverConnected && now < instance.mountGraceUntil) {
          if (instance.pending.length && !instance.pushTimer) {
            instance.pushTimer = setTimeout(
              () => assignPendingTracks(instance),
              CANVAS_MOUNT_RETRY
            );
          }
          continue;
        }
        clearInstance(instance, "canvas-detached");
        instances.delete(id);
        debugEvent("instance-detached", { instanceId: id }, "warn");
        continue;
      }
    }
    recoverOrphans();
    scheduleDebugMarker();
  }, 500);

  document.addEventListener("fullscreenchange", () => {
    for (const instance of instances.values()) {
      if (document.fullscreenElement === instance.canvas) {
        shutdownInstanceRenderer(instance, "canvas-is-fullscreen-element");
        continue;
      }
      if (!instance.rendererLayer || !(instance.canvas instanceof HTMLCanvasElement)
          || !instance.canvas.isConnected) {
        continue;
      }
      try {
        instance.rendererGeometryKey = "";
        instance.rendererBorderRadius = null;
        ensureRendererLayer(instance, instance.canvas.getBoundingClientRect());
      } catch (error) {
        failInstanceRenderer(instance, "fullscreen-relayout-error", error);
      }
    }
  });

  debugEvent("installed", {
    href: location.href,
    readyState: document.readyState,
    workerAvailable: typeof globalThis.Worker === "function",
    messagePortAvailable: typeof globalThis.MessagePort === "function"
  }, "info");
  if (!document.documentElement) {
    document.addEventListener("readystatechange", scheduleDebugMarker, { once: true });
  }
  postReady(0);
})();
