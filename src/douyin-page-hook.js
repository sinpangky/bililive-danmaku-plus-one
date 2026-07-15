(function installDanmakuEchoDouyinTracker() {
  "use strict";

  if (globalThis.__bulletPlusOneDouyinCanvasHook) {
    return;
  }
  globalThis.__bulletPlusOneDouyinCanvasHook = true;

  const CONTENT_SOURCE = "danmaku-echo-douyin-content";
  const PAGE_SOURCE = "danmaku-echo-douyin-page";
  const instances = new Map();
  const offscreenSources = new WeakMap();
  const canvasIds = new WeakMap();
  let nextCanvasId = 1;
  let nextTrackId = 1;
  let measurementContext = null;

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

  function measureImageItem(item, style) {
    const fontSize = Math.max(8, numberOr(style.fontSize, 20));
    const width = Math.max(1, numberOr(item.width, numberOr(item.height, fontSize)));
    const height = Math.max(1, numberOr(item.height, fontSize));
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

  function measureContent(item, inherited) {
    if (!item || typeof item !== "object") {
      return { width: 0, height: 0, text: "", imageCount: 0, firstText: null };
    }
    const style = Object.assign({}, inherited, item);
    if (item.type === "text") {
      return measureTextItem(item, style);
    }
    if (item.type === "image") {
      return measureImageItem(item, style);
    }

    const result = { width: 0, height: 0, text: "", imageCount: 0, firstText: null };
    const content = Array.isArray(item.content) ? item.content : [];
    const childStyle = inheritableTextStyle(style);
    content.forEach((child) => {
      const childResult = measureContent(child, childStyle);
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

  function describeBarrage(options, config) {
    const result = measureContent(options, {
      fontSize: numberOr(config.fontSize, 20),
      fontWeight: 400,
      fontFamily: "Arial",
      color: "#ffffff",
      strokeColor: "rgba(0, 0, 0, 0.8)",
      strokeWidth: 1
    });
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

  function activeClock(instance, now) {
    const current = instance.active ? now : instance.pausedAt || now;
    return current - instance.pausedTotal;
  }

  function maxChannels(instance, rect) {
    const baseHeight = Math.max(20, numberOr(instance.config.height, rect.height));
    const scaleY = rect.height / baseHeight;
    const channelHeight = Math.max(8, numberOr(instance.config.channelHeight, 40) * scaleY);
    const allChannels = Math.max(1, Math.floor(rect.height / channelHeight));
    const limits = [allChannels];
    const maxHeightRate = numberOr(instance.config.maxHeightRate, 1);
    if (maxHeightRate > 0) {
      limits.push(Math.max(1, Math.floor(allChannels * maxHeightRate)));
    }
    const configured = numberOr(instance.config.maxChannelCount, 0);
    if (configured > 0) {
      limits.push(Math.max(1, Math.floor(configured)));
    }
    return Math.max(1, Math.min(...limits));
  }

  function channelRange(options, channelCount) {
    const range = options && options.channelRange;
    if (!range || numberOr(range.startIndex, -1) < 0) {
      return { start: 0, end: channelCount - 1 };
    }
    const start = Math.min(channelCount - 1, Math.max(0, Math.floor(numberOr(range.startIndex, 0))));
    const length = Math.max(1, Math.floor(numberOr(range.len, channelCount)));
    return { start, end: Math.min(channelCount - 1, start + length - 1) };
  }

  function findChannel(instance, options, needed, clock, channelCount) {
    const range = channelRange(options, channelCount);
    for (let start = range.start; start + needed - 1 <= range.end; start += 1) {
      let available = true;
      for (let channel = start; channel < start + needed; channel += 1) {
        if (numberOr(instance.channelAvailableAt[channel], 0) > clock) {
          available = false;
          break;
        }
      }
      if (available) {
        return start;
      }
    }
    return -1;
  }

  function trackRect(track, now, canvasRect) {
    const instance = track.instance;
    const baseWidth = Math.max(20, numberOr(instance.config.width, canvasRect.width));
    const baseHeight = Math.max(20, numberOr(instance.config.height, canvasRect.height));
    const scaleX = Math.max(0.25, Math.min(4, canvasRect.width / baseWidth));
    const scaleY = Math.max(0.25, Math.min(4, canvasRect.height / baseHeight));
    const width = track.description.width * scaleX;
    const height = track.description.height * scaleY;
    const elapsed = activeClock(instance, now) - track.startedAt;
    const progress = elapsed / track.duration;
    if (progress < 0 || progress > 1) {
      return null;
    }
    return {
      left: canvasRect.right - (canvasRect.width + width) * progress,
      top: canvasRect.top + track.channel * numberOr(instance.config.channelHeight, 40) * scaleY + 2 * scaleY,
      width,
      height
    };
  }

  function pruneTracks(instance, now) {
    const clock = activeClock(instance, now);
    for (const [id, track] of instance.tracks) {
      if (clock - track.startedAt > track.duration + 1000) {
        instance.tracks.delete(id);
      }
    }
  }

  function startTrack(instance, entry, now) {
    const canvas = instance.canvas;
    if (!(canvas instanceof HTMLCanvasElement) || !canvas.isConnected) {
      return false;
    }
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) {
      return false;
    }
    pruneTracks(instance, now);
    const maxCount = Math.max(1, numberOr(instance.config.maxCount, 100));
    if (instance.tracks.size >= maxCount) {
      return false;
    }
    const baseHeight = Math.max(20, numberOr(instance.config.height, rect.height));
    const scaleY = Math.max(0.25, Math.min(4, rect.height / baseHeight));
    const channelHeight = Math.max(8, numberOr(instance.config.channelHeight, 40) * scaleY);
    const channelCount = maxChannels(instance, rect);
    const needed = Math.min(channelCount, Math.max(1, Math.ceil(entry.description.height * scaleY / channelHeight)));
    const clock = activeClock(instance, now);
    const channel = findChannel(instance, entry.options, needed, clock, channelCount);
    if (channel < 0) {
      return false;
    }

    const duration = Math.max(1000, numberOr(entry.options.duration, numberOr(instance.config.duration, 15_000)));
    const baseWidth = Math.max(20, numberOr(instance.config.width, rect.width));
    const scaleX = Math.max(0.25, Math.min(4, rect.width / baseWidth));
    const width = entry.description.width * scaleX;
    const speed = (rect.width + width) / duration;
    const gap = Math.max(0, numberOr(instance.config.gap, 20) * scaleX);
    const availableAt = clock + (width + gap) / Math.max(speed, 0.001);
    for (let index = channel; index < channel + needed; index += 1) {
      instance.channelAvailableAt[index] = availableAt;
    }

    const track = {
      id: nextTrackId,
      instance,
      channel,
      duration,
      startedAt: clock,
      description: entry.description,
      content: entry.content
    };
    nextTrackId += 1;
    instance.tracks.set(track.id, track);
    return true;
  }

  function processQueue(instance) {
    instance.queueTimer = 0;
    if (!instance.active || !instance.queue.length) {
      return;
    }
    const now = performance.now();
    const wallNow = Date.now();
    const remaining = [];
    instance.queue.forEach((entry) => {
      if (entry.expiresAt > wallNow && !startTrack(instance, entry, now)) {
        remaining.push(entry);
      }
    });
    instance.queue = remaining;
    if (remaining.length) {
      instance.queueTimer = setTimeout(() => processQueue(instance), 80);
    }
  }

  function queueBarrage(instance, options) {
    if (!options || typeof options !== "object") {
      return;
    }
    const description = describeBarrage(options, instance.config);
    if (!plausibleText(description.text)) {
      return;
    }
    const reserveDuration = Math.max(800, numberOr(options.reserveDuration, 0));
    instance.queue.push({
      options,
      description,
      content: serializeBarrage(options),
      expiresAt: Math.max(Date.now(), numberOr(options.startTime, Date.now())) + reserveDuration
    });
    if (!instance.queueTimer && instance.active) {
      instance.queueTimer = setTimeout(
        () => processQueue(instance),
        description.imageCount ? 80 : 0
      );
    }
  }

  function clearInstance(instance) {
    if (instance.queueTimer) {
      clearTimeout(instance.queueTimer);
      instance.queueTimer = 0;
    }
    instance.queue.length = 0;
    instance.tracks.clear();
    instance.channelAvailableAt = [];
  }

  function looksLikeDanmakuConfig(config, canvas) {
    return isDanmakuCanvas(canvas)
      || (config && numberOr(config.channelHeight, 0) > 0 && numberOr(config.duration, 0) > 0);
  }

  function observeWorkerMessage(message) {
    if (!message || typeof message !== "object" || !message.method) {
      return;
    }
    const id = String(message._uniqueId == null ? "" : message._uniqueId);
    const params = message.params && typeof message.params === "object" ? message.params : {};
    if (message.method === "createInstance") {
      const offscreen = params.offscrrenCanvas || params.offscreenCanvas;
      const canvas = offscreenSources.get(offscreen) || findUnclaimedCanvas();
      const config = params.config && typeof params.config === "object" ? params.config : {};
      if (!(canvas instanceof HTMLCanvasElement) || !id || !looksLikeDanmakuConfig(config, canvas)) {
        return;
      }
      const previous = instances.get(id);
      if (previous) {
        clearInstance(previous);
      }
      const instance = {
        id,
        canvas,
        canvasId: canvasId(canvas),
        config: Object.assign({
          fontSize: 20,
          channelHeight: 40,
          duration: 15_000,
          gap: 20,
          maxCount: 100,
          maxHeightRate: 1
        }, config),
        tracks: new Map(),
        queue: [],
        queueTimer: 0,
        channelAvailableAt: [],
        active: true,
        pausedAt: 0,
        pausedTotal: 0
      };
      instances.set(id, instance);
      const barrages = Array.isArray(params.barrages) ? params.barrages : [];
      barrages.forEach((barrage) => queueBarrage(instance, barrage));
      return;
    }

    const instance = instances.get(id);
    if (!instance) {
      return;
    }
    if (message.method === "addBarrage") {
      queueBarrage(instance, params);
    } else if (message.method === "updateConfig") {
      Object.assign(instance.config, params);
    } else if (message.method === "clear") {
      clearInstance(instance);
    } else if (message.method === "destroy") {
      clearInstance(instance);
      instances.delete(id);
    } else if (message.method === "stop" && instance.active) {
      instance.active = false;
      instance.pausedAt = performance.now();
      if (instance.queueTimer) {
        clearTimeout(instance.queueTimer);
        instance.queueTimer = 0;
      }
    } else if (message.method === "start" && !instance.active) {
      const now = performance.now();
      instance.pausedTotal += Math.max(0, now - instance.pausedAt);
      instance.pausedAt = 0;
      instance.active = true;
      processQueue(instance);
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
      } catch (_error) {
        // Reading metadata must never interfere with Douyin's own worker call.
      }
      return Reflect.apply(original, this, arguments);
    }
    danmakuEchoPostMessage.__danmakuEchoObserved = true;
    Object.defineProperty(prototype, "postMessage", {
      configurable: true,
      writable: true,
      value: danmakuEchoPostMessage
    });
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
      content: track.content
    };
  }

  function probeAt(x, y) {
    const now = performance.now();
    let best = null;
    let bestScore = Infinity;
    for (const instance of instances.values()) {
      const canvas = instance.canvas;
      if (!(canvas instanceof HTMLCanvasElement) || !canvas.isConnected) {
        continue;
      }
      pruneTracks(instance, now);
      const canvasRect = canvas.getBoundingClientRect();
      if (canvasRect.width < 20 || canvasRect.height < 20
          || x < canvasRect.left - 8 || x > canvasRect.right + 8
          || y < canvasRect.top - 8 || y > canvasRect.bottom + 8) {
        continue;
      }
      for (const track of instance.tracks.values()) {
        const rect = trackRect(track, now, canvasRect);
        if (!rect) {
          continue;
        }
        const right = rect.left + rect.width;
        const bottom = rect.top + rect.height;
        const visible = right > canvasRect.left && rect.left < canvasRect.right
          && bottom > canvasRect.top && rect.top < canvasRect.bottom;
        if (!visible || x < rect.left - 7 || x > right + 7 || y < rect.top - 5 || y > bottom + 5) {
          continue;
        }
        const score = Math.abs(x - (rect.left + rect.width / 2))
          + Math.abs(y - (rect.top + rect.height / 2)) * 2;
        if (score < bestScore) {
          bestScore = score;
          best = hitPayload(track, rect, canvasRect);
        }
      }
    }
    return best;
  }

  function postReady(requestId) {
    window.postMessage({
      source: PAGE_SOURCE,
      type: "ready",
      requestId: requestId || 0,
      instanceCount: instances.size
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
    const now = performance.now();
    for (const [id, instance] of instances) {
      if (!instance.canvas.isConnected) {
        clearInstance(instance);
        instances.delete(id);
        continue;
      }
      pruneTracks(instance, now);
    }
  }, 500);

  postReady(0);
})();
