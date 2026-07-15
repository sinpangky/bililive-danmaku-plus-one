"use strict";

const http = require("node:http");

const port = Number(process.env.BCP_FIXTURE_PORT || 18888);
const html = String.raw`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8"><title>弹幕 +1 浏览器测试夹具</title>
    <style>
      @keyframes fixture-danmaku-scroll { from { transform: translateX(0); } to { transform: translateX(-180px); } }
      .danmu-item { animation: fixture-danmaku-scroll 20s linear infinite; }
    </style>
  </head>
  <body>
    <section id="player-wrap" style="position:relative;width:800px;height:450px;background:#111">
      <div class="quality-option" style="position:absolute;left:20px;top:20px;color:white">高清</div>
      <div class="danmu-item" style="position:absolute;left:220px;top:120px;color:white">全屏弹幕也能复读</div>
      <div class="danmu-item second-danmu" style="position:absolute;left:280px;top:120px;color:white">后一个弹幕不能抢占</div>
    </section>
    <section id="chat-room__list">
      <div class="J_msg">
        <span class="name">测试用户：</span>
        <span class="msg">这波操作漂亮</span>
      </div>
    </section>
    <textarea id="pub_msg_input" aria-label="弹幕输入框"></textarea>
    <button id="msg_send_bt" type="button">发送</button>
    <script>
      const message = document.querySelector(".msg");
      const overlayMessage = document.querySelector(".danmu-item");
      const secondOverlayMessage = document.querySelector(".second-danmu");
      const qualityOption = document.querySelector(".quality-option");
      const player = document.querySelector("#player-wrap");
      const input = document.querySelector("#pub_msg_input");
      const send = document.querySelector("#msg_send_bt");
      send.addEventListener("click", () => {
        if (input.value === "这波操作漂亮") {
          document.body.dataset.chatSent = input.value;
          document.body.dataset.chatSentAt = String(Date.now());
          input.value = "";
        }
        if (input.value === "全屏弹幕也能复读") {
          document.body.dataset.overlaySent = input.value;
          input.value = "";
          clearInterval(timer);
        }
      });

      const timer = setInterval(() => {
        if (!document.querySelector(".bcp-one-button")) {
          return;
        }

        if (!document.body.dataset.qualityCheckStartedAt) {
          const rect = qualityOption.getBoundingClientRect();
          qualityOption.dispatchEvent(new PointerEvent("pointermove", {
            bubbles: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
          }));
          document.body.dataset.qualityCheckStartedAt = String(Date.now());
          return;
        }

        if (!document.body.dataset.qualityRejected) {
          if (Date.now() - Number(document.body.dataset.qualityCheckStartedAt) < 200) {
            return;
          }
          const wrongButton = document.querySelector(".bcp-one-button:not([hidden])");
          document.body.dataset.qualityRejected = String(!wrongButton);
          if (wrongButton) {
            clearInterval(timer);
            return;
          }
        }

        const chatSentAt = Number(document.body.dataset.chatSentAt || 0);
        if (chatSentAt && Date.now() - chatSentAt < 800) {
          return;
        }

        const overlayLeaveStartedAt = Number(document.body.dataset.overlayLeaveStartedAt || 0);
        if (overlayLeaveStartedAt && !document.body.dataset.overlayResumed) {
          if (Date.now() - overlayLeaveStartedAt < 350) {
            return;
          }
          const cloneRemoved = !document.querySelector(".bcp-one-frozen");
          const originalVisible = getComputedStyle(overlayMessage).visibility !== "hidden";
          const resumed = cloneRemoved && originalVisible;
          document.body.dataset.overlayCloneRemoved = String(cloneRemoved);
          document.body.dataset.overlayOriginalVisible = String(originalVisible);
          document.body.dataset.overlayButtonHidden = String(document.querySelector(".bcp-one-button").hidden);
          document.body.dataset.overlayResumed = String(resumed);
          if (!resumed) {
            clearInterval(timer);
          }
          return;
        }

        const target = chatSentAt ? overlayMessage : message;
        target.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
        const plusOne = document.querySelector(".bcp-one-button:not([hidden])");
        if (plusOne) {
          if (target === overlayMessage) {
            const frozen = document.querySelector(".bcp-one-frozen");
            const originalHidden = getComputedStyle(overlayMessage).visibility === "hidden";
            document.body.dataset.overlayFrozen = String(Boolean(frozen && originalHidden));
            if (!document.body.dataset.overlayLeaveStartedAt) {
              const playerRect = player.getBoundingClientRect();
              player.dispatchEvent(new PointerEvent("pointermove", {
                bubbles: true,
                clientX: playerRect.right - 5,
                clientY: playerRect.bottom - 5
              }));
              document.body.dataset.overlayLeaveStartedAt = String(Date.now());
              return;
            }
            const frozenRect = frozen.getBoundingClientRect();
            secondOverlayMessage.dispatchEvent(new PointerEvent("pointerover", {
              bubbles: true,
              clientX: frozenRect.left + frozenRect.width / 2,
              clientY: frozenRect.top + frozenRect.height / 2
            }));
            const selectedText = document.querySelector(".bcp-one-button").getAttribute("aria-label") || "";
            const overlapStable = selectedText.includes("全屏弹幕也能复读");
            document.body.dataset.overlapStable = String(overlapStable);
            if (!overlapStable) {
              clearInterval(timer);
              return;
            }
          }
          plusOne.click();
        }
      }, 100);
    </script>
  </body>
</html>`;

