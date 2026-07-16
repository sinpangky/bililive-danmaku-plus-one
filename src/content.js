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
  const EDITABLE_CONTROL_SELECTOR = [
    "input",
    "textarea",
    "[contenteditable='true']",
    "[role='textbox']"
  ].join(",");
  const BILIBILI_QUICK_BAR_SELECTORS = [
    ".bpx-player-ctrl-dm-input",
    ".bilibili-player-video-danmaku-input-wrap",
    ".bilibili-player-video-danmaku-input",
    "[class*='danmaku-input']",
    "[class*='dm-input']"
  ];
  const BILIBILI_QUICK_INPUTS = [
    ".bpx-player-dm-input",
    ".bilibili-player-video-danmaku-input",
    ".bpx-player-ctrl-dm-input input",
    ".bpx-player-ctrl-dm-input textarea",
    ".bpx-player-ctrl-dm-input [contenteditable='true']",
    ".bpx-player-ctrl-dm-input [role='textbox']",
    ".bilibili-player-video-danmaku-input-wrap input",
    ".bilibili-player-video-danmaku-input-wrap textarea",
    ".bilibili-player-video-danmaku-input-wrap [contenteditable='true']",
    ".bilibili-player-video-danmaku-input-wrap [role='textbox']"
  ];
  const BILIBILI_CHAT_ACTION_SURFACES = [
    "[role='dialog']",
    "[role='menu']",
    "[role='listbox']",
    "[class*='user-card']",
    "[class*='userCard']",
    "[class*='user-info']",
    "[class*='userInfo']",
    "[class*='user-panel']",
    "[class*='userPanel']",
    "[class*='profile-card']",
    "[class*='profileCard']",
    "[class*='danmaku-menu']",
    "[class*='danmakuMenu']",
    "[class*='action-panel']",
    "[class*='actionPanel']",
    "[class*='popover']",
    "[class*='popper']",
    "[class*='context-menu']",
    "[class*='contextMenu']"
  ];
  const BILIBILI_CHAT_ACTION_TEXT = /(?:@|举报|禁言|关注|取关|拉黑|屏蔽|用户资料|个人主页)/i;
  const BILIBILI_CHAT_STRONG_ACTION_TEXT = /(?:举报|禁言|关注|取关|拉黑|屏蔽|用户资料|个人主页)/i;
  const BILIBILI_EMOJI_TOGGLE_SELECTORS = [
    "[data-testid*='emoji' i]",
    "[data-e2e*='emoji' i]",
    "[aria-label*='表情']",
    "[title*='表情']",
    "[class*='emoji-btn' i]",
    "[class*='emojiBtn']",
    "[class*='emoticon-btn' i]",
    "[class*='emotion-btn' i]",
    "[class*='face-btn' i]",
    "button[class*='emoji' i]",
    "button[class*='emoticon' i]",
    "button[class*='face' i]",
    "[role='button'][class*='emoji' i]",
    "[role='button'][class*='face' i]"
  ];
  const BILIBILI_EMOJI_SURFACE_SELECTORS = [
    "[data-testid*='emoji' i]",
    "[data-e2e*='emoji' i]",
    "[class*='emoji-panel' i]",
    "[class*='emojiPanel']",
    "[class*='emoticon-panel' i]",
    "[class*='emotion-panel' i]",
    "[class*='face-panel' i]",
    "[class*='emoji-list' i]",
    "[class*='emoticon-list' i]"
  ];
  const OVERLAY_HOVER_PADDING = 14;
  const OVERLAY_LEAVE_DELAY = 160;
  const state = {
    settings: shared.mergeSettings(),
    candidate: null,
    candidateKind: null,
    message: "",
    richPayload: null,
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
    hiddenBilibiliQuickBars: new Map(),
    bilibiliDismissToken: 0,
    chatScrollLock: null,
    chatScrollFrame: 0
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

  function elementMarker(element) {
    if (!(element instanceof Element)) {
      return "";
    }
    return [
      element.tagName,
      element.id,
      typeof element.className === "string" ? element.className : "",
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.getAttribute("placeholder"),
      element.getAttribute("data-placeholder"),
      element.getAttribute("role")
    ].filter(Boolean).join(" ");
  }

  function isBilibiliQuickInputRegion(element) {
    if (platformId !== "bilibili" || !(element instanceof Element)) {
      return false;
    }

    if (closestMatching(element, BILIBILI_QUICK_BAR_SELECTORS)) {
      return true;
    }

    const insidePlayer = Boolean(closestMatching(element, config.videoRoots));
    if (!insidePlayer) {
      return false;
    }

    if (element.matches(EDITABLE_CONTROL_SELECTOR)) {
      return true;
    }

    const nestedEditor = element.querySelector(EDITABLE_CONTROL_SELECTOR);
    if (nestedEditor && !matchesAny(element, config.videoRoots)) {
      const rect = element.getBoundingClientRect();
      if (rect.height > 0
        && rect.height <= 160
        && rect.width <= Math.max(900, innerWidth * 0.95)) {
        return true;
      }
    }

    return /(?:danmaku|danmu|dm)[-_ ]?(?:input|send)|(?:input|send)[-_ ]?(?:danmaku|danmu|dm)|快捷(?:输入|发送)|发送弹幕/i
      .test(elementMarker(element));
  }

  function pathTouchesBilibiliQuickInput(path) {
    return platformId === "bilibili"
      && path.some((item) => item instanceof Element && isBilibiliQuickInputRegion(item));
  }

  function pathTouchesBilibiliChatActions(path) {
    if (platformId !== "bilibili") {
      return false;
    }

    for (const item of path) {
      if (!(item instanceof Element)) {
        continue;
      }
      if (closestMatching(item, config.userNames)) {
        return true;
      }
      const actionSurface = closestMatching(item, BILIBILI_CHAT_ACTION_SURFACES);
      if (actionSurface) {
        const role = actionSurface.getAttribute("role") || "";
        const text = shared.normalizeWhitespace(
          actionSurface.innerText || actionSurface.textContent
        ).slice(0, 500);
        if (/^(?:dialog|menu|listbox)$/i.test(role) || BILIBILI_CHAT_ACTION_TEXT.test(text)) {
          return true;
        }
      }
      const control = closestMatching(item, ["button", "a", "[role='button']", "[role='menuitem']"]);
      if (control && BILIBILI_CHAT_ACTION_TEXT.test(
        shared.normalizeWhitespace(control.innerText || control.textContent)
      )) {
        return true;
      }
      const itemText = shared.normalizeWhitespace(item.innerText || item.textContent).slice(0, 500);
      if (BILIBILI_CHAT_STRONG_ACTION_TEXT.test(itemText)) {
        const position = getComputedStyle(item).position;
        if (position === "fixed" || position === "absolute") {
          return true;
        }
      }
    }
    return false;
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

  function canPauseChatScroll() {
    return platformId === "huya" || platformId === "bilibili";
  }

  function chatScrollTargets(root) {
    const targets = [];
    const seen = new Set();
    const add = (element, fallback) => {
      if (!(element instanceof HTMLElement) || seen.has(element)
          || element === document.body || element === document.documentElement) {
        return;
      }
      const style = getComputedStyle(element);
      const scrollable = element.scrollHeight > element.clientHeight + 1
        && /(?:auto|scroll|overlay|hidden)/i.test(style.overflowY);
      if (!scrollable && !fallback) {
        return;
      }
      seen.add(element);
      targets.push({
        element,
        top: element.scrollTop,
        left: element.scrollLeft
      });
    };

    add(root, true);
    let ancestor = root.parentElement;
    for (let depth = 0; ancestor && depth < 5; depth += 1, ancestor = ancestor.parentElement) {
      add(ancestor, false);
    }
    let descendants = [];
    try {
      descendants = Array.from(root.querySelectorAll("*")).slice(0, 160);
    } catch (_error) {
      descendants = [];
    }
    descendants.forEach((element) => add(element, false));
    return targets;
  }

  function maintainChatScrollLock() {
    state.chatScrollFrame = 0;
    const lock = state.chatScrollLock;
    if (!lock || !isEnabled() || !lock.root.isConnected) {
      releaseChatScrollLock();
      return;
    }
    lock.targets.forEach((target) => {
      if (!target.element.isConnected) {
        return;
      }
      if (Math.abs(target.element.scrollTop - target.top) > 0.5) {
        target.element.scrollTop = target.top;
      }
      if (Math.abs(target.element.scrollLeft - target.left) > 0.5) {
        target.element.scrollLeft = target.left;
      }
    });
    state.chatScrollFrame = requestAnimationFrame(maintainChatScrollLock);
  }

  function pauseChatScroll(root) {
    if (!canPauseChatScroll() || !(root instanceof Element)) {
      return;
    }
    if (state.chatScrollLock && state.chatScrollLock.root === root) {
      return;
    }
    releaseChatScrollLock();
    state.chatScrollLock = {
      root,
      targets: chatScrollTargets(root)
    };
    root.dataset.bcpOneScrollPaused = "true";
    state.chatScrollFrame = requestAnimationFrame(maintainChatScrollLock);
  }

  function releaseChatScrollLock() {
    if (state.chatScrollFrame) {
      cancelAnimationFrame(state.chatScrollFrame);
      state.chatScrollFrame = 0;
    }
    const lock = state.chatScrollLock;
    state.chatScrollLock = null;
    if (lock && lock.root.isConnected) {
      delete lock.root.dataset.bcpOneScrollPaused;
    }
  }

  function updateChatScrollLock(path) {
    if (!canPauseChatScroll()) {
      return;
    }
    const root = findChatRoot(path);
    if (root) {
      pauseChatScroll(root);
    }
  }

  function releaseChatScrollLockAfterPointerOut(next) {
    const lock = state.chatScrollLock;
    if (!lock) {
      return;
    }
    const element = next instanceof Element ? next : null;
    if (element && (lock.root.contains(element)
        || (state.button && state.button.contains(element)))) {
      return;
    }
    releaseChatScrollLock();
  }

  function findCandidate(path) {
    if (pathTouchesBilibiliQuickInput(path) || pathTouchesBilibiliChatActions(path)) {
      return null;
    }

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

  function overlayMessageForValidation(element) {
    const plainText = element.dataset.bcpDouyinCanvas === "true"
      ? shared.parseMessageText(element.dataset.bcpDouyinCanvasText, config.maxLength)
      : textFromCandidate(element);
    if (shared.isPlausibleMessage(plainText, config.maxLength)) {
      return plainText;
    }
    if (platformId !== "bilibili") {
      return "";
    }

    // Bilibili renders image-only video emoticons without textContent. Reuse
    // the rich payload parser here so known danmaku nodes are not rejected
    // before selectCandidate() can preserve and resend their image asset.
    const payload = richPayloadFromCandidate(element);
    return payload.assets.length && shared.isPlausibleMessage(payload.text, config.maxLength)
      ? payload.text
      : "";
  }

  function isOverlayMessageElement(element) {
    if (!(element instanceof Element) || isOwned(element) || !isVisible(element)) {
      return false;
    }

    if (isBilibiliQuickInputRegion(element)
      || matchesAny(element, config.videoRoots)
      || element.matches("video, canvas, button, input, textarea, [role='button'], [contenteditable='true']")) {
      return false;
    }

    if (element.querySelector(EDITABLE_CONTROL_SELECTOR)) {
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

    return Boolean(overlayMessageForValidation(element));
  }

  function isGenericOverlayElement(element) {
    if (!(element instanceof Element) || isOwned(element)) {
      return false;
    }

    if (isBilibiliQuickInputRegion(element)
      || element.matches("button, input, textarea, video, canvas, a, [contenteditable='true']")
      || element.querySelector(EDITABLE_CONTROL_SELECTOR)) {
      return false;
    }

    const videoRoot = closestMatching(element, config.videoRoots);
    if (!videoRoot) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    const text = overlayMessageForValidation(element);
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
      && Boolean(text);
  }

  function isInsideFrozenHoverZone(x, y) {
    const workerCandidate = state.candidate
      && state.candidate.dataset.bcpDouyinWorker === "true"
      ? state.candidate
      : null;
    const frozenTarget = state.frozenClone && state.frozenClone.isConnected
      ? state.frozenClone
      : workerCandidate;
    return state.candidateKind === "overlay"
      && frozenTarget
      && pointInside(
        frozenTarget.getBoundingClientRect(),
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

  function normalizedAssetKeys(value) {
    const raw = shared.normalizeWhitespace(value);
    if (!raw) {
      return [];
    }
    const keys = new Set([`raw:${raw.toLowerCase().slice(0, 512)}`]);
    const unwrapped = raw.replace(/^\[|\]$/g, "").trim().toLowerCase();
    if (unwrapped) {
      keys.add(`name:${unwrapped.slice(0, 120)}`);
    }
    try {
      const url = new URL(raw, location.href);
      const pathname = decodeURIComponent(url.pathname).toLowerCase();
      if (pathname) {
        keys.add(`path:${pathname}`);
        const segments = pathname.split("/").filter(Boolean);
        if (segments.length) {
          const file = segments[segments.length - 1];
          keys.add(`file:${file}`);
          keys.add(`stem:${file.split(/[@~!]/, 1)[0]}`);
        }
      }
    } catch (_error) {
      // Tokens and internal emoji ids are not necessarily URLs.
    }
    return Array.from(keys);
  }

  function assetDescriptorFromElement(element) {
    if (!(element instanceof Element)) {
      return null;
    }
    const image = element instanceof HTMLImageElement
      ? element
      : element.querySelector("img");
    const sources = [
      image && image.currentSrc,
      image && image.getAttribute("src"),
      image && image.getAttribute("data-src"),
      image && image.getAttribute("data-url"),
      element.getAttribute("data-src"),
      element.getAttribute("data-url")
    ].filter(Boolean);
    const names = [
      image && emojiTokenFromImage(image),
      image && image.getAttribute("alt"),
      image && image.getAttribute("data-text"),
      image && image.getAttribute("data-emoji"),
      image && image.getAttribute("data-emoji-name"),
      image && image.getAttribute("data-emoticon"),
      image && image.getAttribute("data-id"),
      image && image.getAttribute("title"),
      image && image.getAttribute("aria-label"),
      element.getAttribute("data-text"),
      element.getAttribute("data-emoji"),
      element.getAttribute("data-emoji-name"),
      element.getAttribute("data-emoticon"),
      element.getAttribute("data-id"),
      element.getAttribute("title"),
      element.getAttribute("aria-label")
    ].filter(Boolean);
    const keys = new Set();
    sources.concat(names).forEach((value) => {
      normalizedAssetKeys(value).forEach((key) => keys.add(key));
    });
    if (!keys.size) {
      return null;
    }
    return {
      src: String(sources[0] || "").slice(0, 4096),
      token: shared.normalizeWhitespace(names[0] || "").slice(0, 120),
      keys: Array.from(keys).slice(0, 24)
    };
  }

  function messageElementFromCandidate(candidate) {
    if (!(candidate instanceof Element)) {
      return null;
    }
    for (const selector of config.messageText) {
      try {
        const element = candidate.matches(selector) ? candidate : candidate.querySelector(selector);
        if (element) {
          return element;
        }
      } catch (_error) {
        // Ignore selectors unsupported by an older Chromium build.
      }
    }
    return candidate;
  }

  function richPayloadFromCandidate(candidate) {
    const element = messageElementFromCandidate(candidate);
    if (!element) {
      return { text: "", plainText: "", assets: [] };
    }
    const assets = Array.from(element.querySelectorAll("img"))
      .filter((image) => !closestMatching(image, config.userNames)
        && !closestMatching(image, [
          "[class*='avatar' i]",
          "[class*='badge' i]",
          "[class*='medal' i]"
        ]))
      .map(assetDescriptorFromElement)
      .filter(Boolean)
      .slice(0, 8);
    const plainClone = element.cloneNode(true);
    plainClone.querySelectorAll("img,button,svg,[aria-hidden='true'],[data-bcp-one-owned]")
      .forEach((item) => item.remove());
    const plainText = shared.parseMessageText(plainClone.textContent, config.maxLength);
    let text = richTextFromElement(element);
    if (!shared.isPlausibleMessage(text, config.maxLength) && assets.length) {
      text = assets.map((asset) => asset.token).filter(Boolean).join(" ") || "图片表情";
    }
    return { text, plainText, assets };
  }

  function assetMatchScore(element, asset) {
    const descriptor = assetDescriptorFromElement(element);
    if (!descriptor || !asset || !Array.isArray(asset.keys)) {
      return 0;
    }
    const expected = new Set(asset.keys);
    let score = 0;
    descriptor.keys.forEach((key) => {
      if (expected.has(key)) {
        score += key.startsWith("raw:") ? 8 : key.startsWith("path:") ? 6 : 4;
      }
    });
    return score;
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

    const visibleLeft = Math.max(rect.left, sourceRect.left);
    const visibleTop = Math.max(rect.top, sourceRect.top);
    const visibleRight = Math.min(rect.right, sourceRect.right);
    const visibleBottom = Math.min(rect.bottom, sourceRect.bottom);
    const visibleWidth = visibleRight - visibleLeft;
    const visibleHeight = visibleBottom - visibleTop;
    if (visibleWidth <= 0 || visibleHeight <= 0) {
      return null;
    }

    const scaleX = source.width / sourceRect.width;
    const scaleY = source.height / sourceRect.height;
    const sourceX = (visibleLeft - sourceRect.left) * scaleX;
    const sourceY = (visibleTop - sourceRect.top) * scaleY;
    const sourceWidth = Math.min(visibleWidth * scaleX, source.width - sourceX);
    const sourceHeight = Math.min(visibleHeight * scaleY, source.height - sourceY);
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return null;
    }

    const snapshot = document.createElement("canvas");
    const pixelScale = Math.max(1, Math.min(4, Math.max(scaleX, scaleY)));
    snapshot.width = Math.max(1, Math.round(visibleWidth * pixelScale));
    snapshot.height = Math.max(1, Math.round(visibleHeight * pixelScale));
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
    return {
      element: snapshot,
      rect: {
        left: visibleLeft,
        top: visibleTop,
        width: visibleWidth,
        height: visibleHeight
      }
    };
  }

  function freezeOverlayCandidate(candidate) {
    const rect = candidate.getBoundingClientRect();
    const computed = getComputedStyle(candidate);
    const isDouyinCanvas = candidate.dataset.bcpDouyinCanvas === "true";
    const isDouyinWorker = candidate.dataset.bcpDouyinWorker === "true";
    if (isDouyinWorker) {
      window.postMessage({
        source: "bullet-plus-one-content",
        type: "freeze-douyin-canvas",
        trackId: candidate.dataset.bcpDouyinCanvasId,
        trackIds: candidate.dataset.bcpDouyinCanvasTrackIds,
        instanceId: candidate.dataset.bcpDouyinCanvasInstanceId,
        text: candidate.dataset.bcpDouyinCanvasText || ""
      }, "*");
      return;
    }
    const snapshot = isDouyinCanvas ? createDouyinCanvasSnapshot(candidate, rect) : null;
    const clone = snapshot ? snapshot.element : candidate.cloneNode(true);
    const frozenRect = snapshot ? snapshot.rect : rect;
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
    clone.style.setProperty("left", `${frozenRect.left}px`, "important");
    clone.style.setProperty("top", `${frozenRect.top}px`, "important");
    clone.style.setProperty("right", "auto", "important");
    clone.style.setProperty("bottom", "auto", "important");
    clone.style.setProperty("width", `${frozenRect.width}px`, "important");
    clone.style.setProperty("height", `${frozenRect.height}px`, "important");
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
        instanceId: candidate.dataset.bcpDouyinCanvasInstanceId,
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
        instanceId: candidate.dataset.bcpDouyinCanvasInstanceId,
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
        if (state.candidateKind === "overlay") {
          clearSelection();
        }
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
    const richPayload = isDouyinCanvas ? null : richPayloadFromCandidate(candidate);
    const message = isDouyinCanvas
      ? shared.parseMessageText(candidate.dataset.bcpDouyinCanvasText, config.maxLength)
      : (richPayload && richPayload.text) || textFromCandidate(candidate);
    if (!shared.isPlausibleMessage(message, config.maxLength)) {
      return false;
    }

    cancelHide();
    clearSelection();
    state.candidate = candidate;
    state.candidateKind = kind || "chat";
    state.message = message;
    state.richPayload = richPayload;
    candidate.classList.add("bcp-one-target");
    if (state.candidateKind === "overlay") {
      freezeOverlayCandidate(candidate);
      if (candidate.dataset.bcpDouyinWorker === "true") {
        startPositionTracking();
      }
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
    state.richPayload = null;
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
    const bilibiliDismissToken = platformId === "bilibili"
      ? ++state.bilibiliDismissToken
      : 0;
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
        let container = editor.closest(BILIBILI_QUICK_BAR_SELECTORS.join(","));
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
        if (bilibiliDismissToken !== state.bilibiliDismissToken) {
          return;
        }
        const stillVisible = quickEditors.filter((editor) => editor.isConnected && isVisible(editor));
        if (stillVisible.length) {
          forceHideBilibiliQuickBars(stillVisible);
        }
      }, 60);
    };

    const release = () => {
      if (platformId === "bilibili"
        && bilibiliDismissToken !== state.bilibiliDismissToken) {
        return;
      }

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

  function bilibiliEmojiItemCandidates() {
    const results = [];
    const seen = new Set();
    const add = (element) => {
      if (!(element instanceof Element) || seen.has(element) || !isVisible(element)
          || closestMatching(element, config.chatRoots) || isOwned(element)) {
        return;
      }
      seen.add(element);
      results.push(element);
    };
    queryAllDeep([
      "[data-emoji]",
      "[data-emoji-name]",
      "[data-emoticon]",
      "[data-emoticon-id]",
      "[class*='emoji-item' i]",
      "[class*='emojiItem']",
      "[class*='emoticon-item' i]"
    ]).forEach(add);
    queryAllDeep(BILIBILI_EMOJI_SURFACE_SELECTORS).forEach((surface) => {
      if (!isVisible(surface) || closestMatching(surface, config.chatRoots)) {
        return;
      }
      surface.querySelectorAll("img,[data-emoji],[data-emoticon],[role='button'],button")
        .forEach(add);
    });
    queryAllDeep(["img"]).slice(0, 1000).forEach((image) => {
      if (!closestMatching(image, config.videoRoots)) {
        add(image);
      }
    });
    return results.slice(0, 500);
  }

  function findMatchingBilibiliEmoji(asset) {
    let best = null;
    let bestScore = 0;
    bilibiliEmojiItemCandidates().forEach((element) => {
      const score = assetMatchScore(element, asset);
      if (score > bestScore) {
        bestScore = score;
        best = element;
      }
    });
    if (!best || bestScore < 4) {
      return null;
    }
    return best.closest([
      "button",
      "[role='button']",
      "[data-emoji]",
      "[data-emoticon]",
      "[class*='emoji-item' i]",
      "[class*='emoticon-item' i]"
    ].join(",")) || best;
  }

  function findBilibiliEmojiToggle(input) {
    const inputRect = input && input.getBoundingClientRect();
    const candidates = queryAllDeep(BILIBILI_EMOJI_TOGGLE_SELECTORS)
      .filter((element) => isVisible(element) && !closestMatching(element, config.chatRoots)
        && !isOwned(element));
    candidates.sort((first, second) => {
      const score = (element) => {
        const marker = elementMarker(element);
        const rect = element.getBoundingClientRect();
        const distance = inputRect
          ? Math.abs(rect.left - inputRect.right) + Math.abs(rect.top - inputRect.top)
          : 0;
        return (/(emoji|emoticon|emotion|face|表情)/i.test(marker) ? 500 : 0)
          - Math.min(300, distance / 5);
      };
      return score(second) - score(first);
    });
    return candidates[0] || null;
  }

  async function waitForBilibiliEmoji(asset, timeout) {
    const deadline = Date.now() + timeout;
    let match = findMatchingBilibiliEmoji(asset);
    while (!match && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      match = findMatchingBilibiliEmoji(asset);
    }
    return match;
  }

  function countMatchingBilibiliChatAssets(asset) {
    let count = 0;
    queryAllDeep(config.messages).slice(-120).forEach((row) => {
      row.querySelectorAll("img").forEach((image) => {
        if (assetMatchScore(image, asset) >= 4) {
          count += 1;
        }
      });
    });
    return count;
  }

  function richInputFingerprint(input) {
    if (!input || !input.isConnected) {
      return "";
    }
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      return input.value;
    }
    return `${input.textContent || ""}|${input.innerHTML || ""}`.slice(0, 4096);
  }

  async function waitForBilibiliEmojiResult(input, asset, previousCount, previousInput, timeout) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (countMatchingBilibiliChatAssets(asset) > previousCount) {
        return "sent";
      }
      if (richInputFingerprint(input) !== previousInput) {
        return "inserted";
      }
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    return "none";
  }

  async function repeatBilibiliRichPayload(payload) {
    const now = Date.now();
    if (now - state.lastActionAt < 700) {
      showToast("操作太快，请稍后再试", "warning");
      return false;
    }
    state.lastActionAt = now;
    const asset = payload && Array.isArray(payload.assets) ? payload.assets[0] : null;
    const input = findInput();
    if (!asset || !input) {
      showToast("未找到B站表情资源或弹幕输入框", "error");
      return false;
    }
    const previousCount = countMatchingBilibiliChatAssets(asset);
    let item = findMatchingBilibiliEmoji(asset);
    if (!item) {
      const toggle = findBilibiliEmojiToggle(input);
      if (toggle && typeof toggle.click === "function") {
        toggle.click();
        item = await waitForBilibiliEmoji(asset, 800);
      }
    }
    if (!item || typeof item.click !== "function") {
      showToast("未在B站表情面板中找到对应图片，已取消 +1", "error");
      return false;
    }
    const beforeInput = richInputFingerprint(input);
    item.click();
    let result = await waitForBilibiliEmojiResult(input, asset, previousCount, beforeInput, 900);
    if (result === "inserted" && richInputFingerprint(input) !== beforeInput) {
      const button = findSendButton(input);
      if (button) {
        button.click();
      } else {
        pressEnter(input);
      }
      result = await waitForBilibiliEmojiResult(input, asset, previousCount, beforeInput, 900);
      if (result !== "sent" && !richInputFingerprint(input)) {
        result = "sent";
      }
    }
    if (result === "none") {
      const button = findSendButton(input);
      if (button) {
        button.click();
        result = await waitForBilibiliEmojiResult(input, asset, previousCount, beforeInput, 900);
      }
    }
    if (result !== "sent") {
      showToast("B站图片表情发送未确认，请重试", "error");
      return false;
    }
    releaseInputFocus(input);
    showToast("已发送图片表情 +1", "success");
    return true;
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
    const richPayload = state.richPayload;
    if (platformId === "bilibili" && richPayload && richPayload.assets.length) {
      repeatBilibiliRichPayload(richPayload);
    } else if (message) {
      repeatMessage(message);
    }
    scheduleHide();
  }

  function onPointerOver(event) {
    if (!isEnabled()) {
      return;
    }

    const path = event.composedPath ? event.composedPath() : [event.target];
    updateChatScrollLock(path);
    if (isOwned(event.target)) {
      return;
    }

    if (pathTouchesBilibiliChatActions(path)) {
      if (state.candidate) {
        clearSelection();
      }
      return;
    }

    if (isInsideFrozenHoverZone(event.clientX, event.clientY)) {
      cancelHide();
      return;
    }

    const found = findCandidate(path);
    if (found && found.element !== state.candidate) {
      selectCandidate(found.element, found.kind);
    }
  }

  function restoreBilibiliQuickBars(event) {
    if (platformId !== "bilibili") {
      return;
    }
    if (event && !event.isTrusted) {
      return;
    }

    const path = event
      ? (event.composedPath ? event.composedPath() : [event.target])
      : [];
    const elements = path
      .filter((item) => item instanceof Element)
      .slice(0, 8);
    const marker = elements.map(elementMarker).join(" ");
    const targetsQuickInput = elements.some((element) => isBilibiliQuickInputRegion(element));
    const keyboardOpensQuickInput = Boolean(event
      && event.type === "keydown"
      && event.key === "Enter"
      && fullscreenElement());
    const markerRequestsQuickInput = /(?:danmaku|danmu|dm)[-_ ]?(?:input|send)|(?:input|send)[-_ ]?(?:danmaku|danmu|dm)|弹幕|快捷(?:输入|发送)|发送|send|input/i
      .test(marker);
    const requestsQuickInput = targetsQuickInput
      || keyboardOpensQuickInput
      || markerRequestsQuickInput;

    if (event && !requestsQuickInput) {
      return;
    }
    if (event) {
      // A real user interaction takes ownership of the native editor. Cancel
      // all delayed blur/hide callbacks left by the previous +1 operation.
      state.bilibiliDismissToken += 1;
    }
    if (!state.hiddenBilibiliQuickBars.size) {
      return;
    }

    const now = Date.now();
    for (const [container, saved] of state.hiddenBilibiliQuickBars) {
      if (!event && now - saved.hiddenAt < 500) {
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

    const path = event.composedPath ? event.composedPath() : [event.target];
    if (pathTouchesBilibiliChatActions(path)) {
      if (state.candidate) {
        clearSelection();
      }
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
    releaseChatScrollLockAfterPointerOut(event.relatedTarget);
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
    if (pathTouchesBilibiliChatActions(path)) {
      return;
    }
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

  function onViewportChange(event) {
    const lock = state.chatScrollLock;
    if (lock && event) {
      const target = lock.targets.find((item) => item.element === event.target);
      if (target && target.element.isConnected) {
        if (Math.abs(target.element.scrollTop - target.top) > 0.5) {
          target.element.scrollTop = target.top;
        }
        if (Math.abs(target.element.scrollLeft - target.left) > 0.5) {
          target.element.scrollLeft = target.left;
        }
      }
    }
    requestAnimationFrame(updateButtonPosition);
  }

  function onFullscreenChange() {
    restoreBilibiliQuickBars(null);
    ensurePortal();
    requestAnimationFrame(updateButtonPosition);
  }

  function applySettings(saved) {
    state.settings = shared.mergeSettings(saved);
    shared.applyPlatformColors(document.documentElement, state.settings.colors[platformId]);
    if (!isEnabled()) {
      releaseChatScrollLock();
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
