(function initDanmakuEchoDouyin() {
  "use strict";

  const shared = globalThis.BulletPlusOneShared;
  if (!shared || shared.detectPlatform(location.hostname) !== "douyin"
      || globalThis.__danmakuEchoDouyinLoaded) {
    return;
  }
  globalThis.__danmakuEchoDouyinLoaded = true;

  const CONTENT_SOURCE = "danmaku-echo-douyin-content";
  const PAGE_SOURCE = "danmaku-echo-douyin-page";
  const MAX_LENGTH = 1000;
  const CARD_LOCK_TIME = 1200;
  const CARD_HIDE_DELAY = 280;
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

  const state = {
    settings: shared.mergeSettings(),
    portal: null,
    card: null,
    preview: null,
    button: null,
    toast: null,
    candidate: null,
    hideTimer: 0,
    lockedUntil: 0,
    pointerX: 0,
    pointerY: 0,
    probeFrame: 0,
    nextProbeId: 1,
    pendingProbe: null,
    pageReady: false,
    lastActionAt: 0,
    lastUrl: location.href
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

  function hideCard() {
    cancelHide();
    state.candidate = null;
    state.lockedUntil = 0;
    state.pendingProbe = null;
    if (!state.card) {
      return;
    }
    state.card.hidden = true;
    state.card.classList.remove("is-visible");
    state.card.removeAttribute("data-track-id");
    if (state.preview) {
      state.preview.replaceChildren();
    }
  }

  function scheduleHide(delay) {
    if (state.hideTimer) {
      return;
    }
    state.hideTimer = setTimeout(() => {
      state.hideTimer = 0;
      hideCard();
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
    button.addEventListener("pointerdown", (event) => event.stopPropagation());

    card.append(preview, button);
    card.addEventListener("pointerenter", cancelHide);
    card.addEventListener("pointerleave", () => scheduleHide(CARD_HIDE_DELAY));
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

  function messageFromChatRow(row) {
    for (const selector of MESSAGE_TEXT_SELECTORS) {
      let element = null;
      try {
        element = row.matches(selector) ? row : row.querySelector(selector);
      } catch (_error) {
        element = null;
      }
      const text = richTextFromElement(element);
      if (shared.isPlausibleMessage(text, MAX_LENGTH)) {
        return text;
      }
    }
    return richTextFromElement(row);
  }

  function comparableText(value) {
    return shared.normalizeWhitespace(value)
      .replace(/\[[^\]\n]{1,40}\]/g, "")
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/\s+/g, "");
  }

  function resolveRichMessage(canvasText) {
    const key = comparableText(canvasText);
    if (!key) {
      return canvasText;
    }
    const rows = queryAll(CHAT_MESSAGE_SELECTORS).slice(-100).reverse();
    for (const row of rows) {
      if (isOwned(row)) {
        continue;
      }
      const text = messageFromChatRow(row);
      if (shared.isPlausibleMessage(text, MAX_LENGTH) && comparableText(text) === key) {
        return text;
      }
    }
    return canvasText;
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
    let left = Math.max(boundsLeft, Math.min(anchor.left, boundsRight - width));
    if (!Number.isFinite(left)) {
      left = Math.max(8, Math.min(anchor.left, innerWidth - width - 8));
    }
    const below = anchor.top + anchor.height + 7;
    const above = anchor.top - height - 7;
    const boundsBottom = Math.min(innerHeight - 8, bounds.top + bounds.height - 8);
    const boundsTop = Math.max(8, bounds.top + 8);
    let top = below + height <= boundsBottom ? below : above;
    top = Math.max(boundsTop, Math.min(top, boundsBottom - height));
    card.style.setProperty("left", `${Math.round(left)}px`);
    card.style.setProperty("top", `${Math.round(top)}px`);
    card.style.removeProperty("visibility");
    requestAnimationFrame(() => card.classList.add("is-visible"));
  }

  function showCard(candidate) {
    if (!enabled() || !candidate || !shared.isPlausibleMessage(candidate.message, MAX_LENGTH)) {
      return;
    }
    cancelHide();
    const card = ensureCard();
    state.candidate = candidate;
    state.lockedUntil = performance.now() + CARD_LOCK_TIME;
    state.button.disabled = false;
    state.button.setAttribute("aria-label", `弹幕加一：${candidate.message}`);
    card.dataset.trackId = String(candidate.trackId || "dom");
    card.classList.remove("is-visible");
    renderPreview(candidate);
    positionCard(candidate);
    setTimeout(() => {
      if (state.candidate !== candidate || !state.card || state.card.hidden) {
        return;
      }
      const cardRect = state.card.getBoundingClientRect();
      if (!pointInside(cardRect, state.pointerX, state.pointerY, 12)
          && !pointInside(candidate.rect, state.pointerX, state.pointerY, 10)) {
        scheduleHide(CARD_HIDE_DELAY);
      }
    }, CARD_LOCK_TIME + 10);
  }

  function saneRect(rect) {
    return rect
      && [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)
      && rect.width >= 2 && rect.width <= innerWidth * 2
      && rect.height >= 4 && rect.height <= 300;
  }

  function candidateFromProbe(hit) {
    if (!hit || !saneRect(hit.rect)) {
      return null;
    }
    const canvasText = shared.parseMessageText(hit.text, MAX_LENGTH);
    if (!shared.isPlausibleMessage(canvasText, MAX_LENGTH)) {
      return null;
    }
    return {
      trackId: hit.trackId,
      instanceId: hit.instanceId,
      rect: hit.rect,
      canvasRect: saneRect(hit.canvasRect) ? hit.canvasRect : null,
      message: resolveRichMessage(canvasText),
      content: Array.isArray(hit.content) ? hit.content : [],
      style: hit.style && typeof hit.style === "object" ? hit.style : {},
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
    const message = kind === "chat" ? messageFromChatRow(element) : richTextFromElement(element);
    if (!shared.isPlausibleMessage(message, MAX_LENGTH)) {
      return null;
    }
    return {
      trackId: `dom-${Date.now()}`,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      canvasRect: null,
      message,
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
    for (const element of elements) {
      const row = closestAny(element, CHAT_MESSAGE_SELECTORS);
      if (row && closestAny(row, CHAT_ROOT_SELECTORS)) {
        const candidate = domCandidateFromElement(row, "chat");
        if (candidate) {
          return candidate;
        }
      }
    }
    return null;
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
    if (isOwned(event.target)) {
      cancelHide();
      return;
    }
    if (state.candidate && state.card && !state.card.hidden) {
      const cardRect = state.card.getBoundingClientRect();
      if (performance.now() < state.lockedUntil
          || pointInside(cardRect, event.clientX, event.clientY, 12)
          || pointInside(state.candidate.rect, event.clientX, event.clientY, 10)) {
        cancelHide();
      } else {
        scheduleHide(CARD_HIDE_DELAY);
      }
      return;
    }
    const domCandidate = findDomCandidate(event);
    if (domCandidate) {
      showCard(domCandidate);
      return;
    }
    scheduleProbe();
  }

  function inputText(input) {
    return input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement
      ? input.value
      : input.textContent || "";
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

  async function repeatMessage(message) {
    const now = Date.now();
    if (now - state.lastActionAt < 700) {
      showToast("操作太快，请稍后再试", "warning");
      return false;
    }
    state.lastActionAt = now;
    const input = findInput();
    if (!input) {
      showToast("未找到抖音弹幕输入框，请确认已登录并展开聊天区", "error");
      return false;
    }
    setInputValue(input, message);
    await new Promise((resolve) => setTimeout(resolve, 80));
    let button = findSendButton(input);
    if (button) {
      button.click();
    } else {
      pressEnter(input);
    }
    let consumed = await waitForConsumption(input, message, 320);
    if (!consumed) {
      pressEnter(input);
      consumed = await waitForConsumption(input, message, 260);
    }
    if (!consumed) {
      button = findSendButton(input);
      if (button) {
        button.click();
        consumed = await waitForConsumption(input, message, 320);
      }
    }
    if (!consumed) {
      showToast("自动发送失败，弹幕仍在输入框，请重试", "error");
      return false;
    }
    try {
      input.blur();
    } catch (_error) {
      // The controlled editor may be replaced during the send cycle.
    }
    showToast("已执行 +1", "success");
    return true;
  }

  async function onPlusOneClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!state.candidate || state.button.disabled) {
      return;
    }
    state.button.disabled = true;
    const success = await repeatMessage(state.candidate.message);
    if (success) {
      hideCard();
    } else if (state.button) {
      state.button.disabled = false;
    }
  }

  function onAltClick(event) {
    if (!enabled() || !state.settings.altClick || !event.altKey
        || isOwned(event.target) || !state.candidate) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    repeatMessage(state.candidate.message).then((success) => {
      if (success) {
        hideCard();
      }
    });
  }

  function applySettings(saved) {
    state.settings = shared.mergeSettings(saved);
    if (!enabled()) {
      hideCard();
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.source !== PAGE_SOURCE) {
      return;
    }
    if (event.data.type === "ready") {
      state.pageReady = true;
      return;
    }
    if (event.data.type !== "probe-result" || !state.pendingProbe
        || Number(event.data.requestId) !== state.pendingProbe.requestId) {
      return;
    }
    const pending = state.pendingProbe;
    state.pendingProbe = null;
    if (state.candidate || performance.now() - pending.sentAt > 250
        || Math.hypot(state.pointerX - pending.x, state.pointerY - pending.y) > 14) {
      return;
    }
    const candidate = candidateFromProbe(event.data.hit);
    if (candidate) {
      showCard(candidate);
    }
  });

  storageGet().then(applySettings);
  ensureCard();
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("click", onAltClick, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideCard();
    }
  }, true);
  window.addEventListener("blur", () => scheduleHide(120));
  window.addEventListener("scroll", hideCard, true);
  window.addEventListener("resize", hideCard, { passive: true });
  document.addEventListener("fullscreenchange", () => {
    hideCard();
    ensurePortal();
  }, true);
  document.addEventListener("webkitfullscreenchange", () => {
    hideCard();
    ensurePortal();
  }, true);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hideCard();
    }
  });

  if (globalThis.chrome && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((_changes, areaName) => {
      if (areaName === "sync") {
        storageGet().then(applySettings);
      }
    });
  }

  const ping = () => window.postMessage({
    source: CONTENT_SOURCE,
    type: "ping",
    requestId: state.nextProbeId++
  }, "*");
  ping();
  [1000, 3000, 7000].forEach((delay) => setTimeout(() => {
    if (!state.pageReady) {
      ping();
    }
  }, delay));

  setInterval(() => {
    if (state.lastUrl !== location.href) {
      state.lastUrl = location.href;
      hideCard();
      state.pageReady = false;
      ping();
    }
  }, 500);
})();