const bilibiliHtml = String.raw`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8"><title>B站弹幕 +1 浏览器测试夹具</title>
    <style>
      .bpx-player-container { position: relative; width: 800px; height: 450px; background: #111; }
      .bilibili-live-player-video-danmaku { position: absolute; inset: 0; transform: translateZ(0); }
      .bili-danmaku-x-dm { position: absolute; left: 260px; top: 120px; color: white; white-space: nowrap; }
    </style>
  </head>
  <body>
    <section class="bpx-player-container">
      <div class="bilibili-live-player-video-danmaku">
        <div class="bili-danmaku-x-dm">
          <span class="bili-danmaku-x-dm-content">B站单条弹幕</span>
        </div>
      </div>
      <div class="bili-danmaku-x-dm bpx-player-ctrl-dm-input" style="display:none;position:absolute;left:20px;top:auto;bottom:20px;z-index:2">
        <textarea class="bpx-player-dm-input" placeholder="发送弹幕" aria-label="全屏快捷弹幕输入框"></textarea>
        <button class="bpx-player-dm-btn" type="button">发送</button>
      </div>
    </section>
    <div class="chat-input-ctnr">
      <textarea class="chat-input" aria-label="弹幕输入框"></textarea>
      <button class="bl-button--primary" type="button">发送</button>
    </div>
    <script>
      const player = document.querySelector(".bpx-player-container");
      const container = document.querySelector(".bilibili-live-player-video-danmaku");
      const message = document.querySelector(".bili-danmaku-x-dm-content");
      const input = document.querySelector(".chat-input");
      const send = document.querySelector(".bl-button--primary");
      const quickControls = document.querySelector(".bpx-player-ctrl-dm-input");
      const quickInput = document.querySelector(".bpx-player-dm-input");
      const quickSend = document.querySelector(".bpx-player-dm-btn");
      const parameters = new URLSearchParams(location.search);
      if (parameters.get("hashed") === "1") {
        quickControls.className = "x7Qk2m";
        quickInput.className = "p9Lm4n";
        quickSend.className = "s3Nd8v";
      }
      if (parameters.get("long") === "1") {
        message.textContent = "这是一条用于验证完整复读能力的超长B站弹幕".repeat(20);
      }
      let bilibiliClickAttempts = 0;
      send.addEventListener("click", () => {
        bilibiliClickAttempts += 1;
        document.body.dataset.bilibiliClickAttempts = String(bilibiliClickAttempts);
        if (parameters.get("fallback") === "1" && bilibiliClickAttempts === 1) {
          document.body.dataset.bilibiliFirstClickIgnored = "true";
          return;
        }
        document.body.dataset.bilibiliSendMethod = "button";
        document.body.dataset.bilibiliSent = input.value;
        input.value = "";
      });
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || !input.value) {
          return;
        }
        document.body.dataset.bilibiliSendMethod = "enter";
        document.body.dataset.bilibiliSent = input.value;
        input.value = "";
      });
      quickSend.addEventListener("click", () => {
        if (quickInput.value === "全屏快捷栏手动发送") {
          document.body.dataset.bilibiliManualQuickSent = quickInput.value;
        }
        document.body.dataset.bilibiliSendMethod = "quick-button";
        document.body.dataset.bilibiliSent = quickInput.value;
        quickInput.value = "";
        setTimeout(() => {
          quickControls.style.display = "flex";
          quickControls.style.removeProperty("visibility");
          quickControls.style.removeProperty("opacity");
          quickControls.style.removeProperty("pointer-events");
          quickInput.focus();
          document.body.dataset.bilibiliQuickRefocused = String(document.activeElement === quickInput);
        }, parameters.get("late") === "1" ? 800 : 120);
      });
      document.addEventListener("pointerdown", (event) => {
        if (parameters.get("outsideFails") === "1"
          || quickControls.contains(event.target)
          || getComputedStyle(quickControls).display === "none") {
          return;
        }
        const dismissCount = Number(document.body.dataset.bilibiliQuickDismissCount || 0) + 1;
        document.body.dataset.bilibiliQuickDismissCount = String(dismissCount);
        quickControls.style.display = "none";
      });

      if (parameters.get("fullscreen") === "1") {
        Object.defineProperty(document, "fullscreenElement", {
          configurable: true,
          get: () => player
        });
        input.style.display = "none";
        send.style.display = "none";
        quickControls.style.display = "flex";
        document.body.dataset.bilibiliFullscreenSimulated = "true";
      }

      const timer = setInterval(() => {
        if (!document.querySelector(".bcp-one-button")) {
          return;
        }

        if (parameters.get("fullscreen") === "1" && !document.body.dataset.quickInputCheckStartedAt) {
          const rect = quickInput.getBoundingClientRect();
          quickInput.dispatchEvent(new PointerEvent("pointerover", {
            bubbles: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
          }));
          document.body.dataset.quickInputCheckStartedAt = String(Date.now());
          return;
        }

        if (parameters.get("fullscreen") === "1" && !document.body.dataset.quickInputRejected) {
          if (Date.now() - Number(document.body.dataset.quickInputCheckStartedAt) < 200) {
            return;
          }
          const wrongButton = document.querySelector(".bcp-one-button:not([hidden])");
          document.body.dataset.quickInputRejected = String(!wrongButton);
          if (wrongButton) {
            clearInterval(timer);
            return;
          }
          quickInput.value = "全屏快捷栏手动发送";
          quickSend.click();
        }

        if (!document.body.dataset.containerCheckStartedAt) {
          const rect = container.getBoundingClientRect();
          container.dispatchEvent(new PointerEvent("pointermove", {
            bubbles: true,
            clientX: rect.right - 20,
            clientY: rect.bottom - 20
          }));
          document.body.dataset.containerCheckStartedAt = String(Date.now());
          return;
        }

        if (!document.body.dataset.containerRejected) {
          if (Date.now() - Number(document.body.dataset.containerCheckStartedAt) < 200) {
            return;
          }
          const wrongButton = document.querySelector(".bcp-one-button:not([hidden])");
          document.body.dataset.containerRejected = String(!wrongButton);
          if (wrongButton) {
            clearInterval(timer);
            return;
          }
        }

        message.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
        const plusOne = document.querySelector(".bcp-one-button:not([hidden])");
        if (!plusOne) {
          return;
        }

        const frozen = document.querySelector(".bcp-one-frozen");
        const containerVisible = getComputedStyle(container).visibility !== "hidden";
        const singleSelected = Boolean(frozen
          && frozen.textContent.includes(message.textContent)
          && containerVisible
          && frozen.getBoundingClientRect().height < 120);
        document.body.dataset.singleDanmakuSelected = String(singleSelected);
        plusOne.click();
        clearInterval(timer);
      }, 100);
    </script>
  </body>
</html>`;

