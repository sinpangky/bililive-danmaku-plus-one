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
      <div class="player-fullscreen-danmu-input fixture-huya-quick-reply"
        style="display:none;position:absolute;left:20px;bottom:20px;z-index:5">
        <textarea class="player-danmu-input fixture-huya-quick-input"
          data-fixture-reply-surface="quick" placeholder="发送弹幕"></textarea>
        <button class="btn-send fixture-huya-quick-send" type="button">发送</button>
      </div>
    </section>
    <section id="chat-room__list">
      <div class="J_msg">
        <span class="name" title="点击查看个人信息">测试用户：</span>
        <span class="msg">这波操作漂亮</span>
      </div>
      <div class="J_msg fixture-overlay-source-row">
        <span class="name" title="点击查看个人信息">画面用户：</span>
        <span class="msg">全屏弹幕也能复读</span>
      </div>
    </section>
    <textarea id="pub_msg_input" data-fixture-reply-surface="side" aria-label="弹幕输入框"></textarea>
    <button id="msg_send_bt" type="button">发送</button>
    <script>
      const message = document.querySelector(".msg");
      const overlayMessage = document.querySelector(".danmu-item");
      const secondOverlayMessage = document.querySelector(".second-danmu");
      const qualityOption = document.querySelector(".quality-option");
      const player = document.querySelector("#player-wrap");
      const input = document.querySelector("#pub_msg_input");
      const send = document.querySelector("#msg_send_bt");
      const quickControls = document.querySelector(".fixture-huya-quick-reply");
      const quickInput = document.querySelector(".fixture-huya-quick-input");
      const quickSend = document.querySelector(".fixture-huya-quick-send");
      const parameters = new URLSearchParams(location.search);
      if (parameters.get("fullscreen") === "1") {
        Object.defineProperty(document, "fullscreenElement", {
          configurable: true,
          get: () => player
        });
        quickControls.style.display = "flex";
        document.body.dataset.huyaFullscreenSimulated = "true";
      }
      send.addEventListener("click", () => {
        const value = input.value;
        if (!value.trim()) return;
        document.body.dataset.chatSent = value;
        document.body.dataset.chatSentAt = String(Date.now());
        if (value === "全屏弹幕也能复读") {
          document.body.dataset.overlaySent = value;
          clearInterval(timer);
        }
        input.value = "";
      });
      quickSend.addEventListener("click", () => {
        const value = quickInput.value;
        if (!value.trim()) return;
        document.body.dataset.huyaQuickSent = value;
        document.body.dataset.chatSent = value;
        document.body.dataset.chatSentAt = String(Date.now());
        if (value === "全屏弹幕也能复读") {
          document.body.dataset.overlaySent = value;
          clearInterval(timer);
        }
        quickInput.value = "";
      });

      const timer = setInterval(() => {
        if (parameters.get("manual") === "1") {
          clearInterval(timer);
          return;
        }
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
    <main class="live-player-mounter">
    <section class="bpx-player-container">
      <div class="bilibili-live-player-video-danmaku">
        <div class="bili-danmaku-x-dm">
          <span class="bili-danmaku-x-dm-content">B站单条弹幕</span>
        </div>
        <div class="bili-danmaku-x-dm fixture-video-emote-row"
          style="display:none;top:180px">
          <span class="bili-danmaku-x-dm-content">
            <img class="bili-danmaku-x-dm-img fixture-video-emote"
              data-emoticon="anchor-wave" data-fixture-unmarked-room-emoticon="true"
              alt="[主播挥手]"
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Ccircle cx='18' cy='18' r='16' fill='%23ff8a65'/%3E%3C/svg%3E">
            <span class="fixture-video-emote-token" style="position:absolute;opacity:0">[主播挥手]</span>
          </span>
        </div>
        <div class="bili-danmaku-x-dm fixture-bili-extra-emote-row"
          style="display:none;top:220px">
          <span class="bili-danmaku-x-dm-content fixture-wow-content"
            data-emoji-name="[哇]">
            <img class="bili-danmaku-x-dm-img fixture-wow-emote"
              data-emoticon-id="official-wow"
              src="/fixture/bili-wow.webp?source=chat">
          </span>
        </div>
        <div class="bili-danmaku-x-dm fixture-bili-extra-emote-row"
          data-fixture-raw-exclusive="true" style="display:none;top:260px">
          <span class="bili-danmaku-x-dm-content"><span class="fixture-exclusive-depth-1"><span
            class="fixture-exclusive-depth-2"><span class="fixture-exclusive-depth-3"><span
              class="fixture-exclusive-depth-4"><span class="fixture-exclusive-depth-5">
                <img class="bili-danmaku-x-dm-img fixture-exclusive-emote"
                  alt="[图片表情]"
                  src="/fixture/bili-room-happy.webp?source=chat">
              </span></span></span></span></span></span>
        </div>
        <div class="bili-danmaku-x-dm fixture-bili-extra-emote-row"
          style="display:none;top:300px">
          <span class="bili-danmaku-x-dm-content fixture-cry-content"
            data-emoji-name="[大哭]">
            <img class="bili-danmaku-x-dm-img fixture-cry-emote"
              data-emoticon-id="official-cry"
              src="/fixture/bili-cry.webp?source=chat">
          </span>
        </div>
        <div class="bili-danmaku-x-dm fixture-bili-extra-emote-row"
          style="display:none;top:340px">
          <span class="bili-danmaku-x-dm-content fixture-mixed-cry-content">加油啊<img
              class="bili-danmaku-x-dm-img fixture-mixed-cry-emote"
              src="/fixture/bili-cry.webp?source=chat-a"><img
              class="bili-danmaku-x-dm-img"
               src="/fixture/bili-cry.webp?source=chat-b"></span>
        </div>
        <div class="bili-danmaku-x-dm fixture-bili-extra-emote-row"
          style="display:none;top:380px">
          <span class="bili-danmaku-x-dm-content fixture-single-mixed-sad-content">画面文字<img
              class="bili-danmaku-x-dm-img fixture-single-mixed-sad-emote"
              src="/fixture/bili-sad.webp?source=video-mixed"></span>
        </div>
        <div class="bili-danmaku-x-dm fixture-bili-extra-emote-row"
          style="display:none;top:400px">
          <span class="bili-danmaku-x-dm-content fixture-correlated-inline-content">我们这样真的能上分吗？<img
              class="bili-danmaku-x-dm-img fixture-correlated-inline-emote"
              src="/fixture/69312e99a00d1db2de34ef2db9220c5686643a3f.png"><img
              class="bili-danmaku-x-dm-img"
              src="/fixture/69312e99a00d1db2de34ef2db9220c5686643a3f.png"></span>
        </div>
        <div class="bili-danmaku-x-dm fixture-bili-extra-emote-row fixture-prefixed-text-row"
          style="display:none;top:360px">
          <img class="bili-danmaku-x-dm-emoji honor-level-40"
            data-emoji-name="[荣耀等级40]" alt="[荣耀等级40]"
            src="/fixture/bili-honor-badge.webp">
          <span class="bili-danmaku-x-prefixImage-text-container fixture-prefix-text">徽章后的文字</span>
        </div>
        <div class="bili-danmaku-x-dm fixture-bili-extra-emote-row"
          data-fixture-raw-exclusive-favorite="true" style="display:none;top:380px">
          <span class="bili-danmaku-x-dm-content"><img
            class="bili-danmaku-x-dm-img fixture-exclusive-favorite-emote"
            alt="[图片表情]"
            src="/fixture/bili-room-happy.webp?source=favorite"></span>
        </div>
        <div class="bili-danmaku-x-dm fixture-bili-extra-emote-row"
          data-fixture-panel-pack="decoration" style="display:none;top:240px">
          <img class="bili-danmaku-x-dm-img fixture-decoration-emote"
            style="width:36px;height:36px" src="/fixture/bili-decoration-wave.webp">
        </div>
        <div class="bili-danmaku-x-dm fixture-bili-extra-emote-row"
          data-fixture-panel-pack="supporter" style="display:none;top:280px">
          <img class="bili-danmaku-x-dm-img fixture-supporter-emote"
            style="width:36px;height:36px" src="/fixture/bili-fan-club-cheer.webp">
        </div>
      </div>
      <div class="bili-danmaku-x-dm bpx-player-ctrl-dm-input" style="display:none;position:absolute;left:20px;top:auto;bottom:20px;z-index:2">
        <textarea class="bpx-player-dm-input" data-fixture-reply-surface="quick"
          placeholder="发送弹幕" aria-label="全屏快捷弹幕输入框"></textarea>
        <button class="bpx-player-dm-btn" type="button">发送</button>
      </div>
    </section>
    <div id="chat-history-list" class="chat-history-list"
      style="height:120px;overflow-y:auto">
      <div class="danmaku-item chat-emoticon bulge-emoticon fixture-rich-row"
        data-type="1" data-anchor-emoticon="anchor-wave" data-danmaku="主播挥手">
        <div class="danmaku-item-left"><span class="user-name">主播：</span></div>
        <span class="danmaku-item-right emoticon bulge">
          <img class="open-menu fixture-streamer-emote"
            alt="主播挥手"
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Ccircle cx='18' cy='18' r='16' fill='%23ff8a65'/%3E%3C/svg%3E">
          <span class="open-menu fixture-streamer-emote-token">主播挥手</span>
        </span>
      </div>
      <div class="danmaku-item chat-emoticon bulge-emoticon fixture-room-side-row"
        data-type="1" data-file-id="room-happy-42" data-danmaku="主播表情9">
        <span class="danmaku-item-right emoticon bulge"><img class="open-menu"
          alt="主播表情9" src="/fixture/bili-room-happy.webp?source=side"><span>主播表情9</span></span>
      </div>
      <div class="danmaku-item chat-emoticon bulge-emoticon fixture-decoration-side-row"
        data-type="1" data-file-id="decoration-wave-7" data-danmaku="装扮挥手">
        <span class="danmaku-item-right emoticon bulge"><img class="open-menu"
          alt="装扮挥手" src="/fixture/bili-decoration-wave.webp?source=side"><span>装扮挥手</span></span>
      </div>
      <div class="danmaku-item chat-emoticon bulge-emoticon fixture-supporter-side-row"
        data-type="1" data-file-id="fan-club-cheer-23" data-danmaku="粉丝团加油">
        <span class="danmaku-item-right emoticon bulge"><img class="open-menu"
          alt="粉丝团加油" src="/fixture/bili-fan-club-cheer.webp?source=side"><span>粉丝团加油</span></span>
      </div>
      <div class="danmaku-item chat-emoticon bulge-emoticon fixture-honor-tooltip-side-row"
        data-type="1" data-danmaku="打call">
        <span class="danmaku-item-right emoticon bulge"><img class="open-menu"
          alt="这是 TA 的荣耀等级勋章 (●'◡'●)ﾉ♥"
          src="/fixture/bili-honor-tooltip-call.png@40h.webp"><span>打call</span></span>
      </div>
      <div class="danmaku-item fixture-inline-duplicate-side-row" data-type="0"
        data-danmaku="222[委屈]">
        <span class="danmaku-item-right"><span>222</span><img class="open-menu"
          data-emoticon-id="official-sad" alt="[委屈]"
          src="/fixture/bili-sad.webp?source=side"><span class="fixture-inline-accessible-label">[委屈]</span></span>
      </div>
      <div class="danmaku-item fixture-leading-mention-side-row" data-type="0"
        data-danmaku="姐妹你做人真的可以">
        <span class="danmaku-item-right"><span class="user-name">@久远澪00：</span><span>姐妹你做人真&shy;的可以</span></span>
      </div>
      <div class="danmaku-item fixture-correlated-inline-side-row" data-type="0"
        data-danmaku="我们这样真的能上分吗？[委屈][委屈]">
        <span class="danmaku-item-right"><span>我们这样真的能上分吗？</span><img class="open-menu"
          data-emoticon-id="official-sad" alt="[委屈]"
          src="/fixture/69312e99a00d1db2de34ef2db9220c5686643a3f.png@20h.webp"><img class="open-menu"
          data-emoticon-id="official-sad" alt="[委屈]"
          src="/fixture/69312e99a00d1db2de34ef2db9220c5686643a3f.png@20h.webp"></span>
      </div>
    </div>
    <div class="chat-input-ctnr">
      <textarea class="chat-input" data-fixture-reply-surface="side" aria-label="弹幕输入框"></textarea>
      <button class="bl-button--primary" type="button">发送</button>
      <button class="fixture-emoji-toggle" aria-label="表情" type="button">表情</button>
      <div class="emoticons-pane fixture-emoji-panel" hidden>
        <div class="tab-pane fixture-emoji-tabs">
          <button class="tab-pane-item fixture-common-tab active" role="tab"
            aria-selected="true" type="button">常用</button>
          <button class="tab-pane-item fixture-exclusive-tab" role="tab"
            aria-selected="false" type="button">主播专属</button>
          <button class="tab-pane-item fixture-decoration-tab" role="tab"
            aria-selected="false" type="button">个性装扮</button>
          <button class="tab-pane-item fixture-supporter-tab" role="tab"
            aria-selected="false" type="button">粉丝团</button>
        </div>
        <div class="emotion-wrap emoji-wrap fixture-common-pack">
          <button class="emoticon-item fixture-emoji-item"
            data-emoticon="anchor-wave" data-fixture-unmarked-room-emoticon="true" type="button">
            <img data-emoticon="anchor-wave"
              alt="[主播挥手]"
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Ccircle cx='18' cy='18' r='16' fill='%23ff8a65'/%3E%3C/svg%3E">
          </button>
          <button class="emoticon-item fixture-wow-item"
            data-emoticon-id="official-wow" title="[哇]" type="button">
            <img data-emoticon-id="official-wow"
              src="/fixture/bili-wow.webp?source=panel">
          </button>
          <button class="emoticon-item fixture-cry-item"
            data-emoticon-id="official-cry" title="[大哭]" type="button">
            <img data-emoticon-id="official-cry" alt="[大哭]"
              src="/fixture/bili-cry.webp?source=panel">
          </button>
          <button class="emoticon-item fixture-sad-item"
            data-emoticon-id="official-sad" title="[委屈]" type="button">
            <img data-emoticon-id="official-sad" alt="[委屈]"
              src="/fixture/bili-sad.webp?source=panel">
          </button>
        </div>
        <div class="emotion-wrap fixture-exclusive-pack" hidden>
          <button class="emoticon-item fixture-exclusive-item"
            data-fixture-resource-id="room-happy-42" title="[主播表情9]" type="button">
            <img alt="[主播表情9]"
              src="/fixture/bili-room-happy.webp?source=panel">
          </button>
        </div>
        <div class="emotion-wrap fixture-decoration-pack" hidden>
          <button class="emoticon-item fixture-decoration-item"
            data-fixture-resource-id="decoration-wave-7" title="[装扮挥手]" type="button">
            <img alt="[装扮挥手]" src="/fixture/bili-decoration-wave.webp?source=panel">
          </button>
        </div>
        <div class="emotion-wrap fixture-supporter-pack" hidden>
          <button class="emoticon-item fixture-supporter-item"
            data-fixture-resource-id="fan-club-cheer-23" title="[粉丝团加油]" type="button">
            <img alt="[粉丝团加油]" src="/fixture/bili-fan-club-cheer.webp?source=panel">
          </button>
        </div>
      </div>
    </div>
    </main>
    <script>
      const player = document.querySelector(".bpx-player-container");
      const container = document.querySelector(".bilibili-live-player-video-danmaku");
      const message = document.querySelector(".bili-danmaku-x-dm-content");
      const input = document.querySelector(".chat-input");
      const send = document.querySelector(".bl-button--primary");
      const quickControls = document.querySelector(".bpx-player-ctrl-dm-input");
      let quickInput = document.querySelector(".bpx-player-dm-input");
      let quickSend = document.querySelector(".bpx-player-dm-btn");
      const emojiToggle = document.querySelector(".fixture-emoji-toggle");
      const emojiPanel = document.querySelector(".fixture-emoji-panel");
      const emojiItem = document.querySelector(".fixture-emoji-item");
      const commonTab = document.querySelector(".fixture-common-tab");
      const exclusiveTab = document.querySelector(".fixture-exclusive-tab");
      const decorationTab = document.querySelector(".fixture-decoration-tab");
      const fanClubTab = document.querySelector(".fixture-supporter-tab");
      const commonPack = document.querySelector(".fixture-common-pack");
      const exclusivePack = document.querySelector(".fixture-exclusive-pack");
      const decorationPack = document.querySelector(".fixture-decoration-pack");
      const fanClubPack = document.querySelector(".fixture-supporter-pack");
      const wowItem = document.querySelector(".fixture-wow-item");
      const cryItem = document.querySelector(".fixture-cry-item");
      const sadItem = document.querySelector(".fixture-sad-item");
      const exclusiveItem = document.querySelector(".fixture-exclusive-item");
      const decorationItem = document.querySelector(".fixture-decoration-item");
      const fanClubItem = document.querySelector(".fixture-supporter-item");
      const richChat = document.querySelector("#chat-history-list");
      let armedPanelEmoji = null;
      const parameters = new URLSearchParams(location.search);
      document.cookie = "bili_jct=fixture-csrf; path=/";
      const nativeFetch = window.fetch.bind(window);
      window.fetch = async (resource, options = {}) => {
        const url = String(resource instanceof Request ? resource.url : resource);
        if (url.includes("/room/v1/Room/room_init")) {
          return new Response(JSON.stringify({ code: 0, data: { room_id: 8818471 } }), {
            headers: { "Content-Type": "application/json" }, status: 200
          });
        }
        if (url.includes("/xlive/web-ucenter/v2/emoticon/GetEmoticons")) {
          document.body.dataset.bilibiliEmoticonCatalogRequests = String(
            Number(document.body.dataset.bilibiliEmoticonCatalogRequests || 0) + 1
          );
          const emoticons = [
            ["room-happy-42", "主播表情9", "/fixture/bili-room-happy.webp"],
            ["decoration-wave-7", "装扮挥手", "/fixture/bili-decoration-wave.webp"],
            ["fan-club-cheer-23", "粉丝团加油", "/fixture/bili-fan-club-cheer.webp"],
            ["honor-tooltip-call-40", "打call", "/fixture/bili-honor-tooltip-call.png"]
          ].map(([emoticon_unique, emoji, path]) => ({
            bulge_display: 1, emoji, emoticon_unique, is_dynamic: 1, perm: 1,
            url: location.origin + path
          }));
          return new Response(JSON.stringify({
            code: 0, data: { data: [{ emoticons, pkg_id: 42, pkg_name: "测试大表情" }] }
          }), { headers: { "Content-Type": "application/json" }, status: 200 });
        }
        if (url.includes("/msg/send")) {
          const body = options.body instanceof URLSearchParams
            ? options.body : new URLSearchParams(String(options.body || ""));
          if (body.get("dm_type") === "1") {
            document.body.dataset.bilibiliEmojiSent = body.get("msg") || "";
            document.body.dataset.bilibiliEmoticonApiSends = String(
              Number(document.body.dataset.bilibiliEmoticonApiSends || 0) + 1
            );
          }
          return new Response(JSON.stringify({ code: 0, message: "0" }), {
            headers: { "Content-Type": "application/json" }, status: 200
          });
        }
        return nativeFetch(resource, options);
      };
      const lazyQuickMode = parameters.get("lazyquick") === "1";
      const lazyEmojiMode = parameters.get("lazyemoji") === "1";
      const nameOnlyPanelMode = parameters.get("nameonlypanel") === "1";
      const mountedPackMode = parameters.get("mountedpacks") !== "0";
      const lazyEmojiNodes = lazyEmojiMode ? Array.from(emojiPanel.childNodes) : [];
      if (lazyEmojiMode) emojiPanel.replaceChildren();
      if (parameters.get("legacyexclusive") === "1") {
        const legacyExclusiveRow = document.querySelector(".fixture-exclusive-emote")
          ?.closest(".fixture-bili-extra-emote-row");
        legacyExclusiveRow?.removeAttribute("data-type");
        legacyExclusiveRow?.removeAttribute("data-file-id");
      }
      if (parameters.get("rich") === "1") {
        document.querySelector(".fixture-video-emote-row").style.display = "block";
        document.querySelectorAll(".fixture-bili-extra-emote-row")
          .forEach((row) => row.style.display = "block");
      }
      emojiToggle.addEventListener("click", () => {
        document.body.dataset.bilibiliEmojiToggleClicks = String(
          Number(document.body.dataset.bilibiliEmojiToggleClicks || 0) + 1
        );
        if (lazyEmojiMode && !emojiPanel.childNodes.length) {
          emojiPanel.append(...lazyEmojiNodes);
        }
        emojiPanel.hidden = false;
      });
      const panelPacks = [
        [commonTab, commonPack],
        [exclusiveTab, exclusivePack],
        [decorationTab, decorationPack],
        [fanClubTab, fanClubPack]
      ];
      if (mountedPackMode) {
        panelPacks.slice(1).forEach(([, pack]) => pack.remove());
      }
      panelPacks.forEach(([tab, pack]) => tab.addEventListener("click", () => {
        document.body.dataset.bilibiliEmojiTabClicks = String(
          Number(document.body.dataset.bilibiliEmojiTabClicks || 0) + 1
        );
        panelPacks.forEach(([candidateTab, candidatePack]) => {
          candidateTab.setAttribute("aria-selected", String(candidateTab === tab));
          candidateTab.classList.toggle("active", candidateTab === tab);
          candidatePack.hidden = candidatePack !== pack;
          if (mountedPackMode && candidatePack !== pack) candidatePack.remove();
        });
        if (mountedPackMode && !pack.isConnected) emojiPanel.append(pack);
      }));
      const appendEmojiEcho = (nativeItem, identityAttribute) => {
        const row = document.createElement("div");
        row.className = "danmaku-item fixture-rich-echo";
        const content = document.createElement("span");
        content.className = "danmaku-content";
        const image = nativeItem.querySelector("img").cloneNode(true);
        content.appendChild(image);
        row.appendChild(content);
        richChat.appendChild(row);
        document.body.dataset.bilibiliEmojiSent =
          image.getAttribute(identityAttribute)
          || nativeItem.getAttribute("data-fixture-resource-id")
          || "";
        emojiPanel.hidden = true;
      };
      const recordEmojiItemClick = () => {
        document.body.dataset.bilibiliEmojiItemClicks = String(
          Number(document.body.dataset.bilibiliEmojiItemClicks || 0) + 1
        );
      };
      const sendEmojiItem = (nativeItem, identityAttribute) => {
        recordEmojiItemClick();
        appendEmojiEcho(nativeItem, identityAttribute);
      };
      const insertEmojiItem = (nativeItem) => {
        recordEmojiItemClick();
        armedPanelEmoji = nativeItem;
        const value = nativeItem.getAttribute("title") || "";
        emojiPanel.hidden = true;
        send.disabled = true;
        setTimeout(() => {
          const setter = Object.getOwnPropertyDescriptor(
            HTMLTextAreaElement.prototype,
            "value"
          ).set;
          setter.call(input, value);
          input.dispatchEvent(new InputEvent("input", {
            bubbles: true,
            composed: true,
            data: value,
            inputType: "insertText"
          }));
          setTimeout(() => {
            send.disabled = false;
          }, 180);
        }, 220);
      };
      emojiItem.addEventListener("click", () => sendEmojiItem(emojiItem, "data-emoticon"));
      wowItem.addEventListener("click", () => sendEmojiItem(wowItem, "data-emoticon-id"));
      cryItem.addEventListener("click", () => sendEmojiItem(cryItem, "data-emoticon-id"));
      sadItem.addEventListener("click", () => sendEmojiItem(sadItem, "data-emoticon-id"));
      exclusiveItem.addEventListener("click", () => insertEmojiItem(exclusiveItem));
      decorationItem.addEventListener("click", () => insertEmojiItem(decorationItem));
      fanClubItem.addEventListener("click", () => insertEmojiItem(fanClubItem));
      if (parameters.get("hashed") === "1" && !lazyQuickMode) {
        quickControls.className = "x7Qk2m";
        quickInput.className = "p9Lm4n";
        quickSend.className = "s3Nd8v";
      }
      if (parameters.get("long") === "1") {
        message.textContent = "这是一条用于验证完整复读能力的超长B站弹幕".repeat(20);
      }
      let bilibiliClickAttempts = 0;
      const commitArmedPanelEmoji = () => {
        if (!armedPanelEmoji || input.value !== armedPanelEmoji.getAttribute("title")) return;
        appendEmojiEcho(armedPanelEmoji, "data-file-id");
        armedPanelEmoji = null;
      };
      send.addEventListener("click", () => {
        bilibiliClickAttempts += 1;
        document.body.dataset.bilibiliClickAttempts = String(bilibiliClickAttempts);
        if (parameters.get("fallback") === "1" && bilibiliClickAttempts === 1) {
          document.body.dataset.bilibiliFirstClickIgnored = "true";
          return;
        }
        document.body.dataset.bilibiliSendMethod = "button";
        document.body.dataset.bilibiliSent = input.value;
        commitArmedPanelEmoji();
        input.value = "";
      });
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || !input.value) {
          return;
        }
        document.body.dataset.bilibiliSendMethod = "enter";
        document.body.dataset.bilibiliSent = input.value;
        commitArmedPanelEmoji();
        input.value = "";
      });
      const editorValue = (editor) => editor instanceof HTMLInputElement
        || editor instanceof HTMLTextAreaElement ? editor.value : editor.textContent || "";
      const clearEditor = (editor) => {
        if (editor instanceof HTMLInputElement || editor instanceof HTMLTextAreaElement) {
          editor.value = "";
        } else {
          editor.textContent = "";
        }
      };
      const bindQuickSend = (button) => button.addEventListener("click", () => {
        const value = editorValue(quickInput);
        if (value === "全屏快捷栏手动发送") {
          document.body.dataset.bilibiliManualQuickSent = value;
        }
        document.body.dataset.bilibiliSendMethod = "quick-button";
        document.body.dataset.bilibiliSent = value;
        clearEditor(quickInput);
        setTimeout(() => {
          quickControls.style.display = "flex";
          quickControls.style.removeProperty("visibility");
          quickControls.style.removeProperty("opacity");
          quickControls.style.removeProperty("pointer-events");
          quickInput.focus();
          document.body.dataset.bilibiliQuickRefocused = String(document.activeElement === quickInput);
        }, parameters.get("late") === "1" ? 800 : 120);
      });
      if (lazyQuickMode) {
        quickInput.remove();
        quickSend.remove();
        quickInput = null;
        quickSend = null;
        const opener = document.createElement("button");
        opener.type = "button";
        opener.className = "fixture-bilibili-quick-opener";
        opener.setAttribute("aria-expanded", "false");
        opener.setAttribute("aria-label", "打开弹幕输入框");
        opener.textContent = "输入弹幕";
        opener.addEventListener("click", () => {
          if (quickInput) return;
          opener.setAttribute("aria-expanded", "true");
          setTimeout(() => {
            quickInput = document.createElement("div");
            quickInput.className = "bpx-player-dm-input fixture-lazy-quick-input";
            quickInput.setAttribute("contenteditable", "plaintext-only");
            quickInput.setAttribute("role", "textbox");
            quickInput.dataset.fixtureReplySurface = "quick";
            quickInput.setAttribute("aria-label", "全屏快捷弹幕输入框");
            quickInput.style.cssText = "width:260px;min-height:28px;background:#fff;color:#111";
            quickSend = document.createElement("button");
            quickSend.type = "button";
            quickSend.className = "bpx-player-dm-btn";
            quickSend.textContent = "发送";
            bindQuickSend(quickSend);
            opener.replaceWith(quickInput, quickSend);
            document.body.dataset.bilibiliLazyQuickMounted = "true";
          }, 60);
        });
        quickControls.appendChild(opener);
      } else {
        bindQuickSend(quickSend);
      }
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
        document.querySelector(".chat-input-ctnr").style.display = "none";
        input.style.display = "none";
        send.style.display = "none";
        quickControls.style.display = "flex";
        document.body.dataset.bilibiliFullscreenSimulated = "true";
      }

      const timer = setInterval(() => {
        if (!document.querySelector(".bcp-one-button")) {
          return;
        }
        if (parameters.get("rich") === "1") {
          clearInterval(timer);
          return;
        }

        if (parameters.get("fullscreen") === "1" && !lazyQuickMode
            && !document.body.dataset.quickInputCheckStartedAt) {
          const rect = quickInput.getBoundingClientRect();
          quickInput.dispatchEvent(new PointerEvent("pointerover", {
            bubbles: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
          }));
          document.body.dataset.quickInputCheckStartedAt = String(Date.now());
          return;
        }

        if (parameters.get("fullscreen") === "1" && !lazyQuickMode
            && !document.body.dataset.quickInputRejected) {
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
    <meta charset="utf-8"><title>抖音 DOM 弹幕接管测试夹具</title>
    <style>
      html, body { margin: 0; }
      #douyin-player { position: relative; width: 800px; height: 450px; background: #111; }
      #DanmakuLayout { position: absolute; inset: 0; pointer-events: none; }
      .CanvasDanmakuPlugin, canvas { display: block; width: 800px; height: 450px; }
    </style>
  </head>
  <body>
    <section id="douyin-player" class="LivePlayer_LivingPlayer player-container">
      <div id="DanmakuLayout">
        <div class="CanvasDanmakuPlugin"><canvas width="800" height="450"></canvas></div>
      </div>
      <div class="danmaku-input fixture-douyin-quick-reply"
        style="display:none;position:absolute;left:20px;bottom:20px;z-index:5">
        <textarea class="fixture-douyin-quick-input" data-fixture-reply-surface="quick"
          placeholder="发送弹幕"></textarea>
        <button class="fixture-douyin-quick-send" type="button">发送</button>
      </div>
    </section>
    <div id="douyin-chat-scroller" data-e2e="chat-message-list"
      style="position:fixed;left:500px;top:250px;width:260px;height:180px;overflow:auto;z-index:2">
      <div data-e2e="chat-message" class="fixture-reply-source-row" style="height:36px">
        <span data-e2e="chat-message-user-name">弹幕用户：</span>
        <span data-e2e="message-content">抖音画面弹幕</span>
      </div>
      <div data-e2e="chat-message" style="height:36px">
        <span data-e2e="message-content">右侧聊天栏不应出现 +1</span>
      </div>
      <div style="height:240px">聊天区自动滚动夹具</div>
    </div>
    <textarea class="fixture-douyin-side-input" data-fixture-reply-surface="side"
      placeholder="说点什么" aria-label="弹幕输入框"></textarea>
    <button class="sendButton" type="button">发送</button>
    <button class="fixture-douyin-emoji-toggle" data-e2e="emoji-toggle"
      aria-label="表情" type="button">表情</button>
    <div class="emoji-panel fixture-douyin-emoji-panel" hidden>
      <button class="emoji-item fixture-douyin-emoji-item" data-emoji="fixture-smile" type="button">
        <img data-emoji="fixture-smile" alt="😀"
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23ffd84d'/%3E%3C/svg%3E">
      </button>
    </div>
    <script>
      const parameters = new URLSearchParams(location.search);
      const spaMode = parameters.get("spa") === "1";
      const edgeMode = parameters.get("edge") === "1";
      const lateHookMode = parameters.get("latehook") === "1";
      const delayedMountMode = parameters.get("delayedmount") === "1";
      const unsupportedMode = parameters.get("unsupported") === "1";
      const richMode = parameters.get("rich") === "1";
      const fullscreenMode = parameters.get("fullscreen") === "1";
      const cacheOnlyReplyMode = parameters.get("cacheonly") === "1";
      const senderIdOnlyMode = parameters.get("idonly") === "1";
      const nativeReplyFillMode = parameters.get("nativefill") === "1";
      const barrageDuration = lateHookMode ? 15_000 : 10_000;
      const canvasHost = document.querySelector(".CanvasDanmakuPlugin");
      const chatScroller = document.querySelector("#douyin-chat-scroller");
      const emojiToggle = document.querySelector(".fixture-douyin-emoji-toggle");
      const emojiPanel = document.querySelector(".fixture-douyin-emoji-panel");
      const emojiItem = document.querySelector(".fixture-douyin-emoji-item");
      const player = document.querySelector("#douyin-player");
      const sideInput = document.querySelector(".fixture-douyin-side-input");
      const quickControls = document.querySelector(".fixture-douyin-quick-reply");
      const quickInput = document.querySelector(".fixture-douyin-quick-input");
      const quickSend = document.querySelector(".fixture-douyin-quick-send");
      if (fullscreenMode) {
        Object.defineProperty(document, "fullscreenElement", {
          configurable: true,
          get: () => player
        });
        quickControls.style.display = "flex";
        document.body.dataset.douyinFullscreenSimulated = "true";
      }
      if (senderIdOnlyMode || nativeReplyFillMode) {
        const sourceRow = document.querySelector(".fixture-reply-source-row");
        if (sourceRow) sourceRow.remove();
        document.body.dataset.douyinReplySourceUnmounted = "true";
      } else if (cacheOnlyReplyMode) {
        setTimeout(() => {
          const sourceRow = document.querySelector(".fixture-reply-source-row");
          if (sourceRow) sourceRow.remove();
          document.body.dataset.douyinReplySourceUnmounted = "true";
        }, 1_100);
      }
      if (nativeReplyFillMode) {
        document.addEventListener("click", (event) => {
          const reply = event.target instanceof Element
            && event.target.closest(".bcp-douyin-dom-action-item[data-action='reply']");
          if (!reply) return;
          const editor = fullscreenMode ? quickInput : sideInput;
          const setter = Object.getOwnPropertyDescriptor(
            HTMLTextAreaElement.prototype, "value"
          ).set;
          setter.call(editor, "@native用户ID ");
          editor.dispatchEvent(new InputEvent("input", {
            bubbles: true,
            composed: true,
            data: "@native用户ID ",
            inputType: "insertText"
          }));
          editor.focus();
          document.body.dataset.douyinNativeReplyFilled = "true";
        }, true);
      }
      let canvas = canvasHost.querySelector("canvas");
      let transferResult = "not-called";

      const appendRichChatRow = (own, manualText) => {
        const row = document.createElement("div");
        row.dataset.e2e = "chat-message";
        row.className = own ? "fixture-own-chat-row" : "fixture-rich-source-row";
        const user = document.createElement("span");
        user.dataset.e2e = "chat-message-user-name";
        user.textContent = own ? "我：" : "弹幕用户：";
        const content = document.createElement("span");
        content.dataset.e2e = "message-content";
        if (manualText) {
          content.appendChild(document.createTextNode(manualText));
        } else {
          content.appendChild(document.createTextNode("抖音"));
          const image = emojiItem.querySelector("img").cloneNode(true);
          content.appendChild(image);
          content.appendChild(document.createTextNode("画面弹幕"));
        }
        row.append(user, content);
        chatScroller.insertBefore(row, chatScroller.lastElementChild);
        return row;
      };
      if (richMode) {
        appendRichChatRow(false, "");
      }
      emojiToggle.addEventListener("click", () => {
        emojiPanel.hidden = false;
      });
      emojiItem.addEventListener("click", () => {
        const editor = fullscreenMode ? quickInput : sideInput;
        editor.value += "😀";
        editor.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          composed: true,
          data: "😀",
          inputType: "insertText"
        }));
        emojiPanel.hidden = true;
      });

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
      } else if (typeof canvas.transferControlToOffscreen === "function") {
        transferResult = canvas.transferControlToOffscreen();
      }
      document.body.dataset.douyinTransferStayedNative = String(transferResult !== null);
      if (delayedMountMode) {
        canvas.remove();
        document.body.dataset.douyinCanvasInitiallyDetached = "true";
      }

      const channel = new MessageChannel();
      const workerControls = [];
      channel.port2.addEventListener("message", (event) => workerControls.push(event.data));
      channel.port2.start();

      const post = (method, params, transfer) => {
        const message = {
          method,
          _uniqueId: "fixture-worker-instance",
          params: params || {}
        };
        if (transfer && transferResult && typeof transferResult === "object") {
          channel.port1.postMessage(message, { transfer: [transferResult] });
        } else {
          channel.port1.postMessage(message);
        }
      };
      const barrage = (id, text, withImage) => ({
        id,
        user: cacheOnlyReplyMode || nativeReplyFillMode
          ? undefined
          : senderIdOnlyMode
            ? { id_str: "731234567890" }
            : { nickname: "弹幕用户" },
        startTime: Date.now(),
        reserveDuration: 5_000,
        padding: [4, 8, 4, 8],
        content: [{
          type: "text",
          text,
          fontSize: 24,
          fontWeight: 700,
          fontFamily: "sans-serif",
          color: "#ffffff",
          strokeColor: "#000000"
        }].concat(withImage ? [{
          type: "image",
          src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23ffd84d'/%3E%3C/svg%3E",
          width: 24,
          height: 24,
          margin: [0, 0, 0, 4]
        }] : [])
      });
      const postPair = (prefix) => {
        post("addBarrage", barrage(prefix + "-selected", "抖音画面弹幕", true));
        setTimeout(() => {
          post("addBarrage", barrage(prefix + "-other", "其他弹幕继续移动", false));
        }, 120);
      };
      const postImageOnly = (id) => post("addBarrage", {
        id,
        startTime: Date.now(),
        reserveDuration: 5_000,
        content: [{
          type: "image",
          src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='20' height='20' fill='%23fff'/%3E%3C/svg%3E",
          width: 20,
          height: 20
        }]
      });

      post("createInstance", {
        config: {
          width: 800,
          height: 450,
          devicePixelRatio: 1,
          fontSize: 20,
          channelHeight: 40,
          duration: barrageDuration,
          gap: 20
        },
        offscrrenCanvas: transferResult,
        barrages: []
      }, true);
      if (unsupportedMode) {
        // Reproduce the real-room failure both in the initial batch and after
        // takeover. These decorative/image-only messages are skipped one by
        // one and must never block the complete renderer instance.
        postImageOnly("fixture-image-only-initial");
        setTimeout(() => postImageOnly("fixture-image-only-later"), 1_600);
        setTimeout(() => post("addBarrage", {
          id: "fixture-empty-later",
          startTime: Date.now(),
          reserveDuration: 5_000,
          content: []
        }), 1_750);
        let passiveSequence = 0;
        setInterval(() => {
          passiveSequence += 1;
          postImageOnly("fixture-image-only-sustain-" + passiveSequence);
          if (passiveSequence % 3 === 0) {
            post("addBarrage", {
              id: "fixture-empty-sustain-" + passiveSequence,
              startTime: Date.now(),
              reserveDuration: 5_000,
              content: []
            });
          }
        }, 800);
        [8_000, 16_000, 24_000].forEach((delay, index) => {
          setTimeout(() => postPair("fixture-sustain-" + index), delay);
        });
      }
      postPair("fixture-initial");
      if (delayedMountMode) {
        setTimeout(() => {
          canvasHost.appendChild(canvas);
          document.body.dataset.douyinCanvasMountedAfterCreate = "true";
        }, 900);
      }

      if (lateHookMode) {
        // The hook is injected at about 500 ms by inspect-live-dom.cjs. This
        // first later message recovers the instance, but must not hide Canvas.
        setTimeout(() => post(
          "addBarrage",
          barrage("fixture-recovery-only", "恢复实例暂不接管", false)
        ), 900);
        setTimeout(() => {
          const layer = document.querySelector(".bcp-douyin-dom-layer");
          document.body.dataset.douyinLateCanvasVisibleBeforeClean = String(
            getComputedStyle(canvas).visibility !== "hidden"
          );
          document.body.dataset.douyinLateLayerInactiveBeforeClean = String(
            !layer || layer.hidden || getComputedStyle(layer).display === "none"
          );
        }, 1_350);
        // A clear establishes a clean synchronization boundary.  Barrages seen
        // after it are safe for the independent DOM renderer to take over.
        setTimeout(() => {
          post("clear", {});
          document.body.dataset.douyinLateCleanBoundarySent = "true";
          setTimeout(() => postPair("fixture-clean"), 40);
        }, 1_600);
      }

      const input = sideInput;
      const send = document.querySelector(".sendButton");
      const handleFixtureSend = (editor, event) => {
        const sentMessage = editor.value;
        const plainMessage = sentMessage.replace(/😀/g, "");
        const manual = richMode && sentMessage === "我自己发送的侧边消息";
        document.body.dataset.douyinSent = plainMessage;
        document.body.dataset.douyinSentRich = sentMessage;
        document.body.dataset.douyinNativeSendTrusted = String(event.isTrusted);
        document.body.dataset.douyinSendSurface = editor.dataset.fixtureReplySurface || "";
        editor.value = "";
        if (richMode) {
          const ownRow = appendRichChatRow(true, manual ? sentMessage : "");
          ownRow.dataset.fixtureSentKind = manual ? "manual" : "emoji";
        }
        setTimeout(() => post(
          "addBarrage",
          barrage("fixture-own-echo-" + Date.now(), plainMessage, richMode && !manual)
        ), 80);
      };
      send.addEventListener("click", (event) => handleFixtureSend(input, event));
      quickSend.addEventListener("click", (event) => handleFixtureSend(quickInput, event));

      window.__douyinDomFixture = {
        canvas,
        channel,
        workerControls,
        post,
        postPair,
        delayedMountMode,
        fullscreenMode,
        unsupportedMode,
        richMode
      };

      setInterval(() => {
        const layer = document.querySelector(".bcp-douyin-dom-layer");
        const rendered = Array.from(document.querySelectorAll(".bcp-douyin-dom-barrage"));
        const canvasStyle = getComputedStyle(canvas);
        document.body.dataset.douyinHookLoaded = String(
          Boolean(window.__bulletPlusOneDouyinCanvasHook)
        );
        document.body.dataset.douyinDomLayerCount = String(
          document.querySelectorAll(".bcp-douyin-dom-layer").length
        );
        document.body.dataset.douyinDomBarrageCount = String(rendered.length);
        document.body.dataset.douyinDomMessages = JSON.stringify(
          rendered.map((node) => node.dataset.message || node.textContent.trim())
        );
        document.body.dataset.douyinCanvasHidden = String(
          canvasStyle.visibility === "hidden"
        );
        document.body.dataset.douyinCanvasDisplayPreserved = String(
          canvasStyle.display !== "none"
        );
        document.body.dataset.douyinTakeoverActive = String(Boolean(
          layer && !layer.hidden && canvasStyle.visibility === "hidden" && rendered.length
        ));
        document.body.dataset.douyinWorkerStopWasNotSent = String(
          !workerControls.some((message) => message && message.method === "stop")
        );
        document.body.dataset.douyinLegacyInteractionCount = String(
          document.querySelectorAll(
            "[data-bcp-douyin-interaction-card='true'],[data-bcp-douyin-worker-overlay],.bcp-one-frozen"
          ).length
        );
      }, 50);
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
  } else if (hostname === "live.douyin.com"
      || (hostname === "www.douyin.com" && requestUrl.pathname.startsWith("/follow/live"))
      || requestedPlatform === "douyin") {
    response.end(douyinHtml);
  } else {
    response.end(html);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`READY http://127.0.0.1:${port}`);
});

setTimeout(
  () => server.close(),
  Math.max(30_000, Number(process.env.BCP_FIXTURE_TIMEOUT) || 120_000)
).unref();
