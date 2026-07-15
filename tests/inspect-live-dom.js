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
    const contentSource = readFileSync(path.join(root, "src", "content.js"), "utf8");
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
        const channel = new MessageChannel();
        const workerControls = [];
        channel.port2.addEventListener("message", (event) => workerControls.push(event.data));
        channel.port2.start();
        channel.port1.postMessage({
          method: "createInstance",
          _uniqueId: "probe-worker-instance",
          params: {
            config: {
              width: 640,
              height: 360,
              devicePixelRatio: 2,
              fontSize: 40,
              channelHeight: 48,
              duration: 15_000,
              gap: 20
            },
            offscrrenCanvas: transferResult,
            barrages: []
          }
        }, { transfer: [transferResult] });
        channel.port1.postMessage({
          method: "addBarrage",
          _uniqueId: "probe-worker-instance",
          params: {
            id: "probe-barrage",
            startTime: Date.now(),
            reserveDuration: 5_000,
            padding: [4, 4, 4, 4],
            content: [
              { type: "text", text: "一起", fontSize: 40, color: "#fff" },
              { type: "image", width: 40, height: 40 },
              { type: "text", text: "加油", fontSize: 40, color: "#fff" }
            ]
          }
        });
        await new Promise((resolve) => setTimeout(resolve, 120));

        const hitbox = document.querySelector("[data-bcp-douyin-canvas-text='一起加油']");
        let buttonVisible = false;
        let frozenTag = "";
        let hitboxRect = null;
        let hoverLatency = null;
        let frozenStartLeft = null;
        let frozenRect = null;
        let frozenBackingSize = null;
        let frozenAspectError = null;
        let frozenWithinCanvas = null;
        let resumedLeft = null;
        let inputValue = "";
        let inputFocusedAfterSend = null;
        let sentValue = "";
        let workerTrackStayedRunning = false;
        let workerStopWasNotSent = false;
        let buttonFollowError = null;
        if (hitbox) {
          const rect = hitbox.getBoundingClientRect();
          hitboxRect = [rect.left, rect.top, rect.width, rect.height];
          const hoverStartedAt = performance.now();
          hitbox.dispatchEvent(new PointerEvent("pointermove", {
            bubbles: true,
            composed: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
          }));
          for (let attempt = 0; attempt < 20 && !document.querySelector(".bcp-one-button:not([hidden])"); attempt += 1) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
          }
          await new Promise((resolve) => setTimeout(resolve, 30));
          const button = document.querySelector(".bcp-one-button");
          const frozen = document.querySelector(".bcp-one-frozen");
          const workerAnimation = hitbox.getAnimations()[0];
          workerTrackStayedRunning = Boolean(workerAnimation && workerAnimation.playState === "running");
          workerStopWasNotSent = !workerControls.some((message) => message && message.method === "stop");
          hoverLatency = button && !button.hidden ? performance.now() - hoverStartedAt : null;
          frozenStartLeft = frozen ? frozen.getBoundingClientRect().left : null;
          if (frozen instanceof HTMLCanvasElement) {
            const frozenBounds = frozen.getBoundingClientRect();
            const canvasBounds = canvas.getBoundingClientRect();
            frozenRect = [frozenBounds.left, frozenBounds.top, frozenBounds.width, frozenBounds.height];
            frozenBackingSize = [frozen.width, frozen.height];
            frozenAspectError = Math.abs(
              (frozen.width / frozen.height) / (frozenBounds.width / frozenBounds.height) - 1
            );
            frozenWithinCanvas = frozenBounds.left >= canvasBounds.left - 1
              && frozenBounds.top >= canvasBounds.top - 1
              && frozenBounds.right <= canvasBounds.right + 1
              && frozenBounds.bottom <= canvasBounds.bottom + 1;
          }
          buttonVisible = Boolean(button && !button.hidden && button.getBoundingClientRect().width > 0);
          frozenTag = frozen ? frozen.tagName : "";
          if (buttonVisible) {
            const hitboxStart = hitbox.getBoundingClientRect().left;
            const buttonStart = button.getBoundingClientRect().left;
            await new Promise((resolve) => setTimeout(resolve, 120));
            const hitboxDelta = hitbox.getBoundingClientRect().left - hitboxStart;
            const buttonDelta = button.getBoundingClientRect().left - buttonStart;
            buttonFollowError = Math.abs(hitboxDelta - buttonDelta);
          }

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
          input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              sentValue = input.value;
              input.value = "";
            }
          });
          controls.append(input, send);
          document.body.appendChild(controls);
          if (button) {
            button.click();
            await new Promise((resolve) => setTimeout(resolve, 260));
            const resuming = document.querySelector(".bcp-one-resuming");
            resumedLeft = resuming ? resuming.getBoundingClientRect().left : null;
            await new Promise((resolve) => setTimeout(resolve, 220));
          }
          inputValue = input.value;
          inputFocusedAfterSend = document.activeElement === input;
          controls.remove();
        }

        const result = {
          transferWasBlocked: transferResult === null,
          transferStayedNative: transferResult !== null,
          mainThreadCanvasMethodsUntouched:
            CanvasRenderingContext2D.prototype.fillText.name !== "bulletPlusOneCanvasText",
          hitboxText: hitbox && hitbox.dataset.bcpDouyinCanvasText,
          hitboxTrackIds: hitbox && hitbox.dataset.bcpDouyinCanvasTrackIds,
          hitboxImageCount: hitbox && hitbox.dataset.bcpDouyinCanvasImageCount,
          hitboxVelocityX: hitbox && hitbox.dataset.bcpDouyinCanvasVelocityX,
          hitboxRect,
          hoverLatency,
          frozenStartLeft,
          frozenRect,
          frozenBackingSize,
          frozenAspectError,
          frozenWithinCanvas,
          resumedLeft,
          buttonVisible,
          frozenTag,
          inputValue,
          inputFocusedAfterSend,
          sentValue,
          workerTrackStayedRunning,
          workerStopWasNotSent,
          buttonFollowError
        };
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
    const captured = Array.from(document.querySelectorAll("[data-bcp-douyin-canvas='true']"))
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
      extensionButtonCount: document.querySelectorAll(".bcp-one-button").length,
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