const bilibiliActivityHtml = String.raw`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8"><title>B站活动背景嵌入直播间测试夹具</title>
    <style>
      body { margin: 0; min-height: 100vh; background: #160a38; }
      .activity-roster { height: 240px; color: white; padding: 24px; }
      iframe { display: block; width: 900px; height: 600px; border: 0; margin: 0 auto; }
    </style>
  </head>
  <body>
    <section class="activity-roster">活动背景与赛事信息</section>
    <iframe title="活动内嵌直播间" src="/blanc/5236391?fixture=embedded"></iframe>
    <script>
      const frame = document.querySelector("iframe");
      const timer = setInterval(() => {
        const frameDocument = frame.contentDocument;
        if (!frameDocument || !frameDocument.body) {
          return;
        }

        document.body.dataset.bilibiliActivityFrameLoaded = "true";
        document.body.dataset.bilibiliActivityButtonFound = String(
          Boolean(frameDocument.querySelector(".bcp-one-button"))
        );
        document.body.dataset.bilibiliActivitySelected =
          frameDocument.body.dataset.singleDanmakuSelected || "";
        document.body.dataset.bilibiliActivitySent =
          frameDocument.body.dataset.bilibiliSent || "";

        if (frameDocument.body.dataset.bilibiliSent) {
          clearInterval(timer);
        }
      }, 100);
    </script>
  </body>
</html>`;

