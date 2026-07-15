"use strict";

const { spawn } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const edgePath = process.argv[2];
const targetUrl = process.argv[3];
const profilePath = process.argv[4];
const port = Number(process.argv[5] || 9333);
const extensionPath = process.argv[6] || "";
const waitMilliseconds = Number(process.argv[7] || 15_000);
const shouldProbeDouyin = process.argv[8] === "--probe-douyin";
const hostResolverRules = process.argv[9] && process.argv[9] !== "none" ? process.argv[9] : "";
const injectPlatform = process.argv[10] || "";

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

  await send("Runtime.enable");
  await delay(waitMilliseconds);

  if (injectPlatform) {
    const root = path.resolve(__dirname, "..");
    const sharedSource = readFileSync(path.join(root, "src", "shared.js"), "utf8")
      .replace("    detectPlatform,", `    detectPlatform: () => ${JSON.stringify(injectPlatform)},`);
    const contentFile = injectPlatform === "douyin" ? "douyin-content.js" : "content.js";
    const cssFile = injectPlatform === "douyin" ? "douyin-content.css" : "content.css";
    const contentSource = readFileSync(path.join(root, "src", contentFile), "utf8");
    const cssSource = readFileSync(path.join(root, "src", cssFile), "utf8");
    await send("Page.enable");
    if (injectPlatform === "douyin") {
      const pageHookSource = readFileSync(path.join(root, "src", "douyin-page-hook.js"), "utf8");
      await send("Page.addScriptToEvaluateOnNewDocument", { source: pageHookSource });
    }
    await send("Page.navigate", { url: targetUrl });
    await delay(500);
    await send("Runtime.evaluate", {
      expression: `(() => { const style = document.createElement("style"); style.textContent = ${JSON.stringify(cssSource)}; document.documentElement.appendChild(style); })()`
    });
    await send("Runtime.evaluate", { expression: sharedSource });
    await send("Runtime.evaluate", { expression: contentSource });
    await delay(2_000);
  }

  let douyinProbe = null;
  if (shouldProbeDouyin) {
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
              fontSize: 40,
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
        channel.postMessage({
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
        });
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
      "[data-bcp-douyin-interaction-card='true'],[data-bcp-douyin-canvas='true']"
    ))
      .slice(0, 100).map(describe);
    const resources = performance.getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((url) => /\.(?:js|mjs)(?:\?|$)/i.test(url) && /(live|webcast|player|danmaku|room)/i.test(url))
      .slice(-200);
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
        ".bcp-one-button,.bcp-douyin-button"
      ).length,
      activeElement: document.activeElement ? {
        tag: document.activeElement.tagName,
        className: typeof document.activeElement.className === "string" ? document.activeElement.className : "",
        placeholder: document.activeElement.getAttribute("placeholder") || ""
      } : null,
      mainHookInstalled: Boolean(globalThis.__bulletPlusOneDouyinCanvasHook),
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
  return value;
}

inspect()
  .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
  .finally(() => {
    browser.kill();
  });
