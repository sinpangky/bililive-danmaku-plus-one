(function installDanmakuEchoDouyinTracker() {
  "use strict";

  if (globalThis.__bulletPlusOneDouyinCanvasHook) {
    return;
  }
  globalThis.__bulletPlusOneDouyinCanvasHook = true;

  const CONTENT_SOURCE = "danmaku-echo-douyin-content";
  const PAGE_SOURCE = "danmaku-echo-douyin-page";
  const DEBUG_VERSION = "douyin-tracker-v3";
  const instances = new Map();
  const offscreenSources = new WeakMap();
  const canvasIds = new WeakMap();
  const orphanMessages = new Map();
  let nextCanvasId = 1;
  let nextTrackId = 1;
  let measurementContext = null;
  let debugMarkerTimer = 0;

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
      channelCount: instance.channels ? instance.channels.length : 0
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
    expired.forEach((id) => instance.tracks.delete(id));
  }

  function modelFrame(instance) {
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
    const deltaTime = rawDelta < 1000 ? Math.max(0, rawDelta) : 16;
    instance.lastFrameAt = now;
    removeExpiredTracks(instance, rect);
    if (channelsEmpty(instance)) {
      return;
    }

    const speeds = new Map();
    const rightPositions = new Map();
    const previousIds = new Map();
    instance.channels.forEach((channel) => {
      let channelSpeed = Infinity;
      channel.forEach((track, index) => {
        const barrageId = String(track.options.id || track.id);
        const ownSpeed = trackSpeed(track, rect);
        channelSpeed = Math.min(channelSpeed, speeds.get(barrageId) || ownSpeed, ownSpeed);
        speeds.set(barrageId, channelSpeed);
        rightPositions.set(barrageId, trackRightPosition(track, rect));
        if (!previousIds.has(track.id)) {
          previousIds.set(track.id, new Set());
        }
        if (index > 0) {
          previousIds.get(track.id).add(String(channel[index - 1].options.id || channel[index - 1].id));
        }
      });
    });

    const moved = new Set();
    instance.channels.forEach((channel, channelIndex) => {
      channel.forEach((track) => {
        if (moved.has(track.id) || !track.bookedChannel
            || track.bookedChannel.start !== channelIndex) {
          return;
        }
        moved.add(track.id);
        const barrageId = String(track.options.id || track.id);
        const predecessors = Array.from(previousIds.get(track.id) || []);
        const gap = Math.max(0, numberOr(instance.config.gap, 100)) * modelDpr(instance);
        const preRightEdge = predecessors.length
          ? Math.max(...predecessors.map((id) => numberOr(rightPositions.get(id), -Infinity))) + gap
          : -Infinity;
        const pixels = canvasPixelSize(instance, rect);
        const dpr = modelDpr(instance);
        const speed = numberOr(speeds.get(barrageId), trackSpeed(track, rect));
        const nextLeft = pixels.width - (track.deltaXWithoutDpr + deltaTime * speed) * dpr;
        if (!Number.isFinite(preRightEdge) || nextLeft >= preRightEdge) {
          track.deltaXWithoutDpr += deltaTime * speed;
        } else {
          track.deltaXWithoutDpr = (pixels.width - preRightEdge) / dpr;
        }
        rightPositions.set(barrageId, trackRightPosition(track, rect));
      });
    });
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
    if (!(instance.canvas instanceof HTMLCanvasElement) || !instance.canvas.isConnected) {
      scheduleRecovery();
      return;
    }
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
        instance.tracks.delete(track.id);
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

  function collectImageSources(item, result) {
    if (!item || typeof item !== "object") {
      return;
    }
    if (item.type === "image" && typeof item.src === "string" && item.src) {
      result.add(item.src);
    }
    if (Array.isArray(item.content)) {
      item.content.forEach((child) => collectImageSources(child, result));
    }
  }

  function loadImageRatio(src) {
    return new Promise((resolve) => {
      if (typeof Image !== "function") {
        resolve(null);
        return;
      }
      const image = new Image();
      let settled = false;
      const finish = (ratio) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(Number.isFinite(ratio) && ratio > 0 ? ratio : null);
      };
      const timer = setTimeout(() => finish(null), 800);
      image.onload = () => {
        clearTimeout(timer);
        finish(image.naturalWidth / Math.max(1, image.naturalHeight));
      };
      image.onerror = () => {
        clearTimeout(timer);
        finish(null);
      };
      image.src = src;
    });
  }

  async function prepareBarrage(instance, options) {
    const sources = new Set();
    collectImageSources(options, sources);
    const imageRatios = new Map();
    await Promise.all(Array.from(sources).map(async (src) => {
      imageRatios.set(src, await loadImageRatio(src));
    }));
    if (!instances.has(instance.id) || instances.get(instance.id) !== instance) {
      return;
    }
    const description = describeBarrage(options, instance.config, imageRatios);
    if (!plausibleText(description.text)) {
      debugEvent("barrage-ignored", { instanceId: instance.id, reason: "implausible-text" });
      return;
    }
    const maxCount = Math.max(1, numberOr(instance.config.maxCount, 200));
    if (instance.pending.length >= maxCount) {
      debugEvent("barrage-ignored", { instanceId: instance.id, reason: "pending-limit" });
      return;
    }
    const track = {
      id: nextTrackId,
      instance,
      options,
      description,
      content: serializeBarrage(options),
      deltaXWithoutDpr: 0,
      bookedChannel: null,
      observedAt: Date.now(),
      startedAt: 0
    };
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
  }

  function queueBarrage(instance, options) {
    if (!options || typeof options !== "object") {
      return;
    }
    debugState.counters.barragesObserved += 1;
    prepareBarrage(instance, options).catch((error) => {
      debugEvent("prepare-barrage-error", {
        instanceId: instance.id,
        message: String(error && error.message || error)
      }, "error");
    });
  }

  function clearInstance(instance) {
    if (instance.pushTimer) {
      clearTimeout(instance.pushTimer);
      instance.pushTimer = 0;
    }
    stopAnimation(instance);
    instance.pending.length = 0;
    instance.tracks.clear();
    instance.channels = [];
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
      clearInstance(previous);
    }
    const instance = {
      id,
      canvas,
      canvasId: canvasId(canvas),
      config: Object.assign(defaultConfigForCanvas(canvas), config || {}),
      tracks: new Map(),
      pending: [],
      channels: [],
      pushTimer: 0,
      animationFrame: 0,
      lastFrameAt: 0,
      active: true,
      recovered: Boolean(recovered)
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
      const canvas = offscreenSources.get(offscreen) || findUnclaimedCanvas();
      const config = params.config && typeof params.config === "object" ? params.config : {};
      if (!(canvas instanceof HTMLCanvasElement) || !id || !looksLikeDanmakuConfig(config, canvas)) {
        rememberOrphan(id, "createInstance", params);
        return;
      }
      const instance = createTrackedInstance(id, canvas, config, false);
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
      clearInstance(instance);
      debugEvent("instance-cleared", { instanceId: id });
    } else if (message.method === "destroy") {
      clearInstance(instance);
      instances.delete(id);
      debugEvent("instance-destroyed", { instanceId: id }, "info");
    } else if (message.method === "stop" && instance.active) {
      instance.active = false;
      if (instance.pushTimer) {
        clearTimeout(instance.pushTimer);
        instance.pushTimer = 0;
      }
      stopAnimation(instance);
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
      orphanCount: orphanMessages.size
    }, "*");
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
    for (const [id, instance] of instances) {
      if (!instance.canvas.isConnected) {
        clearInstance(instance);
        instances.delete(id);
        debugEvent("instance-detached", { instanceId: id }, "warn");
        continue;
      }
    }
    recoverOrphans();
    scheduleDebugMarker();
  }, 500);

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