const douyinHtml = String.raw`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8"><title>抖音 Canvas 弹幕 +1 测试夹具</title>
    <style>
      #douyin-player { position: relative; width: 800px; height: 450px; background: #111; }
      #DanmakuLayout { position: absolute; inset: 0; pointer-events: none; }
      .CanvasDanmakuPlugin, canvas { width: 800px; height: 450px; }
    </style>
  </head>
  <body>
    <section id="douyin-player" class="LivePlayer_LivingPlayer player-container">
      <div id="DanmakuLayout">
        <div class="CanvasDanmakuPlugin"><canvas width="800" height="450"></canvas></div>
      </div>
    </section>
    <textarea placeholder="说点什么" aria-label="弹幕输入框"></textarea>
    <button class="sendButton" type="button">发送</button>
    <script>
      const parameters = new URLSearchParams(location.search);
      const spaMode = parameters.get("spa") === "1";
      const edgeMode = parameters.get("edge") === "1";
      const canvasHost = document.querySelector(".CanvasDanmakuPlugin");
      let canvas = canvasHost.querySelector("canvas");
      let transferResult = "not-called";

      if (spaMode) {
        history.pushState({}, "", "/123456?platform=douyin&spa=1" + (edgeMode ? "&edge=1" : ""));
        canvasHost.replaceChildren();
        canvas = document.createElement("canvas");
        canvas.width = 1440;
        canvas.height = 813;
        if (typeof canvas.transferControlToOffscreen === "function") {
          try {
            transferResult = canvas.transferControlToOffscreen();
          } catch (error) {
            transferResult = error;
          }
        }
        document.body.dataset.douyinDetachedTransferBlocked = String(transferResult === null);
        canvasHost.appendChild(canvas);
      }
      if (!spaMode && typeof canvas.transferControlToOffscreen === "function") {
        transferResult = canvas.transferControlToOffscreen();
      }
      document.body.dataset.douyinTransferStayedNative = String(transferResult !== null);

      const channel = new MessageChannel();
      const workerControls = [];
      channel.port2.addEventListener("message", (event) => workerControls.push(event.data));
      channel.port2.start();
      channel.port1.postMessage({
        method: "createInstance",
        _uniqueId: "fixture-worker-instance",
        params: {
          config: {
            width: 800,
            height: 450,
            devicePixelRatio: 1,
            fontSize: 24,
            channelHeight: 40,
            duration: 15_000,
            gap: 20
          },
          offscrrenCanvas: transferResult,
          barrages: []
        }
      }, { transfer: [transferResult] });
      channel.port1.postMessage({
        method: "addBarrage",
        _uniqueId: "fixture-worker-instance",
        params: {
          id: "fixture-barrage",
          startTime: Date.now(),
          reserveDuration: 5_000,
          padding: [4, 8, 4, 8],
          content: [{
            type: "text",
            text: "抖音画面弹幕",
            fontSize: 24,
            fontWeight: 700,
            fontFamily: "sans-serif",
            color: "#ffffff",
            strokeColor: "#000000"
          }, {
            type: "image",
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23ffd84d'/%3E%3C/svg%3E",
            width: 24,
            height: 24,
            margin: [0, 0, 0, 4]
          }]
        }
      });
      channel.port1.postMessage({
        method: "addBarrage",
        _uniqueId: "fixture-worker-instance",
        params: {
          id: "fixture-other-barrage",
          startTime: Date.now(),
          reserveDuration: 5_000,
          padding: [4, 8, 4, 8],
          content: [{
            type: "text",
            text: "其他弹幕继续移动",
            fontSize: 24,
            fontWeight: 700,
            fontFamily: "sans-serif",
            color: "#ffffff",
            strokeColor: "#000000"
          }]
        }
      });
      const input = document.querySelector("textarea");
      const send = document.querySelector(".sendButton");

      send.addEventListener("click", () => {
        document.body.dataset.douyinSent = input.value;
        input.value = "";
        clearInterval(timer);
      });

      const timer = setInterval(() => {
        document.body.dataset.douyinHookLoaded = String(Boolean(window.__bulletPlusOneDouyinCanvasHook));
        const hitbox = document.querySelector("[data-bcp-douyin-canvas-text='抖音画面弹幕']");
        const otherHitbox = document.querySelector(
          "[data-bcp-douyin-canvas-text='其他弹幕继续移动']"
        );
        document.body.dataset.douyinHitboxFound = String(Boolean(hitbox));
        const plusOne = document.querySelector(".bcp-one-button");
        document.body.dataset.douyinButtonFound = String(Boolean(plusOne));
        if (!hitbox || !plusOne) {
          return;
        }

        const rect = hitbox.getBoundingClientRect();
        canvas.dispatchEvent(new PointerEvent("pointermove", {
          bubbles: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        }));

        const visibleButton = document.querySelector(".bcp-one-button:not([hidden])");
        const frozen = document.querySelector(".bcp-one-frozen");
        if (visibleButton) {
          const animation = hitbox.getAnimations()[0];
          const otherAnimation = otherHitbox && otherHitbox.getAnimations()[0];
          document.body.dataset.douyinCanvasCaptured = "true";
          document.body.dataset.douyinWorkerTrackPaused = String(
            Boolean(animation && animation.playState === "paused")
          );
          document.body.dataset.douyinOtherWorkerTrackStayedRunning = String(
            Boolean(otherAnimation && otherAnimation.playState === "running")
          );
          document.body.dataset.douyinWorkerStopWasNotSent = String(
            !workerControls.some((message) => message && message.method === "stop")
          );
          document.body.dataset.douyinWorkerCanvasHidden = String(
            getComputedStyle(canvas).visibility === "hidden"
          );
          document.body.dataset.douyinWorkerOverlayCount = String(
            document.querySelectorAll("[data-bcp-douyin-worker-overlay='true']").length
          );
          const selectedOverlay = document.querySelector(
            "[data-bcp-douyin-worker-overlay-selected='true']"
          );
          document.body.dataset.douyinWorkerOverlayFallback = String(
            Boolean(selectedOverlay
              && selectedOverlay.dataset.bcpDouyinWorkerOverlayFallback === "true")
          );
          document.body.dataset.douyinWorkerOverlayText = selectedOverlay
            ? selectedOverlay.textContent
            : "";
          document.body.dataset.douyinWorkerOverlayImageCount = String(
            selectedOverlay ? selectedOverlay.querySelectorAll("img").length : 0
          );
          document.body.dataset.douyinFrozenCloneAbsent = String(!frozen);
          visibleButton.click();
        }
      }, 100);
    </script>
  </body>
</html>`;

const server = http.createServer((request, response) => {
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });
  const hostname = String(request.headers.host || "").split(":")[0];
  const requestUrl = new URL(request.url || "/", "http://fixture.local");
  const requestedPlatform = requestUrl.searchParams.get("platform");
  if ((hostname === "live.bilibili.com" || requestedPlatform === "bilibili")
      && requestUrl.searchParams.get("activity") === "1") {
    response.end(bilibiliActivityHtml);
  } else if (hostname === "live.bilibili.com" || requestedPlatform === "bilibili") {
    response.end(bilibiliHtml);
  } else if (hostname === "live.douyin.com" || requestedPlatform === "douyin") {
    response.end(douyinHtml);
  } else {
    response.end(html);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`READY http://127.0.0.1:${port}`);
});

setTimeout(() => server.close(), 60_000).unref();
