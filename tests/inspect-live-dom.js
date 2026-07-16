"use strict";

const { spawn } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const edgePath = process.argv[2];
const targetUrl = process.argv[3];
const profilePath = process.argv[4];
const port = Number(process.argv[5] || 9333);
const extensionPath = process.argv[6] && process.argv[6] !== "none" ? process.argv[6] : "";
const waitMilliseconds = Number(process.argv[7] || 15_000);
const shouldProbeDouyin = process.argv[8] === "--probe-douyin";
const hostResolverRules = process.argv[9] && process.argv[9] !== "none" ? process.argv[9] : "";
const injectPlatform = process.argv[10] || "";
const lateDouyinHook = injectPlatform === "douyin-late";
const normalizedInjectPlatform = lateDouyinHook ? "douyin" : injectPlatform;

if (!edgePath || !targetUrl || !profilePath) {
  throw new Error("Usage: node inspect-live-dom.js <edge> <url> <profile> [port]");
}

const browserArguments = [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profilePath}`,
];

if (extensionPath) {
  browserArguments.push(`--disable-extensions-except=${extensionPath}`);
  browserArguments.push(`--load-extension=${extensionPath}`);
}
if (hostResolverRules) {
  browserArguments.push(`--host-resolver-rules=${hostResolverRules}`);
  browserArguments.push("--no-proxy-server");
}
browserArguments.push(targetUrl);

const browser = spawn(edgePath, browserArguments, { stdio: "ignore", windowsHide: true });

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function findPageTarget() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const target = targets.find((item) => item.type === "page" && /^https?:/i.test(item.url));
      if (target) {
        return target;
      }
    } catch (_error) {
      // Browser debugging endpoint is not ready yet.
    }
    await delay(200);
  }
  throw new Error("Could not find the live page debugging target");
}

async function inspect() {
  const target = await findPageTarget();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let nextId = 1;

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  function send(method, params = {}) {
    const id = nextId;
    nextId += 1;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }

  async function evaluateValue(expression) {
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return result.result.value;
  }

  function dispatchMouse(type, x, y, extra = {}) {
    return send("Input.dispatchMouseEvent", Object.assign({
      type,
      x: Math.round(x),
      y: Math.round(y),
      button: type === "mouseMoved" ? "none" : "left",
      buttons: type === "mousePressed" ? 1 : 0,
      clickCount: type === "mouseMoved" ? 0 : 1,
      pointerType: "mouse"
    }, extra));
  }

  await send("Runtime.enable");
  await delay(waitMilliseconds);

  if (normalizedInjectPlatform) {
    const root = path.resolve(__dirname, "..");
    const sharedSource = readFileSync(path.join(root, "src", "shared.js"), "utf8")
      .replace("    detectPlatform,", `    detectPlatform: () => ${JSON.stringify(normalizedInjectPlatform)},`);
    const isDouyinInjection = normalizedInjectPlatform === "douyin";
    const contentFile = isDouyinInjection ? "douyin-content.js" : "content.js";
    const cssFile = isDouyinInjection ? "douyin-content.css" : "content.css";
    const contentSource = readFileSync(path.join(root, "src", contentFile), "utf8");
    const cssSource = readFileSync(path.join(root, "src", cssFile), "utf8");
    await send("Page.enable");
    let pageHookSource = "";
    if (isDouyinInjection) {
      pageHookSource = readFileSync(path.join(root, "src", "douyin-page-hook.js"), "utf8");
      if (!lateDouyinHook) {
        await send("Page.addScriptToEvaluateOnNewDocument", { source: pageHookSource });
      }
    }
    await send("Page.navigate", { url: targetUrl });
    await delay(500);
    if (lateDouyinHook) {
      await send("Runtime.evaluate", { expression: pageHookSource });
    }
    await send("Runtime.evaluate", {
      expression: `(() => { const style = document.createElement("style"); style.textContent = ${JSON.stringify(cssSource)}; document.documentElement.appendChild(style); })()`
    });
    await send("Runtime.evaluate", { expression: sharedSource });
    await send("Runtime.evaluate", { expression: contentSource });
    await delay(lateDouyinHook ? 3_200 : 2_000);
  }

  const hasDouyinFixture = (shouldProbeDouyin || normalizedInjectPlatform === "douyin")
    ? await evaluateValue("Boolean(window.__douyinDomFixture)")
    : false;
  let douyinProbe = null;
  if (shouldProbeDouyin && !hasDouyinFixture && normalizedInjectPlatform !== "douyin") {
    const probeResult = await send("Runtime.evaluate", {
      expression: String.raw`(async () => {
        const host = document.createElement("div");
        host.className = "CanvasDanmakuPlugin";
        Object.assign(host.style, {
          position: "fixed",
          // Keep the synthetic barrage and its +1 button away from the viewport edge
          // so the follow assertion is not masked by the button's edge clamping.
          left: "-200px",
          top: "60px",
          width: "640px",
          height: "360px",
          zIndex: "1000",
          pointerEvents: "none"
        });
        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        canvas.style.width = "640px";
        canvas.style.height = "360px";
        document.body.appendChild(host);

        const chatMessage = document.createElement("div");
        chatMessage.className = "webcast-chatroom___item";
        const chatContent = document.createElement("span");
        chatContent.className = "message-content";
        chatContent.appendChild(document.createTextNode("一起"));
        const chatEmoji = document.createElement("img");
        chatEmoji.className = "emoji-image";
        chatEmoji.alt = "[加油]";
        chatContent.appendChild(chatEmoji);
        chatContent.appendChild(document.createTextNode("加油"));
        chatMessage.appendChild(chatContent);
        document.body.appendChild(chatMessage);

        let transferResult = "not-called";
        if (typeof canvas.transferControlToOffscreen === "function") {
          transferResult = canvas.transferControlToOffscreen();
        }
        host.appendChild(canvas);
        const workerMain = () => {
          const instances = new Map();
          const edges = (value) => {
            const list = Array.isArray(value) ? value : [value || 0];
            const top = Number(list[0]) || 0;
            const right = Number(list[1] == null ? top : list[1]) || 0;
            const bottom = Number(list[2] == null ? top : list[2]) || 0;
            const left = Number(list[3] == null ? right : list[3]) || 0;
            return { top, right, bottom, left };
          };
          const flatten = (item, inherited, result) => {
            if (!item || typeof item !== "object") return;
            const style = Object.assign({}, inherited, item);
            if (item.type === "text" || item.type === "image") {
              result.push(style);
              return;
            }
            (Array.isArray(item.content) ? item.content : []).forEach(
              (child) => flatten(child, style, result)
            );
          };
          const measure = (instance, options) => {
            const items = [];
            flatten(options, { fontSize: instance.config.fontSize || 20 }, items);
            const padding = edges(options.padding);
            let width = padding.left + padding.right;
            let height = 0;
            for (const item of items) {
              const fontSize = Number(item.fontSize) || instance.config.fontSize || 20;
              if (item.type === "text") {
                instance.context.font = (item.fontWeight || 400) + " "
                  + (fontSize * instance.dpr) + "px " + (item.fontFamily || "Arial");
                width += instance.context.measureText(item.text || "").width / instance.dpr;
                height = Math.max(height, fontSize);
              } else {
                width += Number(item.width || item.height || fontSize);
                height = Math.max(height, Number(item.height || fontSize));
              }
            }
            return { items, padding, width, height };
          };
          const draw = (instance) => {
            if (!instance.active) return;
            const context = instance.context;
            const dpr = instance.dpr;
            context.clearRect(0, 0, instance.canvas.width, instance.canvas.height);
            instance.barrages.forEach((barrage, channel) => {
              const layout = measure(instance, barrage);
              const duration = Number(barrage.duration || instance.config.duration || 15_000);
              const elapsed = Math.max(0, Date.now() - Number(barrage.startTime || Date.now()));
              const left = instance.config.width
                - elapsed * (instance.config.width + layout.width) / duration;
              let x = (left + layout.padding.left) * dpr;
              const top = (channel * instance.config.channelHeight + 2) * dpr;
              for (const item of layout.items) {
                const fontSize = Number(item.fontSize) || instance.config.fontSize || 20;
                if (item.type === "text") {
                  context.font = (item.fontWeight || 400) + " "
                    + (fontSize * dpr) + "px " + (item.fontFamily || "Arial");
                  context.textBaseline = "top";
                  context.lineWidth = 2 * dpr;
                  context.strokeStyle = item.strokeColor || "#000";
                  context.fillStyle = item.color || "#fff";
                  context.strokeText(item.text || "", x, top);
                  context.fillText(item.text || "", x, top);
                  x += context.measureText(item.text || "").width;
                } else {
                  const width = Number(item.width || item.height || fontSize) * dpr;
                  const height = Number(item.height || fontSize) * dpr;
                  context.fillStyle = "#ffd84d";
                  context.fillRect(x, top, width, height);
                  x += width;
                }
              }
            });
          };
          setInterval(() => instances.forEach(draw), 16);
          self.addEventListener("message", (event) => {
            const message = event.data || {};
            const params = message.params || {};
            self.postMessage({ observedMethod: message.method || "" });
            if (message.method === "createInstance") {
              const canvas = params.offscrrenCanvas || params.offscreenCanvas;
              const config = params.config || {};
              instances.set(message._uniqueId, {
                canvas,
                context: canvas.getContext("2d"),
                config,
                dpr: Number(config.devicePixelRatio) || 1,
                barrages: Array.isArray(params.barrages) ? params.barrages.slice() : [],
                active: true
              });
              self.postMessage({
                method: "createInstanceResult",
                isSuccess: true,
                _uniqueId: message._uniqueId
              });
              return;
            }
            const instance = instances.get(message._uniqueId);
            if (!instance) return;
            if (message.method === "addBarrage") instance.barrages.push(params);
            if (message.method === "stop") instance.active = false;
            if (message.method === "start") instance.active = true;
            if (message.method === "clear") instance.barrages = [];
            if (message.method === "destroy") instances.delete(message._uniqueId);
          });
        };
        const workerUrl = URL.createObjectURL(new Blob([
          "(" + workerMain.toString() + ")()"
        ], { type: "text/javascript" }));
        const channel = new Worker(workerUrl, { name: "probe-canvas-danmaku" });
        const workerControls = [];
        channel.addEventListener("message", (event) => workerControls.push(event.data));
        const firstBarrageStartedAt = Date.now();
        channel.postMessage({
          method: "createInstance",
          _uniqueId: "probe-worker-instance",
          params: {
            config: {
              width: 640,
              height: 360,
              devicePixelRatio: 2,
              fontSize: 20,
              channelHeight: 48,
              duration: 4_000,
              gap: 20
            },
            offscrrenCanvas: transferResult,
            barrages: []
          }
        }, { transfer: [transferResult] });
        channel.postMessage({
          method: "addBarrage",
          _uniqueId: "probe-worker-instance",
          params: {
            id: "probe-barrage",
            startTime: firstBarrageStartedAt,
            reserveDuration: 5_000,
            padding: [4, 4, 4, 4],
            content: [
              { type: "text", text: "一起", fontSize: 40, color: "#fff" },
              {
                type: "image",
                src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='20' cy='20' r='18' fill='%23ffd84d'/%3E%3C/svg%3E",
                width: 40,
                height: 40
              },
              { type: "text", text: "加油", fontSize: 40, color: "#fff" }
            ]
          }
        });
        setTimeout(() => channel.postMessage({
          method: "addBarrage",
          _uniqueId: "probe-worker-instance",
          params: {
            id: "probe-other-barrage",
            startTime: Date.now(),
            reserveDuration: 5_000,
            padding: [4, 4, 4, 4],
            content: [
              { type: "text", text: "其他弹幕继续移动", fontSize: 40, color: "#fff" }
            ]
          }
        }), 200);
        // Let both synthetic barrages enter the visible area before probing.
        await new Promise((resolve) => setTimeout(resolve, 1_400));

        const canvasRect = canvas.getBoundingClientRect();
        const elapsed = Date.now() - firstBarrageStartedAt;
        const expectedWidth = 208;
        const expectedLeft = canvasRect.right
          - (canvasRect.width + expectedWidth) * elapsed / 4_000;
        const pointerX = expectedLeft + expectedWidth / 2;
        const pointerY = canvasRect.top + 24;
        const hoverStartedAt = performance.now();
        canvas.dispatchEvent(new PointerEvent("pointermove", {
          bubbles: true,
          composed: true,
          clientX: pointerX,
          clientY: pointerY,
          pointerType: "mouse"
        }));
        for (let attempt = 0; attempt < 40 && !document.querySelector(
          "[data-bcp-douyin-interaction-card='true']:not([hidden])"
        ); attempt += 1) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        await new Promise((resolve) => setTimeout(resolve, 40));

        const card = document.querySelector(
          "[data-bcp-douyin-interaction-card='true']:not([hidden])"
        );
        const button = card && card.querySelector(".bcp-douyin-button");
        const cardRect = card && card.getBoundingClientRect();
        const hoverLatency = card ? performance.now() - hoverStartedAt : null;
        const buttonVisible = Boolean(button && button.getBoundingClientRect().width > 0);
        const previewText = card
          ? card.querySelector(".bcp-douyin-preview").textContent
          : "";
        const previewImageCount = card
          ? card.querySelectorAll(".bcp-douyin-preview img").length
          : 0;
        const cardMessage = button
          ? String(button.getAttribute("aria-label") || "").replace(/^弹幕加一：/, "")
          : "";
        await new Promise((resolve) => setTimeout(resolve, 160));
        const stableRect = card && card.getBoundingClientRect();
        const cardDrift = cardRect && stableRect
          ? Math.max(Math.abs(stableRect.left - cardRect.left), Math.abs(stableRect.top - cardRect.top))
          : null;

        const controls = document.createElement("div");
        Object.assign(controls.style, {
          position: "fixed",
          left: "20px",
          bottom: "20px",
          zIndex: "1001"
        });
        const input = document.createElement("textarea");
        input.placeholder = "说点什么";
        input.style.width = "180px";
        input.style.height = "40px";
        const send = document.createElement("button");
        send.dataset.e2e = "chat-room-send";
        send.textContent = "发送";
        let sentValue = "";
        const consumeInput = () => {
          sentValue = input.value;
          input.value = "";
        };
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") consumeInput();
        });
        send.addEventListener("click", consumeInput);
        controls.append(input, send);
        document.body.appendChild(controls);
        if (button) {
          button.click();
          await new Promise((resolve) => setTimeout(resolve, 520));
        }

        const result = {
          transferWasBlocked: transferResult === null,
          transferStayedNative: transferResult !== null,
          mainThreadCanvasMethodsUntouched:
            CanvasRenderingContext2D.prototype.fillText.name !== "bulletPlusOneCanvasText",
          cardVisible: Boolean(card),
          buttonVisible,
          hoverLatency,
          cardRect: cardRect ? [cardRect.left, cardRect.top, cardRect.width, cardRect.height] : null,
          cardDrift,
          previewText,
          previewImageCount,
          cardMessage,
          sentValue,
          inputValue: input.value,
          inputFocusedAfterSend: document.activeElement === input,
          nativeCanvasUntouched: getComputedStyle(canvas).visibility !== "hidden"
            && getComputedStyle(canvas).display !== "none",
          workerStopWasNotSent: !workerControls.some(
            (message) => message && message.observedMethod === "stop"
          ),
          trackerDomNodeCount: document.querySelectorAll(
            "[data-bcp-douyin-canvas='true'],[data-bcp-douyin-worker-overlay]"
          ).length,
          legacyFreezeNodeCount: document.querySelectorAll(
            ".bcp-one-frozen,.bcp-one-resuming"
          ).length,
          expectedNativeTravelDuringCardCheck: (canvasRect.width + expectedWidth) * 160 / 4_000,
          cardClearedAfterSend: Boolean(card && card.hidden)
        };
        controls.remove();
        channel.terminate();
        URL.revokeObjectURL(workerUrl);
        host.remove();
        chatMessage.remove();
        return result;
      })()`,
      returnByValue: true,
      awaitPromise: true
    });
    douyinProbe = probeResult.result.value;
  }

  let douyinDomRegression = null;
  let douyinRichRegression = null;
  if (normalizedInjectPlatform === "douyin" || hasDouyinFixture) {
    const readTakeoverState = () => evaluateValue(String.raw`(() => {
      const canvas = document.querySelector(".CanvasDanmakuPlugin canvas, #DanmakuLayout canvas");
      const layer = document.querySelector(".bcp-douyin-dom-layer");
      const rectValue = (element) => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        };
      };
      const nodes = Array.from(document.querySelectorAll(".bcp-douyin-dom-barrage"))
        .map((node) => {
          const track = node.closest(".bcp-douyin-dom-track");
          const action = track && track.querySelector(":scope > .bcp-douyin-dom-action");
          const content = node.querySelector(".bcp-douyin-dom-content");
          const contentStyle = content ? getComputedStyle(content) : null;
          return {
            message: node.dataset.message || (action && action.dataset.message)
              || String(node.textContent || "").replace(/\+1\s*$/, "").trim(),
            trackId: node.dataset.trackId || (action && action.dataset.trackId) || "",
            instanceId: node.dataset.instanceId || (action && action.dataset.instanceId) || "",
            own: node.dataset.own || "",
            ownFrame: Boolean(contentStyle && contentStyle.boxShadow !== "none"),
            hovered: track && track.dataset.hovered || "",
            sending: track && track.dataset.sending || "",
            trackRect: rectValue(track),
            trackPointerEvents: track ? getComputedStyle(track).pointerEvents : "missing",
            rect: rectValue(node),
            contentRect: rectValue(content),
            actionRect: rectValue(action),
            actionGap: action
              ? action.getBoundingClientRect().left - node.getBoundingClientRect().right
              : null,
            trailingHoverSpace: action && track
              ? track.getBoundingClientRect().right - action.getBoundingClientRect().right
              : null,
            actionAfterContent: Boolean(action && node.nextElementSibling === action
              && node.parentElement === action.parentElement && !node.contains(action)),
            contentInset: content ? {
              left: content.getBoundingClientRect().left - node.getBoundingClientRect().left,
              top: content.getBoundingClientRect().top - node.getBoundingClientRect().top,
              right: node.getBoundingClientRect().right - content.getBoundingClientRect().right,
              bottom: node.getBoundingClientRect().bottom - content.getBoundingClientRect().bottom
            } : null,
            actionVisibility: action ? getComputedStyle(action).visibility : "missing",
            actionPointerEvents: action ? getComputedStyle(action).pointerEvents : "missing"
          };
        });
      const canvasRect = rectValue(canvas);
      const canvasStyle = canvas ? getComputedStyle(canvas) : null;
      let pageDebug = null;
      try {
        const marker = document.getElementById("bcp-douyin-page-debug");
        pageDebug = marker ? JSON.parse(marker.textContent || "null") : null;
      } catch (_error) {
        pageDebug = null;
      }
      const fixtureState = window.__douyinDomFixture || null;
      const chatRow = document.querySelector("[data-e2e='chat-message']");
      const chatCard = document.querySelector(
        "[data-bcp-douyin-interaction-card='true']:not([hidden])"
      );
      return {
        fixture: Boolean(fixtureState),
        delayedMountMode: Boolean(fixtureState && fixtureState.delayedMountMode),
        unsupportedMode: Boolean(fixtureState && fixtureState.unsupportedMode),
        richMode: Boolean(fixtureState && fixtureState.richMode),
        rendererBlocked: Boolean(pageDebug && Array.isArray(pageDebug.instances)
          && pageDebug.instances.some((item) => item.renderer && item.renderer.blocked)),
        skippedBarrageCount: Number(pageDebug && pageDebug.counters
          && pageDebug.counters.skippedBarrages) || 0,
        viewport: {
          width: document.documentElement.clientWidth || innerWidth,
          height: document.documentElement.clientHeight || innerHeight
        },
        canvasRect,
        canvasVisibility: canvasStyle ? canvasStyle.visibility : "missing",
        canvasDisplay: canvasStyle ? canvasStyle.display : "missing",
        layerPresent: Boolean(layer),
        layerHidden: Boolean(layer && (layer.hidden || getComputedStyle(layer).display === "none")),
        chatRowRect: rectValue(chatRow),
        chatCardVisible: Boolean(chatCard),
        nodes,
        target: nodes.find((item) => item.message.includes("抖音画面弹幕")) || null,
        other: nodes.find((item) => item.message.includes("其他弹幕继续移动")) || null,
        sent: document.body.dataset.douyinSent || "",
        sentRich: document.body.dataset.douyinSentRich || "",
        ownChatRows: Array.from(document.querySelectorAll(
          "[data-bcp-douyin-own-chat='true']"
        )).map((row) => ({
          kind: row.dataset.fixtureSentKind || "",
          text: String(row.textContent || "").trim(),
          framed: Boolean(row.querySelector("[data-bcp-douyin-own-chat-content='true']"))
        })),
        workerStopWasNotSent: document.body.dataset.douyinWorkerStopWasNotSent || "",
        lateCanvasVisibleBeforeClean:
          document.body.dataset.douyinLateCanvasVisibleBeforeClean || "",
        lateLayerInactiveBeforeClean:
          document.body.dataset.douyinLateLayerInactiveBeforeClean || "",
        lateCleanBoundarySent: document.body.dataset.douyinLateCleanBoundarySent || ""
      };
    })()`);

    let initial = await readTakeoverState();
    if (initial && initial.fixture && initial.unsupportedMode) {
      // Stay beyond the real-room failure window while decorative and empty
      // official barrages continue arriving.
      await delay(20_000);
    }
    for (let attempt = 0; attempt < 100; attempt += 1) {
      initial = await readTakeoverState();
      const actionInsideCanvas = initial && initial.target && initial.target.actionRect
        && initial.target.trackRect
        && initial.canvasRect
        && initial.target.trackRect.right <= initial.canvasRect.right - 2
        && initial.target.actionRect.left >= initial.canvasRect.left + 2
        && initial.target.trackRect.right <= initial.viewport.width - 2;
      if (initial && initial.fixture && initial.canvasVisibility === "hidden"
          && !initial.layerHidden && initial.target && initial.other && actionInsideCanvas) {
        break;
      }
      await delay(50);
    }

    if (!initial || !initial.target || !initial.other) {
      douyinDomRegression = {
        ready: false,
        reason: "dom-barrages-not-ready",
        initial
      };
    } else {
      if (initial.chatRowRect) {
        await dispatchMouse(
          "mouseMoved",
          initial.chatRowRect.left + initial.chatRowRect.width / 2,
          initial.chatRowRect.top + initial.chatRowRect.height / 2
        );
        await delay(120);
      }
      const afterChatHover = await readTakeoverState();
      await dispatchMouse("mouseMoved", 1, 449);
      await dispatchMouse(
        "mouseMoved",
        initial.target.rect.left + initial.target.rect.width / 2,
        initial.target.rect.top + initial.target.rect.height / 2
      );
      await delay(80);
      const hoverStart = await readTakeoverState();
      await delay(320);
      const hoverEnd = await readTakeoverState();

      const distance = (first, second) => first && second
        ? Math.max(Math.abs(second.left - first.left), Math.abs(second.top - first.top))
        : null;
      const targetDrift = distance(hoverStart.target && hoverStart.target.rect,
        hoverEnd.target && hoverEnd.target.rect);
      const otherTravel = distance(hoverStart.other && hoverStart.other.rect,
        hoverEnd.other && hoverEnd.other.rect);
      const sizeDelta = hoverEnd.target && initial.target
        ? Math.max(
          Math.abs(hoverEnd.target.rect.width - initial.target.rect.width),
          Math.abs(hoverEnd.target.rect.height - initial.target.rect.height)
        )
        : null;

      const action = hoverEnd.target && hoverEnd.target.actionRect;
      const clickedMessage = hoverEnd.target ? hoverEnd.target.message : "";
      let gapHover = null;
      let trailingHover = null;
      if (action) {
        const barrage = hoverEnd.target.rect;
        if (barrage && action.left > barrage.right) {
          await dispatchMouse(
            "mouseMoved",
            barrage.right + (action.left - barrage.right) / 2,
            action.top + action.height / 2
          );
          await delay(280);
          gapHover = await readTakeoverState();
        }
        const trackRect = hoverEnd.target.trackRect;
        if (trackRect && trackRect.right > action.right) {
          await dispatchMouse(
            "mouseMoved",
            action.right + Math.min(6, (trackRect.right - action.right) / 2),
            action.top + action.height / 2
          );
          await delay(280);
          trailingHover = await readTakeoverState();
        }
        const visibleLeft = Math.max(0, action.left);
        const visibleRight = Math.min(hoverEnd.viewport.width - 1, action.right);
        const visibleTop = Math.max(0, action.top);
        const visibleBottom = Math.min(hoverEnd.viewport.height - 1, action.bottom);
        const clickX = visibleLeft + Math.max(1, visibleRight - visibleLeft) / 2;
        const clickY = visibleTop + Math.max(1, visibleBottom - visibleTop) / 2;
        await dispatchMouse("mouseMoved", clickX, clickY);
        await delay(60);
        await dispatchMouse("mousePressed", clickX, clickY);
        await dispatchMouse("mouseReleased", clickX, clickY);
      }
      // Poll through the success edge so an immediate one-frame spring cannot
      // hide inside a coarse post-click delay.
      let releaseStart = null;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await delay(20);
        const sample = await readTakeoverState();
        releaseStart = sample;
        if (sample.sent === clickedMessage && sample.target
            && sample.target.hovered !== "true") {
          break;
        }
      }
      const resumeSamples = [releaseStart];
      for (let sample = 0; sample < 6; sample += 1) {
        await delay(60);
        resumeSamples.push(await readTakeoverState());
      }
      const afterClick = resumeSamples[resumeSamples.length - 1];
      const ownEcho = afterClick.nodes.find((item) => item.message === clickedMessage
        && item.own === "true");

      const disableRenderer = () => evaluateValue(String.raw`(() => {
        window.dispatchEvent(new MessageEvent("message", {
          source: window,
          data: {
            source: "danmaku-echo-douyin-content",
            type: "renderer-settings",
            enabled: false,
            reason: "fixture-disable-regression"
          }
        }));
        return true;
      })()`);
      await disableRenderer();
      await delay(60);
      const afterDisable = await readTakeoverState();

      if (initial.richMode) {
        const manualButtonRect = await evaluateValue(`(() => {
          const input = document.querySelector("textarea[placeholder='说点什么']");
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
          setter.call(input, "我自己发送的侧边消息");
          input.dispatchEvent(new InputEvent("input", {
            bubbles: true,
            composed: true,
            data: "我自己发送的侧边消息",
            inputType: "insertText"
          }));
          const button = document.querySelector(".sendButton");
          Object.assign(button.style, {
            position: "fixed",
            left: "220px",
            top: "420px",
            zIndex: "10"
          });
          const rect = button.getBoundingClientRect();
          return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        })()`);
        const manualX = manualButtonRect.left + manualButtonRect.width / 2;
        const manualY = manualButtonRect.top + manualButtonRect.height / 2;
        await dispatchMouse("mouseMoved", manualX, manualY);
        await dispatchMouse("mousePressed", manualX, manualY);
        await dispatchMouse("mouseReleased", manualX, manualY);
        let manualState = null;
        for (let attempt = 0; attempt < 30; attempt += 1) {
          await delay(60);
          manualState = await readTakeoverState();
          if (manualState.ownChatRows.some((row) => row.kind === "manual" && row.framed)) {
            break;
          }
        }
        douyinRichRegression = {
          emojiIncludedInPlusOne: afterClick.sentRich === "抖音😀画面弹幕",
          emojiOwnChatFramed: afterClick.ownChatRows.some(
            (row) => row.kind === "emoji" && row.framed
          ),
          manualOwnChatFramed: Boolean(manualState && manualState.ownChatRows.some(
            (row) => row.kind === "manual" && row.framed
          )),
          sideChatPlusOneAbsent: afterClick.chatCardVisible === false,
          manualSentRich: manualState && manualState.sentRich || "",
          manualRows: manualState && manualState.ownChatRows || []
        };
        douyinRichRegression.assertionFailures = [
          "emojiIncludedInPlusOne",
          "emojiOwnChatFramed",
          "manualOwnChatFramed",
          "sideChatPlusOneAbsent"
        ].filter((key) => douyinRichRegression[key] !== true);
      }

      const targetResumePositions = resumeSamples
        .map((sample) => sample.target && sample.target.rect && sample.target.rect.left)
        .filter(Number.isFinite);
      const otherResumePositions = resumeSamples
        .map((sample) => sample.other && sample.other.rect && sample.other.rect.left)
        .filter(Number.isFinite);
      const targetResumeSteps = targetResumePositions.slice(1)
        .map((left, index) => targetResumePositions[index] - left);
      const otherResumeSteps = otherResumePositions.slice(1)
        .map((left, index) => otherResumePositions[index] - left);
      const targetResumeTravel = targetResumePositions.length > 1
        ? targetResumePositions[0] - targetResumePositions[targetResumePositions.length - 1]
        : null;
      const otherResumeTravel = otherResumePositions.length > 1
        ? otherResumePositions[0] - otherResumePositions[otherResumePositions.length - 1]
        : null;
      const resumeSpeedRatio = targetResumeTravel > 0 && otherResumeTravel > 0
        ? targetResumeTravel / otherResumeTravel
        : null;
      const resumeMaxStep = targetResumeSteps.length ? Math.max(...targetResumeSteps) : null;
      const otherResumeMaxStep = otherResumeSteps.length ? Math.max(...otherResumeSteps) : null;
      const releaseTargetTravel = hoverEnd.target && releaseStart && releaseStart.target
        ? hoverEnd.target.rect.left - releaseStart.target.rect.left
        : null;
      const releaseOtherTravel = hoverEnd.other && releaseStart && releaseStart.other
        ? hoverEnd.other.rect.left - releaseStart.other.rect.left
        : null;
      const noReleaseSpring = releaseTargetTravel != null && releaseOtherTravel != null
        && releaseTargetTravel >= -0.5
        && releaseTargetTravel <= Math.max(3, releaseOtherTravel * 1.35 + 3);
      douyinDomRegression = {
        ready: initial.canvasVisibility === "hidden" && !initial.layerHidden,
        layerPresent: initial.layerPresent,
        rightChatPlusOneAbsent: !afterChatHover.chatCardVisible,
        barrageCount: initial.nodes.length,
        canvasHiddenAfterReady: initial.canvasVisibility === "hidden",
        canvasDisplayPreserved: initial.canvasDisplay !== "none",
        hoveredMessage: hoverEnd.target ? hoverEnd.target.message : "",
        hoveredOnlyTarget: Boolean(
          hoverEnd.target && hoverEnd.target.hovered === "true"
            && hoverEnd.other && hoverEnd.other.hovered !== "true"
        ),
        targetDrift,
        targetPaused: targetDrift != null && targetDrift <= 1.5,
        otherTravel,
        otherContinued: otherTravel != null && otherTravel >= 2,
        sizeDelta,
        sizeStable: sizeDelta != null && sizeDelta <= 0.5,
        actionVisible: Boolean(
          hoverEnd.target && hoverEnd.target.actionVisibility !== "hidden"
            && hoverEnd.target.actionPointerEvents !== "none"
        ),
        actionBehindMessage: Boolean(
          hoverEnd.target && hoverEnd.target.contentRect && hoverEnd.target.actionRect
            && hoverEnd.target.actionAfterContent
            && hoverEnd.target.actionRect.left >= hoverEnd.target.contentRect.right - 1
        ),
        trackOwnsHover: Boolean(
          hoverEnd.target && hoverEnd.target.trackPointerEvents !== "none"
        ),
        actionGapReserved: Boolean(
          hoverEnd.target && hoverEnd.target.actionGap >= 7.5
        ),
        trailingHoverReserved: Boolean(
          hoverEnd.target && hoverEnd.target.trailingHoverSpace >= 11.5
        ),
        gapHoverKeptPaused: Boolean(
          gapHover && gapHover.target && gapHover.target.hovered === "true"
            && distance(hoverEnd.target.rect, gapHover.target.rect) <= 1.5
        ),
        trailingHoverKeptPaused: Boolean(
          trailingHover && trailingHover.target && trailingHover.target.hovered === "true"
            && distance(
              (gapHover && gapHover.target || hoverEnd.target).rect,
              trailingHover.target.rect
            ) <= 1.5
        ),
        messagePaddingExpanded: Boolean(
          hoverEnd.target && hoverEnd.target.contentInset
            && hoverEnd.target.contentInset.left >= 7.5
            && hoverEnd.target.contentInset.right >= 7.5
            && hoverEnd.target.contentInset.top >= 3.5
            && hoverEnd.target.contentInset.bottom >= 3.5
        ),
        clickedMessage,
        sentMessage: afterClick.sent,
        clickSentMatchingMessage: Boolean(clickedMessage && afterClick.sent === clickedMessage),
        ownMessageFramed: Boolean(ownEcho && ownEcho.ownFrame),
        targetResumeTravel,
        otherResumeTravel,
        resumeSpeedRatio,
        resumeMaxStep,
        otherResumeMaxStep,
        releaseTargetTravel,
        releaseOtherTravel,
        noReleaseSpring,
        resumedFromHeldPositionAtNormalSpeed: Boolean(
          noReleaseSpring && targetResumeTravel != null && targetResumeTravel >= 8
            && targetResumeSteps.every((step) => step >= -0.5)
            && resumeMaxStep != null && otherResumeMaxStep != null
            && resumeMaxStep <= otherResumeMaxStep * 1.35 + 3
            && resumeSpeedRatio != null && resumeSpeedRatio >= 0.75 && resumeSpeedRatio <= 1.25
        ),
        workerStopWasNotSent: afterClick.workerStopWasNotSent === "true",
        canvasRestoredAfterDisable: afterDisable.canvasVisibility !== "hidden"
          && afterDisable.canvasDisplay !== "none",
        layerInactiveAfterDisable: !afterDisable.layerPresent || afterDisable.layerHidden,
        unsupportedStayedActive: !initial.unsupportedMode || Boolean(
          !initial.rendererBlocked && initial.canvasVisibility === "hidden"
            && initial.skippedBarrageCount >= 2
        ),
        lateCanvasVisibleBeforeClean: initial.lateCanvasVisibleBeforeClean,
        lateLayerInactiveBeforeClean: initial.lateLayerInactiveBeforeClean,
        lateCleanBoundarySent: initial.lateCleanBoundarySent,
        beforeHover: initial,
        afterChatHover,
        hoverStart,
        hoverEnd,
        gapHover,
        trailingHover,
        resumeSamples,
        afterClick,
        afterDisable
      };

      await evaluateValue(`(() => {
        const result = ${JSON.stringify(douyinDomRegression)};
        document.body.dataset.douyinHoveredMessage = result.hoveredMessage || "";
        document.body.dataset.douyinSingleHoverPaused = String(result.targetPaused);
        document.body.dataset.douyinOtherBarrageContinued = String(result.otherContinued);
        document.body.dataset.douyinHoverSizeStable = String(result.sizeStable);
        document.body.dataset.douyinClickedMessage = result.clickedMessage || "";
        document.body.dataset.douyinClickSentMatchingMessage = String(result.clickSentMatchingMessage);
        document.body.dataset.douyinCanvasRestoredAfterDisable = String(
          result.canvasRestoredAfterDisable
        );
        return true;
      })()`);
    }
  }

  let sideChatRegression = null;
  if (normalizedInjectPlatform === "huya" || normalizedInjectPlatform === "bilibili") {
    sideChatRegression = await evaluateValue(`(async () => {
      const platform = ${JSON.stringify(normalizedInjectPlatform)};
      const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
      const nextPaint = () => new Promise((resolve) => requestAnimationFrame(resolve));
      const root = document.createElement("section");
      root.className = platform === "bilibili" ? "chat-history-list" : "room-chat-messages";
      Object.assign(root.style, {
        position: "fixed",
        left: "20px",
        top: "220px",
        width: "300px",
        height: "120px",
        overflowY: "auto",
        background: "#18181c",
        zIndex: "1000"
      });
      let targetRow = null;
      let targetContent = null;
      let targetUser = null;
      for (let index = 0; index < 24; index += 1) {
        const row = document.createElement("div");
        row.className = platform === "bilibili" ? "danmaku-item" : "J_msg";
        row.style.height = "28px";
        const user = document.createElement("span");
        user.className = platform === "bilibili" ? "user-name" : "name";
        user.textContent = "测试用户" + index + "：";
        const content = document.createElement("span");
        content.className = platform === "bilibili" ? "danmaku-content" : "msg";
        content.textContent = index === 6 ? "侧边聊天暂停测试" : "填充聊天消息" + index;
        row.append(user, content);
        root.appendChild(row);
        if (index === 6) {
          targetRow = row;
          targetContent = content;
          targetUser = user;
        }
      }
      const outside = document.createElement("div");
      outside.style.position = "fixed";
      outside.style.left = "360px";
      outside.style.top = "220px";
      outside.style.width = "20px";
      outside.style.height = "20px";
      document.body.append(root, outside);
      root.scrollTop = 120;
      let panel = null;
      let report = null;
      if (platform === "bilibili") {
        targetUser.addEventListener("click", () => {
          panel = document.createElement("div");
          panel.className = "user-card-popover";
          panel.setAttribute("role", "dialog");
          report = document.createElement("button");
          report.textContent = "@用户并举报";
          panel.appendChild(report);
          document.body.appendChild(panel);
        }, { once: true });
      }
      const autoScroll = setInterval(() => {
        root.scrollTop = Math.min(root.scrollTop + 5, root.scrollHeight - root.clientHeight);
      }, 16);
      await delay(70);
      targetContent.dispatchEvent(new PointerEvent("pointerover", {
        bubbles: true,
        composed: true,
        pointerType: "mouse"
      }));
      await delay(70);
      await nextPaint();
      const button = document.querySelector(".bcp-one-button");
      const messagePlusOneAvailable = Boolean(button && !button.hidden
        && String(button.getAttribute("aria-label") || "").includes("侧边聊天暂停测试"));
      const pauseMarkerApplied = root.dataset.bcpOneScrollPaused === "true";
      const pausedStart = root.scrollTop;
      await delay(220);
      await nextPaint();
      const pausedEnd = root.scrollTop;
      const scrollPaused = Math.abs(pausedEnd - pausedStart) <= 1;

      let usernameActionRejected = true;
      let userPanelRejected = true;
      if (platform === "bilibili") {
        targetUser.dispatchEvent(new PointerEvent("pointerover", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          relatedTarget: targetContent
        }));
        await delay(40);
        usernameActionRejected = Boolean(button && button.hidden);
        targetUser.click();
        report.dispatchEvent(new PointerEvent("pointerover", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          relatedTarget: targetUser
        }));
        await delay(40);
        userPanelRejected = Boolean(button && button.hidden);
        targetContent.dispatchEvent(new PointerEvent("pointerover", {
          bubbles: true,
          composed: true,
          pointerType: "mouse",
          relatedTarget: report
        }));
        await delay(40);
      }

      const beforeRelease = root.scrollTop;
      targetContent.dispatchEvent(new PointerEvent("pointerout", {
        bubbles: true,
        composed: true,
        pointerType: "mouse",
        relatedTarget: outside
      }));
      await delay(180);
      const afterRelease = root.scrollTop;
      const scrollResumed = afterRelease - beforeRelease >= 10;
      const pauseMarkerReleased = root.dataset.bcpOneScrollPaused !== "true";
      clearInterval(autoScroll);
      if (panel) panel.remove();
      root.remove();
      outside.remove();
      return {
        platform,
        messagePlusOneAvailable,
        pauseMarkerApplied,
        pausedStart,
        pausedEnd,
        scrollPaused,
        usernameActionRejected,
        userPanelRejected,
        beforeRelease,
        afterRelease,
        scrollResumed,
        pauseMarkerReleased
      };
    })()`);
    sideChatRegression.assertionFailures = [
      "messagePlusOneAvailable",
      "pauseMarkerApplied",
      "scrollPaused",
      "usernameActionRejected",
      "userPanelRejected",
      "scrollResumed",
      "pauseMarkerReleased"
    ].filter((key) => sideChatRegression[key] !== true);
  }

  let bilibiliRichRegression = null;
  if (normalizedInjectPlatform === "bilibili"
      && new URL(targetUrl).searchParams.get("rich") === "1") {
    bilibiliRichRegression = await evaluateValue(`(async () => {
      const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
      const image = document.querySelector(".fixture-video-emote");
      image.dispatchEvent(new PointerEvent("pointerover", {
        bubbles: true,
        composed: true,
        pointerType: "mouse"
      }));
      await delay(80);
      const plusOne = document.querySelector(".bcp-one-button:not([hidden])");
      const selectedImageMessage = Boolean(plusOne
        && String(plusOne.getAttribute("aria-label") || "").includes("主播挥手"));
      if (plusOne) plusOne.click();
      for (let attempt = 0; attempt < 30
          && !document.body.dataset.bilibiliEmojiSent; attempt += 1) {
        await delay(60);
      }
      const sentAsImage = document.body.dataset.bilibiliEmojiSent === "anchor-wave";
      const echoImage = document.querySelector(".fixture-rich-echo img[data-emoticon='anchor-wave']");
      return {
        videoImageSelected: Boolean(image && image.closest(".bilibili-live-player-video-danmaku")),
        selectedImageMessage,
        sentAsImage,
        echoImageRendered: Boolean(echoImage),
        sentInputText: document.querySelector(".chat-input").value
      };
    })()`);
    bilibiliRichRegression.assertionFailures = [
      "videoImageSelected",
      "selectedImageMessage",
      "sentAsImage",
      "echoImageRendered"
    ].filter((key) => bilibiliRichRegression[key] !== true);
  }

  const expression = String.raw`(() => {
    const all = Array.from(document.querySelectorAll("*"));
    const describe = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id || "",
        className: typeof element.className === "string" ? element.className : "",
        text: String(element.innerText || element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160),
        dataE2e: element.getAttribute("data-e2e") || "",
        dataTestid: element.getAttribute("data-testid") || "",
        role: element.getAttribute("role") || "",
        ariaLabel: element.getAttribute("aria-label") || "",
        placeholder: element.getAttribute("placeholder") || element.getAttribute("data-placeholder") || "",
        contenteditable: element.getAttribute("contenteditable") || "",
        childCount: element.childElementCount,
        rect: [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)],
        style: [style.position, style.pointerEvents, style.animationName, style.transform].join(" | "),
        parentClass: element.parentElement && typeof element.parentElement.className === "string"
          ? element.parentElement.className
          : ""
      };
    };
    const semantic = all.filter((element) => {
      const marker = [element.id, element.className, element.getAttribute("data-e2e"), element.getAttribute("data-testid"), element.getAttribute("aria-label")].join(" ");
      return /(danmaku|danmu|bullet|barrage|chat|comment|message|弹幕|聊天)/i.test(marker);
    }).slice(0, 300).map(describe);
    const inputs = all.filter((element) => element.matches("textarea, input, button, [contenteditable='true'], [role='textbox']"))
      .slice(0, 200).map(describe);
    const movingText = all.filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const text = String(element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
      return text.length > 0 && text.length <= 100
        && rect.width >= 4 && rect.width <= 900 && rect.height >= 8 && rect.height <= 120
        && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth
        && (style.position === "absolute" || style.position === "fixed" || style.transform !== "none" || style.animationName !== "none");
    }).slice(0, 400).map(describe);
    const canvasLike = all.filter((element) => {
      const marker = [element.tagName, element.id, element.className].join(" ");
      return element.tagName === "CANVAS" || /(canvas|danmaku)/i.test(marker);
    }).slice(0, 100).map((element) => {
      const item = describe(element);
      const before = getComputedStyle(element, "::before");
      const after = getComputedStyle(element, "::after");
      item.shadowRoot = Boolean(element.shadowRoot);
      item.backgroundImage = getComputedStyle(element).backgroundImage.slice(0, 200);
      item.pseudo = [before.content, before.backgroundImage, after.content, after.backgroundImage]
        .join(" | ").slice(0, 400);
      return item;
    });
    const captured = Array.from(document.querySelectorAll(
      ".bcp-douyin-dom-layer,.bcp-douyin-dom-track,.bcp-douyin-dom-barrage,.bcp-douyin-dom-action"
    ))
      .slice(0, 100).map(describe);
    const resources = performance.getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((url) => /\.(?:js|mjs)(?:\?|$)/i.test(url) && /(live|webcast|player|danmaku|room)/i.test(url))
      .slice(-200);
    const readDebugMarker = (id) => {
      const marker = document.getElementById(id);
      if (!marker) return null;
      try {
        const parsed = JSON.parse(marker.textContent || "{}");
        return {
          version: parsed.version || marker.dataset.version || "",
          pageReady: parsed.pageReady,
          pageVersion: parsed.pageVersion,
          instanceCount: parsed.instanceCount,
          orphanCount: parsed.orphanCount,
          counters: parsed.counters || null,
          lastProbe: parsed.lastProbe || null,
          lastCard: parsed.lastCard || null,
          lastError: parsed.lastError || "",
          instances: Array.isArray(parsed.instances) ? parsed.instances.slice(0, 5) : [],
          attempts: Array.isArray(parsed.attempts) ? parsed.attempts.slice(-5) : [],
          events: Array.isArray(parsed.events) ? parsed.events.slice(-12) : []
        };
      } catch (error) {
        return { parseError: String(error) };
      }
    };
    return {
      url: location.href,
      title: document.title,
      bodyText: String(document.body && document.body.innerText || "").replace(/\s+/g, " ").slice(0, 1000),
      viewport: [innerWidth, innerHeight],
      bodyDataset: Object.assign({}, document.body && document.body.dataset),
      liveLinks: Array.from(document.querySelectorAll("a[href*='live.douyin.com/']"))
        .map((anchor) => anchor.href)
        .filter((href, index, values) => values.indexOf(href) === index)
        .slice(0, 50),
      semantic,
      inputs,
      movingText,
      canvasLike,
      captured,
      extensionButtonCount: document.querySelectorAll(
        ".bcp-one-button,.bcp-douyin-button,.bcp-douyin-dom-action"
      ).length,
      activeElement: document.activeElement ? {
        tag: document.activeElement.tagName,
        className: typeof document.activeElement.className === "string" ? document.activeElement.className : "",
        placeholder: document.activeElement.getAttribute("placeholder") || ""
      } : null,
      mainHookInstalled: Boolean(globalThis.__bulletPlusOneDouyinCanvasHook),
      debug: {
        bootstrap: readDebugMarker("bcp-douyin-bootstrap-debug"),
        page: readDebugMarker("bcp-douyin-page-debug"),
        content: readDebugMarker("bcp-douyin-content-debug")
      },
      resources
    };
  })()`;

  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  socket.close();
  const value = result.result.value;
  value.douyinProbe = douyinProbe;
  value.douyinDomRegression = douyinDomRegression;
  value.douyinRichRegression = douyinRichRegression;
  value.sideChatRegression = sideChatRegression;
  value.bilibiliRichRegression = bilibiliRichRegression;
  if (hasDouyinFixture && douyinDomRegression) {
    const failures = [];
    [
      "ready",
      "targetPaused",
      "otherContinued",
      "sizeStable",
      "actionVisible",
      "actionBehindMessage",
      "trackOwnsHover",
      "actionGapReserved",
      "trailingHoverReserved",
      "gapHoverKeptPaused",
      "trailingHoverKeptPaused",
      "messagePaddingExpanded",
      "clickSentMatchingMessage",
      "ownMessageFramed",
      "noReleaseSpring",
      "resumedFromHeldPositionAtNormalSpeed",
      "workerStopWasNotSent",
      "canvasRestoredAfterDisable",
      "layerInactiveAfterDisable",
      "rightChatPlusOneAbsent"
    ].forEach((key) => {
      if (douyinDomRegression[key] !== true) failures.push(key);
    });
    if (lateDouyinHook) {
      [
        "lateCanvasVisibleBeforeClean",
        "lateLayerInactiveBeforeClean",
        "lateCleanBoundarySent"
      ].forEach((key) => {
        if (douyinDomRegression[key] !== "true") failures.push(key);
      });
    }
    if (douyinDomRegression.beforeHover && douyinDomRegression.beforeHover.unsupportedMode
        && douyinDomRegression.unsupportedStayedActive !== true) {
      failures.push("unsupported-stayed-active");
    }
    douyinDomRegression.assertionFailures = failures;
  }
  return value;
}

inspect()
  .then((result) => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.douyinDomRegression
        && result.douyinDomRegression.assertionFailures
        && result.douyinDomRegression.assertionFailures.length) {
      process.exitCode = 1;
    }
    if (result.sideChatRegression
        && result.sideChatRegression.assertionFailures
        && result.sideChatRegression.assertionFailures.length) {
      process.exitCode = 1;
    }
    if (result.bilibiliRichRegression
        && result.bilibiliRichRegression.assertionFailures
        && result.bilibiliRichRegression.assertionFailures.length) {
      process.exitCode = 1;
    }
    if (result.douyinRichRegression
        && result.douyinRichRegression.assertionFailures
        && result.douyinRichRegression.assertionFailures.length) {
      process.exitCode = 1;
    }
  })
  .finally(() => {
    browser.kill();
  });
