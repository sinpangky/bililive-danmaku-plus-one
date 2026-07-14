(function initBulletPlusOne() {
  "use strict";

  const shared = globalThis.BulletPlusOneShared;
  const platformId = shared && shared.detectPlatform(location.hostname);

  if (!shared || !platformId || globalThis.__bulletPlusOneLoaded) {
    return;
  }

  globalThis.__bulletPlusOneLoaded = true;

  const PLATFORM_CONFIG = {
    huya: {
      name: "虎牙直播",
      maxLength: 1000,
      chatRoots: [
        "#chat-room__list",
        ".chat-room__list",
        ".chat-room__bd",
        ".room-chat-messages",
        "[class*='chat-room'][class*='list']",
        "[class*='chatRoom'][class*='list']"
      ],
      videoRoots: [
        "#player-wrap",
        "#player-container",
        ".player-wrap",
        ".player-container",
        "[class*='player-wrap']",
        "[class*='player-container']"
      ],
      overlayMessages: [
        ".danmu-item",
        ".danmaku-item",
        ".bullet-item",
        ".player-danmu-item",
        "[class*='danmu-item']",
        "[class*='danmaku-item']",
        "[class*='danmuItem']",
        "[class*='bullet-item']"
      ],
      messages: [
        ".J_msg",
        ".msg-item",
        ".msg-normal",
        "[data-cid]",
        "[class*='message-item']",
        "[class*='messageItem']"
      ],
      messageText: [
        ".msg",
        ".txt",
        ".msg-content",
        ".message-content",
        "[class*='message-content']",
        "[class*='messageContent']"
      ],
      userNames: [
        ".name",
        ".nick",
        ".username",
        "[class*='user-name']",
        "[class*='userName']",
        "[class*='nickname']"
      ],
      inputs: [
        "#pub_msg_input",
        "textarea[placeholder*='弹幕']",
        "textarea[placeholder*='发言']",
        ".chat-room__input textarea",
        ".chat-room__input [contenteditable='true']",
        "[class*='chat-input'] [contenteditable='true']"
      ],
      sendButtons: [
        "#msg_send_bt",
        ".btn-send",
        ".chat-room__input button",
        "button[class*='send']",
        "[class*='send-btn']"
      ]
    },
    bilibili: {
      name: "哔哩哔哩直播",
      maxLength: 1000,
      chatRoots: [
        "#chat-items",
        "#chat-history-list",
        ".chat-history-list",
        ".chat-items",
        "[class*='chat-history']",
        "[class*='danmaku-list']"
      ],
      videoRoots: [
        "#live-player",
        ".live-player-mounter",
        ".bpx-player-container",
        ".bilibili-live-player-video-area",
        "[class*='live-player']",
        "[class*='player-container']"
      ],
      overlayMessages: [
        ".bili-danmaku-x-dm",
        ".bili-danmaku-x-dm-content",
        ".b-danmaku",
        ".bilibili-player-video-danmaku .b-danmaku",
        ".bpx-player-dm-wrap .bili-danmaku-x-dm",
        ".bilibili-live-player-video-danmaku [class*='danmaku-item']",
        ".bpx-player-dm-wrap [class*='danmaku-item']",
        "[class*='video-danmaku-item']"
      ],
      messages: [
        ".danmaku-item",
        ".chat-item",
        "[data-danmaku]",
        "[data-id][class*='danmaku']",
        "[class*='message-item']"
      ],
      messageText: [
        ".danmaku-content",
        ".danmaku-item-right",
        ".message-content",
        "[class*='danmaku-content']",
        "[class*='danmakuContent']"
      ],
      userNames: [
        ".user-name",
        ".username",
        ".uname",
        "[class*='user-name']",
        "[class*='userName']"
      ],
      inputs: [
        "textarea.chat-input",
        ".chat-input-ctnr textarea",
        ".bpx-player-dm-input",
        ".bilibili-player-video-danmaku-input",
        ".bpx-player-ctrl-dm-input input",
        ".bpx-player-ctrl-dm-input textarea",
        ".bpx-player-ctrl-dm-input [contenteditable='true']",
        "textarea[placeholder*='弹幕']",
        "textarea[placeholder*='说点什么']",
        "[contenteditable='true'][data-placeholder*='弹幕']",
        ".chat-input[contenteditable='true']"
      ],
      sendButtons: [
        ".chat-input-ctnr button[type='submit']",
        ".chat-input-ctnr .bl-button--primary",
        ".bpx-player-dm-btn",
        ".bpx-player-ctrl-dm-btn",
        ".send-btn",
        "button[class*='send']",
        "[class*='send-button']"
      ]
    },
    douyin: {
      name: "抖音直播",
      maxLength: 1000,
      chatRoots: [
        "[data-e2e='chat-message-list']",
        "[data-e2e='chat-room-message-list']",
        "[class*='webcast-chatroom___items']",
        "[class*='webcast-chatroom___list']",
        "[class*='webcast-chatroom'] [class*='message-list']",
        "[class*='chatroom'] [class*='message']",
        "[class*='ChatMessageList']",
        "[class*='messageList']"
      ],
      videoRoots: [
        "[data-e2e='live-player']",
        "[data-e2e='player-container']",
        "[class*='live-player']",
        "[class*='player-container']",
        "[class*='PlayerContainer']",
        "[class*='video-container']"
      ],
      overlayMessages: [
        "[data-bcp-douyin-canvas='true']",
        "[data-e2e='danmaku-item']",
        "[class*='webcast-danmaku___item']",
        "[class*='danmaku-item']",
        "[class*='danmakuItem']",
        "[class*='danmu-item']",
        "[class*='bullet-item']"
      ],
      messages: [
        "[data-e2e='chat-message']",
        "[data-e2e='chat-room-message']",
        "[data-e2e='danmaku-item']",
        "[class*='webcast-chatroom___item']",
        "[class*='ChatMessage']",
        "[class*='chat-message']",
        "[class*='message-item']"
      ],
      messageText: [
        "[data-e2e='chat-message-text']",
        "[data-e2e='message-content']",
        "[class*='message-content']",
        "[class*='messageContent']",
        "[class*='content']"
      ],
      userNames: [
        "[data-e2e='chat-message-user-name']",
        "[class*='nickname']",
        "[class*='user-name']",
        "[class*='userName']"
      ],
      inputs: [
        "[data-e2e='chat-room-input']",
        "textarea[data-e2e*='chat']",
        "textarea[placeholder*='弹幕']",
        "textarea[placeholder*='说点什么']",
        "[contenteditable='true'][data-placeholder*='弹幕']",
        "[contenteditable='true'][data-placeholder*='说点什么']",
        "[class*='webcast-chatroom___input'] [contenteditable='true']",
        "[class*='chat-input'] [contenteditable='true']",
        "[class*='ChatInput'] [contenteditable='true']"
      ],
      sendButtons: [
        "[data-e2e='chat-room-send']",
        "[data-e2e*='send' i]",
        "[data-testid*='send' i]",
        "[aria-label*='发送']",
        "button[data-e2e*='send']",
        "[class*='webcast-chatroom___send']",
        "button[class*='send']",
        "[class*='send-button']",
        "[class*='sendButton']"
      ]
    }
  };

  const config = PLATFORM_CONFIG[platformId];
  const BILIBILI_QUICK_INPUTS = [
    ".bpx-player-dm-input",
    ".bilibili-player-video-danmaku-input",
    ".bpx-player-ctrl-dm-input input",
    ".bpx-player-ctrl-dm-input textarea",
    ".bpx-player-ctrl-dm-input [contenteditable='true']"
  ];
  const OVERLAY_HOVER_PADDING = 14;
  const OVERLAY_LEAVE_DELAY = 160;
  const state = {
    settings: shared.mergeSettings(),
    candidate: null,
    candidateKind: null,
    message: "",
    hideTimer: 0,
    lastActionAt: 0,
    roots: [document],
    rootsCachedAt: 0,
    portal: null,
    button: null,
    toast: null,
    frozenClone: null,
    originalVisibility: null,
    pausedAnimations: [],
    positionFrame: 0,
    pointerFrame: 0,
    pointerX: 0,
    pointerY: 0,
    hiddenBilibiliQuickBars: new Map()
  };

  function storageGet() {
    return new Promise((resolve) => {
      if (!globalThis.chrome || !chrome.storage || !chrome.storage.sync) {
        resolve({});
        return;
      }

      chrome.storage.sync.get(null, (value) => resolve(value || {}));
    });
  }

  function isEnabled() {
    return Boolean(state.settings.enabled && state.settings.platforms[platformId]);
  }

  function isOwned(node) {
    return node instanceof Element && Boolean(node.closest("[data-bcp-one-owned]"));
  }

  function isVisible(element) {
    if (!(element instanceof Element) || !element.isConnected) {
      return false;
    }

    const style = getComputedStyle(element);
    return style.display !== "none"
      && style.visibility !== "hidden"
      && Number(style.opacity || 1) > 0
      && element.getClientRects().length > 0;
  }

  function refreshRoots() {
    const now = Date.now();
    if (now - state.rootsCachedAt < 3000) {
      return state.roots;
    }

    const roots = [document];
    const queue = [document];
    const visited = new Set(queue);

    while (queue.length && roots.length < 40) {
      const root = queue.shift();
      let elements = [];

      try {
        elements = root.querySelectorAll("*");
      } catch (_error) {
        continue;
      }

      for (const element of elements) {
        if (element.shadowRoot && !visited.has(element.shadowRoot)) {
          visited.add(element.shadowRoot);
          roots.push(element.shadowRoot);
          queue.push(element.shadowRoot);
        }
      }
    }

    state.roots = roots;
    state.rootsCachedAt = now;
    return roots;
  }

  function queryAllDeep(selectors) {
    const results = [];
    const seen = new Set();

    for (const root of refreshRoots()) {
      for (const selector of selectors) {
        let matches = [];

        try {
          matches = root.querySelectorAll(selector);
        } catch (_error) {
          continue;
        }

        for (const match of matches) {
          if (!seen.has(match)) {
            seen.add(match);
            results.push(match);
          }
        }
      }
    }

    return results;
  }

  function matchesAny(element, selectors) {
    if (!(element instanceof Element)) {
      return false;
    }

    return selectors.some((selector) => {
      try {
        return element.matches(selector);
      } catch (_error) {
        return false;
      }
    });
  }

  function closestFromPath(path, selectors) {
    return path.find((item) => matchesAny(item, selectors)) || null;
  }

  function closestMatching(element, selectors) {
    let current = element instanceof Element ? element : null;

    while (current) {
      if (matchesAny(current, selectors)) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  function findChatRoot(path) {
    const inPath = closestFromPath(path, config.chatRoots);
    if (inPath) {
      return inPath;
    }

    for (const node of path) {
      if (!(node instanceof Element)) {
        continue;
      }

      for (const root of queryAllDeep(config.chatRoots)) {
        if (root.contains(node)) {
          return root;
        }
      }
    }

    return null;
  }

  function findCandidate(path) {
    const overlay = closestFromPath(path, config.overlayMessages);
    if (overlay && isOverlayMessageElement(overlay)) {
      return { element: overlay, kind: "overlay" };
    }

    const known = closestFromPath(path, config.messages);
    if (known) {
      return { element: known, kind: "chat" };
    }

    const chatRoot = findChatRoot(path);
    if (!chatRoot) {
      return null;
    }

    for (const node of path) {
      if (!(node instanceof Element) || node === chatRoot || !chatRoot.contains(node)) {
        continue;
      }

      if (node.matches("button, input, textarea, a, [contenteditable='true']")) {
        continue;
      }

      const rect = node.getBoundingClientRect();
      const text = shared.normalizeWhitespace(node.innerText || node.textContent);
      if (rect.height >= 12 && rect.height <= 180 && text.length >= 1 && text.length <= 260) {
        return { element: node, kind: "chat" };
      }
    }

    return null;
  }

  function pointInside(rect, x, y, padding) {
    const margin = Number.isFinite(padding) ? padding : 0;
    return x >= rect.left - margin
      && x <= rect.right + margin
      && y >= rect.top - margin
      && y <= rect.bottom + margin;
  }

  function isOverlayMessageElement(element) {
    if (!(element instanceof Element) || isOwned(element) || !isVisible(element)) {
      return false;
    }

    if (matchesAny(element, config.videoRoots)
      || element.matches("video, canvas, button, input, textarea, [role='button'], [contenteditable='true']")) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    const exactOverlay = matchesAny(element, config.overlayMessages);
    const maximumWidth = exactOverlay
      ? Number.POSITIVE_INFINITY
      : Math.min(900, innerWidth * 0.85);
    if (rect.height < 8
      || rect.height > Math.min(120, innerHeight * 0.22)
      || rect.width < 4
      || rect.width > maximumWidth) {
      return false;
    }

    for (const selector of config.overlayMessages) {
      try {
        if (element.querySelector(selector)) {
          return false;
        }
      } catch (_error) {
        // Ignore selectors unsupported by an older Chromium build.
      }
    }

    const text = element.dataset.bcpDouyinCanvas === "true"
      ? shared.parseMessageText(element.dataset.bcpDouyinCanvasText, config.maxLength)
      : textFromCandidate(element);
    return shared.isPlausibleMessage(text, config.maxLength);
  }

  function isGenericOverlayElement(element) {
    if (!(element instanceof Element) || isOwned(element)) {
      return false;
    }

    if (element.matches("button, input, textarea, video, canvas, a, [contenteditable='true']")) {
      return false;
    }

    const videoRoot = closestMatching(element, config.videoRoots);
    if (!videoRoot) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    const text = shared.parseMessageText(element.innerText || element.textContent, config.maxLength);
    const style = getComputedStyle(element);
    const className = typeof element.className === "string" ? element.className : "";
    const marker = [
      element.id,
      className,
      element.getAttribute("data-e2e"),
      element.getAttribute("data-testid"),
      element.getAttribute("aria-label")
    ].filter(Boolean).join(" ");
    const hasDanmakuMarker = /(danmaku|danmu|bullet|barrage|弹幕)/i.test(marker);
    const isControl = /(setting|control|quality|definition|resolution|menu|button|清晰度|设置)/i.test(marker);
    const looksLikeMessage = style.animationName !== "none"
      || style.transform !== "none"
      || /(item|text|message|content|\bdm\b)/i.test(marker);

    return isOverlayMessageElement(element)
      && hasDanmakuMarker
      && !isControl
      && looksLikeMessage
      && rect.height >= 10
      && rect.height <= 100
      && rect.width >= 4
      && rect.width <= Math.min(900, innerWidth * 0.9)
      && shared.isPlausibleMessage(text, config.maxLength);
  }

  function isInsideFrozenHoverZone(x, y) {
    return state.candidateKind === "overlay"
      && state.frozenClone
      && state.frozenClone.isConnected
      && pointInside(
        state.frozenClone.getBoundingClientRect(),
        x,
        y,
        OVERLAY_HOVER_PADDING
      );
  }

  function findOverlayAtPoint(x, y) {
    if (isInsideFrozenHoverZone(x, y)) {
      return state.candidate;
    }

    let exactCandidates;
    if (platformId === "douyin") {
      try {
        exactCandidates = Array.from(document.querySelectorAll(config.overlayMessages.join(",")));
      } catch (_error) {
        exactCandidates = queryAllDeep(config.overlayMessages);
      }
    } else {
      exactCandidates = queryAllDeep(config.overlayMessages);
    }
    const exactHits = [];

    exactCandidates.forEach((candidate, index) => {
      if (!isOverlayMessageElement(candidate)) {
        return;
      }

      const rect = candidate.getBoundingClientRect();
      if (pointInside(rect, x, y)) {
        const normalizedX = (x - (rect.left + rect.width / 2)) / Math.max(rect.width, 1);
        const normalizedY = (y - (rect.top + rect.height / 2)) / Math.max(rect.height, 1);
        const centerDistance = Math.hypot(normalizedX, normalizedY);
        const areaPenalty = Math.min((rect.width * rect.height) / 1_000_000, 0.25);
        exactHits.push({ candidate, score: centerDistance + areaPenalty, index });
      }
    });

    if (exactHits.length) {
      exactHits.sort((a, b) => a.score - b.score || b.index - a.index);
      return exactHits[0].candidate;
    }

    const pointElements = typeof document.elementsFromPoint === "function"
      ? document.elementsFromPoint(x, y)
      : [];

    for (const element of pointElements) {
      const exact = closestMatching(element, config.overlayMessages);
      if (exact) {
        return exact;
      }
      if (isGenericOverlayElement(element)) {
        return element;
      }
    }

    return null;
  }

  function textFromSpecificElement(candidate) {
    for (const selector of config.messageText) {
      let element = null;

      try {
        element = candidate.matches(selector) ? candidate : candidate.querySelector(selector);
      } catch (_error) {
        element = null;
      }

      if (element) {
        const text = shared.parseMessageText(element.innerText || element.textContent, config.maxLength);
        if (shared.isPlausibleMessage(text, config.maxLength)) {
          return text;
        }
      }
    }

    return "";
  }

  function emojiTokenFromImage(image) {
    const marker = [
      typeof image.className === "string" ? image.className : "",
      image.getAttribute("data-e2e"),
      image.getAttribute("data-testid")
    ].filter(Boolean).join(" ");
    const raw = [
      image.getAttribute("alt"),
      image.getAttribute("data-text"),
      image.getAttribute("data-emoji"),
      image.getAttribute("data-emoji-name"),
      image.getAttribute("title"),
      image.getAttribute("aria-label")
    ].find((value) => shared.normalizeWhitespace(value));
    const value = shared.normalizeWhitespace(raw);
    if (!value) {
      return "";
    }
    if (/^\[[^\]\n]{1,40}\]$/.test(value) || /\p{Extended_Pictographic}/u.test(value)) {
      return value;
    }
    if (/(emoji|emote|sticker|表情)/i.test(marker) && Array.from(value).length <= 40) {
      return `[${value}]`;
    }
    return "";
  }

  function richTextFromElement(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll("img").forEach((image) => {
      const token = emojiTokenFromImage(image);
      if (token) {
        image.replaceWith(document.createTextNode(token));
      } else {
        image.remove();
      }
    });

    const removals = [
      "button",
      "svg",
      "[aria-hidden='true']",
      "[data-bcp-one-owned]",
      ...config.userNames
    ];
    for (const selector of removals) {
      try {
        if (clone.matches && clone.matches(selector)) {
          return "";
        }
        clone.querySelectorAll(selector).forEach((item) => item.remove());
      } catch (_error) {
        // Ignore selectors unsupported by an older Chromium build.
      }
    }
    return shared.parseMessageText(clone.textContent, config.maxLength);
  }

  function richTextFromCandidate(candidate) {
    for (const selector of config.messageText) {
      let element = null;
      try {
        element = candidate.matches(selector) ? candidate : candidate.querySelector(selector);
      } catch (_error) {
        element = null;
      }
      if (element) {
        const text = richTextFromElement(element);
        if (shared.isPlausibleMessage(text, config.maxLength)) {
          return text;
        }
      }
    }
    return richTextFromElement(candidate);
  }

  function comparableDouyinText(value) {
    return shared.normalizeWhitespace(value)
      .replace(/\[[^\]\n]{1,40}\]/g, "")
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/\s+/g, "");
  }

  function resolveDouyinCanvasMessage(canvasText) {
    if (platformId !== "douyin") {
      return "";
    }
    const canvasKey = comparableDouyinText(canvasText);
    if (!canvasKey) {
      return "";
    }
    const candidates = queryAllDeep(config.messages).slice(-80).reverse();
    for (const candidate of candidates) {
      if (isOwned(candidate)) {
        continue;
      }
      const richText = richTextFromCandidate(candidate);
      if (!shared.isPlausibleMessage(richText, config.maxLength)) {
        continue;
      }
      const richKey = comparableDouyinText(richText);
      if (richKey === canvasKey && richText !== canvasText) {
        return richText;
      }
    }
    return "";
  }

  function textFromCandidate(candidate) {
    if (candidate.dataset && candidate.dataset.bcpDouyinCanvasText) {
      const canvasText = shared.parseMessageText(
        candidate.dataset.bcpDouyinCanvasText,
        config.maxLength
      );
      return resolveDouyinCanvasMessage(canvasText) || canvasText;
    }

    const specific = textFromSpecificElement(candidate);
    if (specific) {
      return specific;
    }

    const clone = candidate.cloneNode(true);
    const removals = [
      "button",
      "svg",
      "img",
      "[aria-hidden='true']",
      "[data-bcp-one-owned]",
      ...config.userNames
    ];

    for (const selector of removals) {
      try {
        clone.querySelectorAll(selector).forEach((element) => element.remove());
      } catch (_error) {
        // Ignore selectors that are unsupported by an older browser.
      }
    }

    return shared.parseMessageText(clone.textContent, config.maxLength);
  }

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function ensurePortal() {
    const host = fullscreenElement() || document.documentElement;

    if (!state.portal) {
      const portal = document.createElement("div");
      portal.className = "bcp-one-portal";
      portal.dataset.bcpOneOwned = "true";
      state.portal = portal;
    }

    if (state.portal.parentNode !== host) {
      try {
        host.appendChild(state.portal);
      } catch (_error) {
        document.documentElement.appendChild(state.portal);
      }
    }

    return state.portal;
  }

  function ensureButton() {
    const portal = ensurePortal();

    if (state.button && state.button.isConnected) {
      if (state.button.parentNode !== portal) {
        portal.appendChild(state.button);
      }
      return state.button;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "bcp-one-button";
    button.textContent = "+1";
    button.hidden = true;
    button.dataset.bcpOneOwned = "true";
    button.addEventListener("pointerenter", cancelHide);
    button.addEventListener("pointerleave", scheduleHide);
    button.addEventListener("click", onPlusOneClick);
    portal.appendChild(button);
    state.button = button;
    return button;
  }

  function createDouyinCanvasSnapshot(candidate, rect) {
    const sourceId = candidate.dataset.bcpDouyinCanvasSourceId;
    if (!sourceId) {
      return null;
    }
    const source = Array.from(
      document.querySelectorAll("canvas[data-bcp-douyin-canvas-source-id]")
    ).find((canvas) => canvas.dataset.bcpDouyinCanvasSourceId === sourceId);
    if (!(source instanceof HTMLCanvasElement)) {
      return null;
    }
    const sourceRect = source.getBoundingClientRect();
    if (sourceRect.width <= 0 || sourceRect.height <= 0 || source.width <= 0 || source.height <= 0) {
      return null;
    }

    const scaleX = source.width / sourceRect.width;
    const scaleY = source.height / sourceRect.height;
    const sourceX = Math.max(0, (rect.left - sourceRect.left) * scaleX);
    const sourceY = Math.max(0, (rect.top - sourceRect.top) * scaleY);
    const sourceWidth = Math.min(rect.width * scaleX, source.width - sourceX);
    const sourceHeight = Math.min(rect.height * scaleY, source.height - sourceY);
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return null;
    }

    const snapshot = document.createElement("canvas");
    snapshot.width = Math.max(1, Math.ceil(sourceWidth));
    snapshot.height = Math.max(1, Math.ceil(sourceHeight));
    const context = snapshot.getContext("2d");
    if (!context) {
      return null;
    }
    try {
      context.drawImage(
        source,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        snapshot.width,
        snapshot.height
      );
    } catch (_error) {
      return null;
    }
    snapshot.dataset.bcpDouyinSnapshot = "true";
    snapshot.setAttribute("aria-hidden", "true");
    return snapshot;
  }

  function freezeOverlayCandidate(candidate) {
    const rect = candidate.getBoundingClientRect();
    const computed = getComputedStyle(candidate);
    const isDouyinCanvas = candidate.dataset.bcpDouyinCanvas === "true";
    const clone = isDouyinCanvas
      ? createDouyinCanvasSnapshot(candidate, rect) || candidate.cloneNode(true)
      : candidate.cloneNode(true);
    const copiedProperties = [
      "display",
      "box-sizing",
      "font",
      "font-family",
      "font-size",
      "font-style",
      "font-weight",
      "line-height",
      "letter-spacing",
      "text-align",
      "text-shadow",
      "-webkit-text-stroke",
      "color",
      "background",
      "border",
      "border-radius",
      "padding",
      "opacity",
      "filter",
      "white-space"
    ];

    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
    clone.classList.add("bcp-one-frozen");
    clone.dataset.bcpOneOwned = "true";

    for (const property of copiedProperties) {
      const value = computed.getPropertyValue(property);
      if (value) {
        clone.style.setProperty(property, value, "important");
      }
    }

    if (isDouyinCanvas) {
      if (!(clone instanceof HTMLCanvasElement)) {
        clone.textContent = candidate.dataset.bcpDouyinCanvasText || "";
        clone.removeAttribute("aria-hidden");
        clone.style.setProperty(
          "font",
          candidate.dataset.bcpDouyinCanvasFont || computed.font,
          "important"
        );
        clone.style.setProperty(
          "color",
          candidate.dataset.bcpDouyinCanvasColor || "#ffffff",
          "important"
        );
        clone.style.setProperty(
          "text-shadow",
          candidate.dataset.bcpDouyinCanvasShadow || "0 1px 2px rgb(0 0 0 / 80%)",
          "important"
        );
        const stroke = candidate.dataset.bcpDouyinCanvasStroke;
        if (stroke && stroke !== "transparent") {
          clone.style.setProperty("-webkit-text-stroke", `1px ${stroke}`, "important");
        }
      }
      clone.style.setProperty("line-height", "1", "important");
      clone.style.setProperty("overflow", "visible", "important");
    }

    clone.style.setProperty("position", "fixed", "important");
    clone.style.setProperty("left", `${rect.left}px`, "important");
    clone.style.setProperty("top", `${rect.top}px`, "important");
    clone.style.setProperty("right", "auto", "important");
    clone.style.setProperty("bottom", "auto", "important");
    clone.style.setProperty("width", `${rect.width}px`, "important");
    clone.style.setProperty("height", `${rect.height}px`, "important");
    clone.style.setProperty("margin", "0", "important");
    clone.style.setProperty("transform", "none", "important");
    clone.style.setProperty("animation", "none", "important");
    clone.style.setProperty("transition", "none", "important");
    clone.style.setProperty("visibility", "visible", "important");
    clone.style.setProperty("pointer-events", "none", "important");
    clone.style.setProperty("z-index", "2147483646", "important");

    state.originalVisibility = {
      value: candidate.style.getPropertyValue("visibility"),
      priority: candidate.style.getPropertyPriority("visibility")
    };
    state.pausedAnimations = typeof candidate.getAnimations === "function"
      ? candidate.getAnimations({ subtree: true }).map((animation) => ({
        animation,
        shouldResume: animation.playState === "running"
      }))
      : [];

    for (const item of state.pausedAnimations) {
      try {
        item.animation.pause();
      } catch (_error) {
        // The site may discard an animation between discovery and pausing.
      }
    }

    candidate.style.setProperty("visibility", "hidden", "important");
    if (isDouyinCanvas) {
      window.postMessage({
        source: "bullet-plus-one-content",
        type: "freeze-douyin-canvas",
        trackId: candidate.dataset.bcpDouyinCanvasId,
        trackIds: candidate.dataset.bcpDouyinCanvasTrackIds,
        text: candidate.dataset.bcpDouyinCanvasText || ""
      }, "*");
    }
    ensurePortal().appendChild(clone);
    state.frozenClone = clone;
  }

  function unfreezeOverlayCandidate() {
    const candidate = state.candidate;
    const frozenClone = state.frozenClone;
    const isDouyinCanvas = candidate && candidate.dataset.bcpDouyinCanvas === "true";
    const releaseDouyinTracks = () => {
      window.postMessage({
        source: "bullet-plus-one-content",
        type: "unfreeze-douyin-canvas",
        trackId: candidate.dataset.bcpDouyinCanvasId,
        trackIds: candidate.dataset.bcpDouyinCanvasTrackIds,
        text: candidate.dataset.bcpDouyinCanvasText || ""
      }, "*");
    };

    if (isDouyinCanvas && frozenClone && frozenClone.isConnected) {
      state.frozenClone = null;
      frozenClone.classList.add("bcp-one-resuming");
      frozenClone.style.removeProperty("transform");
      const rect = frozenClone.getBoundingClientRect();
      const measuredVelocity = Number(candidate.dataset.bcpDouyinCanvasVelocityX);
      const speed = measuredVelocity < -0.005
        ? Math.min(0.8, Math.max(0.04, -measuredVelocity))
        : 0.12;
      const distance = Math.max(32, rect.right + OVERLAY_HOVER_PADDING);
      const duration = Math.min(12_000, Math.max(400, distance / speed));
      let animation = null;
      try {
        animation = frozenClone.animate([
          { transform: "translateX(0)" },
          { transform: `translateX(-${distance}px)` }
        ], {
          duration,
          easing: "linear",
          fill: "forwards"
        });
      } catch (_error) {
        animation = null;
      }

      if (animation) {
        animation.finished.then(() => {
          frozenClone.remove();
          releaseDouyinTracks();
        }, () => {
          frozenClone.remove();
          releaseDouyinTracks();
        });
      } else {
        frozenClone.remove();
        releaseDouyinTracks();
      }
    } else {
      if (isDouyinCanvas) {
        releaseDouyinTracks();
      }
      if (frozenClone) {
        frozenClone.remove();
        state.frozenClone = null;
      }
    }

    if (state.candidate && state.candidate.isConnected && state.originalVisibility) {
      if (state.originalVisibility.value) {
        state.candidate.style.setProperty(
          "visibility",
          state.originalVisibility.value,
          state.originalVisibility.priority
        );
      } else {
        state.candidate.style.removeProperty("visibility");
      }
    }

    for (const item of state.pausedAnimations) {
      if (item.shouldResume) {
        try {
          item.animation.play();
        } catch (_error) {
          // Ignore animations removed by the site's danmaku renderer.
        }
      }
    }

    state.originalVisibility = null;
    state.pausedAnimations = [];
  }

  function updateButtonPosition() {
    const positionTarget = state.frozenClone || state.candidate;
    if (!positionTarget || !state.button || state.button.hidden || !positionTarget.isConnected) {
      return;
    }

    const rect = positionTarget.getBoundingClientRect();
    const buttonRect = state.button.getBoundingClientRect();
    const preferredLeft = rect.right + 8;
    const fallbackLeft = rect.right - buttonRect.width - 4;
    const left = preferredLeft + buttonRect.width <= innerWidth - 8 ? preferredLeft : fallbackLeft;
    const top = rect.top + (rect.height - buttonRect.height) / 2;

    state.button.style.left = `${Math.max(8, Math.min(left, innerWidth - buttonRect.width - 8))}px`;
    state.button.style.top = `${Math.max(8, Math.min(top, innerHeight - buttonRect.height - 8))}px`;
  }

  function stopPositionTracking() {
    if (state.positionFrame) {
      cancelAnimationFrame(state.positionFrame);
      state.positionFrame = 0;
    }
  }

  function startPositionTracking() {
    stopPositionTracking();

    const track = () => {
      state.positionFrame = 0;
      if (state.candidateKind !== "overlay" || !state.candidate || !state.candidate.isConnected) {
        return;
      }

      updateButtonPosition();
      state.positionFrame = requestAnimationFrame(track);
    };

    state.positionFrame = requestAnimationFrame(track);
  }

  function selectCandidate(candidate, kind) {
    if (kind === "overlay" && !isOverlayMessageElement(candidate)) {
      return false;
    }

    const isDouyinCanvas = candidate.dataset.bcpDouyinCanvas === "true";
    const message = isDouyinCanvas
      ? shared.parseMessageText(candidate.dataset.bcpDouyinCanvasText, config.maxLength)
      : textFromCandidate(candidate);
    if (!shared.isPlausibleMessage(message, config.maxLength)) {
      return false;
    }

    cancelHide();
    clearSelection();
    state.candidate = candidate;
    state.candidateKind = kind || "chat";
    state.message = message;
    candidate.classList.add("bcp-one-target");
    if (state.candidateKind === "overlay") {
      freezeOverlayCandidate(candidate);
    }

    const button = ensureButton();
    button.hidden = false;
    button.title = `复读：${message}`;
    button.setAttribute("aria-label", `弹幕加一：${message}`);
    updateButtonPosition();

    if (isDouyinCanvas) {
      setTimeout(() => {
        if (state.candidate !== candidate) {
          return;
        }
        const richMessage = resolveDouyinCanvasMessage(message) || message;
        if (!shared.isPlausibleMessage(richMessage, config.maxLength)) {
          return;
        }
        state.message = richMessage;
        button.title = `复读：${richMessage}`;
        button.setAttribute("aria-label", `弹幕加一：${richMessage}`);
      }, 0);
    }
    return true;
  }

  function clearSelection() {
    if (state.candidate && state.candidate.isConnected) {
      state.candidate.classList.remove("bcp-one-target");
    }

    unfreezeOverlayCandidate();
    state.candidate = null;
    state.candidateKind = null;
    state.message = "";
    stopPositionTracking();
    if (state.button) {
      state.button.hidden = true;
    }
  }

  function cancelHide() {
    if (state.hideTimer) {
      clearTimeout(state.hideTimer);
      state.hideTimer = 0;
    }
  }

  function scheduleHide(delay) {
    if (state.hideTimer) {
      return;
    }
    const timeout = Number.isFinite(delay)
      ? delay
      : (state.candidateKind === "overlay" ? OVERLAY_LEAVE_DELAY : 180);
    state.hideTimer = setTimeout(() => {
      state.hideTimer = 0;
      clearSelection();
    }, timeout);
  }

  function showToast(message, kind) {
    if (state.toast) {
      state.toast.remove();
    }

    const toast = document.createElement("div");
    toast.className = `bcp-one-toast bcp-one-toast--${kind || "info"}`;
    toast.dataset.bcpOneOwned = "true";
    toast.textContent = message;
    ensurePortal().appendChild(toast);
    state.toast = toast;

    requestAnimationFrame(() => toast.classList.add("is-visible"));
    setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => toast.remove(), 180);
      if (state.toast === toast) {
        state.toast = null;
      }
    }, 1800);
  }

  function findInput() {
    const candidates = queryAllDeep(config.inputs);
    const usable = candidates.filter((element) => {
      const disabled = element.matches(":disabled")
        || element.getAttribute("aria-disabled") === "true"
        || element.getAttribute("contenteditable") === "false";
      return !disabled && element.isConnected;
    });
    const visible = usable.find((element) => isVisible(element));
    if (visible) {
      return visible;
    }

    // Native fullscreen only renders descendants of the fullscreen player.
    // Bilibili keeps its real chat input outside that subtree, but its event
    // handlers remain usable programmatically.
    if (platformId === "bilibili" && fullscreenElement()) {
      return usable[0] || null;
    }
    return null;
  }

  function inputText(input) {
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      return input.value;
    }
    return input.textContent || "";
  }

  function setNativeValue(input, value) {
    const hiddenBilibiliFullscreen = platformId === "bilibili"
      && Boolean(fullscreenElement())
      && !isVisible(input);
    if (!hiddenBilibiliFullscreen) {
      input.focus({ preventScroll: true });
    }

    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      const prototype = input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value");

      if (setter && setter.set) {
        setter.set.call(input, value);
      } else {
        input.value = value;
      }

      input.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        composed: true,
        data: value,
        inputType: "insertText"
      }));
      input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      return;
    }

    if (input.isContentEditable || input.getAttribute("contenteditable") === "true") {
      if (hiddenBilibiliFullscreen) {
        input.textContent = value;
        input.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          composed: true,
          data: value,
          inputType: "insertText"
        }));
        return;
      }

      input.dispatchEvent(new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: value,
        inputType: "insertText"
      }));

      let inserted = false;
      try {
        document.execCommand("selectAll", false, null);
        inserted = document.execCommand("insertText", false, value);
      } catch (_error) {
        inserted = false;
      }

      if (!inserted) {
        input.textContent = value;
      }

      input.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        composed: true,
        data: value,
        inputType: "insertText"
      }));
    }
  }

  function buttonScore(button, input, selectorIndex, scopeBonus) {
    const visible = isVisible(button);
    const allowHidden = platformId === "bilibili" && Boolean(fullscreenElement());
    if ((!visible && !allowHidden)
      || button.matches(":disabled")
      || button.getAttribute("aria-disabled") === "true"
      || typeof button.click !== "function") {
      return -Infinity;
    }

    const text = shared.normalizeWhitespace(button.innerText || button.textContent || button.getAttribute("aria-label"));
    const marker = [
      button.getAttribute("data-e2e"),
      button.getAttribute("data-testid"),
      button.getAttribute("aria-label"),
      typeof button.className === "string" ? button.className : ""
    ].filter(Boolean).join(" ");
    let score = 100 - selectorIndex + (scopeBonus || 0);

    if (!visible) {
      score -= 80;
    }

    if (/^(发送|发 送|send)$/i.test(text)) {
      score += 200;
    } else if (/(发送|send)/i.test(text)) {
      score += 80;
    }
    if (/(send|发送|danmu|danmaku|comment)/i.test(marker)) {
      score += 120;
    }

    const inputRect = input.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const distance = Math.abs(buttonRect.left - inputRect.right) + Math.abs(buttonRect.top - inputRect.top);
    return score - Math.min(distance / 10, 100);
  }

  function findSendButton(input) {
    const candidates = [];
    const seen = new Set();

    const addCandidate = (button, selectorIndex, scopeBonus) => {
      if (!seen.has(button)) {
        seen.add(button);
        candidates.push({ button, selectorIndex, scopeBonus });
      }
    };

    let parent = input.parentElement;
    for (let depth = 0; parent && depth < 6; depth += 1, parent = parent.parentElement) {
      const nearby = parent.querySelectorAll([
        "button",
        "[role='button']",
        "[data-e2e*='send' i]",
        "[data-testid*='send' i]",
        "[aria-label*='发送']",
        "[class*='send' i]"
      ].join(","));
      for (const button of nearby) {
        addCandidate(button, config.sendButtons.length + 1, 360 - depth * 50);
      }
    }

    config.sendButtons.forEach((selector, selectorIndex) => {
      for (const button of queryAllDeep([selector])) {
        addCandidate(button, selectorIndex, 0);
      }
    });

    candidates.sort((a, b) => buttonScore(b.button, input, b.selectorIndex, b.scopeBonus)
      - buttonScore(a.button, input, a.selectorIndex, a.scopeBonus));
    return candidates.length
      && buttonScore(
        candidates[0].button,
        input,
        candidates[0].selectorIndex,
        candidates[0].scopeBonus
      ) > -Infinity
      ? candidates[0].button
      : null;
  }

  function pressEnter(input) {
    const init = {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      composed: true
    };

    input.dispatchEvent(new KeyboardEvent("keydown", init));
    input.dispatchEvent(new KeyboardEvent("keypress", init));
    input.dispatchEvent(new KeyboardEvent("keyup", init));
  }

  function inputStillContainsMessage(input, message) {
    if (!input || !input.isConnected) {
      return false;
    }
    return shared.normalizeWhitespace(inputText(input))
      === shared.normalizeWhitespace(message);
  }

  async function waitForInputConsumption(input, message, timeout) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (!inputStillContainsMessage(input, message)) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return !inputStillContainsMessage(input, message);
  }

  function releaseInputFocus(input) {
    const quickBarStyleProperties = ["display", "visibility", "opacity", "pointer-events"];
    const restorePlaybackState = (snapshots) => {
      for (const snapshot of snapshots) {
        if (!snapshot.video.isConnected) {
          continue;
        }
        if (snapshot.paused && !snapshot.video.paused) {
          snapshot.video.pause();
        } else if (!snapshot.paused && snapshot.video.paused) {
          const playResult = snapshot.video.play();
          if (playResult && typeof playResult.catch === "function") {
            playResult.catch(() => {});
          }
        }
      }
    };

    const forceHideBilibiliQuickBars = (quickEditors) => {
      for (const editor of quickEditors) {
        const player = fullscreenElement()
          || closestMatching(editor, config.videoRoots)
          || queryAllDeep(config.videoRoots).find((element) => isVisible(element));
        let container = editor.closest([
          ".bpx-player-ctrl-dm-input",
          ".bilibili-player-video-danmaku-input-wrap",
          "[class*='danmaku-input']",
          "[class*='dm-input']"
        ].join(","));
        if (!container || container === editor) {
          container = editor.parentElement || editor;
          const playerRect = player && player.getBoundingClientRect();
          let current = container;
          for (let depth = 0; current && current !== player && depth < 5; depth += 1) {
            const rect = current.getBoundingClientRect();
            const widthLimit = playerRect && playerRect.width > 0
              ? playerRect.width * 0.9
              : Math.max(800, innerWidth * 0.8);
            if (rect.height <= 0 || rect.height > 120 || rect.width > widthLimit) {
              break;
            }
            container = current;
            current = current.parentElement;
          }
        }
        if (state.hiddenBilibiliQuickBars.has(container)) {
          state.hiddenBilibiliQuickBars.get(container).hiddenAt = Date.now();
          container.style.setProperty("display", "none", "important");
          container.style.setProperty("visibility", "hidden", "important");
          container.style.setProperty("opacity", "0", "important");
          container.style.setProperty("pointer-events", "none", "important");
          continue;
        }
        state.hiddenBilibiliQuickBars.set(container, {
          styles: Object.fromEntries(quickBarStyleProperties.map((property) => [property, {
            value: container.style.getPropertyValue(property),
            priority: container.style.getPropertyPriority(property)
          }])),
          hiddenAt: Date.now()
        });
        container.style.setProperty("display", "none", "important");
        container.style.setProperty("visibility", "hidden", "important");
        container.style.setProperty("opacity", "0", "important");
        container.style.setProperty("pointer-events", "none", "important");
      }
    };

    const dismissBilibiliQuickInput = () => {
      const player = fullscreenElement()
        || closestMatching(input, config.videoRoots)
        || queryAllDeep(config.videoRoots).find((element) => isVisible(element));
      const quickEditorSet = new Set(queryAllDeep(BILIBILI_QUICK_INPUTS));
      const addIfPlayerEditor = (editor) => {
        if (!(editor instanceof HTMLElement) || !editor.isConnected || !isVisible(editor)) {
          return;
        }
        const looksEditable = editor.matches(
          "input, textarea, [contenteditable='true'], [role='textbox']"
        );
        if (!looksEditable) {
          return;
        }
        const owner = closestMatching(editor, config.videoRoots);
        const playerRect = player && player.getBoundingClientRect();
        const playerCoversViewport = Boolean(playerRect
          && playerRect.width >= innerWidth * 0.85
          && playerRect.height >= innerHeight * 0.75);
        if ((player && player.contains(editor)) || owner || (editor === input && playerCoversViewport)) {
          quickEditorSet.add(editor);
        }
      };
      addIfPlayerEditor(input);
      addIfPlayerEditor(document.activeElement);
      if (player) {
        const playerRect = player.getBoundingClientRect();
        for (const editor of player.querySelectorAll(
          "input, textarea, [contenteditable='true'], [role='textbox']"
        )) {
          if (!isVisible(editor)) {
            continue;
          }
          const rect = editor.getBoundingClientRect();
          if (rect.height >= 8
            && rect.height <= 100
            && rect.bottom >= playerRect.top + playerRect.height * 0.45) {
            quickEditorSet.add(editor);
          }
        }
      }
      const quickEditors = Array.from(quickEditorSet)
        .filter((editor) => editor.isConnected && isVisible(editor));
      if (!quickEditors.length) {
        return;
      }

      const escapeInit = {
        key: "Escape",
        code: "Escape",
        keyCode: 27,
        which: 27,
        bubbles: true,
        cancelable: true,
        composed: true
      };
      for (const editor of quickEditors) {
        editor.dispatchEvent(new KeyboardEvent("keydown", escapeInit));
        editor.dispatchEvent(new KeyboardEvent("keyup", escapeInit));
      }

      const playerRect = player && player.getBoundingClientRect();
      let outsideTarget = player && player.querySelector([
        ".bilibili-live-player-video-danmaku",
        ".bpx-player-video-wrap",
        ".bilibili-live-player-video-area",
        "video"
      ].join(","));
      if (!outsideTarget && playerRect && playerRect.width > 0 && playerRect.height > 0) {
        outsideTarget = document.elementFromPoint(
          playerRect.left + playerRect.width / 2,
          playerRect.top + playerRect.height * 0.55
        );
      }
      outsideTarget = outsideTarget || player || document.body || document.documentElement;
      if (!outsideTarget) {
        forceHideBilibiliQuickBars(quickEditors);
        return;
      }
      const videos = player
        ? Array.from(player.querySelectorAll("video")).map((video) => ({ video, paused: video.paused }))
        : [];
      const pointerInit = {
        bubbles: true,
        cancelable: true,
        composed: true,
        button: 0,
        buttons: 0,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true
      };
      outsideTarget.dispatchEvent(new PointerEvent("pointerdown", pointerInit));
      outsideTarget.dispatchEvent(new MouseEvent("mousedown", pointerInit));
      outsideTarget.dispatchEvent(new PointerEvent("pointerup", pointerInit));
      outsideTarget.dispatchEvent(new MouseEvent("mouseup", pointerInit));
      outsideTarget.dispatchEvent(new MouseEvent("click", pointerInit));
      restorePlaybackState(videos);
      setTimeout(() => restorePlaybackState(videos), 80);
      setTimeout(() => {
        const stillVisible = quickEditors.filter((editor) => editor.isConnected && isVisible(editor));
        if (stillVisible.length) {
          forceHideBilibiliQuickBars(stillVisible);
        }
      }, 60);
    };

    const release = () => {
      const editors = new Set(input ? [input] : []);
      if (platformId === "bilibili") {
        for (const editor of queryAllDeep(config.inputs)) {
          editors.add(editor);
        }
      }

      for (const editor of editors) {
        if (!editor || typeof editor.blur !== "function") {
          continue;
        }
        try {
          editor.blur();
        } catch (_error) {
          // Bilibili may replace its fullscreen editor during the send cycle.
        }
      }

      if (platformId === "bilibili") {
        const active = document.activeElement;
        const fullPlayer = fullscreenElement();
        if (active instanceof HTMLElement
          && fullPlayer
          && fullPlayer.contains(active)
          && active.matches("input, textarea, [contenteditable='true'], [role='textbox']")) {
          active.blur();
        }
        dismissBilibiliQuickInput();
      }
    };

    release();
    if (platformId === "bilibili") {
      // The fullscreen player focuses its quick editor again after its send
      // handler returns. Recheck across that short asynchronous focus cycle.
      [80, 200, 400, 700, 1100, 1600].forEach((delay) => setTimeout(release, delay));
    }
  }

  async function repeatMessage(message) {
    const now = Date.now();
    if (now - state.lastActionAt < 700) {
      showToast("操作太快，请稍后再试", "warning");
      return;
    }
    state.lastActionAt = now;

    const input = findInput();
    if (!input) {
      showToast(`未找到${config.name}弹幕输入框，请确认已登录并展开聊天区`, "error");
      return;
    }

    setNativeValue(input, message);
    await new Promise((resolve) => setTimeout(resolve, 80));
    let button = findSendButton(input);

    if (button) {
      button.click();
    } else {
      pressEnter(input);
    }

    // Live sites occasionally replace or temporarily disable their send
    // control after the editor updates. Do not report success merely because a
    // stale button accepted click(); a successful send consumes the editor.
    let consumed = await waitForInputConsumption(input, message, 320);
    if (!consumed) {
      pressEnter(input);
      consumed = await waitForInputConsumption(input, message, 260);
    }

    // Re-query after the framework has processed the input event. Bilibili in
    // particular may mount an enabled send control only after that update.
    if (!consumed) {
      button = findSendButton(input);
      if (button) {
        button.click();
        consumed = await waitForInputConsumption(input, message, 320);
      }
    }

    if (!consumed) {
      showToast("自动发送失败，弹幕仍在输入框，请重试", "error");
      return;
    }

    releaseInputFocus(input);
    showToast("已执行 +1", "success");
  }

  function onPlusOneClick(event) {
    event.preventDefault();
    event.stopPropagation();
    let message = state.message;
    if (state.candidate && state.candidate.dataset.bcpDouyinCanvas === "true") {
      const canvasText = shared.parseMessageText(
        state.candidate.dataset.bcpDouyinCanvasText,
        config.maxLength
      );
      message = resolveDouyinCanvasMessage(canvasText) || message || canvasText;
      state.message = message;
    }
    if (message) {
      repeatMessage(message);
    }
    scheduleHide();
  }

  function onPointerOver(event) {
    if (!isEnabled() || isOwned(event.target)) {
      return;
    }

    if (isInsideFrozenHoverZone(event.clientX, event.clientY)) {
      cancelHide();
      return;
    }

    const path = event.composedPath ? event.composedPath() : [event.target];
    const found = findCandidate(path);
    if (found && found.element !== state.candidate) {
      selectCandidate(found.element, found.kind);
    }
  }

  function restoreBilibiliQuickBars(event) {
    if (platformId !== "bilibili" || !state.hiddenBilibiliQuickBars.size) {
      return;
    }
    if (event && !event.isTrusted) {
      return;
    }
    if (event && event.type === "keydown" && event.key !== "Enter") {
      return;
    }
    if (event && event.type === "pointerdown") {
      const marker = (event.composedPath ? event.composedPath() : [event.target])
        .filter((item) => item instanceof Element)
        .slice(0, 6)
        .map((item) => [
          item.id,
          typeof item.className === "string" ? item.className : "",
          item.getAttribute("aria-label"),
          item.getAttribute("title")
        ].filter(Boolean).join(" "))
        .join(" ");
      if (!/(danmaku|danmu|\bdm\b|弹幕|send|发送|input)/i.test(marker)) {
        return;
      }
    }
    const now = Date.now();
    for (const [container, saved] of state.hiddenBilibiliQuickBars) {
      if (now - saved.hiddenAt < 500) {
        continue;
      }
      if (container.isConnected) {
        for (const property of ["display", "visibility", "opacity", "pointer-events"]) {
          const style = saved.styles && saved.styles[property];
          if (style && style.value) {
            container.style.setProperty(property, style.value, style.priority);
          } else {
            container.style.removeProperty(property);
          }
        }
      }
      state.hiddenBilibiliQuickBars.delete(container);
    }
  }

  function onPointerMove(event) {
    if (!isEnabled()) {
      return;
    }

    if (isOwned(event.target)) {
      cancelHide();
      return;
    }

    state.pointerX = event.clientX;
    state.pointerY = event.clientY;

    if (state.candidateKind === "overlay" && state.frozenClone && state.frozenClone.isConnected) {
      const insideHoverZone = isInsideFrozenHoverZone(state.pointerX, state.pointerY);
      if (insideHoverZone) {
        cancelHide();
      } else {
        scheduleHide();
      }
      return;
    }

    if (state.pointerFrame) {
      return;
    }

    state.pointerFrame = requestAnimationFrame(() => {
      state.pointerFrame = 0;
      const candidate = findOverlayAtPoint(state.pointerX, state.pointerY);
      if (candidate) {
        cancelHide();
        if (candidate !== state.candidate) {
          selectCandidate(candidate, "overlay");
        }
      } else if (state.candidateKind === "overlay") {
        scheduleHide();
      }
    });
  }

  function onPointerOut(event) {
    if (!state.candidate) {
      return;
    }

    const next = event.relatedTarget;
    if (next && (state.candidate.contains(next) || isOwned(next))) {
      return;
    }

    if (isInsideFrozenHoverZone(event.clientX, event.clientY)) {
      cancelHide();
      return;
    }

    const path = event.composedPath ? event.composedPath() : [event.target];
    if (path.includes(state.candidate)) {
      scheduleHide();
    }
  }

  function onAltClick(event) {
    if (!isEnabled() || !state.settings.altClick || !event.altKey || isOwned(event.target)) {
      return;
    }

    const path = event.composedPath ? event.composedPath() : [event.target];
    let found = findCandidate(path);
    if (!found) {
      const overlay = findOverlayAtPoint(event.clientX, event.clientY);
      found = overlay ? { element: overlay, kind: "overlay" } : null;
    }
    if (!found || !selectCandidate(found.element, found.kind)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    let message = state.message;
    if (state.candidate && state.candidate.dataset.bcpDouyinCanvas === "true") {
      const canvasText = shared.parseMessageText(
        state.candidate.dataset.bcpDouyinCanvasText,
        config.maxLength
      );
      message = resolveDouyinCanvasMessage(canvasText) || message || canvasText;
      state.message = message;
    }
    repeatMessage(message);
    scheduleHide();
  }

  function onViewportChange() {
    requestAnimationFrame(updateButtonPosition);
  }

  function onFullscreenChange() {
    restoreBilibiliQuickBars(null);
    ensurePortal();
    requestAnimationFrame(updateButtonPosition);
  }

  function applySettings(saved) {
    state.settings = shared.mergeSettings(saved);
    if (!isEnabled()) {
      clearSelection();
    }
  }

  storageGet().then(applySettings);
  ensureButton();
  document.addEventListener("pointerover", onPointerOver, true);
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("pointerout", onPointerOut, true);
  document.addEventListener("click", onAltClick, true);
  document.addEventListener("pointerdown", restoreBilibiliQuickBars, true);
  document.addEventListener("keydown", restoreBilibiliQuickBars, true);
  document.addEventListener("fullscreenchange", onFullscreenChange, true);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange, true);
  addEventListener("scroll", onViewportChange, true);
  addEventListener("resize", onViewportChange, { passive: true });

  if (globalThis.chrome && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((_changes, areaName) => {
      if (areaName === "sync") {
        storageGet().then(applySettings);
      }
    });
  }
})();
