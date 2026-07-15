(function installDouyinCanvasDanmakuHook() {
  "use strict";

  if (globalThis.__bulletPlusOneDouyinCanvasHook) {
    return;
  }
  globalThis.__bulletPlusOneDouyinCanvasHook = true;

  const contextPrototype = globalThis.CanvasRenderingContext2D
    && globalThis.CanvasRenderingContext2D.prototype;

  const tracks = new Map();
  const groups = new Map();
  const frozenTracks = new Map();
  const imageSourceIds = new WeakMap();
  const offscreenCanvasSources = new WeakMap();
  const workerInstances = new Map();
  const workerTracks = new Map();
  let nextTrackId = 1;
  let nextCanvasId = 1;
  let nextImageSourceId = 1;
  let groupFrame = 0;
  let measurementContext = null;

  function normalizeText(value) {
    return String(value == null ? "" : value)
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isPlausibleDanmakuText(text) {
    const length = Array.from(text).length;
    return length >= 1
      && length <= 1000
      && !/^(高清|超清|蓝光|原画|自动|流畅|发送|设置|退出全屏|直播已结束)$/.test(text);
  }

  function elementMarker(element) {
    if (!(element instanceof Element)) {
      return "";
    }
    const className = typeof element.className === "string" ? element.className : "";
    return [element.id, className, element.getAttribute("data-e2e")]
      .filter(Boolean)
      .join(" ");
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

  function ensureCanvasId(canvas) {
    if (!canvas.dataset.bcpDouyinCanvasSourceId) {
      canvas.dataset.bcpDouyinCanvasSourceId = String(nextCanvasId);
      nextCanvasId += 1;
    }
    return canvas.dataset.bcpDouyinCanvasSourceId;
  }

  function observeCanvasTransfers() {
    const canvasPrototype = globalThis.HTMLCanvasElement
      && globalThis.HTMLCanvasElement.prototype;
    const original = canvasPrototype && canvasPrototype.transferControlToOffscreen;
    if (typeof original !== "function") {
      return;
    }

    Object.defineProperty(canvasPrototype, "transferControlToOffscreen", {
      configurable: true,
      writable: true,
      value: function bulletPlusOneTransferControlToOffscreen() {
        const offscreenCanvas = Reflect.apply(original, this, arguments);
        if (offscreenCanvas && typeof offscreenCanvas === "object") {
          offscreenCanvasSources.set(offscreenCanvas, this);
          if (isDanmakuCanvas(this)) {
            ensureCanvasId(this);
          }
        }
        return offscreenCanvas;
      }
    });
  }

  function numberOr(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
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

  function collectBarrageContent(item, inherited, result) {
    if (!item || typeof item !== "object") {
      return;
    }
    const style = Object.assign({}, inherited, item);
    if (item.type === "text") {
      const text = normalizeText(item.text);
      if (!text) {
        return;
      }
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
          // Fall back to the character-based estimate.
        }
      }
      const margin = boxEdges(style.margin);
      result.text += text;
      result.width += width + margin.left + margin.right;
      result.height = Math.max(result.height, fontSize + margin.top + margin.bottom);
      if (!result.firstText) {
        result.firstText = {
          fontSize,
          fontWeight,
          fontFamily,
          color: style.color,
          strokeColor: style.strokeColor
        };
      }
      return;
    }
    if (item.type === "image") {
      const fontSize = Math.max(8, numberOr(style.fontSize, 20));
      const width = Math.max(8, numberOr(style.width, numberOr(style.height, fontSize)));
      const height = Math.max(8, numberOr(style.height, fontSize));
      const margin = boxEdges(style.margin);
      result.imageCount += 1;
      result.width += width + margin.left + margin.right;
      result.height = Math.max(result.height, height + margin.top + margin.bottom);
      return;
    }
    const content = Array.isArray(item.content) ? item.content : [];
    content.forEach((child) => collectBarrageContent(child, style, result));
  }

  function describeWorkerBarrage(options, config) {
    const result = { text: "", width: 0, height: 0, imageCount: 0, firstText: null };
    collectBarrageContent(options, {
      fontSize: numberOr(config.fontSize, 20),
      fontWeight: 400,
      fontFamily: "Arial",
      color: "#ffffff",
      strokeColor: "rgba(0, 0, 0, 0.8)"
    }, result);
    const padding = boxEdges(options.padding);
    const margin = boxEdges(options.margin);
    const border = Math.max(0, numberOr(options.borderWidth, 0));
    result.width += padding.left + padding.right + margin.left + margin.right + border * 2;
    result.height += padding.top + padding.bottom + margin.top + margin.bottom + border * 2;
    result.width = Math.max(4, result.width);
    result.height = Math.max(8, result.height || numberOr(config.fontSize, 20));
    result.text = normalizeText(result.text);
    return result;
  }

  function cleanupWorkerTrack(track) {
    if (!track || track.removed) {
      return;
    }
    track.removed = true;
    workerTracks.delete(track.id);
    if (track.instance && track.instance.tracks) {
      track.instance.tracks.delete(track.id);
    }
    if (track.hitbox) {
      track.hitbox.remove();
    }
  }

  function clearWorkerInstance(instance) {
    if (!instance) {
      return;
    }
    if (instance.queueTimer) {
      clearTimeout(instance.queueTimer);
      instance.queueTimer = 0;
    }
    instance.queue.length = 0;
    instance.channelAvailableAt = [];
    for (const track of Array.from(instance.tracks.values())) {
      if (track.animation) {
        try {
          track.animation.cancel();
        } catch (_error) {
          // The animation may already have completed.
        }
      }
      cleanupWorkerTrack(track);
    }
  }

  function findUnclaimedDanmakuCanvas() {
    const claimed = new Set(Array.from(workerInstances.values()).map((instance) => instance.canvas));
    return Array.from(document.querySelectorAll("canvas"))
      .reverse()
      .find((canvas) => isDanmakuCanvas(canvas) && !claimed.has(canvas)) || null;
  }

  function maxWorkerChannels(instance, rect) {
    const channelHeight = Math.max(8, numberOr(instance.config.channelHeight, 40));
    const allChannels = Math.max(1, Math.floor(rect.height / channelHeight));
    const limits = [allChannels];
    const maxHeightRate = numberOr(instance.config.maxHeightRate, 1);
    if (maxHeightRate > 0) {
      limits.push(Math.max(1, Math.floor(allChannels * maxHeightRate)));
    }
    const maxChannelCount = numberOr(instance.config.maxChannelCount, 0);
    if (maxChannelCount > 0) {
      limits.push(Math.max(1, Math.floor(maxChannelCount)));
    }
    return Math.max(1, Math.min(...limits));
  }

  function allowedChannelRange(options, maxChannels) {
    const range = options && options.channelRange;
    if (!range || numberOr(range.startIndex, -1) < 0) {
      return { start: 0, end: maxChannels - 1 };
    }
    const start = Math.min(maxChannels - 1, Math.max(0, Math.floor(numberOr(range.startIndex, 0))));
    const length = Math.max(1, Math.floor(numberOr(range.len, maxChannels)));
    return { start, end: Math.min(maxChannels - 1, start + length - 1) };
  }

  function findAvailableChannels(instance, options, needed, now, maxChannels) {
    const range = allowedChannelRange(options, maxChannels);
    for (let start = range.start; start + needed - 1 <= range.end; start += 1) {
      let available = true;
      for (let channel = start; channel < start + needed; channel += 1) {
        if (numberOr(instance.channelAvailableAt[channel], 0) > now) {
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

  function startWorkerTrack(instance, entry, now) {
    const canvas = instance.canvas;
    if (!(canvas instanceof HTMLCanvasElement) || !canvas.isConnected || !isDanmakuCanvas(canvas)) {
      return false;
    }
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) {
      return false;
    }
    const description = entry.description;
    const maxChannels = maxWorkerChannels(instance, rect);
    const channelHeight = Math.max(8, numberOr(instance.config.channelHeight, 40));
    const needed = Math.min(maxChannels, Math.max(1, Math.ceil(description.height / channelHeight)));
    const channel = findAvailableChannels(instance, entry.options, needed, now, maxChannels);
    if (channel < 0) {
      return false;
    }

    const duration = Math.max(1000, numberOr(entry.options.duration, numberOr(instance.config.duration, 15_000)));
    const gap = Math.max(0, numberOr(instance.config.gap, 20));
    const distance = rect.width + description.width;
    const speed = distance / duration;
    const availableAt = now + (description.width + gap) / Math.max(speed, 0.001);
    for (let index = channel; index < channel + needed; index += 1) {
      instance.channelAvailableAt[index] = availableAt;
    }

    const firstText = description.firstText || {};
    const hitbox = document.createElement("span");
    const trackId = nextTrackId;
    nextTrackId += 1;
    hitbox.dataset.bcpDouyinCanvas = "true";
    hitbox.dataset.bcpDouyinWorker = "true";
    hitbox.dataset.bcpDouyinCanvasId = String(trackId);
    hitbox.dataset.bcpDouyinCanvasTrackIds = String(trackId);
    hitbox.dataset.bcpDouyinCanvasInstanceId = instance.id;
    hitbox.dataset.bcpDouyinCanvasSourceId = ensureCanvasId(canvas);
    hitbox.dataset.bcpDouyinCanvasText = description.text;
    hitbox.dataset.bcpDouyinCanvasImageCount = String(description.imageCount);
    hitbox.dataset.bcpDouyinCanvasVelocityX = String(-speed);
    hitbox.dataset.bcpDouyinCanvasFont = `${firstText.fontWeight || 400} ${firstText.fontSize || 20}px ${firstText.fontFamily || "Arial"}`;
    hitbox.dataset.bcpDouyinCanvasColor = paintToCss(firstText.color, "#ffffff");
    hitbox.dataset.bcpDouyinCanvasStroke = paintToCss(firstText.strokeColor, "rgba(0, 0, 0, 0.8)");
    hitbox.style.setProperty("position", "fixed", "important");
    hitbox.style.setProperty("display", "block", "important");
    hitbox.style.setProperty("left", `${rect.right}px`, "important");
    hitbox.style.setProperty("top", `${rect.top + channel * channelHeight + 2}px`, "important");
    hitbox.style.setProperty("width", `${description.width}px`, "important");
    hitbox.style.setProperty("height", `${description.height}px`, "important");
    hitbox.style.setProperty("pointer-events", "none", "important");
    hitbox.style.setProperty("color", "transparent", "important");
    hitbox.style.setProperty("background", "transparent", "important");
    hitbox.style.setProperty("border", "0", "important");
    hitbox.style.setProperty("z-index", "-2147483647", "important");
    hitbox.setAttribute("aria-hidden", "true");
    document.documentElement.appendChild(hitbox);

    const track = { id: trackId, instance, hitbox, animation: null, removed: false };
    instance.tracks.set(trackId, track);
    workerTracks.set(trackId, track);
    try {
      track.animation = hitbox.animate([
        { transform: "translateX(0)" },
        { transform: `translateX(-${distance}px)` }
      ], {
        duration,
        easing: "linear",
        fill: "forwards"
      });
      track.animation.finished.then(
        () => cleanupWorkerTrack(track),
        () => cleanupWorkerTrack(track)
      );
    } catch (_error) {
      setTimeout(() => cleanupWorkerTrack(track), duration);
    }
    if (!instance.active || instance.pluginPaused) {
      try {
        track.animation && track.animation.pause();
      } catch (_error) {
        // Ignore an animation that completed during setup.
      }
    }
    return true;
  }

  function processWorkerQueue(instance) {
    instance.queueTimer = 0;
    if (!instance.active || instance.pluginPaused || !instance.queue.length) {
      return;
    }
    const now = performance.now();
    const wallNow = Date.now();
    const remaining = [];
    for (const entry of instance.queue) {
      if (entry.expiresAt > wallNow && !startWorkerTrack(instance, entry, now)) {
        remaining.push(entry);
      }
    }
    instance.queue = remaining;
    if (remaining.length) {
      instance.queueTimer = setTimeout(() => processWorkerQueue(instance), 100);
    }
  }

  function queueWorkerBarrage(instance, options) {
    if (!options || typeof options !== "object") {
      return;
    }
    const description = describeWorkerBarrage(options, instance.config);
    if (!isPlausibleDanmakuText(description.text)) {
      return;
    }
    const reserveDuration = Math.max(800, numberOr(options.reserveDuration, 0));
    instance.queue.push({
      options,
      description,
      expiresAt: Math.max(Date.now(), numberOr(options.startTime, Date.now())) + reserveDuration
    });
    if (!instance.queueTimer) {
      instance.queueTimer = setTimeout(
        () => processWorkerQueue(instance),
        description.imageCount ? 80 : 0
      );
    }
  }

  function setWorkerAnimationsPaused(instance, paused) {
    for (const track of instance.tracks.values()) {
      if (!track.animation) {
        continue;
      }
      try {
        if (paused) {
          track.animation.pause();
        } else {
          track.animation.play();
        }
      } catch (_error) {
        // Ignore tracks that completed as the state changed.
      }
    }
  }

  function sendWorkerControl(instance, method) {
    if (!instance || typeof instance.originalPostMessage !== "function") {
      return;
    }
    try {
      Reflect.apply(instance.originalPostMessage, instance.sender, [{
        method,
        params: {},
        _uniqueId: instance.id
      }]);
    } catch (_error) {
      // The site's worker may already have been destroyed.
    }
  }

  function pauseWorkerInstance(instance) {
    if (!instance || instance.pluginPaused) {
      return;
    }
    instance.pluginPaused = true;
    instance.resumeAfterPluginPause = instance.active;
    setWorkerAnimationsPaused(instance, true);
    if (instance.resumeAfterPluginPause) {
      sendWorkerControl(instance, "stop");
    }
  }

  function resumeWorkerInstance(instance) {
    if (!instance || !instance.pluginPaused) {
      return;
    }
    instance.pluginPaused = false;
    if (instance.resumeAfterPluginPause) {
      sendWorkerControl(instance, "start");
      setWorkerAnimationsPaused(instance, false);
      processWorkerQueue(instance);
    }
    instance.resumeAfterPluginPause = false;
  }

  function observeWorkerMessage(sender, message, originalPostMessage) {
    if (!message || typeof message !== "object" || !message.method) {
      return;
    }
    const id = String(message._uniqueId == null ? "" : message._uniqueId);
    const params = message.params && typeof message.params === "object" ? message.params : {};
    if (message.method === "createInstance") {
      const offscreenCanvas = params.offscrrenCanvas || params.offscreenCanvas;
      const canvas = offscreenCanvasSources.get(offscreenCanvas) || findUnclaimedDanmakuCanvas();
      if (!(canvas instanceof HTMLCanvasElement) || !isDanmakuCanvas(canvas) || !id) {
        return;
      }
      const previous = workerInstances.get(id);
      if (previous) {
        clearWorkerInstance(previous);
      }
      const instance = {
        id,
        sender,
        originalPostMessage,
        canvas,
        config: Object.assign({
          fontSize: 20,
          channelHeight: 40,
          duration: 15_000,
          gap: 20,
          maxCount: 100,
          maxHeightRate: 1
        }, params.config || {}),
        tracks: new Map(),
        queue: [],
        queueTimer: 0,
        channelAvailableAt: [],
        active: true,
        pluginPaused: false,
        resumeAfterPluginPause: false
      };
      workerInstances.set(id, instance);
      const barrages = Array.isArray(params.barrages) ? params.barrages : [];
      barrages.forEach((barrage) => queueWorkerBarrage(instance, barrage));
      return;
    }

    const instance = workerInstances.get(id);
    if (!instance) {
      return;
    }
    if (message.method === "addBarrage") {
      queueWorkerBarrage(instance, params);
    } else if (message.method === "updateConfig") {
      Object.assign(instance.config, params);
    } else if (message.method === "clear") {
      clearWorkerInstance(instance);
    } else if (message.method === "destroy") {
      clearWorkerInstance(instance);
      workerInstances.delete(id);
    } else if (message.method === "stop") {
      instance.active = false;
      setWorkerAnimationsPaused(instance, true);
    } else if (message.method === "start") {
      instance.active = true;
      if (!instance.pluginPaused) {
        setWorkerAnimationsPaused(instance, false);
        processWorkerQueue(instance);
      }
    }
  }

  function patchMessageSender(prototype) {
    const original = prototype && prototype.postMessage;
    if (typeof original !== "function" || original.__bcpDouyinObserved) {
      return;
    }
    function bulletPlusOneWorkerPostMessage(message) {
      try {
        observeWorkerMessage(this, message, original);
      } catch (_error) {
        // Never interfere with the site's worker messages.
      }
      return Reflect.apply(original, this, arguments);
    }
    bulletPlusOneWorkerPostMessage.__bcpDouyinObserved = true;
    Object.defineProperty(prototype, "postMessage", {
      configurable: true,
      writable: true,
      value: bulletPlusOneWorkerPostMessage
    });
  }

  function observeWorkerDanmaku() {
    patchMessageSender(globalThis.Worker && globalThis.Worker.prototype);
    patchMessageSender(globalThis.MessagePort && globalThis.MessagePort.prototype);
  }

  function paintToCss(value, fallback) {
    return typeof value === "string" && value ? value : fallback;
  }

  function scaleCanvasFont(font, scale) {
    const factor = Number.isFinite(scale) && scale > 0 ? scale : 1;
    return String(font || "20px sans-serif").replace(
      /(\d+(?:\.\d+)?)px/,
      (_match, size) => `${Math.max(1, Number(size) * factor)}px`
    );
  }

  function currentTransform(context) {
    try {
      return context.getTransform();
    } catch (_error) {
      return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    }
  }

  function transformedPoint(matrix, x, y) {
    return {
      x: matrix.a * x + matrix.c * y + matrix.e,
      y: matrix.b * x + matrix.d * y + matrix.f
    };
  }

  function findTrack(canvas, key, left, top, now) {
    let best = null;
    let bestDistance = Infinity;

    for (const track of tracks.values()) {
      if (track.canvas !== canvas || track.key !== key || now - track.lastSeenAt > 450) {
        continue;
      }
      const verticalDistance = Math.abs(track.top - top);
      const horizontalDistance = Math.abs(track.left - left);
      if (verticalDistance <= 32 && horizontalDistance < bestDistance) {
        best = track;
        bestDistance = horizontalDistance;
      }
    }
    return best;
  }

  function scheduleGroupUpdate() {
    if (groupFrame) {
      return;
    }
    groupFrame = requestAnimationFrame(() => {
      groupFrame = 0;
      rebuildGroups();
    });
  }

  function upsertTrack(data) {
    const now = performance.now();
    let track = findTrack(data.canvas, data.key, data.left, data.top, now);
    if (!track) {
      track = {
        id: nextTrackId,
        canvas: data.canvas,
        key: data.key,
        motionLeft: data.left,
        motionSeenAt: now,
        velocityX: 0
      };
      nextTrackId += 1;
      tracks.set(track.id, track);
    } else {
      const elapsed = now - track.motionSeenAt;
      if (elapsed >= 8) {
        const velocityX = (data.left - track.motionLeft) / elapsed;
        if (Number.isFinite(velocityX) && Math.abs(velocityX) <= 2) {
          track.velocityX = track.velocityX
            ? track.velocityX * 0.65 + velocityX * 0.35
            : velocityX;
        }
        track.motionLeft = data.left;
        track.motionSeenAt = now;
      }
    }
    Object.assign(track, data, { lastSeenAt: now });
    ensureCanvasId(data.canvas);
    scheduleGroupUpdate();
    return track;
  }

  function captureTextDraw(context, rawText, x, y, maxWidth) {
    const canvas = context.canvas;
    if (!isDanmakuCanvas(canvas)) {
      return null;
    }
    const text = normalizeText(rawText);
    if (!isPlausibleDanmakuText(text)) {
      return null;
    }

    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width < 20 || canvasRect.height < 20 || canvas.width < 1 || canvas.height < 1) {
      return null;
    }

    const matrix = currentTransform(context);
    const point = transformedPoint(matrix, Number(x) || 0, Number(y) || 0);
    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;
    const matrixScaleX = Math.hypot(matrix.a, matrix.b) || 1;
    const matrixScaleY = Math.hypot(matrix.c, matrix.d) || matrixScaleX;
    let metrics;
    try {
      metrics = context.measureText(text);
    } catch (_error) {
      return null;
    }

    const fallbackFontSize = Number.parseFloat(context.font) || 20;
    const ascent = metrics.actualBoundingBoxAscent || fallbackFontSize * 0.82;
    const descent = metrics.actualBoundingBoxDescent || fallbackFontSize * 0.18;
    let width = metrics.width * matrixScaleX * scaleX;
    if (Number.isFinite(maxWidth)) {
      width = Math.min(width, Number(maxWidth) * matrixScaleX * scaleX);
    }
    const scaledAscent = ascent * matrixScaleY * scaleY;
    const scaledDescent = descent * matrixScaleY * scaleY;
    const height = scaledAscent + scaledDescent;
    let left = canvasRect.left + point.x * scaleX;
    if (context.textAlign === "center") {
      left -= width / 2;
    } else if (context.textAlign === "right" || context.textAlign === "end") {
      left -= width;
    }

    let top = canvasRect.top + point.y * scaleY - scaledAscent;
    if (context.textBaseline === "top" || context.textBaseline === "hanging") {
      top = canvasRect.top + point.y * scaleY;
    } else if (context.textBaseline === "middle") {
      top = canvasRect.top + point.y * scaleY - height / 2;
    } else if (context.textBaseline === "bottom" || context.textBaseline === "ideographic") {
      top = canvasRect.top + point.y * scaleY - height;
    }
    if (!Number.isFinite(left) || !Number.isFinite(top) || width < 2 || height < 4) {
      return null;
    }

    return upsertTrack({
      canvas,
      key: `text:${text}`,
      type: "text",
      text,
      left,
      top,
      width,
      height,
      font: scaleCanvasFont(context.font, matrixScaleY * scaleY),
      color: paintToCss(context.fillStyle, "#ffffff"),
      stroke: paintToCss(context.strokeStyle, "transparent"),
      shadow: `${context.shadowOffsetX || 0}px ${context.shadowOffsetY || 0}px ${context.shadowBlur || 0}px ${paintToCss(context.shadowColor, "transparent")}`
    });
  }

  function imageSourceKey(source) {
    if ((typeof source === "object" && source) || typeof source === "function") {
      if (!imageSourceIds.has(source)) {
        imageSourceIds.set(source, nextImageSourceId);
        nextImageSourceId += 1;
      }
      return imageSourceIds.get(source);
    }
    return String(source);
  }

  function sourceDimension(source, dimension) {
    const candidates = dimension === "width"
      ? [source && source.naturalWidth, source && source.videoWidth, source && source.width]
      : [source && source.naturalHeight, source && source.videoHeight, source && source.height];
    return candidates.find((value) => Number.isFinite(value) && value > 0) || 0;
  }

  function captureImageDraw(context, args) {
    const canvas = context.canvas;
    if (!isDanmakuCanvas(canvas) || args.length < 3) {
      return null;
    }

    const source = args[0];
    let dx;
    let dy;
    let width;
    let height;
    if (args.length >= 9) {
      dx = Number(args[5]);
      dy = Number(args[6]);
      width = Number(args[7]);
      height = Number(args[8]);
    } else if (args.length >= 5) {
      dx = Number(args[1]);
      dy = Number(args[2]);
      width = Number(args[3]);
      height = Number(args[4]);
    } else {
      dx = Number(args[1]);
      dy = Number(args[2]);
      width = sourceDimension(source, "width");
      height = sourceDimension(source, "height");
    }
    if (![dx, dy, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
      return null;
    }

    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width < 20 || canvasRect.height < 20 || canvas.width < 1 || canvas.height < 1) {
      return null;
    }
    const matrix = currentTransform(context);
    const point = transformedPoint(matrix, dx, dy);
    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;
    const matrixScaleX = Math.hypot(matrix.a, matrix.b) || 1;
    const matrixScaleY = Math.hypot(matrix.c, matrix.d) || matrixScaleX;
    const cssWidth = Math.abs(width * matrixScaleX * scaleX);
    const cssHeight = Math.abs(height * matrixScaleY * scaleY);
    const left = canvasRect.left + point.x * scaleX;
    const top = canvasRect.top + point.y * scaleY;
    if (!Number.isFinite(left) || !Number.isFinite(top) || cssWidth < 2 || cssHeight < 2) {
      return null;
    }

    return upsertTrack({
      canvas,
      key: `image:${imageSourceKey(source)}`,
      type: "image",
      text: "",
      left,
      top,
      width: cssWidth,
      height: cssHeight,
      font: "",
      color: "",
      stroke: "",
      shadow: ""
    });
  }

  function verticalPeers(first, second) {
    const firstBottom = first.top + first.height;
    const secondBottom = second.top + second.height;
    const overlap = Math.min(firstBottom, secondBottom) - Math.max(first.top, second.top);
    const centerDistance = Math.abs(
      first.top + first.height / 2 - (second.top + second.height / 2)
    );
    return overlap >= Math.min(first.height, second.height) * 0.25 || centerDistance <= 24;
  }

  function createGroupHitbox(group) {
    if (!document.documentElement) {
      return null;
    }
    const hitbox = document.createElement("span");
    hitbox.dataset.bcpDouyinCanvas = "true";
    hitbox.setAttribute("aria-hidden", "true");
    hitbox.style.setProperty("position", "fixed", "important");
    hitbox.style.setProperty("display", "block", "important");
    hitbox.style.setProperty("box-sizing", "border-box", "important");
    hitbox.style.setProperty("pointer-events", "none", "important");
    hitbox.style.setProperty("user-select", "none", "important");
    hitbox.style.setProperty("overflow", "hidden", "important");
    hitbox.style.setProperty("color", "transparent", "important");
    hitbox.style.setProperty("background", "transparent", "important");
    hitbox.style.setProperty("border", "0", "important");
    hitbox.style.setProperty("z-index", "-2147483647", "important");
    document.documentElement.appendChild(hitbox);
    group.hitbox = hitbox;
    return hitbox;
  }

  function updateGroupHitbox(group) {
    const hitbox = group.hitbox && group.hitbox.isConnected
      ? group.hitbox
      : createGroupHitbox(group);
    if (!hitbox) {
      return;
    }
    const firstText = group.items.find((track) => track.type === "text");
    hitbox.dataset.bcpDouyinCanvasId = String(firstText.id);
    hitbox.dataset.bcpDouyinCanvasTrackIds = group.items.map((track) => track.id).join(",");
    hitbox.dataset.bcpDouyinCanvasSourceId = ensureCanvasId(group.canvas);
    hitbox.dataset.bcpDouyinCanvasText = group.text;
    hitbox.dataset.bcpDouyinCanvasImageCount = String(
      group.items.filter((track) => track.type === "image").length
    );
    const velocities = group.items
      .map((track) => track.velocityX)
      .filter((value) => Number.isFinite(value) && value < -0.005);
    hitbox.dataset.bcpDouyinCanvasVelocityX = String(
      velocities.length
        ? velocities.reduce((sum, value) => sum + value, 0) / velocities.length
        : 0
    );
    hitbox.dataset.bcpDouyinCanvasFont = firstText.font;
    hitbox.dataset.bcpDouyinCanvasColor = firstText.color;
    hitbox.dataset.bcpDouyinCanvasStroke = firstText.stroke;
    hitbox.dataset.bcpDouyinCanvasShadow = firstText.shadow;
    hitbox.style.setProperty("left", `${group.left}px`, "important");
    hitbox.style.setProperty("top", `${group.top}px`, "important");
    hitbox.style.setProperty("width", `${Math.max(4, group.width)}px`, "important");
    hitbox.style.setProperty("height", `${Math.max(8, group.height)}px`, "important");
    hitbox.style.setProperty("font", firstText.font, "important");
  }

  function rebuildGroups() {
    const now = performance.now();
    const active = Array.from(tracks.values())
      .filter((track) => now - track.lastSeenAt <= 160)
      .sort((first, second) => {
        const canvasDifference = Number(ensureCanvasId(first.canvas)) - Number(ensureCanvasId(second.canvas));
        return canvasDifference || first.top - second.top || first.left - second.left;
      });
    const assembled = [];

    for (const track of active) {
      let target = null;
      for (let index = assembled.length - 1; index >= 0; index -= 1) {
        const candidate = assembled[index];
        if (candidate.canvas !== track.canvas) {
          continue;
        }
        const gap = track.left - candidate.right;
        if (verticalPeers(candidate, track) && gap >= -12 && gap <= 64) {
          target = candidate;
          break;
        }
      }
      if (!target) {
        target = {
          canvas: track.canvas,
          items: [],
          left: track.left,
          top: track.top,
          right: track.left + track.width,
          bottom: track.top + track.height,
          width: track.width,
          height: track.height
        };
        assembled.push(target);
      }
      target.items.push(track);
      target.left = Math.min(target.left, track.left);
      target.top = Math.min(target.top, track.top);
      target.right = Math.max(target.right, track.left + track.width);
      target.bottom = Math.max(target.bottom, track.top + track.height);
      target.width = target.right - target.left;
      target.height = target.bottom - target.top;
    }

    const activeKeys = new Set();
    for (const assembledGroup of assembled) {
      assembledGroup.items.sort((first, second) => first.left - second.left || first.id - second.id);
      const text = normalizeText(
        assembledGroup.items
          .filter((track) => track.type === "text")
          .map((track) => track.text)
          .join("")
      );
      if (!isPlausibleDanmakuText(text)) {
        continue;
      }
      const key = assembledGroup.items.map((track) => track.id).sort((a, b) => a - b).join(":");
      activeKeys.add(key);
      let group = groups.get(key);
      if (!group) {
        group = { key, hitbox: null };
        groups.set(key, group);
      }
      Object.assign(group, assembledGroup, {
        text,
        left: assembledGroup.left - 4,
        top: assembledGroup.top - 4,
        width: assembledGroup.width + 8,
        height: assembledGroup.height + 8,
        lastSeenAt: now
      });
      updateGroupHitbox(group);
    }

    for (const [key, group] of groups) {
      if (!activeKeys.has(key)) {
        if (group.hitbox) {
          group.hitbox.remove();
        }
        groups.delete(key);
      }
    }
  }

  function isFrozen(trackId) {
    const expiresAt = frozenTracks.get(trackId);
    if (!expiresAt) {
      return false;
    }
    if (expiresAt <= performance.now()) {
      frozenTracks.delete(trackId);
      return false;
    }
    return true;
  }

  function patchTextMethod(methodName) {
    const original = contextPrototype[methodName];
    if (typeof original !== "function") {
      return;
    }
    Object.defineProperty(contextPrototype, methodName, {
      configurable: true,
      writable: true,
      value: function bulletPlusOneCanvasText(rawText, x, y, maxWidth) {
        const track = captureTextDraw(this, rawText, x, y, maxWidth);
        if (track && isFrozen(track.id)) {
          return undefined;
        }
        return Reflect.apply(original, this, arguments);
      }
    });
  }

  function patchImageMethod() {
    const original = contextPrototype.drawImage;
    if (typeof original !== "function") {
      return;
    }
    Object.defineProperty(contextPrototype, "drawImage", {
      configurable: true,
      writable: true,
      value: function bulletPlusOneCanvasImage() {
        const track = captureImageDraw(this, arguments);
        if (track && isFrozen(track.id)) {
          return undefined;
        }
        return Reflect.apply(original, this, arguments);
      }
    });
  }

  const supportsWorkerCanvas = Boolean(
    globalThis.HTMLCanvasElement
      && typeof globalThis.HTMLCanvasElement.prototype.transferControlToOffscreen === "function"
      && globalThis.Worker
  );
  observeCanvasTransfers();
  observeWorkerDanmaku();
  if (!supportsWorkerCanvas && contextPrototype) {
    patchTextMethod("fillText");
    patchTextMethod("strokeText");
    patchImageMethod();
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.source !== "bullet-plus-one-content") {
      return;
    }
    const trackIds = String(event.data.trackIds || event.data.trackId || "")
      .split(",")
      .map((value) => Number(value))
      .filter(Number.isFinite);
    const instanceId = String(event.data.instanceId || "");
    const workerInstance = instanceId ? workerInstances.get(instanceId) : null;
    if (!trackIds.length && !workerInstance) {
      return;
    }
    if (event.data.type === "freeze-douyin-canvas") {
      const expiresAt = performance.now() + 15_000;
      trackIds.forEach((trackId) => frozenTracks.set(trackId, expiresAt));
      if (workerInstance) {
        pauseWorkerInstance(workerInstance);
      }
    } else if (event.data.type === "unfreeze-douyin-canvas") {
      trackIds.forEach((trackId) => frozenTracks.delete(trackId));
      if (workerInstance) {
        resumeWorkerInstance(workerInstance);
      }
    }
  });

  setInterval(() => {
    const now = performance.now();
    for (const [id, track] of tracks) {
      if (now - track.lastSeenAt > 500) {
        tracks.delete(id);
        frozenTracks.delete(id);
      }
    }
    scheduleGroupUpdate();
  }, 250);
})();
