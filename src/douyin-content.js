(function initDanmakuEchoDouyin() {
  "use strict";

  const shared = globalThis.BulletPlusOneShared;
  if (!shared || shared.detectPlatform(location.hostname, location.pathname) !== "douyin"
      || globalThis.__danmakuEchoDouyinLoaded) {
    return;
  }
  globalThis.__danmakuEchoDouyinLoaded = true;

  const CONTENT_SOURCE = "danmaku-echo-douyin-content";
  const PAGE_SOURCE = "danmaku-echo-douyin-page";
  const MAX_LENGTH = 1000;
  const CARD_LOCK_TIME = 2500;
  const CARD_STICKY_TIME = 8000;
  const CARD_HIDE_DELAY = 650;
  const DEBUG_VERSION = "douyin-content-v7-rich-emoji-own-chat";
  const RENDERER_HEARTBEAT_INTERVAL = 5000;
  const TRUSTED_ACTION_WINDOW = 1500;
  const OWN_CHAT_MESSAGE_TTL = 12_000;
  const DOM_DANMAKU_SELECTORS = [
    "[data-e2e='danmaku-item']",
    "[class*='webcast-danmaku___item']",
    "[class*='danmaku-item']",
    "[class*='danmakuItem']",
    "[class*='danmu-item']",
    "[class*='bullet-item']"
  ];
  const VIDEO_ROOT_SELECTORS = [
    "[data-e2e='live-player']",
    "[data-e2e='player-container']",
    "[class*='LivePlayer']",
    "[class*='live-player']",
    "[class*='player-container']",
    "[class*='PlayerContainer']",
    "[class*='video-container']"
  ];
  const CHAT_ROOT_SELECTORS = [
    "[data-e2e='chat-message-list']",
    "[data-e2e='chat-room-message-list']",
    "[class*='webcast-chatroom___items']",
    "[class*='webcast-chatroom___list']",
    "[class*='webcast-chatroom']",
    "[class*='ChatMessageList']"
  ];
  const CHAT_MESSAGE_SELECTORS = [
    "[data-e2e='chat-message']",
    "[data-e2e='chat-room-message']",
    "[class*='webcast-chatroom___item']",
    "[class*='ChatMessage']",
    "[class*='chat-message']",
    "[class*='message-item']"
  ];
  const MESSAGE_TEXT_SELECTORS = [
    "[data-e2e='chat-message-text']",
    "[data-e2e='message-content']",
    "[class*='message-content']",
    "[class*='messageContent']",
    "[class*='content']"
  ];
  const USER_NAME_SELECTORS = [
    "[data-e2e='chat-message-user-name']",
    "[class*='nickname']",
    "[class*='user-name']",
    "[class*='userName']"
  ];
  const INPUT_SELECTORS = [
    "[data-e2e='chat-room-input']",
    "textarea[data-e2e*='chat']",
    "textarea[placeholder*='弹幕']",
    "textarea[placeholder*='说点什么']",
    "[contenteditable='true'][data-placeholder*='弹幕']",
    "[contenteditable='true'][data-placeholder*='说点什么']",
    "[class*='webcast-chatroom___input'] [contenteditable='true']",
    "[class*='chat-input'] [contenteditable='true']",
    "[class*='ChatInput'] [contenteditable='true']"
  ];
  const SEND_BUTTON_SELECTORS = [
    "[data-e2e='chat-room-send']",
    "[data-e2e*='send' i]",
    "[data-testid*='send' i]",
    "[aria-label*='发送']",
    "button[data-e2e*='send']",
    "[class*='webcast-chatroom___send']",
    "button[class*='send']",
    "[class*='send-button']",
    "[class*='sendButton']"
  ];
  const EMOJI_TOGGLE_SELECTORS = [
    "[data-e2e*='emoji' i]",
    "[data-testid*='emoji' i]",
    "[aria-label*='表情']",
    "[title*='表情']",
    "[class*='emoji-btn' i]",
    "[class*='emojiBtn']",
    "[class*='emoticon-btn' i]",
    "[class*='emotion-btn' i]",
    "button[class*='emoji' i]",
    "button[class*='emoticon' i]",
    "button[class*='face' i]",
    "[role='button'][class*='emoji' i]",
    "[role='button'][class*='face' i]"
  ];
  const EMOJI_SURFACE_SELECTORS = [
    "[data-e2e*='emoji-panel' i]",
    "[data-testid*='emoji-panel' i]",
    "[class*='emoji-panel' i]",
    "[class*='emojiPanel']",
    "[class*='emoticon-panel' i]",
    "[class*='emotion-panel' i]",
    "[class*='emoji-list' i]"
  ];

  const state = {
    settings: shared.mergeSettings(),
    portal: null,
    card: null,
    preview: null,
    button: null,
    toast: null,
    candidate: null,
    hideTimer: 0,
    expiryTimer: 0,
    cardHovered: false,
    selectionId: 0,
    selectionPhase: "idle",
    selectedAt: 0,
    lockedUntil: 0,
    pointerX: 0,
    pointerY: 0,
    probeFrame: 0,
    nextProbeId: 1,
    pendingProbe: null,
    pageReady: false,
    pageVersion: "",
    pageSnapshot: null,
    trustedAction: null,
    activationRequests: new Set(),
    lastActionAt: 0,
    nextOwnAnnouncementId: 1,
    ownChatIntents: [],
    ownChatScanTimer: 0,
    ownChatObserver: null,
    lastUrl: location.href
  };

  const debugState = {
    version: DEBUG_VERSION,
    loadedAt: new Date().toISOString(),
    loadedAtMs: Date.now(),
    href: location.href,
    pageReady: false,
    pageVersion: "",
    settingsEnabled: false,
    counters: {
      pings: 0,
      probesSent: 0,
      probeResults: 0,
      cardsShown: 0,
      cardsHidden: 0,
      cardPointerEnters: 0,
      rendererActivations: 0,
      rendererActivationsRejected: 0,
      sendsAttempted: 0,
      sendsSucceeded: 0,
      sendsFailed: 0,
      emojiAssetsInserted: 0,
      ownChatIntents: 0,
      ownChatMessagesMarked: 0
    },
    lastProbe: null,
    lastCard: null,
    lastError: "",
    events: []
  };
  globalThis.__danmakuEchoDouyinContentDebug = debugState;
  let debugMarkerTimer = 0;

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

  function contentDebugSnapshot() {
    return {
      version: debugState.version,
      loadedAt: debugState.loadedAt,
      loadedAtMs: debugState.loadedAtMs,
      href: location.href,
      pageReady: state.pageReady,
      pageVersion: state.pageVersion,
      settingsEnabled: enabled(),
      counters: Object.assign({}, debugState.counters),
      lastProbe: debugState.lastProbe,
      lastCard: debugState.lastCard,
      lastError: debugState.lastError,
      card: state.card ? {
        hidden: state.card.hidden,
        hovered: state.cardHovered,
        selectionId: state.selectionId,
        selectionPhase: state.selectionPhase,
        selectedAt: state.selectedAt,
        lockedUntil: state.lockedUntil,
        candidate: state.candidate ? {
          trackId: state.candidate.trackId,
          message: state.candidate.message,
          kind: state.candidate.kind,
          rect: state.candidate.rect
        } : null
      } : null,
      events: debugState.events.slice(-80),
      pageSnapshot: state.pageSnapshot
    };
  }

  function syncDebugMarker() {
    debugMarkerTimer = 0;
    const root = document.documentElement;
    if (!root) {
      return;
    }
    let marker = document.getElementById("bcp-douyin-content-debug");
    if (!marker) {
      marker = document.createElement("script");
      marker.id = "bcp-douyin-content-debug";
      marker.type = "application/json";
      marker.hidden = true;
      root.appendChild(marker);
    }
    const snapshot = contentDebugSnapshot();
    marker.dataset.version = DEBUG_VERSION;
    marker.dataset.pageReady = String(snapshot.pageReady);
    marker.dataset.cardVisible = String(Boolean(state.card && !state.card.hidden));
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
      sinceLoad: Date.now() - debugState.loadedAtMs,
      type,
      details: conciseDebugValue(details || {}, 0)
    };
    debugState.events.push(entry);
    if (debugState.events.length > 240) {
      debugState.events.splice(0, debugState.events.length - 240);
    }
    if (level === "error") {
      debugState.lastError = String(details && (details.message || details.error) || type).slice(0, 500);
      console.error("[Danmaku Echo][Douyin content]", type, entry.details);
    } else if (level === "info") {
      console.info("[Danmaku Echo][Douyin content]", type, entry.details);
    } else if (level === "warn") {
      console.warn("[Danmaku Echo][Douyin content]", type, entry.details);
    } else {
      console.debug("[Danmaku Echo][Douyin content]", type, entry.details);
    }
    scheduleDebugMarker();
  }

  function storageGet() {
    return new Promise((resolve) => {
      if (!globalThis.chrome || !chrome.storage || !chrome.storage.sync) {
        resolve({});
        return;
      }
      chrome.storage.sync.get(null, (value) => resolve(value || {}));
    });
  }

  function enabled() {
    return Boolean(state.settings.enabled && state.settings.platforms.douyin);
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

  function queryAll(selectors, root) {
    const scope = root || document;
    const results = [];
    const seen = new Set();
    selectors.forEach((selector) => {
      let matches = [];
      try {
        matches = scope.querySelectorAll(selector);
      } catch (_error) {
        matches = [];
      }
      matches.forEach((element) => {
        if (!seen.has(element)) {
          seen.add(element);
          results.push(element);
        }
      });
    });
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

  function closestAny(element, selectors) {
    let current = element instanceof Element ? element : null;
    while (current) {
      if (matchesAny(current, selectors)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  function isOwned(node) {
    return node instanceof Element && Boolean(node.closest("[data-bcp-douyin-owned]"));
  }

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function ensurePortal() {
    const host = fullscreenElement() || document.documentElement;
    if (!state.portal) {
      const portal = document.createElement("div");
      portal.className = "bcp-douyin-portal";
      portal.dataset.bcpDouyinOwned = "true";
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

  function cancelHide() {
    if (state.hideTimer) {
      clearTimeout(state.hideTimer);
      state.hideTimer = 0;
    }
  }

  function clearExpiry() {
    if (state.expiryTimer) {
      clearTimeout(state.expiryTimer);
      state.expiryTimer = 0;
    }
  }

  function armExpiry() {
    clearExpiry();
    const selectionId = state.selectionId;
    state.expiryTimer = setTimeout(() => {
      state.expiryTimer = 0;
      if (selectionId !== state.selectionId || !state.candidate) {
        return;
      }
      if (state.cardHovered) {
        armExpiry();
        return;
      }
      hideCard("sticky-timeout");
    }, CARD_STICKY_TIME);
  }

  function hideCard(reason) {
    cancelHide();
    clearExpiry();
    const previous = state.candidate;
    state.candidate = null;
    state.cardHovered = false;
    state.selectionPhase = "idle";
    state.selectedAt = 0;
    state.lockedUntil = 0;
    state.pendingProbe = null;
    if (!state.card) {
      return;
    }
    state.card.hidden = true;
    state.card.classList.remove("is-visible");
    state.card.removeAttribute("data-track-id");
    state.card.removeAttribute("data-kind");
    state.card.removeAttribute("data-message");
    state.card.removeAttribute("data-selection-id");
    state.card.removeAttribute("data-selection-phase");
    state.card.removeAttribute("data-side");
    if (state.preview) {
      state.preview.replaceChildren();
    }
    if (previous) {
      debugState.counters.cardsHidden += 1;
      debugEvent("card-hidden", {
        reason: reason || "unspecified",
        trackId: previous.trackId,
        message: previous.message
      });
    }
  }

  function scheduleHide(reason, delay) {
    if (state.hideTimer) {
      return;
    }
    const selectionId = state.selectionId;
    state.hideTimer = setTimeout(() => {
      state.hideTimer = 0;
      if (selectionId !== state.selectionId || state.cardHovered) {
        return;
      }
      hideCard(reason || "scheduled-hide");
    }, Number.isFinite(delay) ? delay : CARD_HIDE_DELAY);
  }

  function ensureCard() {
    const portal = ensurePortal();
    if (state.card && state.card.isConnected) {
      if (state.card.parentNode !== portal) {
        portal.appendChild(state.card);
      }
      return state.card;
    }

    const card = document.createElement("div");
    card.className = "bcp-douyin-card";
    card.dataset.bcpDouyinOwned = "true";
    card.dataset.bcpDouyinInteractionCard = "true";
    card.hidden = true;
    card.setAttribute("role", "group");

    const preview = document.createElement("div");
    preview.className = "bcp-douyin-preview";
    preview.dataset.bcpDouyinOwned = "true";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "bcp-douyin-button";
    button.textContent = "+1";
    button.dataset.bcpDouyinOwned = "true";
    button.addEventListener("click", onPlusOneClick);
    ["pointerdown", "mousedown"].forEach((type) => {
      button.addEventListener(type, (event) => {
        event.stopPropagation();
        cancelHide();
      }, true);
    });

    card.append(preview, button);
    card.addEventListener("pointerenter", () => {
      state.cardHovered = true;
      state.selectionPhase = "engaged";
      card.dataset.selectionPhase = state.selectionPhase;
      debugState.counters.cardPointerEnters += 1;
      debugEvent("card-pointer-enter", {
        trackId: state.candidate && state.candidate.trackId,
        message: state.candidate && state.candidate.message
      }, "info");
      cancelHide();
      armExpiry();
    });
    card.addEventListener("pointermove", () => {
      state.cardHovered = true;
      state.selectionPhase = "engaged";
      card.dataset.selectionPhase = state.selectionPhase;
      cancelHide();
    });
    card.addEventListener("pointerleave", () => {
      state.cardHovered = false;
      state.selectionPhase = "grace";
      card.dataset.selectionPhase = state.selectionPhase;
      scheduleHide("card-pointerleave", CARD_HIDE_DELAY);
    });
    portal.appendChild(card);
    state.card = card;
    state.preview = preview;
    state.button = button;
    return card;
  }

  function showToast(message, kind) {
    if (state.toast) {
      state.toast.remove();
    }
    const toast = document.createElement("div");
    toast.className = `bcp-douyin-toast bcp-douyin-toast--${kind || "info"}`;
    toast.dataset.bcpDouyinOwned = "true";
    toast.textContent = message;
    ensurePortal().appendChild(toast);
    state.toast = toast;
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => toast.remove(), 160);
      if (state.toast === toast) {
        state.toast = null;
      }
    }, 1800);
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
      // Emoji tokens and internal ids are not necessarily URLs.
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

  function assetDescriptorFromSerialized(item) {
    if (!item || item.type !== "image" || typeof item.src !== "string" || !item.src) {
      return null;
    }
    return {
      src: item.src.slice(0, 4096),
      token: "",
      keys: normalizedAssetKeys(item.src).slice(0, 24)
    };
  }

  function serializedEmojiAssets(content) {
    const assets = [];
    const visit = (item) => {
      const asset = assetDescriptorFromSerialized(item);
      if (asset) {
        assets.push(asset);
      }
      if (item && Array.isArray(item.content)) {
        item.content.forEach(visit);
      }
    };
    (Array.isArray(content) ? content : []).forEach(visit);
    return assets.slice(0, 8);
  }

  function messageContentElement(row) {
    if (!(row instanceof Element)) {
      return null;
    }
    for (const selector of MESSAGE_TEXT_SELECTORS) {
      try {
        const element = row.matches(selector) ? row : row.querySelector(selector);
        if (element) {
          return element;
        }
      } catch (_error) {
        // Ignore selector support differences.
      }
    }
    return row;
  }

  function richTextFromElement(element) {
    if (!(element instanceof Element)) {
      return "";
    }
    const clone = element.cloneNode(true);
    clone.querySelectorAll("img").forEach((image) => {
      const token = emojiTokenFromImage(image);
      image.replaceWith(token ? document.createTextNode(token) : document.createTextNode(""));
    });
    ["button", "svg", "[aria-hidden='true']", "[data-bcp-douyin-owned]", ...USER_NAME_SELECTORS]
      .forEach((selector) => {
        try {
          clone.querySelectorAll(selector).forEach((item) => item.remove());
        } catch (_error) {
          // Ignore selector support differences.
        }
      });
    return shared.parseMessageText(clone.textContent, MAX_LENGTH);
  }

  function richPartsFromElement(element) {
    const parts = [];
    const appendText = (value) => {
      const text = String(value || "");
      if (!text) {
        return;
      }
      const previous = parts[parts.length - 1];
      if (previous && previous.type === "text") {
        previous.text += text;
      } else {
        parts.push({ type: "text", text });
      }
    };
    const visit = (node) => {
      if (!node || parts.length >= 40) {
        return;
      }
      if (node.nodeType === 3) {
        appendText(node.nodeValue);
        return;
      }
      if (!(node instanceof Element)) {
        return;
      }
      if (node.matches("button,svg,[aria-hidden='true'],[data-bcp-douyin-owned]")
          || matchesAny(node, USER_NAME_SELECTORS)) {
        return;
      }
      if (node instanceof HTMLImageElement) {
        const asset = assetDescriptorFromElement(node);
        if (asset) {
          parts.push({ type: "emoji", asset });
        }
        return;
      }
      if (node.tagName === "BR") {
        appendText("\n");
        return;
      }
      Array.from(node.childNodes).forEach(visit);
    };
    Array.from(element.childNodes).forEach(visit);
    return parts;
  }

  function richPayloadFromElement(element) {
    if (!(element instanceof Element)) {
      return { text: "", plainText: "", assets: [] };
    }
    const assets = Array.from(element.querySelectorAll("img"))
      .filter((image) => !closestAny(image, USER_NAME_SELECTORS)
        && !closestAny(image, [
          "[class*='avatar' i]",
          "[class*='badge' i]",
          "[class*='medal' i]"
        ]))
      .map(assetDescriptorFromElement)
      .filter(Boolean)
      .slice(0, 8);
    const plainClone = element.cloneNode(true);
    plainClone.querySelectorAll("img,button,svg,[aria-hidden='true'],[data-bcp-douyin-owned]")
      .forEach((item) => item.remove());
    USER_NAME_SELECTORS.forEach((selector) => {
      try {
        plainClone.querySelectorAll(selector).forEach((item) => item.remove());
      } catch (_error) {
        // Ignore selector support differences.
      }
    });
    const plainText = shared.parseMessageText(plainClone.textContent, MAX_LENGTH);
    let text = richTextFromElement(element);
    if (!shared.isPlausibleMessage(text, MAX_LENGTH) && assets.length) {
      text = assets.map((asset) => asset.token).filter(Boolean).join(" ") || "表情";
    }
    return { text, plainText, assets, parts: richPartsFromElement(element) };
  }

  function richPayloadFromChatRow(row) {
    return richPayloadFromElement(messageContentElement(row));
  }

  function messageFromChatRow(row) {
    return richPayloadFromChatRow(row).text;
  }

  function comparableText(value) {
    return shared.normalizeWhitespace(value)
      .replace(/\[[^\]\n]{1,40}\]/g, "")
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/\s+/g, "");
  }

  function resolveRichPayload(canvasText, rendererContent) {
    const key = comparableText(canvasText);
    const rendererAssets = serializedEmojiAssets(rendererContent);
    const matches = [];
    const rows = queryAll(CHAT_MESSAGE_SELECTORS).slice(-100).reverse();
    for (const row of rows) {
      if (isOwned(row)) {
        continue;
      }
      const payload = richPayloadFromChatRow(row);
      const rowKey = comparableText(payload.plainText || payload.text);
      if (shared.isPlausibleMessage(payload.text, MAX_LENGTH)
          && key && rowKey === key) {
        matches.push(payload);
      }
    }
    if (rendererAssets.length) {
      const exactAssetMatch = matches.find((payload) => payload.assets.some((asset) =>
        rendererAssets.some((rendererAsset) => assetsMatch(asset, rendererAsset))));
      if (exactAssetMatch) {
        return exactAssetMatch;
      }
    }
    if (matches.length) {
      return matches[0];
    }
    return {
      text: canvasText,
      plainText: canvasText,
      // Worker images can also be badges or decorative resources. Only a
      // matching side-chat message is strong enough evidence that an image is
      // an emoji the user can resend.
      assets: []
    };
  }

  async function resolveRichPayloadWithRetry(canvasText, rendererContent) {
    let payload = resolveRichPayload(canvasText, rendererContent);
    if (payload.assets.length || !serializedEmojiAssets(rendererContent).length) {
      return payload;
    }
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      payload = resolveRichPayload(canvasText, rendererContent);
      if (payload.assets.length) {
        break;
      }
    }
    return payload;
  }

  function solidPaint(value, fallback) {
    if (typeof value === "string" && value) {
      return value;
    }
    const first = value && Array.isArray(value.gradientPieces)
      ? value.gradientPieces.find((piece) => Array.isArray(piece) && typeof piece[1] === "string")
      : null;
    return first ? first[1] : fallback;
  }

  function renderPreviewItem(item, parent, inherited) {
    if (!item || typeof item !== "object") {
      return;
    }
    const style = Object.assign({}, inherited, item);
    if (item.type === "text") {
      const span = document.createElement("span");
      span.className = "bcp-douyin-preview-text";
      span.textContent = item.text == null ? "" : String(item.text);
      span.style.setProperty("color", solidPaint(style.color, "#ffffff"));
      span.style.setProperty("font-family", style.fontFamily || "inherit");
      span.style.setProperty("font-weight", String(style.fontWeight || 600));
      parent.appendChild(span);
      return;
    }
    if (item.type === "image") {
      if (typeof item.src === "string" && item.src) {
        const image = document.createElement("img");
        image.className = "bcp-douyin-preview-image";
        image.src = item.src;
        image.alt = "";
        image.draggable = false;
        image.addEventListener("error", () => image.remove(), { once: true });
        parent.appendChild(image);
      }
      return;
    }
    const content = Array.isArray(item.content) ? item.content : [];
    content.forEach((child) => renderPreviewItem(child, parent, style));
  }

  function renderPreview(candidate) {
    state.preview.replaceChildren();
    const content = Array.isArray(candidate.content) ? candidate.content : [];
    content.forEach((item) => renderPreviewItem(item, state.preview, candidate.style || {}));
    if (!state.preview.childNodes.length) {
      const text = document.createElement("span");
      text.className = "bcp-douyin-preview-text";
      text.textContent = candidate.message;
      state.preview.appendChild(text);
    }
    state.preview.title = candidate.message;
  }

  function pointInside(rect, x, y, padding) {
    const extra = padding || 0;
    return Boolean(rect
      && x >= rect.left - extra
      && x <= rect.left + rect.width + extra
      && y >= rect.top - extra
      && y <= rect.top + rect.height + extra);
  }

  function positionCard(candidate) {
    const card = state.card;
    card.style.setProperty("visibility", "hidden");
    card.hidden = false;
    const measured = card.getBoundingClientRect();
    const width = Math.max(120, measured.width);
    const height = Math.max(36, measured.height);
    const anchor = candidate.rect;
    const bounds = candidate.canvasRect || { left: 0, top: 0, width: innerWidth, height: innerHeight };
    const boundsRight = Math.min(innerWidth - 8, bounds.left + bounds.width - 8);
    const boundsLeft = Math.max(8, bounds.left + 8);
    const pointerX = Number.isFinite(candidate.pointerX)
      ? candidate.pointerX
      : anchor.left + anchor.width / 2;
    const pointerY = Number.isFinite(candidate.pointerY)
      ? candidate.pointerY
      : anchor.top + anchor.height / 2;
    let side = "right";
    let left = pointerX + 8;
    if (left + width > boundsRight) {
      side = "left";
      left = pointerX - width - 8;
    }
    left = Math.max(boundsLeft, Math.min(left, boundsRight - width));
    const boundsBottom = Math.min(innerHeight - 8, bounds.top + bounds.height - 8);
    const boundsTop = Math.max(8, bounds.top + 8);
    let top = pointerY - height / 2;
    top = Math.max(boundsTop, Math.min(top, boundsBottom - height));
    card.style.setProperty("left", `${Math.round(left)}px`);
    card.style.setProperty("top", `${Math.round(top)}px`);
    card.dataset.side = side;
    card.style.removeProperty("visibility");
    requestAnimationFrame(() => card.classList.add("is-visible"));
  }

  function showCard(candidate) {
    if (!enabled() || !candidate || !shared.isPlausibleMessage(candidate.message, MAX_LENGTH)) {
      return;
    }
    cancelHide();
    clearExpiry();
    const card = ensureCard();
    state.selectionId += 1;
    state.candidate = candidate;
    state.cardHovered = false;
    state.selectionPhase = "armed";
    state.selectedAt = Date.now();
    state.lockedUntil = performance.now() + CARD_LOCK_TIME;
    state.button.disabled = false;
    state.button.setAttribute("aria-label", `弹幕加一：${candidate.message}`);
    card.dataset.trackId = String(candidate.trackId || "dom");
    card.dataset.kind = candidate.kind || "unknown";
    card.dataset.message = candidate.message.slice(0, 240);
    card.dataset.selectionId = String(state.selectionId);
    card.dataset.selectionPhase = state.selectionPhase;
    card.classList.remove("is-visible");
    renderPreview(candidate);
    positionCard(candidate);
    armExpiry();
    debugState.counters.cardsShown += 1;
    debugState.lastCard = {
      at: Date.now(),
      selectionId: state.selectionId,
      selectionPhase: state.selectionPhase,
      trackId: candidate.trackId,
      instanceId: candidate.instanceId || "",
      message: candidate.message,
      kind: candidate.kind,
      rect: candidate.rect,
      pointer: [candidate.pointerX, candidate.pointerY],
      model: candidate.model || null
    };
    debugEvent("card-shown", debugState.lastCard, "info");
  }

  function saneRect(rect) {
    return rect
      && [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)
      && rect.width >= 2 && rect.width <= innerWidth * 2
      && rect.height >= 4 && rect.height <= 300;
  }

  function candidateFromProbe(hit, pending) {
    if (!hit || !saneRect(hit.rect)) {
      return null;
    }
    const canvasText = shared.parseMessageText(hit.text, MAX_LENGTH);
    if (!shared.isPlausibleMessage(canvasText, MAX_LENGTH)) {
      return null;
    }
    const content = Array.isArray(hit.content) ? hit.content : [];
    const richPayload = resolveRichPayload(canvasText, content);
    return {
      trackId: hit.trackId,
      instanceId: hit.instanceId,
      rect: hit.rect,
      canvasRect: saneRect(hit.canvasRect) ? hit.canvasRect : null,
      message: richPayload.text,
      richPayload,
      content,
      style: hit.style && typeof hit.style === "object" ? hit.style : {},
      model: hit.model && typeof hit.model === "object" ? hit.model : null,
      pointerX: pending && pending.x,
      pointerY: pending && pending.y,
      kind: "canvas"
    };
  }

  function domCandidateFromElement(element, kind) {
    if (!(element instanceof Element) || isOwned(element) || !isVisible(element)) {
      return null;
    }
    const rect = element.getBoundingClientRect();
    if (!saneRect(rect)) {
      return null;
    }
    const richPayload = kind === "chat"
      ? richPayloadFromChatRow(element)
      : richPayloadFromElement(element);
    const message = richPayload.text;
    if (!shared.isPlausibleMessage(message, MAX_LENGTH)) {
      return null;
    }
    return {
      trackId: `dom-${Date.now()}`,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      canvasRect: null,
      message,
      richPayload,
      content: [],
      style: {},
      kind
    };
  }

  function findDomCandidate(event) {
    const path = event.composedPath ? event.composedPath() : [event.target];
    const elements = path.filter((item) => item instanceof Element);
    for (const element of elements) {
      const danmaku = closestAny(element, DOM_DANMAKU_SELECTORS);
      if (danmaku && closestAny(danmaku, VIDEO_ROOT_SELECTORS)) {
        const candidate = domCandidateFromElement(danmaku, "video-dom");
        if (candidate) {
          return candidate;
        }
      }
    }
    return null;
  }

  function isInsideChatColumn(path) {
    return path.some((item) => item instanceof Element && Boolean(
      closestAny(item, CHAT_ROOT_SELECTORS)
        || (closestAny(item, CHAT_MESSAGE_SELECTORS)
          && !closestAny(item, VIDEO_ROOT_SELECTORS))
    ));
  }

  function sendProbe() {
    state.probeFrame = 0;
    if (!enabled() || state.candidate) {
      return;
    }
    const requestId = state.nextProbeId;
    state.nextProbeId += 1;
    state.pendingProbe = {
      requestId,
      x: state.pointerX,
      y: state.pointerY,
      sentAt: performance.now()
    };
    debugState.counters.probesSent += 1;
    debugState.lastProbe = {
      requestId,
      sentAt: Date.now(),
      x: state.pointerX,
      y: state.pointerY,
      status: "pending"
    };
    window.postMessage({
      source: CONTENT_SOURCE,
      type: "probe",
      requestId,
      x: state.pointerX,
      y: state.pointerY
    }, "*");
  }

  function scheduleProbe() {
    if (!state.probeFrame) {
      state.probeFrame = requestAnimationFrame(sendProbe);
    }
  }

  function onPointerMove(event) {
    if (!enabled() || event.pointerType === "touch") {
      return;
    }
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
    if (isInsideChatColumn(path)) {
      if (state.candidate) {
        hideCard("entered-chat-column");
      }
      return;
    }
    if (path.some((item) => item instanceof Element
        && item.matches(".bcp-douyin-dom-layer, .bcp-douyin-dom-track, .bcp-douyin-dom-barrage"))) {
      return;
    }
    if (isOwned(event.target)) {
      cancelHide();
      if (!state.expiryTimer) {
        armExpiry();
      }
      return;
    }
    if (state.candidate && state.card && !state.card.hidden) {
      const cardRect = state.card.getBoundingClientRect();
      if (performance.now() < state.lockedUntil
          || pointInside(cardRect, event.clientX, event.clientY, 12)
          || pointInside(state.candidate.rect, event.clientX, event.clientY, 10)) {
        cancelHide();
      } else {
        scheduleHide("left-chat-card", CARD_HIDE_DELAY);
      }
      return;
    }
    const domCandidate = findDomCandidate(event);
    if (domCandidate) {
      domCandidate.pointerX = event.clientX;
      domCandidate.pointerY = event.clientY;
      showCard(domCandidate);
    }
  }

  function inputText(input) {
    return input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement
      ? input.value
      : input.textContent || "";
  }

  function richPayloadFromInput(input) {
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      const text = shared.parseMessageText(input.value, MAX_LENGTH);
      return { text, plainText: text, assets: [] };
    }
    return richPayloadFromElement(input);
  }

  function findInput() {
    return queryAll(INPUT_SELECTORS).find((element) => {
      const disabled = element.matches(":disabled")
        || element.getAttribute("aria-disabled") === "true"
        || element.getAttribute("contenteditable") === "false";
      return !disabled && isVisible(element);
    }) || null;
  }

  function setInputValue(input, value) {
    input.focus({ preventScroll: true });
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
    if (!isVisible(button) || button.matches(":disabled")
        || button.getAttribute("aria-disabled") === "true"
        || typeof button.click !== "function") {
      return -Infinity;
    }
    const text = shared.normalizeWhitespace(
      button.innerText || button.textContent || button.getAttribute("aria-label")
    );
    const marker = [
      button.getAttribute("data-e2e"),
      button.getAttribute("data-testid"),
      button.getAttribute("aria-label"),
      typeof button.className === "string" ? button.className : ""
    ].filter(Boolean).join(" ");
    let score = 100 - selectorIndex + (scopeBonus || 0);
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
    const distance = Math.abs(buttonRect.left - inputRect.right)
      + Math.abs(buttonRect.top - inputRect.top);
    return score - Math.min(distance / 10, 100);
  }

  function findSendButton(input) {
    const candidates = [];
    const seen = new Set();
    const add = (button, index, bonus) => {
      if (!seen.has(button)) {
        seen.add(button);
        candidates.push({ button, index, bonus });
      }
    };
    let parent = input.parentElement;
    for (let depth = 0; parent && depth < 6; depth += 1, parent = parent.parentElement) {
      queryAll(["button", "[role='button']", "[data-e2e*='send' i]", "[aria-label*='发送']", "[class*='send' i]"], parent)
        .forEach((button) => add(button, SEND_BUTTON_SELECTORS.length + 1, 360 - depth * 50));
    }
    SEND_BUTTON_SELECTORS.forEach((selector, index) => {
      queryAll([selector]).forEach((button) => add(button, index, 0));
    });
    candidates.sort((first, second) => buttonScore(second.button, input, second.index, second.bonus)
      - buttonScore(first.button, input, first.index, first.bonus));
    const best = candidates[0];
    return best && buttonScore(best.button, input, best.index, best.bonus) > -Infinity
      ? best.button
      : null;
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

  function emojiItemCandidates() {
    const results = [];
    const seen = new Set();
    const add = (element) => {
      if (!(element instanceof Element) || seen.has(element) || !isVisible(element)
          || closestAny(element, CHAT_MESSAGE_SELECTORS) || isOwned(element)) {
        return;
      }
      seen.add(element);
      results.push(element);
    };
    queryAll([
      "[data-emoji]",
      "[data-emoji-name]",
      "[data-emoticon]",
      "[class*='emoji-item' i]",
      "[class*='emojiItem']",
      "[class*='emoticon-item' i]"
    ]).forEach(add);
    queryAll(EMOJI_SURFACE_SELECTORS).forEach((surface) => {
      if (!isVisible(surface) || closestAny(surface, CHAT_MESSAGE_SELECTORS)) {
        return;
      }
      surface.querySelectorAll("img,[data-emoji],[data-emoticon],[role='button'],button")
        .forEach(add);
    });
    queryAll(["img"]).slice(0, 1000).forEach((image) => {
      if (!closestAny(image, VIDEO_ROOT_SELECTORS)) {
        add(image);
      }
    });
    return results.slice(0, 500);
  }

  function findMatchingEmojiItem(asset) {
    let best = null;
    let bestScore = 0;
    emojiItemCandidates().forEach((element) => {
      const score = assetMatchScore(element, asset);
      if (score > bestScore) {
        best = element;
        bestScore = score;
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

  function findEmojiToggle(input) {
    const inputRect = input.getBoundingClientRect();
    const candidates = queryAll(EMOJI_TOGGLE_SELECTORS)
      .filter((element) => isVisible(element) && !closestAny(element, CHAT_MESSAGE_SELECTORS)
        && !isOwned(element));
    candidates.sort((first, second) => {
      const score = (element) => {
        const marker = [
          typeof element.className === "string" ? element.className : "",
          element.getAttribute("data-e2e"),
          element.getAttribute("data-testid"),
          element.getAttribute("aria-label"),
          element.getAttribute("title")
        ].filter(Boolean).join(" ");
        const rect = element.getBoundingClientRect();
        const distance = Math.abs(rect.left - inputRect.right) + Math.abs(rect.top - inputRect.top);
        return (/(emoji|emoticon|emotion|face|表情)/i.test(marker) ? 500 : 0)
          - Math.min(300, distance / 5);
      };
      return score(second) - score(first);
    });
    return candidates[0] || null;
  }

  async function waitForEmojiItem(asset, timeout) {
    const deadline = Date.now() + timeout;
    let item = findMatchingEmojiItem(asset);
    while (!item && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      item = findMatchingEmojiItem(asset);
    }
    return item;
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

  function inputIsEmpty(input) {
    if (!input || !input.isConnected) {
      return true;
    }
    if (shared.normalizeWhitespace(inputText(input))) {
      return false;
    }
    return !(input instanceof Element) || !input.querySelector("img,[data-emoji],[data-emoticon]");
  }

  async function insertEmojiAsset(input, asset) {
    let item = findMatchingEmojiItem(asset);
    if (!item) {
      const toggle = findEmojiToggle(input);
      if (toggle && typeof toggle.click === "function") {
        toggle.click();
        item = await waitForEmojiItem(asset, 800);
      }
    }
    if (!item || typeof item.click !== "function") {
      return { ok: false, reason: "emoji-not-found" };
    }
    const before = richInputFingerprint(input);
    item.click();
    const deadline = Date.now() + 600;
    while (Date.now() < deadline && richInputFingerprint(input) === before) {
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    if (richInputFingerprint(input) === before) {
      return { ok: false, reason: "emoji-not-inserted" };
    }
    debugState.counters.emojiAssetsInserted += 1;
    return { ok: true, reason: "inserted" };
  }

  function appendInputText(input, value) {
    const text = String(value || "");
    if (!text) {
      return;
    }
    input.focus({ preventScroll: true });
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      const prototype = input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value");
      const nextValue = `${input.value || ""}${text}`;
      if (setter && setter.set) {
        setter.set.call(input, nextValue);
      } else {
        input.value = nextValue;
      }
      if (typeof input.setSelectionRange === "function") {
        input.setSelectionRange(nextValue.length, nextValue.length);
      }
      input.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        composed: true,
        data: text,
        inputType: "insertText"
      }));
      return;
    }
    const selection = getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(input);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    let inserted = false;
    try {
      inserted = document.execCommand("insertText", false, text);
    } catch (_error) {
      inserted = false;
    }
    if (!inserted) {
      input.appendChild(document.createTextNode(text));
    }
    input.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      composed: true,
      data: text,
      inputType: "insertText"
    }));
  }

  async function prepareRichInput(input, payload) {
    const parts = Array.isArray(payload.parts) ? payload.parts : [];
    const orderedEmojiParts = parts.filter((part) => part.type === "emoji");
    if (!orderedEmojiParts.length) {
      setInputValue(input, payload.text);
      return { ok: true, reason: "text-only" };
    }
    setInputValue(input, "");
    for (const part of parts) {
      if (part.type === "text") {
        appendInputText(input, part.text);
      } else if (part.type === "emoji") {
        const inserted = await insertEmojiAsset(input, part.asset);
        if (!inserted.ok) {
          return inserted;
        }
      }
    }
    return { ok: true, reason: "rich-input-ready" };
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

  function inputContains(input, message) {
    return Boolean(input && input.isConnected
      && shared.normalizeWhitespace(inputText(input)) === shared.normalizeWhitespace(message));
  }

  function normalizeRichPayload(value) {
    if (typeof value === "string") {
      const text = shared.parseMessageText(value, MAX_LENGTH);
      return { text, plainText: text, assets: [], parts: [{ type: "text", text }] };
    }
    const text = shared.parseMessageText(value && value.text, MAX_LENGTH);
    const hasPlainText = Boolean(value && Object.prototype.hasOwnProperty.call(value, "plainText"));
    const plainText = hasPlainText
      ? shared.parseMessageText(value.plainText, MAX_LENGTH)
      : text;
    const sanitizeAsset = (asset) => asset && Array.isArray(asset.keys) && asset.keys.length
      ? {
        src: String(asset.src || "").slice(0, 4096),
        token: String(asset.token || "").slice(0, 120),
        keys: asset.keys.map((key) => String(key).slice(0, 520)).slice(0, 24)
      }
      : null;
    const assets = Array.isArray(value && value.assets)
      ? value.assets.map(sanitizeAsset).filter(Boolean).slice(0, 8)
      : [];
    const parts = Array.isArray(value && value.parts)
      ? value.parts.slice(0, 40).map((part) => {
        if (part && part.type === "emoji") {
          const asset = sanitizeAsset(part.asset);
          return asset ? { type: "emoji", asset } : null;
        }
        if (part && part.type === "text") {
          return { type: "text", text: String(part.text || "").slice(0, MAX_LENGTH) };
        }
        return null;
      }).filter(Boolean)
      : [{ type: "text", text: plainText }].concat(
        assets.map((asset) => ({ type: "emoji", asset }))
      );
    return { text, plainText, assets, parts };
  }

  function assetsMatch(first, second) {
    if (!first || !second || !Array.isArray(first.keys) || !Array.isArray(second.keys)) {
      return false;
    }
    const expected = new Set(first.keys);
    return second.keys.some((key) => expected.has(key));
  }

  function payloadSignature(payload) {
    const normalized = normalizeRichPayload(payload);
    const textKey = comparableText(normalized.plainText || normalized.text);
    const assetKey = normalized.assets.map((asset) => asset.keys.slice().sort()[0] || "")
      .filter(Boolean).join("|");
    return `${textKey}::${assetKey}`.slice(0, 1000);
  }

  function payloadMatchesIntent(payload, intent) {
    const rowText = comparableText(payload.plainText || payload.text);
    const intentText = comparableText(intent.payload.plainText || intent.payload.text);
    const rowRaw = shared.normalizeWhitespace(payload.text);
    const intentRaw = shared.normalizeWhitespace(intent.payload.text);
    const textMatches = rowText || intentText
      ? rowText === intentText
      : Boolean(rowRaw && rowRaw === intentRaw);
    if (!textMatches) {
      return false;
    }
    if (!intent.payload.assets.length) {
      return Boolean(intentText || intentRaw);
    }
    return intent.payload.assets.every((expected) =>
      payload.assets.some((actual) => assetsMatch(expected, actual)));
  }

  function clearStaleOwnChatMarks() {
    document.querySelectorAll("[data-bcp-douyin-own-chat='true']").forEach((row) => {
      const signature = payloadSignature(richPayloadFromChatRow(row));
      if (signature === row.dataset.bcpDouyinOwnChatSignature) {
        return;
      }
      delete row.dataset.bcpDouyinOwnChat;
      delete row.dataset.bcpDouyinOwnChatSignature;
      row.querySelectorAll("[data-bcp-douyin-own-chat-content='true']").forEach((content) => {
        delete content.dataset.bcpDouyinOwnChatContent;
      });
    });
  }

  function scanOwnChatMessages() {
    state.ownChatScanTimer = 0;
    const now = Date.now();
    state.ownChatIntents = state.ownChatIntents
      .filter((intent) => now - intent.at <= OWN_CHAT_MESSAGE_TTL);
    clearStaleOwnChatMarks();
    if (!state.ownChatIntents.length) {
      return;
    }
    const rows = queryAll(CHAT_MESSAGE_SELECTORS).slice(-120).reverse();
    for (let intentIndex = 0; intentIndex < state.ownChatIntents.length; intentIndex += 1) {
      const intent = state.ownChatIntents[intentIndex];
      const row = rows.find((candidate) => {
        if (isOwned(candidate) || candidate.dataset.bcpDouyinOwnChat === "true") {
          return false;
        }
        const payload = richPayloadFromChatRow(candidate);
        const signature = payloadSignature(payload);
        if (intent.baseline.get(candidate) === signature) {
          return false;
        }
        return payloadMatchesIntent(payload, intent);
      });
      if (!row) {
        continue;
      }
      const payload = richPayloadFromChatRow(row);
      const content = messageContentElement(row);
      row.dataset.bcpDouyinOwnChat = "true";
      row.dataset.bcpDouyinOwnChatSignature = payloadSignature(payload);
      if (content) {
        content.dataset.bcpDouyinOwnChatContent = "true";
      }
      state.ownChatIntents.splice(intentIndex, 1);
      intentIndex -= 1;
      debugState.counters.ownChatMessagesMarked += 1;
      debugEvent("own-chat-message-marked", {
        intentId: intent.id,
        text: payload.text,
        assetCount: payload.assets.length
      }, "info");
    }
    if (state.ownChatIntents.length) {
      state.ownChatScanTimer = setTimeout(scanOwnChatMessages, 120);
    }
  }

  function scheduleOwnChatScan(delay) {
    if (state.ownChatScanTimer) {
      return;
    }
    state.ownChatScanTimer = setTimeout(scanOwnChatMessages, Number(delay) || 0);
  }

  function queueOwnChatIntent(intentId, payload) {
    const rows = queryAll(CHAT_MESSAGE_SELECTORS).slice(-120);
    state.ownChatIntents.push({
      id: intentId,
      payload,
      at: Date.now(),
      baseline: new Map(rows.map((row) => [row, payloadSignature(richPayloadFromChatRow(row))]))
    });
    if (state.ownChatIntents.length > 24) {
      state.ownChatIntents.splice(0, state.ownChatIntents.length - 24);
    }
    debugState.counters.ownChatIntents += 1;
    scheduleOwnChatScan(0);
  }

  function announceOwnMessage(message, sourceType) {
    const payload = normalizeRichPayload(message);
    const text = payload.text;
    if (!shared.isPlausibleMessage(text, MAX_LENGTH)) {
      return "";
    }
    const intentId = `${Date.now()}-${state.nextOwnAnnouncementId}`;
    state.nextOwnAnnouncementId += 1;
    window.postMessage({
      source: CONTENT_SOURCE,
      type: "own-message-intent",
      intentId,
      sourceType: String(sourceType || "unknown").slice(0, 40),
      text: payload.plainText || text
    }, "*");
    queueOwnChatIntent(intentId, payload);
    debugEvent("own-message-announced", {
      text,
      sourceType: sourceType || "unknown",
      assetCount: payload.assets.length
    });
    return intentId;
  }

  function cancelOwnMessageAnnouncement(intentId) {
    if (!intentId) {
      return;
    }
    window.postMessage({
      source: CONTENT_SOURCE,
      type: "own-message-cancel",
      intentId
    }, "*");
    state.ownChatIntents = state.ownChatIntents.filter((intent) => intent.id !== intentId);
  }

  async function waitForConsumption(input, message, timeout) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (!inputContains(input, message)) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return !inputContains(input, message);
  }

  async function waitForInputClear(input, timeout) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (inputIsEmpty(input)) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return inputIsEmpty(input);
  }

  async function repeatMessage(message, richValue) {
    const now = Date.now();
    if (now - state.lastActionAt < 700) {
      showToast("操作太快，请稍后再试", "warning");
      return false;
    }
    state.lastActionAt = now;
    debugState.counters.sendsAttempted += 1;
    const richPayload = normalizeRichPayload(richValue || message);
    const emojiAssets = richPayload.assets;
    const inputTextValue = emojiAssets.length ? richPayload.plainText : message;
    debugEvent("send-attempt", {
      message,
      plainText: inputTextValue,
      emojiCount: emojiAssets.length
    }, "info");
    const input = findInput();
    if (!input) {
      debugState.counters.sendsFailed += 1;
      debugEvent("send-failed", { message, reason: "input-not-found" }, "error");
      showToast("未找到抖音弹幕输入框，请确认已登录并展开聊天区", "error");
      return false;
    }
    const ownIntentId = announceOwnMessage(richPayload, "plus-one");
    const prepared = await prepareRichInput(input, richPayload);
    await new Promise((resolve) => setTimeout(resolve, 80));
    if (!prepared.ok) {
      await new Promise((resolve) => setTimeout(resolve, 220));
      const directSent = !state.ownChatIntents.some((intent) => intent.id === ownIntentId);
      if (directSent) {
        debugState.counters.sendsSucceeded += 1;
        debugEvent("send-succeeded", { message, mode: "emoji-direct" }, "info");
        showToast("已执行含表情 +1", "success");
        return true;
      }
      cancelOwnMessageAnnouncement(ownIntentId);
      setInputValue(input, "");
      debugState.counters.sendsFailed += 1;
      debugEvent("send-failed", { message, reason: prepared.reason }, "error");
      showToast("未找到或无法插入对应抖音表情，已取消 +1", "error");
      return false;
    }
    let button = findSendButton(input);
    if (button) {
      button.click();
    } else {
      pressEnter(input);
    }
    let consumed = emojiAssets.length
      ? await waitForInputClear(input, 420)
      : await waitForConsumption(input, message, 320);
    if (!consumed) {
      pressEnter(input);
      consumed = emojiAssets.length
        ? await waitForInputClear(input, 320)
        : await waitForConsumption(input, message, 260);
    }
    if (!consumed) {
      button = findSendButton(input);
      if (button) {
        button.click();
        consumed = emojiAssets.length
          ? await waitForInputClear(input, 420)
          : await waitForConsumption(input, message, 320);
      }
    }
    if (!consumed) {
      cancelOwnMessageAnnouncement(ownIntentId);
      debugState.counters.sendsFailed += 1;
      debugEvent("send-failed", { message, reason: "input-not-consumed" }, "error");
      showToast("自动发送失败，弹幕仍在输入框，请重试", "error");
      return false;
    }
    try {
      input.blur();
    } catch (_error) {
      // The controlled editor may be replaced during the send cycle.
    }
    debugState.counters.sendsSucceeded += 1;
    debugEvent("send-succeeded", { message, emojiCount: emojiAssets.length }, "info");
    showToast(emojiAssets.length ? "已执行含表情 +1" : "已执行 +1", "success");
    return true;
  }

  async function onPlusOneClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!state.candidate || state.button.disabled) {
      return;
    }
    state.button.disabled = true;
    const richPayload = await resolveRichPayloadWithRetry(
      state.candidate.message,
      state.candidate.content
    );
    const success = await repeatMessage(richPayload.text, richPayload);
    if (success) {
      hideCard("send-succeeded");
    } else if (state.button) {
      state.button.disabled = false;
    }
  }

  function onAltClick(event) {
    if (!enabled() || !state.settings.altClick || !event.altKey
        || !event.isTrusted || actionFromEvent(event)) {
      return;
    }
    const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
    const barrage = path.find((item) => item instanceof Element
      && item.matches(".bcp-douyin-dom-barrage"));
    let message = barrage
      ? shared.parseMessageText(barrage.dataset.message || "", MAX_LENGTH)
      : "";
    if (!shared.isPlausibleMessage(message, MAX_LENGTH)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const payload = resolveRichPayload(message, []);
    repeatMessage(payload.text, payload);
  }

  function postRendererSettings(reason, overrideEnabled) {
    const rendererEnabled = typeof overrideEnabled === "boolean" ? overrideEnabled : enabled();
    window.postMessage({
      source: CONTENT_SOURCE,
      type: "renderer-settings",
      enabled: rendererEnabled,
      reason: String(reason || "sync").slice(0, 80),
      version: DEBUG_VERSION,
      sentAt: Date.now()
    }, "*");
    debugEvent("renderer-settings-sent", {
      enabled: rendererEnabled,
      reason: reason || "sync"
    });
  }

  function postRendererResult(data, ok, reason) {
    window.postMessage({
      source: CONTENT_SOURCE,
      type: "renderer-result",
      requestId: data.requestId,
      instanceId: String(data.instanceId || ""),
      trackId: String(data.trackId || ""),
      ok: Boolean(ok),
      reason: String(reason || (ok ? "sent" : "failed")).slice(0, 120)
    }, "*");
  }

  function actionFromEvent(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
    return path.find((item) => item instanceof Element
      && item.matches(".bcp-douyin-dom-action")) || null;
  }

  function rememberTrustedRendererAction(event) {
    const action = actionFromEvent(event);
    if (!action || !event.isTrusted) {
      return;
    }
    state.trustedAction = {
      at: performance.now(),
      instanceId: String(action.dataset.instanceId || ""),
      trackId: String(action.dataset.trackId || ""),
      message: shared.parseMessageText(action.dataset.message || "", MAX_LENGTH)
    };
    debugEvent("renderer-action-trusted", {
      instanceId: state.trustedAction.instanceId,
      trackId: state.trustedAction.trackId,
      message: state.trustedAction.message
    });
  }

  function matchesTrustedAction(data, message) {
    const trusted = state.trustedAction;
    state.trustedAction = null;
    return Boolean(trusted
      && performance.now() - trusted.at <= TRUSTED_ACTION_WINDOW
      && trusted.instanceId === String(data.instanceId || "")
      && trusted.trackId === String(data.trackId || "")
      && trusted.message === message);
  }

  async function handleRendererActivation(data) {
    const requestId = String(data.requestId == null ? "" : data.requestId);
    const message = shared.parseMessageText(data.text, MAX_LENGTH);
    if (!requestId || state.activationRequests.has(requestId)
        || !enabled() || !shared.isPlausibleMessage(message, MAX_LENGTH)) {
      debugState.counters.rendererActivationsRejected += 1;
      debugEvent("renderer-activation-rejected", {
        requestId,
        instanceId: data.instanceId,
        trackId: data.trackId,
        reason: "invalid-or-duplicate"
      }, "warn");
      postRendererResult(data, false, "invalid-or-duplicate");
      return;
    }
    if (!matchesTrustedAction(data, message)) {
      debugState.counters.rendererActivationsRejected += 1;
      debugEvent("renderer-activation-rejected", {
        requestId,
        instanceId: data.instanceId,
        trackId: data.trackId,
        reason: "missing-trusted-click"
      }, "warn");
      postRendererResult(data, false, "missing-trusted-click");
      return;
    }

    state.activationRequests.add(requestId);
    debugState.counters.rendererActivations += 1;
    const richPayload = await resolveRichPayloadWithRetry(message, data.content);
    const richMessage = richPayload.text;
    debugEvent("renderer-activation", {
      requestId,
      instanceId: data.instanceId,
      trackId: data.trackId,
      message: richMessage
    }, "info");
    try {
      const success = await repeatMessage(richMessage, richPayload);
      postRendererResult(data, success, success ? "sent" : "send-failed");
    } catch (error) {
      debugEvent("renderer-activation-error", {
        requestId,
        error: String(error && error.message || error)
      }, "error");
      postRendererResult(data, false, "send-error");
    } finally {
      setTimeout(() => state.activationRequests.delete(requestId), 10_000);
    }
  }

  function applySettings(saved) {
    state.settings = shared.mergeSettings(saved);
    shared.applyPlatformColors(document.documentElement, state.settings.colors.douyin);
    debugState.settingsEnabled = enabled();
    debugEvent("settings-applied", {
      enabled: state.settings.enabled,
      douyin: state.settings.platforms.douyin,
      altClick: state.settings.altClick
    });
    if (!enabled()) {
      hideCard("disabled-by-settings");
      state.ownChatIntents = [];
      document.querySelectorAll("[data-bcp-douyin-own-chat='true']").forEach((row) => {
        delete row.dataset.bcpDouyinOwnChat;
        delete row.dataset.bcpDouyinOwnChatSignature;
        row.querySelectorAll("[data-bcp-douyin-own-chat-content='true']").forEach((content) => {
          delete content.dataset.bcpDouyinOwnChatContent;
        });
      });
    }
    postRendererSettings("settings-applied");
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.source !== PAGE_SOURCE) {
      return;
    }
    if (event.data.type === "renderer-activate") {
      handleRendererActivation(event.data);
      return;
    }
    if (event.data.type === "ready") {
      state.pageReady = true;
      state.pageVersion = String(event.data.version || "legacy");
      debugState.pageReady = true;
      debugState.pageVersion = state.pageVersion;
      debugEvent("page-ready", {
        version: state.pageVersion,
        instanceCount: Number(event.data.instanceCount) || 0,
        orphanCount: Number(event.data.orphanCount) || 0
      }, "info");
      postRendererSettings("page-ready");
      return;
    }
    if (event.data.type === "debug-snapshot") {
      state.pageSnapshot = event.data.snapshot || null;
      debugEvent("page-debug-snapshot", {
        requestId: Number(event.data.requestId) || 0,
        instanceCount: state.pageSnapshot && state.pageSnapshot.instanceCount,
        orphanCount: state.pageSnapshot && state.pageSnapshot.orphanCount
      }, "info");
      console.info("[Danmaku Echo][Douyin diagnostics]", contentDebugSnapshot());
      return;
    }
    if (event.data.type !== "probe-result" || !state.pendingProbe
        || Number(event.data.requestId) !== state.pendingProbe.requestId) {
      return;
    }
    const pending = state.pendingProbe;
    state.pendingProbe = null;
    debugState.counters.probeResults += 1;
    debugState.lastProbe = {
      requestId: pending.requestId,
      sentAt: Date.now() - Math.max(0, performance.now() - pending.sentAt),
      receivedAt: Date.now(),
      latency: performance.now() - pending.sentAt,
      x: pending.x,
      y: pending.y,
      status: event.data.hit ? "hit" : "miss",
      hit: event.data.hit ? {
        trackId: event.data.hit.trackId,
        text: event.data.hit.text,
        rect: event.data.hit.rect,
        model: event.data.hit.model || null
      } : null
    };
    if (state.candidate || performance.now() - pending.sentAt > 250
        || Math.hypot(state.pointerX - pending.x, state.pointerY - pending.y) > 14) {
      debugState.lastProbe.status = "discarded-stale";
      scheduleDebugMarker();
      return;
    }
    const candidate = candidateFromProbe(event.data.hit, pending);
    if (candidate) {
      showCard(candidate);
    } else {
      scheduleDebugMarker();
    }
  });

  storageGet().then(applySettings);
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("pointerdown", (event) => {
    if (state.candidate && !isOwned(event.target)
        && performance.now() >= state.lockedUntil) {
      hideCard("outside-pointerdown");
    }
  }, true);
  document.addEventListener("click", rememberTrustedRendererAction, true);
  document.addEventListener("click", (event) => {
    if (!event.isTrusted || !enabled()) {
      return;
    }
    const input = findInput();
    const button = input && findSendButton(input);
    const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
    if (button && path.includes(button)) {
      announceOwnMessage(richPayloadFromInput(input), "manual-button");
    }
  }, true);
  document.addEventListener("click", onAltClick, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideCard("escape");
    }
    if (event.isTrusted && event.key === "Enter" && !event.shiftKey && enabled()) {
      const input = findInput();
      if (input && (event.target === input || input.contains(event.target))) {
        announceOwnMessage(richPayloadFromInput(input), "manual-enter");
      }
    }
    if (event.ctrlKey && event.altKey && String(event.key).toLowerCase() === "d") {
      event.preventDefault();
      const requestId = state.nextProbeId++;
      debugEvent("diagnostics-requested", { requestId }, "info");
      window.postMessage({
        source: CONTENT_SOURCE,
        type: "debug-request",
        requestId
      }, "*");
      showToast("诊断信息已输出到控制台", "info");
    }
  }, true);
  window.addEventListener("blur", () => scheduleHide("window-blur", 120));
  // Douyin auto-scrolls its virtual chat list whenever messages arrive. A captured
  // scroll listener would clear a valid Canvas selection even while the pointer is
  // already over the card, so scrolling is deliberately not a dismissal signal.
  window.addEventListener("resize", () => hideCard("resize"), { passive: true });
  document.addEventListener("fullscreenchange", () => {
    hideCard("fullscreen-change");
    ensurePortal();
  }, true);
  document.addEventListener("webkitfullscreenchange", () => {
    hideCard("webkit-fullscreen-change");
    ensurePortal();
  }, true);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hideCard("document-hidden");
    } else {
      postRendererSettings("document-visible");
    }
  });
  window.addEventListener("pagehide", () => {
    postRendererSettings("pagehide", false);
  });

  function startOwnChatObserver() {
    if (state.ownChatObserver || !document.documentElement) {
      return;
    }
    state.ownChatObserver = new MutationObserver((mutations) => {
      const relevant = mutations.some((mutation) => {
        const target = mutation.target instanceof Element
          ? mutation.target
          : mutation.target && mutation.target.parentElement;
        if (target && (closestAny(target, CHAT_ROOT_SELECTORS)
            || closestAny(target, CHAT_MESSAGE_SELECTORS))) {
          return true;
        }
        return Array.from(mutation.addedNodes || []).some((node) => node instanceof Element
          && (matchesAny(node, CHAT_ROOT_SELECTORS)
            || matchesAny(node, CHAT_MESSAGE_SELECTORS)
            || Boolean(node.querySelector(CHAT_MESSAGE_SELECTORS.join(",")))));
      });
      if (relevant && (state.ownChatIntents.length
          || document.querySelector("[data-bcp-douyin-own-chat='true']"))) {
        scheduleOwnChatScan(40);
      }
    });
    state.ownChatObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }
  if (document.documentElement) {
    startOwnChatObserver();
  } else {
    document.addEventListener("DOMContentLoaded", startOwnChatObserver, { once: true });
  }

  if (globalThis.chrome && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((_changes, areaName) => {
      if (areaName === "sync") {
        storageGet().then(applySettings);
      }
    });
  }

  const ping = () => {
    const requestId = state.nextProbeId++;
    debugState.counters.pings += 1;
    debugEvent("page-ping", { requestId, href: location.href });
    window.postMessage({
      source: CONTENT_SOURCE,
      type: "ping",
      requestId
    }, "*");
  };
  ping();
  [1000, 3000, 7000].forEach((delay) => setTimeout(() => {
    if (!state.pageReady) {
      ping();
    }
  }, delay));
  setInterval(() => postRendererSettings("heartbeat"), RENDERER_HEARTBEAT_INTERVAL);

  setInterval(() => {
    if (state.lastUrl !== location.href) {
      state.lastUrl = location.href;
      debugEvent("spa-url-changed", { href: location.href }, "info");
      hideCard("spa-url-change");
      state.pageReady = false;
      debugState.pageReady = false;
      ping();
      postRendererSettings("spa-url-change");
    }
  }, 500);
  debugEvent("content-loaded", {
    href: location.href,
    readyState: document.readyState,
    version: DEBUG_VERSION
  }, "info");
  syncDebugMarker();
})();
