// @ts-nocheck -- platform DOM adapter; typed modules cover its stable boundaries.
import { visibleActionsForSurface } from '../platforms/live/action-visibility'
import { unicodeEmojiFallbackText } from '../platforms/live/emoji-fallback'
import { SenderCorrelationCache } from '../platforms/live/sender-correlation'
import { createBilibiliAdapter } from '../platforms/bilibili/adapter'
import { BILIBILI_PLATFORM_CONFIG } from '../platforms/bilibili/config'
import {
  BILIBILI_CHAT_ACTION_SURFACES,
  BILIBILI_CHAT_ACTION_TEXT,
  BILIBILI_CHAT_AD_LABEL_SELECTORS,
  BILIBILI_CHAT_AD_SELECTORS,
  BILIBILI_CHAT_STRONG_ACTION_TEXT,
  BILIBILI_EMOJI_SURFACE_SELECTORS,
  BILIBILI_EMOJI_TOGGLE_SELECTORS,
  BILIBILI_QUICK_BAR_SELECTORS,
  BILIBILI_QUICK_INPUTS,
  isBilibiliAdvertisementLabel,
  isBilibiliAdvertisementMarker,
} from '../platforms/bilibili/dom-config'
import {
  classifyBilibiliRichPayload,
  hasBilibiliInlineTextContent,
  isBilibiliNativePanelAsset,
  isSingleBilibiliEmojiPayload,
} from '../platforms/bilibili/rich-payload'
import { BILIBILI_SEND_MESSAGE } from '../platforms/bilibili/page-send'
import { BILIBILI_EMOTICON_MESSAGE } from '../platforms/bilibili/page-emoticons'
import { selectUniqueBilibiliCatalogEntry } from '../platforms/bilibili/emoji-catalog'
import {
  authoritativeBilibiliText,
  bilibiliPayloadTextFromParts,
  isBilibiliMedalAccessibilityLabel,
  normalizeBilibiliPayloadParts,
} from '../platforms/bilibili/payload-normalizer'
import { normalizedAssetKeys as normalizedRichAssetKeys } from '../platforms/douyin/rich-data'
import { createFavoritesRuntime } from '../features/favorites/launcher'
import { createContentOverlay } from '../components/live/content-overlay'
import { createDiagnosticsCollector } from '../core/diagnostics'
import { writeClipboardText } from '../core/clipboard'
import { SEND_LOG_MESSAGE } from '../features/send-log/types'
import {
  BILIBILI_EMOTICON_ITEM_SELECTOR,
  BILIBILI_EMOTICON_PACK_SELECTOR,
  BILIBILI_EMOTICON_PANEL_SELECTOR,
  BILIBILI_EMOTICON_TAB_SELECTOR,
  BILIBILI_INLINE_EMOJI_PACK_SELECTOR,
  BILIBILI_NATIVE_PANEL_IDENTITY_ATTRIBUTES,
  EDITABLE_CONTROL_SELECTOR,
  EMOJI_DISPLAY_ATTRIBUTES,
  EMOJI_METADATA_ATTRIBUTES,
  LEGACY_BILIBILI_EXCLUSIVE_ASSET_KEY_PREFIX,
  NATIVE_PANEL_ASSET_KEY_PREFIX,
  PLATFORM_EMOJI_CATEGORY_SELECTORS,
  PLATFORM_EMOJI_ITEM_SELECTORS,
  TEXT_EDITOR_SELECTOR,
} from '../platforms/live/editor-config'
import {
  dispatchEditorEnter as pressEnter,
  placeEditorCaretAtEnd as placeCaretAtEnd,
  readEditorText as inputText,
} from '../platforms/live/editor-dom'
import {
  ACTIVE_MEDIA_SELECTOR,
  containsActiveMediaDeep,
  createInertOverlaySnapshot,
  inertSnapshotSkipSelector,
} from '../platforms/live/inert-snapshot'
import { t } from '../core/i18n'

;(function initDanmakuEchoLive() {
  'use strict'

  const shared = globalThis.DanmakuEchoShared
  const platformId = 'bilibili'

  if (
    !shared ||
    !/(^|\.)live\.bilibili\.com$/i.test(location.hostname) ||
    globalThis.__bulletPlusOneLoaded
  ) {
    return
  }

  globalThis.__bulletPlusOneLoaded = true

  const config = BILIBILI_PLATFORM_CONFIG
  const platformName = t('platformBilibili')
  const platformAdapter = createBilibiliAdapter()
  const INERT_SNAPSHOT_SKIP_SELECTOR = inertSnapshotSkipSelector()
  const OVERLAY_HOVER_PADDING = 14
  const OVERLAY_LEAVE_DELAY = 160
  const BILIBILI_OVERLAY_ROW_SELECTOR = '.bili-danmaku-x-dm'
  const BILIBILI_OVERLAY_CACHE_TTL = 180
  const BILIBILI_OVERLAY_CACHE_LIMIT = 240
  const SENDER_SCAN_MIN_INTERVAL = 240
  const REPLY_RESOLVE_ATTEMPTS = 7
  const REPLY_RESOLVE_INTERVAL = 70
  const state = {
    settings: shared.mergeSettings(),
    candidate: null,
    candidateKind: null,
    message: '',
    sender: '',
    selectedAt: 0,
    senderCorrelation: new SenderCorrelationCache(),
    senderObserver: null,
    senderScanTimer: 0,
    senderLastScanAt: 0,
    richPayload: null,
    hideTimer: 0,
    lastActionAt: 0,
    sendInProgress: false,
    roots: [document],
    rootsCachedAt: 0,
    ui: null,
    portal: null,
    actionBar: null,
    actionReferenceFontSize: 0,
    button: null,
    replyButton: null,
    favoriteButton: null,
    toast: null,
    frozenClone: null,
    originalVisibility: null,
    pausedAnimations: [],
    pointerFrame: 0,
    pointerX: 0,
    pointerY: 0,
    bilibiliOverlayCandidates: [],
    bilibiliOverlayCandidatesCachedAt: 0,
    hiddenBilibiliQuickBars: new Map(),
    bilibiliDismissToken: 0,
    emojiPanelOpenedByPlugin: false,
    bilibiliEmojiCatalog: null,
    bilibiliEmojiCatalogBuild: null,
    bilibiliApiEmojiCatalog: null,
    bilibiliApiEmojiCatalogBuild: null,
    activeSendLog: null,
  }
  const diagnostics = createDiagnosticsCollector({
    platform: platformId,
    featureFlags: () => state.settings,
    cacheCounts: () => ({
      senderCorrelation: state.senderCorrelation.size,
      roots: state.roots.length,
      bilibiliOverlayCandidates: state.bilibiliOverlayCandidates.length,
      hiddenBilibiliQuickBars: state.hiddenBilibiliQuickBars.size,
    }),
    observerCounts: () => ({
      sender: state.senderObserver ? 1 : 0,
      timers: Number(Boolean(state.hideTimer)) + Number(Boolean(state.senderScanTimer)),
    }),
    selectorHits: () => ({
      chatRoot: queryAllDeep(config.chatRoots).length > 0,
      input: queryAllDeep(config.inputs).length > 0,
      videoRoot: queryAllDeep(config.videoRoots).length > 0,
    }),
  })
  diagnostics.record({ type: 'runtime.initialized', stage: 'content' })

  function storageGet() {
    return new Promise((resolve) => {
      if (!globalThis.chrome || !chrome.storage || !chrome.storage.sync) {
        resolve({})
        return
      }

      chrome.storage.sync.get(null, (value) => resolve(value || {}))
    })
  }

  function isEnabled() {
    return Boolean(
      state.settings.enabled &&
      state.settings.platforms[platformId] &&
      Object.values(state.settings.actions).some(Boolean),
    )
  }

  function isOwned(node) {
    return node instanceof Element && Boolean(node.closest('[data-bcp-one-owned]'))
  }

  function isVisible(element) {
    if (!(element instanceof Element) || !element.isConnected) {
      return false
    }

    const style = getComputedStyle(element)
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) > 0 &&
      element.getClientRects().length > 0
    )
  }

  function refreshRoots() {
    const now = Date.now()
    if (now - state.rootsCachedAt < 3000) {
      return state.roots
    }

    const roots = [document]
    const queue = [document]
    const visited = new Set(queue)

    while (queue.length && roots.length < 40) {
      const root = queue.shift()
      let elements = []

      try {
        elements = root.querySelectorAll('*')
      } catch {
        continue
      }

      for (const element of elements) {
        if (element.shadowRoot && !visited.has(element.shadowRoot)) {
          visited.add(element.shadowRoot)
          roots.push(element.shadowRoot)
          queue.push(element.shadowRoot)
        }
      }
    }

    state.roots = roots
    state.rootsCachedAt = now
    return roots
  }

  function queryAllDeep(selectors) {
    const results = []
    const seen = new Set()

    for (const root of refreshRoots()) {
      for (const selector of selectors) {
        let matches = []

        try {
          matches = root.querySelectorAll(selector)
        } catch {
          continue
        }

        for (const match of matches) {
          if (!seen.has(match)) {
            seen.add(match)
            results.push(match)
          }
        }
      }
    }

    return results
  }

  function queryDocumentElements(selectors) {
    const results = []
    const seen = new Set()
    let matches = []
    try {
      matches = document.querySelectorAll(selectors.join(','))
    } catch {
      for (const selector of selectors) {
        try {
          document.querySelectorAll(selector).forEach((match) => {
            if (!seen.has(match)) {
              seen.add(match)
              results.push(match)
            }
          })
        } catch {
          // Ignore selectors unsupported by an older Chromium build.
        }
      }
      return results
    }
    matches.forEach((match) => {
      if (!seen.has(match)) {
        seen.add(match)
        results.push(match)
      }
    })
    return results
  }

  function messageRows() {
    if (platformId !== 'bilibili') {
      return queryAllDeep(config.messages)
    }
    return queryDocumentElements(config.messages).filter(
      (element) => !isInsideBilibiliVideoOverlay(element),
    )
  }

  function overlayMessageCandidates() {
    if (platformId !== 'bilibili') {
      return queryAllDeep(config.overlayMessages)
    }

    const now = Date.now()
    if (now - state.bilibiliOverlayCandidatesCachedAt < BILIBILI_OVERLAY_CACHE_TTL) {
      return state.bilibiliOverlayCandidates
    }
    const seen = new Set()
    state.bilibiliOverlayCandidates = queryDocumentElements(config.overlayMessages)
      .map(normalizeOverlayCandidate)
      .filter((element) => {
        if (!element.isConnected || isOwned(element) || seen.has(element)) return false
        seen.add(element)
        return true
      })
      .slice(-BILIBILI_OVERLAY_CACHE_LIMIT)
    state.bilibiliOverlayCandidatesCachedAt = now
    return state.bilibiliOverlayCandidates
  }

  function matchesAny(element, selectors) {
    if (!(element instanceof Element)) {
      return false
    }

    return selectors.some((selector) => {
      try {
        return element.matches(selector)
      } catch {
        return false
      }
    })
  }

  function serializedTextFromElement(root, options) {
    const removals = options && Array.isArray(options.removals) ? options.removals : []
    const imageTokens = Boolean(options && options.imageTokens)
    const rejectRoot = Boolean(options && options.rejectRoot)
    const pieces = []

    const visit = (node, isRoot) => {
      if (node.nodeType === Node.TEXT_NODE) {
        pieces.push(node.textContent || '')
        return
      }
      if (!(node instanceof Element)) {
        return
      }
      if ((!isRoot || rejectRoot) && matchesAny(node, removals)) {
        return
      }
      if (node instanceof HTMLImageElement) {
        if (imageTokens) {
          const token = emojiTokenFromImage(node)
          if (token) pieces.push(` ${token} `)
        }
        return
      }
      if (node.tagName === 'BR') {
        pieces.push(' ')
        return
      }
      for (const child of node.childNodes) {
        visit(child, false)
      }
    }

    visit(root, true)
    return shared.parseMessageText(pieces.join(''), config.maxLength)
  }

  function closestFromPath(path, selectors) {
    return path.find((item) => matchesAny(item, selectors)) || null
  }

  function closestMatching(element, selectors) {
    let current = element instanceof Element ? element : null

    while (current) {
      if (matchesAny(current, selectors)) {
        return current
      }
      current = current.parentElement
    }

    return null
  }

  function pathInsideBilibiliVideo(path) {
    if (platformId !== 'bilibili') return true
    return path.some(
      (item) => item instanceof Element && Boolean(closestMatching(item, config.videoRoots)),
    )
  }

  function elementMarker(element) {
    if (!(element instanceof Element)) {
      return ''
    }
    return [
      element.tagName,
      element.id,
      typeof element.className === 'string' ? element.className : '',
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.getAttribute('placeholder'),
      element.getAttribute('data-placeholder'),
      element.getAttribute('role'),
    ]
      .filter(Boolean)
      .join(' ')
  }

  function isBilibiliSideChatEditor(element) {
    if (platformId !== 'bilibili' || !(element instanceof Element)) return false
    return Boolean(
      element.matches(
        "textarea.chat-input,.chat-input-ctnr textarea,.chat-input-ctnr input,.chat-input[contenteditable]:not([contenteditable='false'])",
      ) || element.closest('.chat-input-ctnr'),
    )
  }

  function isBilibiliQuickInputRegion(element) {
    if (isBilibiliSideChatEditor(element)) {
      return false
    }
    if (platformId !== 'bilibili' || !(element instanceof Element)) {
      return false
    }

    if (closestMatching(element, BILIBILI_QUICK_BAR_SELECTORS)) {
      return true
    }

    const insidePlayer = Boolean(closestMatching(element, config.videoRoots))
    if (!insidePlayer) {
      return false
    }

    if (element.matches(EDITABLE_CONTROL_SELECTOR)) {
      return true
    }

    const nestedEditor = element.querySelector(EDITABLE_CONTROL_SELECTOR)
    if (nestedEditor && !matchesAny(element, config.videoRoots)) {
      const rect = element.getBoundingClientRect()
      if (rect.height > 0 && rect.height <= 160 && rect.width <= Math.max(900, innerWidth * 0.95)) {
        return true
      }
    }

    return /(?:danmaku|danmu|dm)[-_ ]?(?:input|send)|(?:input|send)[-_ ]?(?:danmaku|danmu|dm)|快捷(?:输入|发送)|发送弹幕/i.test(
      elementMarker(element),
    )
  }

  function pathTouchesBilibiliQuickInput(path) {
    return (
      platformId === 'bilibili' &&
      path.some((item) => item instanceof Element && isBilibiliQuickInputRegion(item))
    )
  }

  function pathTouchesBilibiliChatActions(path) {
    if (platformId !== 'bilibili') {
      return false
    }

    for (const item of path) {
      if (!(item instanceof Element)) {
        continue
      }
      if (closestMatching(item, config.userNames)) {
        return true
      }
      const actionSurface = closestMatching(item, BILIBILI_CHAT_ACTION_SURFACES)
      if (actionSurface) {
        const role = actionSurface.getAttribute('role') || ''
        const text = shared
          .normalizeWhitespace(actionSurface.innerText || actionSurface.textContent)
          .slice(0, 500)
        if (/^(?:dialog|menu|listbox)$/i.test(role) || BILIBILI_CHAT_ACTION_TEXT.test(text)) {
          return true
        }
      }
      const control = closestMatching(item, ['button', 'a', "[role='button']", "[role='menuitem']"])
      if (
        control &&
        BILIBILI_CHAT_ACTION_TEXT.test(
          shared.normalizeWhitespace(control.innerText || control.textContent),
        )
      ) {
        return true
      }
      const itemText = shared.normalizeWhitespace(item.innerText || item.textContent).slice(0, 500)
      if (BILIBILI_CHAT_STRONG_ACTION_TEXT.test(itemText)) {
        const position = getComputedStyle(item).position
        if (position === 'fixed' || position === 'absolute') {
          return true
        }
      }
    }
    return false
  }

  function isBilibiliChatAdvertisement(element) {
    if (platformId !== 'bilibili' || !(element instanceof Element)) {
      return false
    }

    const chatRoot = closestMatching(element, config.chatRoots)
    if (!chatRoot) {
      return false
    }

    const card = closestMatching(element, config.messages) || element
    if (card === chatRoot) {
      return false
    }

    let current = card
    while (current && current !== chatRoot) {
      if (matchesAny(current, BILIBILI_CHAT_AD_SELECTORS)) {
        return true
      }

      const metadata = [
        elementMarker(current),
        current.getAttribute('data-type'),
        current.getAttribute('data-module'),
        current.getAttribute('data-report'),
        current.getAttribute('data-testid'),
        current.getAttribute('data-e2e'),
      ]
        .filter(Boolean)
        .join(' ')
      if (isBilibiliAdvertisementMarker(metadata)) {
        return true
      }
      current = current.parentElement
    }

    let labels = []
    try {
      labels = Array.from(card.querySelectorAll(BILIBILI_CHAT_AD_LABEL_SELECTORS.join(',')))
    } catch {
      labels = []
    }

    const hasAdvertisementLabel = labels.some((label) =>
      isBilibiliAdvertisementLabel(
        shared.normalizeWhitespace(label.innerText || label.textContent),
      ),
    )
    if (!hasAdvertisementLabel) {
      return false
    }

    // A user may legitimately mention the word "广告". Only treat label text
    // as an ad when the row also has the structure of an interactive card.
    return Boolean(
      card.querySelector(
        "a[href], button, [role='button'], [data-url], [data-href], [class*='banner' i], [class*='card' i]",
      ),
    )
  }

  function pathTouchesBilibiliChatAdvertisement(path) {
    return (
      platformId === 'bilibili' &&
      path.some((item) => item instanceof Element && isBilibiliChatAdvertisement(item))
    )
  }

  function isInsideBilibiliVideoOverlay(element) {
    return (
      platformId === 'bilibili' &&
      element instanceof Element &&
      Boolean(closestMatching(element, config.overlayMessages))
    )
  }

  function isInsideBilibiliPlayerOutsideChat(element) {
    if (platformId !== 'bilibili' || !(element instanceof Element)) {
      return false
    }
    if (isInsideBilibiliVideoOverlay(element)) {
      return true
    }
    return (
      Boolean(closestMatching(element, config.videoRoots)) &&
      !closestMatching(element, config.chatRoots)
    )
  }

  function findChatRoot(path) {
    const inPath = closestFromPath(path, config.chatRoots)
    if (inPath) {
      return inPath
    }

    for (const node of path) {
      if (!(node instanceof Element)) {
        continue
      }

      for (const root of queryAllDeep(config.chatRoots)) {
        if (root.contains(node)) {
          return root
        }
      }
    }

    return null
  }

  function pathInsideEnabledBilibiliSurface(path) {
    if (platformId !== 'bilibili' || pathInsideBilibiliVideo(path)) {
      return true
    }
    return state.settings.sideChatCapsule.bilibili && Boolean(findChatRoot(path))
  }

  function findCandidate(path) {
    const overlayMatch = closestFromPath(path, config.overlayMessages)
    if (overlayMatch) {
      const overlay = normalizeOverlayCandidate(overlayMatch)
      return overlay && isOverlayMessageElement(overlay)
        ? { element: overlay, kind: 'overlay' }
        : null
    }

    if (
      pathTouchesBilibiliQuickInput(path) ||
      pathTouchesBilibiliChatActions(path) ||
      pathTouchesBilibiliChatAdvertisement(path)
    ) {
      return null
    }

    const known = closestFromPath(path, config.messages)
    if (known && !isBilibiliChatAdvertisement(known)) {
      return { element: known, kind: 'chat' }
    }

    const chatRoot = findChatRoot(path)
    if (!chatRoot) {
      return null
    }

    for (const node of path) {
      if (!(node instanceof Element) || node === chatRoot || !chatRoot.contains(node)) {
        continue
      }

      if (node.matches("button, input, textarea, a, [contenteditable='true']")) {
        continue
      }

      if (isBilibiliChatAdvertisement(node)) {
        continue
      }

      const rect = node.getBoundingClientRect()
      const text = shared.normalizeWhitespace(node.innerText || node.textContent)
      if (rect.height >= 12 && rect.height <= 180 && text.length >= 1 && text.length <= 260) {
        return { element: node, kind: 'chat' }
      }
    }

    return null
  }

  function pointInside(rect, x, y, padding) {
    const margin = Number.isFinite(padding) ? padding : 0
    return (
      x >= rect.left - margin &&
      x <= rect.right + margin &&
      y >= rect.top - margin &&
      y <= rect.bottom + margin
    )
  }

  function overlayMessageForValidation(element) {
    const plainText = textFromCandidate(element)
    if (shared.isPlausibleMessage(plainText, config.maxLength)) {
      return plainText
    }
    if (platformId !== 'bilibili') {
      return ''
    }

    // Bilibili renders image-only video emoticons without textContent. Reuse
    // the rich payload parser here so known danmaku nodes are not rejected
    // before selectCandidate() can preserve and resend their image asset.
    const payload = richPayloadFromCandidate(element)
    return payload.assets.length && shared.isPlausibleMessage(payload.text, config.maxLength)
      ? payload.text
      : ''
  }

  function normalizeOverlayCandidate(element) {
    if (platformId !== 'bilibili' || !(element instanceof Element)) {
      return element
    }
    const row = element.matches(BILIBILI_OVERLAY_ROW_SELECTOR)
      ? element
      : element.closest(BILIBILI_OVERLAY_ROW_SELECTOR)
    if (row) return row

    // Some Bilibili renderers reuse `danmaku-item-right` on every inline
    // Emoji wrapper. The broad fallback selector then lands on the first
    // Emoji instead of the complete moving danmaku. Promote it to the
    // outermost message-sized overlay inside the player.
    const videoRoot = closestMatching(element, config.videoRoots)
    if (!videoRoot) return element
    let promoted = element
    let current = element.parentElement
    for (let depth = 0; current && current !== videoRoot && depth < 10; depth += 1) {
      const className = typeof current.className === 'string' ? current.className : ''
      const marker = elementMarker(current)
      const rect = current.getBoundingClientRect()
      const messageSized = rect.height >= 8 && rect.height <= Math.min(120, innerHeight * 0.22)
      const inlineFragment = /(?:^|\s)danmaku-item-right(?:\s|$)/i.test(className)
      if (
        messageSized &&
        !inlineFragment &&
        (matchesAny(current, config.overlayMessages) ||
          /(?:danmaku|danmu|barrage|bullet)/i.test(marker))
      ) {
        promoted = current
      }
      current = current.parentElement
    }
    return promoted
  }

  function isOverlayMessageElement(element) {
    if (!(element instanceof Element) || isOwned(element) || !element.isConnected) {
      return false
    }

    const bilibiliOverlayRow =
      platformId === 'bilibili' && element.matches(BILIBILI_OVERLAY_ROW_SELECTOR)
    if (bilibiliOverlayRow) {
      const rect = element.getBoundingClientRect()
      return rect.height >= 8 && rect.height <= Math.min(120, innerHeight * 0.22) && rect.width >= 4
    }

    if (!isVisible(element)) {
      return false
    }

    if (
      isBilibiliQuickInputRegion(element) ||
      matchesAny(element, config.videoRoots) ||
      element.matches(ACTIVE_MEDIA_SELECTOR) ||
      element.matches(
        "video, canvas, button, input, textarea, [role='button'], [contenteditable='true']",
      )
    ) {
      return false
    }

    if (element.querySelector(EDITABLE_CONTROL_SELECTOR) || containsActiveMediaDeep(element)) {
      return false
    }

    const rect = element.getBoundingClientRect()
    const exactOverlay = matchesAny(element, config.overlayMessages)
    const maximumWidth = exactOverlay ? Number.POSITIVE_INFINITY : Math.min(900, innerWidth * 0.85)
    if (
      rect.height < 8 ||
      rect.height > Math.min(120, innerHeight * 0.22) ||
      rect.width < 4 ||
      rect.width > maximumWidth
    ) {
      return false
    }

    for (const selector of config.overlayMessages) {
      try {
        if (element.querySelector(selector)) {
          if (bilibiliOverlayRow && selector === '.bili-danmaku-x-dm-content') {
            continue
          }
          return false
        }
      } catch {
        // Ignore selectors unsupported by an older Chromium build.
      }
    }

    return Boolean(overlayMessageForValidation(element))
  }

  function isGenericOverlayElement(element) {
    if (!(element instanceof Element) || isOwned(element)) {
      return false
    }

    if (
      isBilibiliQuickInputRegion(element) ||
      element.matches("button, input, textarea, video, canvas, a, [contenteditable='true']") ||
      element.querySelector(EDITABLE_CONTROL_SELECTOR)
    ) {
      return false
    }

    const videoRoot = closestMatching(element, config.videoRoots)
    if (!videoRoot) {
      return false
    }

    const rect = element.getBoundingClientRect()
    const text = overlayMessageForValidation(element)
    const style = getComputedStyle(element)
    const className = typeof element.className === 'string' ? element.className : ''
    const marker = [
      element.id,
      className,
      element.getAttribute('data-e2e'),
      element.getAttribute('data-testid'),
      element.getAttribute('aria-label'),
    ]
      .filter(Boolean)
      .join(' ')
    const hasDanmakuMarker = /(danmaku|danmu|bullet|barrage|弹幕)/i.test(marker)
    const isControl =
      /(setting|control|quality|definition|resolution|menu|button|清晰度|设置)/i.test(marker)
    const looksLikeMessage =
      style.animationName !== 'none' ||
      style.transform !== 'none' ||
      /(item|text|message|content|\bdm\b)/i.test(marker)

    return (
      isOverlayMessageElement(element) &&
      hasDanmakuMarker &&
      !isControl &&
      looksLikeMessage &&
      rect.height >= 10 &&
      rect.height <= 100 &&
      rect.width >= 4 &&
      rect.width <= Math.min(900, innerWidth * 0.9) &&
      Boolean(text)
    )
  }

  function isInsideFrozenHoverZone(x, y) {
    const frozenTarget =
      state.frozenClone && state.frozenClone.isConnected ? state.frozenClone : null
    return (
      state.candidateKind === 'overlay' &&
      frozenTarget &&
      pointInside(frozenTarget.getBoundingClientRect(), x, y, OVERLAY_HOVER_PADDING)
    )
  }

  function isInsideChatHoverZone(x, y) {
    if (
      state.candidateKind !== 'chat' ||
      !state.candidate?.isConnected ||
      !state.actionBar?.isConnected ||
      state.actionBar.hidden
    ) {
      return false
    }

    const candidateRect = state.candidate.getBoundingClientRect()
    const actionRect = state.actionBar.getBoundingClientRect()
    const hoverRect = {
      bottom: Math.max(candidateRect.bottom, actionRect.bottom),
      left: Math.min(candidateRect.left, actionRect.left),
      right: Math.max(candidateRect.right, actionRect.right),
      top: Math.min(candidateRect.top, actionRect.top),
    }
    return pointInside(hoverRect, x, y, 4)
  }

  function findOverlayAtPoint(x, y) {
    if (isInsideFrozenHoverZone(x, y)) {
      return state.candidate
    }

    const pointElements =
      typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y) : []

    for (const element of pointElements) {
      const exact = normalizeOverlayCandidate(closestMatching(element, config.overlayMessages))
      if (exact) {
        return exact
      }
      if (isGenericOverlayElement(element)) {
        return element
      }
    }

    const exactCandidates = overlayMessageCandidates()
    const exactHits = []

    exactCandidates.forEach((candidate, index) => {
      if (!isOverlayMessageElement(candidate)) {
        return
      }

      const rect = candidate.getBoundingClientRect()
      if (pointInside(rect, x, y)) {
        const normalizedX = (x - (rect.left + rect.width / 2)) / Math.max(rect.width, 1)
        const normalizedY = (y - (rect.top + rect.height / 2)) / Math.max(rect.height, 1)
        const centerDistance = Math.hypot(normalizedX, normalizedY)
        const areaPenalty = Math.min((rect.width * rect.height) / 1_000_000, 0.25)
        exactHits.push({ candidate, score: centerDistance + areaPenalty, index })
      }
    })

    if (exactHits.length) {
      exactHits.sort((a, b) => a.score - b.score || b.index - a.index)
      return exactHits[0].candidate
    }

    return null
  }

  function textFromSpecificElement(candidate) {
    for (const selector of config.messageText) {
      let element = null

      try {
        element = candidate.matches(selector) ? candidate : candidate.querySelector(selector)
      } catch {
        element = null
      }

      if (element) {
        const text = shared.parseMessageText(
          element.innerText || element.textContent,
          config.maxLength,
        )
        if (shared.isPlausibleMessage(text, config.maxLength)) {
          return text
        }
      }
    }

    return ''
  }

  function emojiMetadataElements(element, image) {
    const elements = []
    const seen = new Set()
    const append = (candidate) => {
      if (!(candidate instanceof Element) || seen.has(candidate)) return
      seen.add(candidate)
      elements.push(candidate)
    }
    append(image)
    append(element)

    let current = (image || element).parentElement
    for (let depth = 0; current && depth < 12; depth += 1) {
      const marker = elementMarker(current)
      if (
        /(?:emoji|emote|emoticon|emotion|face|sticker|表情)/i.test(marker) ||
        EMOJI_METADATA_ATTRIBUTES.some((attribute) => current.hasAttribute(attribute)) ||
        (platformId === 'bilibili' && current.getAttribute('data-type') === '1')
      ) {
        append(current)
      }
      const isMessageBoundary =
        closestMatching(current, config.messages) === current ||
        closestMatching(current, config.overlayMessages) === current
      const hasBilibiliImageIdentity =
        platformId === 'bilibili' &&
        (current.getAttribute('data-type') === '1' ||
          BILIBILI_NATIVE_PANEL_IDENTITY_ATTRIBUTES.some((attribute) =>
            current.hasAttribute(attribute),
          ))
      if (isMessageBoundary && (platformId !== 'bilibili' || hasBilibiliImageIdentity)) {
        break
      }
      current = current.parentElement
    }
    return elements
  }

  function isGenericEmojiLabel(value) {
    const normalized = shared.normalizeWhitespace(value).replace(/^\[|\]$/g, '')
    return /^(?:图片|图片表情|表情|表情包|emoji|emote|emoticon|image|sticker)$/i.test(normalized)
  }

  function normalizedEmojiToken(value, marker) {
    const normalized = shared.normalizeWhitespace(value)
    if (!normalized || isGenericEmojiLabel(normalized)) return ''
    if (/^\[[^\]\n]{1,40}\]$/.test(normalized)) return normalized
    if (/\p{Extended_Pictographic}/u.test(normalized)) return normalized
    if (
      /^(?:data|blob|https?):/i.test(normalized) ||
      /[\\/]/.test(normalized) ||
      Array.from(normalized).length > 40
    ) {
      return ''
    }
    if (
      /(?:emoji|emote|emoticon|emotion|face|sticker|表情)/i.test(marker) &&
      !/^(?:\d{6,}|[a-f\d]{16,})$/i.test(normalized)
    ) {
      return `[${normalized}]`
    }
    return ''
  }

  function emojiTokenFromElement(element) {
    if (!(element instanceof Element)) return ''
    const image = element instanceof HTMLImageElement ? element : element.querySelector('img')
    for (const metadataElement of emojiMetadataElements(element, image)) {
      const marker = elementMarker(metadataElement)
      for (const attribute of EMOJI_METADATA_ATTRIBUTES) {
        const raw = shared.normalizeWhitespace(metadataElement.getAttribute(attribute))
        if (platformId === 'bilibili' && isBilibiliMedalAccessibilityLabel(raw)) continue
        if (
          raw &&
          !EMOJI_DISPLAY_ATTRIBUTES.has(attribute) &&
          !/^\[[^\]\n]{1,40}\]$/.test(raw) &&
          !/\p{Extended_Pictographic}/u.test(raw)
        ) {
          continue
        }
        const token = normalizedEmojiToken(raw, `${marker} ${attribute}`)
        if (token) return token
      }
    }
    return ''
  }

  function emojiTokenFromImage(image) {
    return emojiTokenFromElement(image)
  }

  function assetDescriptorFromElement(element) {
    if (!(element instanceof Element)) {
      return null
    }
    const image = element instanceof HTMLImageElement ? element : element.querySelector('img')
    const metadataElements = emojiMetadataElements(element, image)
    const sources = []
    const displayMetadata = []
    const identityMetadata = []
    metadataElements.forEach((metadataElement) => {
      const sourceValues = [
        metadataElement instanceof HTMLImageElement && metadataElement.currentSrc,
        metadataElement.getAttribute('src'),
        metadataElement.getAttribute('data-src'),
        metadataElement.getAttribute('data-url'),
        metadataElement.getAttribute('data-image'),
        metadataElement.getAttribute('data-image-url'),
      ]
      sourceValues.filter(Boolean).forEach((value) => sources.push(value))
      EMOJI_METADATA_ATTRIBUTES.forEach((attribute) => {
        const value = metadataElement.getAttribute(attribute)
        if (!value) return
        if (platformId === 'bilibili' && isBilibiliMedalAccessibilityLabel(value)) return
        if (
          EMOJI_DISPLAY_ATTRIBUTES.has(attribute) ||
          /^\[[^\]\n]{1,40}\]$/.test(shared.normalizeWhitespace(value)) ||
          /\p{Extended_Pictographic}/u.test(value)
        ) {
          displayMetadata.push(value)
        } else {
          identityMetadata.push(value)
        }
      })
    })
    const authoritativeBilibiliToken =
      platformId === 'bilibili'
        ? metadataElements
            .filter(
              (metadataElement) =>
                metadataElement.getAttribute('data-type') === '1' ||
                BILIBILI_NATIVE_PANEL_IDENTITY_ATTRIBUTES.some((attribute) =>
                  metadataElement.hasAttribute(attribute),
                ),
            )
            .map((metadataElement) =>
              shared.normalizeWhitespace(metadataElement.getAttribute('data-danmaku')),
            )
            .find((value) => /^\[[^\]\n]{1,40}\]$/.test(value)) || ''
        : ''
    const token = authoritativeBilibiliToken || emojiTokenFromElement(element)
    const keys = new Set()
    if (platformId === 'bilibili') {
      let nativePanelIdentity = ''
      let isNativePanelAsset = false
      metadataElements.forEach((metadataElement) => {
        if (metadataElement.getAttribute('data-type') === '1') {
          isNativePanelAsset = true
        }
        BILIBILI_NATIVE_PANEL_IDENTITY_ATTRIBUTES.forEach((attribute) => {
          const value = shared.normalizeWhitespace(metadataElement.getAttribute(attribute))
          if (!value) return
          isNativePanelAsset = true
          if (!nativePanelIdentity) nativePanelIdentity = value
        })
      })
      if (isNativePanelAsset) {
        keys.add(
          `${NATIVE_PANEL_ASSET_KEY_PREFIX}${String(nativePanelIdentity || sources[0] || 'type-1')
            .trim()
            .toLowerCase()
            .slice(0, 220)}`,
        )
      }
    }
    sources
      .concat(displayMetadata)
      .concat(token || [])
      .forEach((value) => {
        normalizedRichAssetKeys(value, location.href).forEach((key) => keys.add(key))
      })
    identityMetadata.forEach((value) => {
      normalizedRichAssetKeys(value, location.href)
        .filter((key) => !key.startsWith('name:'))
        .forEach((key) => keys.add(key))
    })
    if (!keys.size) {
      return null
    }
    return {
      src: String(sources[0] || '').slice(0, 4096),
      token: shared.normalizeWhitespace(token).slice(0, 120),
      keys: Array.from(keys).slice(0, 48),
    }
  }

  function messageElementFromCandidate(candidate) {
    if (!(candidate instanceof Element)) {
      return null
    }
    for (const selector of config.messageText) {
      try {
        const element = candidate.matches(selector) ? candidate : candidate.querySelector(selector)
        if (element) {
          return element
        }
      } catch {
        // Ignore selectors unsupported by an older Chromium build.
      }
    }
    return candidate
  }

  function authoritativeBilibiliMessage(candidate) {
    if (platformId !== 'bilibili' || !(candidate instanceof Element)) return ''
    const candidates = []
    const seen = new Set()
    const append = (element) => {
      if (!(element instanceof Element) || seen.has(element)) return
      seen.add(element)
      candidates.push(element)
    }
    append(candidate)
    candidate.querySelectorAll('[data-danmaku]').forEach(append)
    let current = candidate.parentElement
    for (let depth = 0; current && depth < 8; depth += 1) {
      append(current)
      if (matchesAny(current, config.chatRoots) || matchesAny(current, config.videoRoots)) break
      current = current.parentElement
    }
    for (const element of candidates) {
      const text = authoritativeBilibiliText(element.getAttribute('data-danmaku'))
      if (shared.isPlausibleMessage(text, config.maxLength)) return text
    }
    return ''
  }

  function richPayloadFromCandidate(candidate) {
    if (
      platformId === 'bilibili' &&
      candidate instanceof Element &&
      candidate.matches(BILIBILI_OVERLAY_ROW_SELECTOR) &&
      !candidate.querySelector('img')
    ) {
      const content = candidate.querySelector('.bili-danmaku-x-dm-content') || candidate
      const text = String(content.textContent || candidate.getAttribute('data-danmaku') || '')
      if (shared.isPlausibleMessage(text, config.maxLength)) {
        return { text, plainText: text, assets: [], parts: [{ type: 'text', text }] }
      }
    }

    const element = messageElementFromCandidate(candidate)
    if (!element) {
      return { text: '', plainText: '', assets: [], parts: [] }
    }
    const explicitMessageElement = config.messageText.some((selector) => {
      try {
        return element.matches(selector)
      } catch {
        return false
      }
    })
    const parts =
      platformId === 'bilibili'
        ? normalizeBilibiliPayloadParts(richPartsFromElement(element, explicitMessageElement))
        : richPartsFromElement(element, explicitMessageElement)
    const assets = parts
      .filter((part) => part && part.type === 'emoji' && part.asset)
      .map((part) => part.asset)
      .slice(0, 8)
    const authoritativeText = authoritativeBilibiliMessage(candidate)
    const structuralPayload = {
      assets,
      parts,
      plainText: '',
      text: bilibiliPayloadTextFromParts(parts),
    }
    const panelOnly = isBilibiliExplicitPanelOnlyPayload(candidate, structuralPayload)
    if (!panelOnly && (!assets.length || authoritativeText)) {
      const directText = assets.length
        ? authoritativeText
        : explicitMessageElement
          ? String(element.textContent || '')
          : structuralPayload.text
      if (shared.isPlausibleMessage(directText, config.maxLength)) {
        return {
          assets: [],
          parts: [{ text: directText, type: 'text' }],
          plainText: directText,
          text: directText,
        }
      }
    }
    const plainText = shared.parseMessageText(
      parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join(''),
      config.maxLength,
    )
    let text =
      platformId === 'bilibili'
        ? shared.parseMessageText(bilibiliPayloadTextFromParts(parts), config.maxLength)
        : richTextFromElement(element)
    if (!shared.isPlausibleMessage(text, config.maxLength) && assets.length) {
      text =
        assets
          .map((asset) => asset.token)
          .filter(Boolean)
          .join(' ') || '图片表情'
    }
    return { text, plainText, assets, parts }
  }

  function isBilibiliExplicitPanelOnlyPayload(candidate, payload) {
    if (
      platformId !== 'bilibili' ||
      !(candidate instanceof Element)
    ) {
      return false
    }
    const panelOnlySelector = [
      '[data-emoticon-unique]',
      '[data-type="1"]',
      '[data-file-id]',
      '[data-room-emoticon]',
      '[data-room-emoji]',
      '[data-anchor-emoticon]',
      '[data-anchor-emoji]',
      "[class*='room-emoticon' i]",
      "[class*='anchor-emoticon' i]",
      "[class*='bulge-emoticon' i]",
    ].join(',')
    try {
      const assets = Array.isArray(payload.assets) ? payload.assets : []
      if (
        assets.length === 1 &&
        (candidate.matches(panelOnlySelector) || candidate.querySelector(panelOnlySelector))
      ) {
        return true
      }
      if (!isSingleBilibiliEmojiPayload(payload)) return false
      const meaningfulParts = Array.isArray(payload.parts)
        ? payload.parts.filter((part) => {
            if (part?.type === 'emoji') return true
            const text = shared.normalizeWhitespace(part?.text)
            return (
              Boolean(text) &&
              !assets.some((asset) => shared.normalizeWhitespace(asset?.token) === text)
            )
          })
        : []
      return (
        assets.length === 1 &&
        meaningfulParts.length === 1 &&
        meaningfulParts[0]?.type === 'emoji' &&
        Boolean(candidate.querySelector('[data-emoticon]:not([data-emoticon-id])'))
      )
    } catch {
      return false
    }
  }

  function sendLogPayloadSnapshot(payload) {
    const assets = Array.isArray(payload?.assets) ? payload.assets : []
    const parts = Array.isArray(payload?.parts) ? payload.parts : []
    return {
      assets: assets.slice(0, 8).map((asset) => ({
        ...(Number.isFinite(asset?._bcpMatchScore)
          ? { matchScore: Number(asset._bcpMatchScore) }
          : {}),
        nativePanel: isBilibiliNativePanelAsset(asset),
        ...(asset?._bcpResolution ? { resolution: String(asset._bcpResolution).slice(0, 80) } : {}),
        source: String(asset?.src || '').slice(0, 500),
        token: String(asset?.token || '').slice(0, 120),
      })),
      parts: parts
        .slice(0, 40)
        .map((part) =>
          part?.type === 'emoji'
            ? { type: 'emoji', token: String(part.asset?.token || '').slice(0, 120) }
            : { type: 'text', text: String(part?.text || '').slice(0, 500) },
        ),
    }
  }

  function beginSendLog(source, sourceContent, payload) {
    const snapshot = sendLogPayloadSnapshot(payload)
    const classification = payload?.assets?.length
      ? classifyBilibiliRichPayload(payload).kind
      : 'plain-text'
    const entry = {
      assets: snapshot.assets,
      classification,
      confirmation: 'none',
      durationMs: 0,
      error: '',
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
      method: 'not-attempted',
      normalizedContent: String(payload?.text || sourceContent || ''),
      parts: snapshot.parts,
      platform: 'bilibili',
      resultContent: '',
      source,
      sourceContent: String(sourceContent || ''),
      success: false,
      timestamp: Date.now(),
      version: 1,
    }
    state.activeSendLog = entry
    return entry
  }

  function updateSendLog(values) {
    if (state.activeSendLog) Object.assign(state.activeSendLog, values)
  }

  function refreshActiveSendLogPayload(payload) {
    if (!state.activeSendLog) return
    const snapshot = sendLogPayloadSnapshot(payload)
    updateSendLog({
      assets: snapshot.assets,
      classification: payload?.assets?.length
        ? classifyBilibiliRichPayload(payload).kind
        : 'plain-text',
      normalizedContent: String(payload?.text || ''),
      parts: snapshot.parts,
    })
  }

  function persistSendLog(entry, success, error = '') {
    if (!entry) return
    entry.success = Boolean(success)
    entry.error = String(error || entry.error || '')
    entry.durationMs = Math.max(0, Date.now() - entry.timestamp)
    try {
      chrome.runtime.sendMessage({
        type: SEND_LOG_MESSAGE,
        operation: 'append',
        entry,
      })
    } catch {
      // Sending must not fail because diagnostic persistence is unavailable.
    }
    if (state.activeSendLog === entry) state.activeSendLog = null
  }

  function richPartsFromElement(element, preserveNestedUserNames = false) {
    const parts = []
    const appendText = (value) => {
      const text = String(value || '')
      if (!text) return
      const previous = parts[parts.length - 1]
      if (previous && previous.type === 'text') previous.text += text
      else parts.push({ type: 'text', text })
    }
    const visit = (node) => {
      if (!node || parts.length >= 40) return
      if (node.nodeType === Node.TEXT_NODE) {
        appendText(node.textContent || '')
        return
      }
      if (!(node instanceof Element)) return
      if (
        matchesAny(node, [
          'button',
          'svg',
          "[aria-hidden='true']",
          '[data-bcp-one-owned]',
          ...(preserveNestedUserNames ? [] : config.userNames),
        ])
      )
        return
      if (node instanceof HTMLImageElement) {
        const asset = assetDescriptorFromElement(node)
        if (asset) parts.push({ type: 'emoji', asset })
        return
      }
      if (node.tagName === 'BR') {
        appendText(' ')
        return
      }
      Array.from(node.childNodes).forEach(visit)
    }
    Array.from(element.childNodes).forEach(visit)
    return parts
  }

  function assetMatchScore(element, asset) {
    const descriptor = assetDescriptorFromElement(element)
    return assetDescriptorMatchScore(descriptor, asset)
  }

  function assetDescriptorMatchScore(descriptor, asset) {
    if (!descriptor || !asset || !Array.isArray(asset.keys)) {
      return 0
    }
    const expected = new Set(asset.keys)
    let score = 0
    descriptor.keys.forEach((key) => {
      if (expected.has(key)) {
        score += key.startsWith('raw:') ? 8 : key.startsWith('path:') ? 6 : 4
      }
    })
    return score
  }

  function emojiTokenQuality(value) {
    const token = normalizedEmojiToken(value, 'emoji')
    if (!token) return 0
    if (/\p{Extended_Pictographic}/u.test(token)) return 6
    const name = token.replace(/^\[|\]$/g, '')
    if (/[\u3400-\u9fff]/u.test(name)) return 5
    if (/^[a-z][a-z -]{0,24}$/i.test(name)) return 4
    if (/^(?:\d{6,}|[a-f\d]{12,}|[a-z\d_-]{24,})$/i.test(name)) return 1
    return 3
  }

  function mergeEmojiAssetMetadata(target, source) {
    if (!target || !source) return target
    const sourceToken = normalizedEmojiToken(source.token, 'emoji')
    if (sourceToken && emojiTokenQuality(sourceToken) > emojiTokenQuality(target.token)) {
      target.token = sourceToken
    }
    if (!target.src && source.src) target.src = source.src
    target.keys = Array.from(
      new Set([...(Array.isArray(target.keys) ? target.keys : []), ...(source.keys || [])]),
    ).slice(0, 48)
    return target
  }

  function resolveBilibiliAssetFromRecentChat(asset) {
    if (platformId !== 'bilibili' || !asset) return null
    const matches = new Map()
    messageRows()
      .slice(-180)
      .forEach((row) => {
        row.querySelectorAll('img').forEach((image) => {
          const descriptor = assetDescriptorFromElement(image)
          const token = normalizedEmojiToken(descriptor?.token, 'emoji')
          const score = assetDescriptorMatchScore(descriptor, asset)
          if (!descriptor || score < 4 || emojiTokenQuality(token) < 3) return
          const identity = `${
            descriptor.keys?.find((key) => /^(?:fragment|stem|file|path):/.test(String(key))) ||
            descriptor.src
          }|${token}`
          const previous = matches.get(identity)
          if (!previous || score > previous.score) matches.set(identity, { descriptor, score })
        })
      })
    const ranked = Array.from(matches.values()).sort((first, second) => second.score - first.score)
    if (!ranked.length) return null
    const best = ranked.filter((match) => match.score === ranked[0].score)
    const tokens = new Set(
      best.map((match) => normalizedEmojiToken(match.descriptor.token, 'emoji')),
    )
    return tokens.size === 1 ? best[0].descriptor : null
  }

  function enrichRichPayloadAsset(payload, assetIndex, item) {
    const source = assetDescriptorFromElement(item)
    const asset = payload && Array.isArray(payload.assets) ? payload.assets[assetIndex] : null
    if (!source || !asset) return
    mergeEmojiAssetMetadata(asset, source)
    const emojiParts = Array.isArray(payload.parts)
      ? payload.parts.filter((part) => part && part.type === 'emoji' && part.asset)
      : []
    if (emojiParts[assetIndex]) {
      mergeEmojiAssetMetadata(emojiParts[assetIndex].asset, source)
    }
  }

  function refreshRichPayloadText(payload) {
    if (!payload || !Array.isArray(payload.assets) || !payload.assets.length) return ''
    const parts = Array.isArray(payload.parts) ? payload.parts : []
    let unresolvedEmoji = false
    const resolvedText = parts.length
      ? parts
          .map((part) => {
            if (!part || typeof part !== 'object') return ''
            if (part.type === 'text') return String(part.text || '')
            if (part.type === 'emoji' && part.asset) {
              const token = normalizedEmojiToken(part.asset.token, 'emoji')
              if (!token) unresolvedEmoji = true
              return token
            }
            return ''
          })
          .join('')
      : payload.assets
          .map((asset) => {
            const token = normalizedEmojiToken(asset && asset.token, 'emoji')
            if (!token) unresolvedEmoji = true
            return token
          })
          .join('')
    if (unresolvedEmoji) return payload.text || ''
    const normalized = shared.parseMessageText(resolvedText, config.maxLength)
    if (shared.isPlausibleMessage(normalized, config.maxLength)) {
      payload.text = normalized
    }
    return payload.text || ''
  }

  function isBilibiliNativePanelElement(element) {
    if (platformId !== 'bilibili' || !(element instanceof Element)) return false
    const realPanelItem =
      element.closest(BILIBILI_EMOTICON_ITEM_SELECTOR) ||
      element.querySelector(BILIBILI_EMOTICON_ITEM_SELECTOR)
    const realPack = realPanelItem?.closest(BILIBILI_EMOTICON_PACK_SELECTOR)
    if (
      realPanelItem &&
      realPack &&
      realPack.closest(BILIBILI_EMOTICON_PANEL_SELECTOR) &&
      !realPack.matches(BILIBILI_INLINE_EMOJI_PACK_SELECTOR)
    ) {
      return true
    }
    const nativeSelector = [
      "[data-type='1']",
      ...BILIBILI_NATIVE_PANEL_IDENTITY_ATTRIBUTES.map((attribute) => `[${attribute}]`),
    ].join(',')
    try {
      if (element.matches(nativeSelector) || element.querySelector(nativeSelector)) return true
    } catch {
      // Fall through to semantic panel/category markers.
    }

    let current = element
    for (let depth = 0; current && depth < 6; depth += 1) {
      const marker = [
        elementMarker(current),
        current.getAttribute('data-category'),
        current.getAttribute('data-group'),
        current.getAttribute('data-pack'),
      ]
        .filter(Boolean)
        .join(' ')
      if (/(?:room|anchor|exclusive|special|custom|房间|主播|专属)/i.test(marker)) return true
      if (matchesAny(current, BILIBILI_EMOJI_SURFACE_SELECTORS)) break
      current = current.parentElement
    }
    return false
  }

  async function enrichRichPayloadAssetNames(payload, options) {
    if (!payload || !Array.isArray(payload.assets) || !payload.assets.length) return payload
    const resolveBilibiliNative = Boolean(options && options.resolveBilibiliNative)
    let resolvedSingleBilibiliItem = null
    const input = platformId === 'bilibili' ? findBilibiliEmojiEditor() || findInput() : findInput()
    for (let index = 0; index < payload.assets.length; index += 1) {
      const asset = payload.assets[index]
      const shouldResolveNative =
        platformId === 'bilibili' && resolveBilibiliNative && !isBilibiliNativePanelAsset(asset)
      if (emojiTokenQuality(asset && asset.token) >= 3 && !shouldResolveNative) continue
      const chatDescriptor = resolveBilibiliAssetFromRecentChat(asset)
      if (chatDescriptor) {
        asset._bcpResolution = 'recent-side-chat'
        asset._bcpMatchScore = assetDescriptorMatchScore(chatDescriptor, asset)
        mergeEmojiAssetMetadata(asset, chatDescriptor)
        const emojiParts = Array.isArray(payload.parts)
          ? payload.parts.filter((part) => part && part.type === 'emoji' && part.asset)
          : []
        if (emojiParts[index]) {
          emojiParts[index].asset._bcpResolution = asset._bcpResolution
          emojiParts[index].asset._bcpMatchScore = asset._bcpMatchScore
          mergeEmojiAssetMetadata(emojiParts[index].asset, chatDescriptor)
        }
        if (!isBilibiliNativePanelAsset(chatDescriptor)) continue
      }
      const apiEntry = await resolveBilibiliApiEmoji(asset)
      if (apiEntry) {
        asset._bcpResolution = 'bilibili-emoticon-api'
        asset._bcpMatchScore = assetDescriptorMatchScore(apiEntry.descriptor, asset)
        mergeEmojiAssetMetadata(asset, apiEntry.descriptor)
        // Bilibili sometimes exposes the Honor-level badge tooltip as the
        // image alt text of a side-chat large Emoji. The API catalog is the
        // authoritative identity once its URL uniquely matches.
        if (apiEntry.descriptor.token) asset.token = apiEntry.descriptor.token
        const emojiParts = Array.isArray(payload.parts)
          ? payload.parts.filter((part) => part && part.type === 'emoji' && part.asset)
          : []
        if (emojiParts[index]) {
          emojiParts[index].asset._bcpResolution = asset._bcpResolution
          emojiParts[index].asset._bcpMatchScore = asset._bcpMatchScore
          mergeEmojiAssetMetadata(emojiParts[index].asset, apiEntry.descriptor)
          if (apiEntry.descriptor.token) {
            emojiParts[index].asset.token = apiEntry.descriptor.token
          }
        }
        continue
      }
      let item =
        platformId === 'bilibili'
          ? findUniqueBilibiliPlatformEmoji(asset, fullscreenActive())
          : findMatchingPlatformEmoji(asset)
      if (!item && input) {
        item =
          platformId === 'bilibili'
            ? await openUniqueBilibiliPlatformEmoji(input, asset)
            : await openPlatformEmojiForAsset(input, asset)
      }
      if (item) {
        const panelDescriptor = assetDescriptorFromElement(item)
        asset._bcpResolution = 'emoji-panel-catalog'
        asset._bcpMatchScore = assetDescriptorMatchScore(panelDescriptor, asset)
        const isNativeBilibiliItem = isBilibiliNativePanelElement(item)
        enrichRichPayloadAsset(payload, index, item)
        if (platformId === 'bilibili' && isNativeBilibiliItem) {
          markBilibiliPayloadAssetAsNativePanel(payload, index, item)
        }
        if (platformId === 'bilibili' && payload.assets.length === 1 && isNativeBilibiliItem) {
          resolvedSingleBilibiliItem = item
        }
      }
    }
    if (platformId === 'bilibili' && Array.isArray(payload.parts)) {
      payload.parts = normalizeBilibiliPayloadParts(payload.parts)
      payload.assets = payload.parts
        .filter((part) => part?.type === 'emoji' && part.asset)
        .map((part) => part.asset)
        .slice(0, 8)
    }
    refreshRichPayloadText(payload)
    refreshActiveSendLogPayload(payload)
    if (
      resolveBilibiliNative &&
      resolvedSingleBilibiliItem &&
      bilibiliFavoriteImagePayload(payload) &&
      !payload.assets.some(isBilibiliNativePanelAsset)
    ) {
      // Some fullscreen-rendered image Emoji and current Bilibili panel items
      // expose only an image URL plus a bracketed display name. Finding one
      // unique official item is still authoritative: force this single-image
      // payload through that item instead of submitting "[name]" as text.
      markBilibiliPayloadAsNativePanel(payload, resolvedSingleBilibiliItem)
    }
    return payload
  }

  function richTextFromElement(element) {
    const removals = [
      'button',
      'svg',
      "[aria-hidden='true']",
      '[data-bcp-one-owned]',
      ...config.userNames,
    ]
    return serializedTextFromElement(element, {
      imageTokens: true,
      rejectRoot: true,
      removals,
    })
  }

  function textFromCandidate(candidate) {
    const specific = textFromSpecificElement(candidate)
    if (specific) {
      return specific
    }

    const removals = [
      'button',
      'svg',
      'img',
      "[aria-hidden='true']",
      '[data-bcp-one-owned]',
      ...config.userNames,
    ]

    return serializedTextFromElement(candidate, {
      imageTokens: false,
      rejectRoot: false,
      removals,
    })
  }

  const SENDER_VALUE_ATTRIBUTES = [
    'data-username',
    'data-user-name',
    'data-uname',
    'data-name',
    'data-display-name',
    'data-nickname',
    'data-nick-name',
    'data-sender-name',
    'data-author-name',
    'data-display-id',
    'data-user-id',
    'data-uid',
  ]
  const SENDER_RECORD_ATTRIBUTES = [
    'data-user',
    'data-user-info',
    'data-user-data',
    'data-author',
    'data-sender',
    'data-profile',
  ]
  const MESSAGE_ID_ATTRIBUTES = [
    'data-id_str',
    'data-id-str',
    'data-message-id',
    'data-msg-id',
    'data-item-id',
    'data-chatid',
    'data-comment-uuid',
    'data-cid',
    'data-id',
  ]

  function senderFromRecordAttribute(element, attribute) {
    const raw = String(element.getAttribute(attribute) || '').trim()
    if (!raw) return ''
    const candidates = [raw]
    try {
      const decoded = decodeURIComponent(raw)
      if (decoded !== raw) candidates.push(decoded)
    } catch {
      // Some site-internal metadata deliberately contains bare percent signs.
    }
    for (const candidate of candidates) {
      try {
        const record = JSON.parse(candidate)
        const sender =
          shared.extractSenderFromRecord(record) || shared.extractSenderFromRecord({ user: record })
        if (sender) return sender
      } catch {
        const sender = shared.normalizeSenderName(candidate)
        if (sender && !candidate.startsWith('{') && !candidate.startsWith('[')) return sender
      }
    }
    return ''
  }

  function senderFromElement(element) {
    if (!(element instanceof Element)) {
      return ''
    }

    for (const selector of config.userNames) {
      let nameElement = null
      try {
        nameElement = element.matches(selector) ? element : element.querySelector(selector)
      } catch {
        nameElement = null
      }
      if (!nameElement) {
        continue
      }
      const values = [
        nameElement.textContent,
        nameElement.getAttribute('aria-label'),
        nameElement.getAttribute('title'),
        ...SENDER_VALUE_ATTRIBUTES.map((attribute) => nameElement.getAttribute(attribute)),
      ]
      for (const value of values) {
        const sender = shared.normalizeSenderName(value)
        if (sender) {
          return sender
        }
      }
      for (const attribute of SENDER_RECORD_ATTRIBUTES) {
        const sender = senderFromRecordAttribute(nameElement, attribute)
        if (sender) return sender
      }
    }

    for (const attribute of SENDER_VALUE_ATTRIBUTES) {
      const sender = shared.normalizeSenderName(element.getAttribute(attribute))
      if (sender) {
        return sender
      }
    }
    for (const attribute of SENDER_RECORD_ATTRIBUTES) {
      const sender = senderFromRecordAttribute(element, attribute)
      if (sender) return sender
    }
    const rowText = shared.normalizeWhitespace(element.innerText || element.textContent)
    const prefix = rowText.match(/^([^：:\n]{1,64})[：:]\s*/u)
    return shared.normalizeSenderName(prefix && prefix[1])
  }

  function messageIdsFromElement(element) {
    if (!(element instanceof Element)) return []
    const ids = new Set()
    const elementId = String(element.id || '').trim()
    if (elementId && elementId.length <= 160) ids.add(elementId)
    for (const current of [
      element,
      ...Array.from(
        element.querySelectorAll(
          '[data-id_str],[data-id-str],[data-message-id],[data-msg-id],[data-item-id],[data-chatid],[data-comment-uuid],[data-cid],[data-id]',
        ),
      ).slice(0, 8),
    ]) {
      const currentId = String(current.id || '').trim()
      if (currentId && currentId.length <= 160) ids.add(currentId)
      for (const attribute of MESSAGE_ID_ATTRIBUTES) {
        const value = String(current.getAttribute(attribute) || '').trim()
        if (value && value.length <= 160) ids.add(value)
      }
    }
    return Array.from(ids)
  }

  function replyMessageValues(message, richPayload) {
    return [
      message,
      richPayload && richPayload.text,
      shared.parseMessageText(message, config.maxLength),
    ].filter(Boolean)
  }

  function senderFromChatContext(candidate) {
    let current = candidate instanceof Element ? candidate : null
    for (let depth = 0; current && depth < 5; depth += 1) {
      if (matchesAny(current, config.chatRoots)) break
      const sender = senderFromElement(current)
      if (sender) return sender
      current = current.parentElement
    }
    return ''
  }

  function scanSenderCache() {
    if (state.senderScanTimer) {
      clearTimeout(state.senderScanTimer)
      state.senderScanTimer = 0
    }
    const now = Date.now()
    state.senderLastScanAt = now
    const rows = messageRows().slice(-160)
    rows.forEach((row, index) => {
      if (isOwned(row) || isBilibiliChatAdvertisement(row)) return
      const richPayload = richPayloadFromCandidate(row)
      const message = (richPayload && richPayload.text) || textFromCandidate(row)
      const sender = senderFromChatContext(row)
      if (!sender || !shared.isPlausibleMessage(message, config.maxLength)) return
      state.senderCorrelation.remember(replyMessageValues(message, richPayload), sender, {
        ids: messageIdsFromElement(row),
        observedAt: now - (rows.length - index) * 8,
        now,
      })
    })
  }

  function scheduleSenderCacheScan(delay) {
    if (state.senderScanTimer) return
    const requestedDelay = Math.max(0, Number(delay) || 0)
    const elapsed = Date.now() - state.senderLastScanAt
    const throttledDelay = Math.max(requestedDelay, SENDER_SCAN_MIN_INTERVAL - elapsed)
    state.senderScanTimer = setTimeout(scanSenderCache, throttledDelay)
  }

  function senderFromMatchingChatRow(message, observedAt) {
    const rows = messageRows().slice(-160)
    const expectedValues = replyMessageValues(message, null)
    rows.forEach((row, index) => {
      if (isOwned(row) || isBilibiliChatAdvertisement(row)) {
        return
      }
      const richPayload = richPayloadFromCandidate(row)
      const rowMessage = (richPayload && richPayload.text) || textFromCandidate(row)
      const sender = senderFromChatContext(row)
      if (!sender) return
      state.senderCorrelation.remember(replyMessageValues(rowMessage, richPayload), sender, {
        ids: messageIdsFromElement(row),
        observedAt: Date.now() - (rows.length - index) * 8,
      })
    })
    return state.senderCorrelation.resolve(expectedValues, { observedAt })
  }

  function senderFromCandidate(candidate, message, kind, observedAt, options) {
    const scanDom = !options || options.scanDom !== false
    const direct = kind === 'chat' ? senderFromChatContext(candidate) : senderFromElement(candidate)
    const values = replyMessageValues(message, state.richPayload)
    const ids = messageIdsFromElement(candidate)
    if (direct) {
      state.senderCorrelation.remember(values, direct, {
        ids,
        observedAt: observedAt || Date.now(),
      })
      return direct
    }
    if (kind === 'overlay' && scanDom) {
      const matching = senderFromMatchingChatRow(message, observedAt)
      if (matching) return matching
    } else if (kind !== 'overlay' && scanDom) {
      scanSenderCache()
    }
    return state.senderCorrelation.resolve(values, { ids, observedAt })
  }

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null
  }

  function fullscreenActive() {
    if (fullscreenElement()) {
      return true
    }
    try {
      const topDocument = window.top && window.top.document
      return Boolean(
        topDocument && (topDocument.fullscreenElement || topDocument.webkitFullscreenElement),
      )
    } catch {
      // Cross-origin player frames cannot inspect their parent document. A
      // viewport-sized player root is the safest remaining fullscreen signal.
    }
    return queryAllDeep(config.videoRoots).some((root) => {
      if (!isVisible(root)) return false
      const rect = root.getBoundingClientRect()
      return rect.width >= innerWidth * 0.9 && rect.height >= innerHeight * 0.85
    })
  }

  function ensurePortal() {
    const host = fullscreenElement() || document.documentElement
    if (!state.ui) {
      state.ui = createContentOverlay({
        onCopy: onCopyActionClick,
        onFavorite: onFavoriteActionClick,
        onPlaceholder: onPlaceholderActionClick,
        onPlusOne: onPlusOneClick,
        onPointerEnter: cancelHide,
        onPointerLeave: scheduleHide,
      })
      state.portal = state.ui.portal
    }
    return state.ui.ensureHost(host)
  }

  function ensureButton() {
    ensurePortal()
    renderActionBar()
    state.actionBar = state.ui.actionBar()
    state.button = state.ui.plusOneButton()
    return state.button
  }

  function onPlaceholderActionClick(event, action) {
    event.preventDefault()
    event.stopPropagation()
    cancelHide()
    if (action === 'reply') {
      void prepareReply().catch((error) => {
        console.warn('[bililive-danmaku-plus-one] reply preparation failed', {
          platform: platformId,
          reason: error instanceof Error ? error.message : String(error),
        })
        showToast(t('toastSenderUnknown'), 'error')
      })
    }
  }

  async function onCopyActionClick(event) {
    event.preventDefault()
    event.stopPropagation()
    cancelHide()
    if (
      !visibleActionsForSurface(state.settings, platformId, state.candidateKind).copy ||
      !state.message
    ) {
      return
    }
    const bilibiliClassification =
      platformId === 'bilibili' && state.richPayload
        ? classifyBilibiliRichPayload(state.richPayload)
        : null
    const copyText =
      bilibiliClassification?.kind === 'panel-emoji-single'
        ? bilibiliClassification.text
        : state.message
    const copied = await writeClipboardText(copyText)
    showToast(t(copied ? 'toastCopied' : 'toastCopyFailed'), copied ? 'success' : 'error')
  }

  async function onFavoriteActionClick(event) {
    event.preventDefault()
    event.stopPropagation()
    cancelHide()
    if (
      !visibleActionsForSurface(state.settings, platformId, state.candidateKind).favorite ||
      !state.message ||
      !state.favoritesRuntime
    ) {
      return
    }
    let message = state.message
    const payload = state.richPayload
    if (payload && payload.assets && payload.assets.length) {
      await enrichRichPayloadAssetNames(payload, { resolveBilibiliNative: true })
      if (shared.isPlausibleMessage(payload.text, config.maxLength)) {
        message = payload.text
        if (payload === state.richPayload) {
          state.message = message
        }
      }
    }
    await state.favoritesRuntime.favoriteText(message, payload)
  }

  function renderActionBar() {
    if (state.ui) {
      state.ui.setActions(visibleActionsForSurface(state.settings, platformId, state.candidateKind))
    }
  }

  function freezeOverlayCandidate(candidate) {
    state.pausedAnimations =
      typeof candidate.getAnimations === 'function'
        ? candidate.getAnimations({ subtree: true }).map((animation) => ({
            animation,
            shouldResume: animation.playState === 'running',
          }))
        : []

    for (const item of state.pausedAnimations) {
      try {
        item.animation.pause()
      } catch {
        // The site may discard an animation between discovery and pausing.
      }
    }

    const rect = candidate.getBoundingClientRect()
    // Never deep-clone live-site DOM here. Huya advertisements can contain
    // custom elements or clonable shadow roots that initialize a new media
    // pipeline during a deep DOM clone, before media descendants can be removed.
    const snapshot = createInertOverlaySnapshot(candidate, {
      skipSelector: INERT_SNAPSHOT_SKIP_SELECTOR,
    })
    snapshot.classList.add('bcp-one-frozen', 'bcp-one-target')
    snapshot.dataset.bcpOneOwned = 'true'

    snapshot.style.setProperty('position', 'fixed', 'important')
    snapshot.style.setProperty('box-sizing', 'border-box', 'important')
    snapshot.style.setProperty('left', `${rect.left}px`, 'important')
    snapshot.style.setProperty('top', `${rect.top}px`, 'important')
    snapshot.style.setProperty('right', 'auto', 'important')
    snapshot.style.setProperty('bottom', 'auto', 'important')
    snapshot.style.setProperty('width', `${rect.width}px`, 'important')
    snapshot.style.setProperty('height', `${rect.height}px`, 'important')
    snapshot.style.setProperty('margin', '0', 'important')
    snapshot.style.setProperty('transform', 'none', 'important')
    snapshot.style.setProperty('animation', 'none', 'important')
    snapshot.style.setProperty('transition', 'none', 'important')
    snapshot.style.setProperty('visibility', 'visible', 'important')
    snapshot.style.setProperty('pointer-events', 'none', 'important')
    snapshot.style.setProperty('z-index', '2147483646', 'important')

    state.originalVisibility = {
      value: candidate.style.getPropertyValue('visibility'),
      priority: candidate.style.getPropertyPriority('visibility'),
    }

    candidate.style.setProperty('visibility', 'hidden', 'important')
    ensurePortal().appendChild(snapshot)
    state.frozenClone = snapshot
  }

  function unfreezeOverlayCandidate() {
    const frozenClone = state.frozenClone
    if (frozenClone) {
      frozenClone.remove()
      state.frozenClone = null
    }

    if (state.candidate && state.candidate.isConnected && state.originalVisibility) {
      if (state.originalVisibility.value) {
        state.candidate.style.setProperty(
          'visibility',
          state.originalVisibility.value,
          state.originalVisibility.priority,
        )
      } else {
        state.candidate.style.removeProperty('visibility')
      }
    }

    for (const item of state.pausedAnimations) {
      if (item.shouldResume) {
        try {
          item.animation.play()
        } catch {
          // Ignore animations removed by the site's danmaku renderer.
        }
      }
    }

    state.originalVisibility = null
    state.pausedAnimations = []
  }

  function updateButtonPosition() {
    const positionTarget = state.frozenClone || state.candidate
    if (
      !positionTarget ||
      !state.actionBar ||
      state.actionBar.hidden ||
      !positionTarget.isConnected
    ) {
      return
    }

    const rect = positionTarget.getBoundingClientRect()
    const messageElement = state.candidate ? messageElementFromCandidate(state.candidate) : null
    const fontTarget = messageElement instanceof Element ? messageElement : state.candidate
    const computedFontSize =
      fontTarget instanceof Element ? Number.parseFloat(getComputedStyle(fontTarget).fontSize) : 0
    const fontRect = fontTarget instanceof Element ? fontTarget.getBoundingClientRect() : null
    const layoutHeight = fontTarget instanceof HTMLElement ? fontTarget.offsetHeight : 0
    const renderedScale =
      fontRect && layoutHeight > 0 ? Math.max(0.25, Math.min(fontRect.height / layoutHeight, 4)) : 1
    const renderedFontSize = computedFontSize * renderedScale
    if (state.candidateKind === 'overlay' && renderedFontSize > 0) {
      if (state.actionReferenceFontSize <= 0) {
        state.actionReferenceFontSize = renderedFontSize
      }
      const actionScale = Math.max(
        0.5,
        Math.min(renderedFontSize / state.actionReferenceFontSize, 2),
      )
      state.actionBar.style.setProperty('--bcp-action-scale', String(actionScale))
    } else {
      state.actionBar.style.setProperty('--bcp-action-scale', '1')
    }
    const buttonRect = state.actionBar.getBoundingClientRect()
    let left
    let top
    if (state.candidateKind === 'chat') {
      const preferredLeft = rect.left - buttonRect.width - 6
      const fallbackRight = rect.right + 6
      left = preferredLeft >= 8 ? preferredLeft : fallbackRight
      top = rect.top + (rect.height - buttonRect.height) / 2
    } else {
      left = rect.left + (rect.width - buttonRect.width) / 2
      const preferredTop = rect.bottom + 8
      const fallbackTop = rect.top - buttonRect.height - 8
      top = preferredTop + buttonRect.height <= innerHeight - 8 ? preferredTop : fallbackTop
    }

    state.actionBar.style.left = `${Math.max(8, Math.min(left, innerWidth - buttonRect.width - 8))}px`
    state.actionBar.style.top = `${Math.max(8, Math.min(top, innerHeight - buttonRect.height - 8))}px`
  }

  function selectCandidate(candidate, kind, allowNoVisibleActions) {
    const selectionStartedAt = performance.now()
    if (kind === 'overlay' && !isOverlayMessageElement(candidate)) {
      return false
    }
    if (kind !== 'overlay' && isBilibiliChatAdvertisement(candidate)) {
      return false
    }
    const candidateKind = kind || 'chat'
    const candidateActions = visibleActionsForSurface(state.settings, platformId, candidateKind)
    if (!allowNoVisibleActions && !Object.values(candidateActions).some(Boolean)) {
      return false
    }

    const richPayload = richPayloadFromCandidate(candidate)
    const message = (richPayload && richPayload.text) || textFromCandidate(candidate)
    if (!shared.isPlausibleMessage(message, config.maxLength)) {
      return false
    }
    cancelHide()
    clearSelection()
    state.candidate = candidate
    state.candidateKind = candidateKind
    state.message = message
    state.richPayload = richPayload
    state.selectedAt = Date.now()
    state.sender = ''
    candidate.classList.add('bcp-one-target')
    if (state.candidateKind === 'overlay') {
      freezeOverlayCandidate(candidate)
    }
    state.sender = senderFromCandidate(candidate, message, state.candidateKind, state.selectedAt, {
      scanDom: false,
    })

    ensureButton()
    state.ui.showActionBar(message, state.sender)
    requestAnimationFrame(updateButtonPosition)
    diagnostics.record({
      type: 'candidate.selected',
      stage: candidateKind,
      durationMs: performance.now() - selectionStartedAt,
      outcome: 'success',
    })
    return true
  }

  function clearSelection() {
    if (state.candidate && state.candidate.isConnected) {
      state.candidate.classList.remove('bcp-one-target')
    }

    unfreezeOverlayCandidate()
    state.candidate = null
    state.candidateKind = null
    state.message = ''
    state.sender = ''
    state.selectedAt = 0
    state.richPayload = null
    if (state.ui) state.ui.hideActionBar()
  }

  function cancelHide() {
    if (state.hideTimer) {
      clearTimeout(state.hideTimer)
      state.hideTimer = 0
    }
  }

  function scheduleHide(delay) {
    if (state.hideTimer) {
      return
    }
    const timeout = Number.isFinite(delay)
      ? delay
      : state.candidateKind === 'overlay'
        ? OVERLAY_LEAVE_DELAY
        : 180
    state.hideTimer = setTimeout(() => {
      state.hideTimer = 0
      clearSelection()
    }, timeout)
  }

  function showToast(message, kind) {
    ensurePortal()
    state.ui.showToast(message, kind || 'info')
  }

  function inputSurfaceScore(element, index) {
    const fullscreen = fullscreenElement()
    const isFullscreen = fullscreenActive()
    const insideFullscreen = Boolean(
      fullscreen && (fullscreen === element || fullscreen.contains(element)),
    )
    const insideVideo = Boolean(closestMatching(element, config.videoRoots))
    const insideChat = Boolean(closestMatching(element, config.chatRoots))
    const quickInput = platformId === 'bilibili' && isBilibiliQuickInputRegion(element)
    let score = 1000 - index
    if (isFullscreen) {
      if (insideFullscreen) score += 1400
      if (insideVideo) score += 800
      if (quickInput) score += 900
      if (insideChat && !insideFullscreen) score -= 1200
    } else {
      if (insideChat) score += 700
      if (!insideVideo) score += 300
      if (insideVideo || quickInput) score -= 900
    }
    return score
  }

  function findInput(options) {
    const reply = Boolean(options && options.reply)
    const candidates = queryAllDeep(config.inputs)
    const seen = new Set(candidates)
    const addEditors = (root) => {
      if (!(root instanceof Element || root instanceof Document || root instanceof ShadowRoot)) {
        return
      }
      let editors = []
      try {
        editors = root.querySelectorAll(TEXT_EDITOR_SELECTOR)
      } catch {
        editors = []
      }
      for (const editor of editors) {
        if (!seen.has(editor)) {
          seen.add(editor)
          candidates.push(editor)
        }
      }
    }
    const fullscreen = fullscreenElement()
    if (fullscreenActive()) {
      if (fullscreen) addEditors(fullscreen)
      queryAllDeep(config.videoRoots).forEach(addEditors)
    } else {
      queryAllDeep(config.chatRoots).forEach(addEditors)
    }
    const usable = candidates.filter((element) => {
      const disabled =
        element.matches(':disabled') ||
        element.getAttribute('aria-disabled') === 'true' ||
        element.getAttribute('contenteditable') === 'false'
      return !disabled && element.isConnected && element.matches(TEXT_EDITOR_SELECTOR)
    })
    const visible = usable
      .filter((element) => isVisible(element))
      .map((element) => ({ element, index: candidates.indexOf(element) }))
      .sort(
        (left, right) =>
          inputSurfaceScore(right.element, right.index) -
          inputSurfaceScore(left.element, left.index),
      )
    if (reply && platformId === 'bilibili' && fullscreenActive()) {
      const fullscreenReplyInput = visible.find(
        ({ element }) =>
          isBilibiliQuickInputRegion(element) ||
          Boolean(closestMatching(element, config.videoRoots)) ||
          Boolean(fullscreen && (fullscreen === element || fullscreen.contains(element))),
      )
      return fullscreenReplyInput ? fullscreenReplyInput.element : null
    }
    if (visible.length) {
      return visible[0].element
    }

    // Native fullscreen only renders descendants of the fullscreen player.
    // Bilibili keeps its real chat input outside that subtree, but its event
    // handlers remain usable programmatically.
    if (!reply && platformId === 'bilibili' && fullscreenActive()) {
      return usable[0] || null
    }
    return null
  }

  function findBilibiliEmojiEditor() {
    if (platformId !== 'bilibili') return null
    const fullscreen = fullscreenElement()
    const candidates = queryAllDeep(config.inputs).filter((element) => {
      const disabled =
        element.matches(':disabled') ||
        element.getAttribute('aria-disabled') === 'true' ||
        element.getAttribute('contenteditable') === 'false'
      const insideFullscreen = Boolean(
        fullscreen && (fullscreen === element || fullscreen.contains(element)),
      )
      return (
        !disabled &&
        element.isConnected &&
        element.matches(TEXT_EDITOR_SELECTOR) &&
        !insideFullscreen &&
        !isBilibiliQuickInputRegion(element)
      )
    })
    candidates.sort((first, second) => {
      const score = (element) =>
        (element.matches('textarea.chat-input,.chat-input-ctnr textarea,.chat-input') ? 1200 : 0) +
        (closestMatching(element, config.chatRoots) ? 600 : 0) +
        (isVisible(element) ? 120 : 0)
      return score(second) - score(first)
    })
    return candidates[0] || null
  }

  function activateBilibiliQuickInput() {
    if (platformId !== 'bilibili' || !fullscreenActive()) {
      return false
    }
    restoreBilibiliQuickBars(null, true)
    state.rootsCachedAt = 0
    const selectors = [
      ...BILIBILI_QUICK_BAR_SELECTORS,
      "[aria-expanded='false'][aria-label*='弹幕']",
      "[title*='弹幕输入']",
      "[data-testid*='danmaku'][role='button']",
      "[data-e2e*='danmaku'][role='button']",
    ]
    const candidates = queryAllDeep(selectors)
      .filter(
        (element) =>
          isVisible(element) &&
          Boolean(
            closestMatching(element, config.videoRoots) || fullscreenElement()?.contains(element),
          ),
      )
      .sort((left, right) => {
        const leftExpanded = left.getAttribute('aria-expanded') === 'false' ? 1 : 0
        const rightExpanded = right.getAttribute('aria-expanded') === 'false' ? 1 : 0
        return rightExpanded - leftExpanded
      })

    for (const candidate of candidates) {
      const nestedEditors = Array.from(candidate.querySelectorAll(TEXT_EDITOR_SELECTOR))
      if (
        candidate.matches(TEXT_EDITOR_SELECTOR) ||
        nestedEditors.some((editor) => isVisible(editor))
      ) {
        continue
      }
      const nestedActivator = Array.from(
        candidate.querySelectorAll("[aria-expanded='false'], button, [role='button']"),
      ).find((element) => isVisible(element))
      const clickTarget = nestedActivator || candidate
      const marker = shared.normalizeWhitespace(
        clickTarget.innerText || clickTarget.textContent || clickTarget.getAttribute('aria-label'),
      )
      if (clickTarget.matches("button, [role='button']") && /^(?:发送|send)$/i.test(marker)) {
        continue
      }
      if (typeof clickTarget.click === 'function') {
        clickTarget.click()
        return true
      }
    }
    return false
  }

  async function findReplyInput() {
    let input = findInput({ reply: true })
    if (input || platformId !== 'bilibili' || !fullscreenActive()) {
      return input
    }
    activateBilibiliQuickInput()
    for (const delay of [0, 40, 80, 140, 220, 360]) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
      state.rootsCachedAt = 0
      input = findInput({ reply: true })
      if (input) return input
    }
    return null
  }

  function setNativeValue(input, value) {
    const hiddenBilibiliFullscreen =
      platformId === 'bilibili' && fullscreenActive() && !isVisible(input)
    if (!hiddenBilibiliFullscreen) {
      input.focus({ preventScroll: true })
    }

    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      const prototype =
        input instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')

      if (setter && setter.set) {
        setter.set.call(input, value)
      } else {
        input.value = value
      }

      input.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          composed: true,
          data: value,
          inputType: 'insertText',
        }),
      )
      input.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      return
    }

    if (
      input.isContentEditable ||
      (input.hasAttribute('contenteditable') && input.getAttribute('contenteditable') !== 'false')
    ) {
      if (hiddenBilibiliFullscreen) {
        input.textContent = value
        input.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            composed: true,
            data: value,
            inputType: 'insertText',
          }),
        )
        return
      }

      input.dispatchEvent(
        new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          composed: true,
          data: value,
          inputType: 'insertText',
        }),
      )

      let inserted = false
      try {
        document.execCommand('selectAll', false, null)
        inserted = document.execCommand('insertText', false, value)
      } catch {
        inserted = false
      }

      if (!inserted) {
        input.textContent = value
      }

      input.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          composed: true,
          data: value,
          inputType: 'insertText',
        }),
      )
    }
  }

  function focusReplyInput(input, expectedValue) {
    const focus = () => {
      const editor = input.isConnected ? input : findInput({ reply: true })
      if (!editor || inputText(editor) !== expectedValue) {
        return
      }
      editor.focus({ preventScroll: true })
      placeCaretAtEnd(editor)
    }
    focus()
    requestAnimationFrame(focus)
    setTimeout(focus, 50)
  }

  async function prepareReply() {
    if (
      !visibleActionsForSurface(state.settings, platformId, state.candidateKind).reply ||
      !state.candidate
    ) {
      return
    }
    const candidate = state.candidate
    const message = state.message
    const kind = state.candidateKind
    const observedAt = state.selectedAt
    let sender = state.sender
    for (let attempt = 0; !sender && attempt < REPLY_RESOLVE_ATTEMPTS; attempt += 1) {
      try {
        sender = senderFromCandidate(candidate, message, kind, observedAt, {
          scanDom: attempt === 0,
        })
      } catch (error) {
        console.warn('[bililive-danmaku-plus-one] sender resolution failed', {
          attempt: attempt + 1,
          platform: platformId,
          reason: error instanceof Error ? error.message : String(error),
        })
        sender = ''
      }
      if (!sender && attempt + 1 < REPLY_RESOLVE_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, REPLY_RESOLVE_INTERVAL))
      }
    }
    if (!sender) {
      showToast(t('toastSenderUnknown'), 'error')
      return
    }
    const input = await findReplyInput()
    if (!input) {
      showToast(t('toastEditorNotFound', platformName), 'error')
      return
    }
    const nextValue = shared.replyDraftValue(inputText(input), sender)
    setNativeValue(input, nextValue)
    clearSelection()
    focusReplyInput(input, nextValue)
  }

  function buttonScore(button, input, selectorIndex, scopeBonus) {
    const visible = isVisible(button)
    const allowHidden = platformId === 'bilibili' && fullscreenActive()
    if (
      (!visible && !allowHidden) ||
      button.matches(':disabled') ||
      button.getAttribute('aria-disabled') === 'true' ||
      typeof button.click !== 'function'
    ) {
      return -Infinity
    }

    const text = shared.normalizeWhitespace(
      button.innerText || button.textContent || button.getAttribute('aria-label'),
    )
    const marker = [
      button.getAttribute('data-e2e'),
      button.getAttribute('data-testid'),
      button.getAttribute('aria-label'),
      typeof button.className === 'string' ? button.className : '',
    ]
      .filter(Boolean)
      .join(' ')
    let score = 100 - selectorIndex + (scopeBonus || 0)

    if (!visible) {
      score -= 80
    }

    if (/^(发送|发 送|send)$/i.test(text)) {
      score += 200
    } else if (/(发送|send)/i.test(text)) {
      score += 80
    }
    if (/(send|发送|danmu|danmaku|comment)/i.test(marker)) {
      score += 120
    }

    const inputRect = input.getBoundingClientRect()
    const buttonRect = button.getBoundingClientRect()
    const distance =
      Math.abs(buttonRect.left - inputRect.right) + Math.abs(buttonRect.top - inputRect.top)
    return score - Math.min(distance / 10, 100)
  }

  function findSendButton(input) {
    const candidates = []
    const seen = new Set()

    const addCandidate = (button, selectorIndex, scopeBonus) => {
      if (!seen.has(button)) {
        seen.add(button)
        candidates.push({ button, selectorIndex, scopeBonus })
      }
    }

    let parent = input.parentElement
    for (let depth = 0; parent && depth < 6; depth += 1, parent = parent.parentElement) {
      const nearby = parent.querySelectorAll(
        [
          'button',
          "[role='button']",
          "[data-e2e*='send' i]",
          "[data-testid*='send' i]",
          "[aria-label*='发送']",
          "[class*='send' i]",
        ].join(','),
      )
      for (const button of nearby) {
        addCandidate(button, config.sendButtons.length + 1, 360 - depth * 50)
      }
    }

    config.sendButtons.forEach((selector, selectorIndex) => {
      for (const button of queryAllDeep([selector])) {
        addCandidate(button, selectorIndex, 0)
      }
    })

    candidates.sort(
      (a, b) =>
        buttonScore(b.button, input, b.selectorIndex, b.scopeBonus) -
        buttonScore(a.button, input, a.selectorIndex, a.scopeBonus),
    )
    return candidates.length &&
      buttonScore(
        candidates[0].button,
        input,
        candidates[0].selectorIndex,
        candidates[0].scopeBonus,
      ) > -Infinity
      ? candidates[0].button
      : null
  }

  function inputStillContainsMessage(input, message) {
    if (!input || !input.isConnected) {
      return false
    }
    return shared.normalizeWhitespace(inputText(input)) === shared.normalizeWhitespace(message)
  }

  async function waitForInputConsumption(input, message, timeout) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      if (!inputStillContainsMessage(input, message)) {
        return true
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    return !inputStillContainsMessage(input, message)
  }

  function releaseInputFocus(input) {
    const bilibiliDismissToken = platformId === 'bilibili' ? ++state.bilibiliDismissToken : 0
    const quickBarStyleProperties = ['display', 'visibility', 'opacity', 'pointer-events']
    const restorePlaybackState = (snapshots) => {
      for (const snapshot of snapshots) {
        if (!snapshot.video.isConnected) {
          continue
        }
        if (snapshot.paused && !snapshot.video.paused) {
          snapshot.video.pause()
        } else if (!snapshot.paused && snapshot.video.paused) {
          const playResult = snapshot.video.play()
          if (playResult && typeof playResult.catch === 'function') {
            playResult.catch(() => {})
          }
        }
      }
    }

    const forceHideBilibiliQuickBars = (quickEditors) => {
      for (const editor of quickEditors) {
        const player =
          fullscreenElement() ||
          closestMatching(editor, config.videoRoots) ||
          queryAllDeep(config.videoRoots).find((element) => isVisible(element))
        const container = editor.closest(BILIBILI_QUICK_BAR_SELECTORS.join(','))
        // Never guess an ancestor here. A wrong guess can hide the entire
        // danmaku layer until another trusted user event restores its styles.
        if (!container || container === editor || container === player) continue
        if (state.hiddenBilibiliQuickBars.has(container)) {
          state.hiddenBilibiliQuickBars.get(container).hiddenAt = Date.now()
          container.style.setProperty('display', 'none', 'important')
          container.style.setProperty('visibility', 'hidden', 'important')
          container.style.setProperty('opacity', '0', 'important')
          container.style.setProperty('pointer-events', 'none', 'important')
          continue
        }
        state.hiddenBilibiliQuickBars.set(container, {
          styles: Object.fromEntries(
            quickBarStyleProperties.map((property) => [
              property,
              {
                value: container.style.getPropertyValue(property),
                priority: container.style.getPropertyPriority(property),
              },
            ]),
          ),
          hiddenAt: Date.now(),
        })
        container.style.setProperty('display', 'none', 'important')
        container.style.setProperty('visibility', 'hidden', 'important')
        container.style.setProperty('opacity', '0', 'important')
        container.style.setProperty('pointer-events', 'none', 'important')
      }
    }

    const dismissBilibiliQuickInput = () => {
      const player =
        fullscreenElement() ||
        closestMatching(input, config.videoRoots) ||
        queryAllDeep(config.videoRoots).find((element) => isVisible(element))
      const quickEditorSet = new Set(queryAllDeep(BILIBILI_QUICK_INPUTS))
      const addIfPlayerEditor = (editor) => {
        if (!(editor instanceof HTMLElement) || !editor.isConnected || !isVisible(editor)) {
          return
        }
        if (isBilibiliSideChatEditor(editor)) {
          return
        }
        const looksEditable = editor.matches(
          "input, textarea, [contenteditable]:not([contenteditable='false']), [role='textbox']",
        )
        if (!looksEditable) {
          return
        }
        const owner = closestMatching(editor, config.videoRoots)
        const playerRect = player && player.getBoundingClientRect()
        const playerCoversViewport = Boolean(
          playerRect &&
          playerRect.width >= innerWidth * 0.85 &&
          playerRect.height >= innerHeight * 0.75,
        )
        if (
          (player && player.contains(editor)) ||
          owner ||
          (editor === input && fullscreenActive() && playerCoversViewport)
        ) {
          quickEditorSet.add(editor)
        }
      }
      addIfPlayerEditor(input)
      addIfPlayerEditor(document.activeElement)
      if (player) {
        const playerRect = player.getBoundingClientRect()
        for (const editor of player.querySelectorAll(
          "input, textarea, [contenteditable='true'], [role='textbox']",
        )) {
          if (!isVisible(editor) || isBilibiliSideChatEditor(editor)) {
            continue
          }
          const rect = editor.getBoundingClientRect()
          if (
            rect.height >= 8 &&
            rect.height <= 100 &&
            rect.bottom >= playerRect.top + playerRect.height * 0.45
          ) {
            quickEditorSet.add(editor)
          }
        }
      }
      const quickEditors = Array.from(quickEditorSet).filter(
        (editor) => editor.isConnected && isVisible(editor),
      )
      if (!quickEditors.length) {
        return
      }

      const escapeInit = {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        which: 27,
        bubbles: true,
        cancelable: true,
        composed: true,
      }
      for (const editor of quickEditors) {
        editor.dispatchEvent(new KeyboardEvent('keydown', escapeInit))
        editor.dispatchEvent(new KeyboardEvent('keyup', escapeInit))
      }

      const playerRect = player && player.getBoundingClientRect()
      let outsideTarget =
        player &&
        player.querySelector(
          [
            '.bilibili-live-player-video-danmaku',
            '.bpx-player-video-wrap',
            '.bilibili-live-player-video-area',
            'video',
          ].join(','),
        )
      if (!outsideTarget && playerRect && playerRect.width > 0 && playerRect.height > 0) {
        outsideTarget = document.elementFromPoint(
          playerRect.left + playerRect.width / 2,
          playerRect.top + playerRect.height * 0.55,
        )
      }
      outsideTarget = outsideTarget || player || document.body || document.documentElement
      if (!outsideTarget) {
        forceHideBilibiliQuickBars(quickEditors)
        return
      }
      const videos = player
        ? Array.from(player.querySelectorAll('video')).map((video) => ({
            video,
            paused: video.paused,
          }))
        : []
      const pointerInit = {
        bubbles: true,
        cancelable: true,
        composed: true,
        button: 0,
        buttons: 0,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
      }
      outsideTarget.dispatchEvent(new PointerEvent('pointerdown', pointerInit))
      outsideTarget.dispatchEvent(new MouseEvent('mousedown', pointerInit))
      outsideTarget.dispatchEvent(new PointerEvent('pointerup', pointerInit))
      outsideTarget.dispatchEvent(new MouseEvent('mouseup', pointerInit))
      outsideTarget.dispatchEvent(new MouseEvent('click', pointerInit))
      restorePlaybackState(videos)
      setTimeout(() => restorePlaybackState(videos), 80)
      setTimeout(() => {
        if (bilibiliDismissToken !== state.bilibiliDismissToken) {
          return
        }
        const stillVisible = quickEditors.filter(
          (editor) => editor.isConnected && isVisible(editor),
        )
        if (stillVisible.length) {
          forceHideBilibiliQuickBars(stillVisible)
        }
      }, 60)
    }

    const release = () => {
      if (platformId === 'bilibili' && bilibiliDismissToken !== state.bilibiliDismissToken) {
        return
      }

      const editors = new Set(input ? [input] : [])
      if (platformId === 'bilibili') {
        for (const editor of queryAllDeep(config.inputs)) {
          editors.add(editor)
        }
      }

      for (const editor of editors) {
        if (!editor || typeof editor.blur !== 'function') {
          continue
        }
        try {
          editor.blur()
        } catch {
          // Bilibili may replace its fullscreen editor during the send cycle.
        }
      }

      if (platformId === 'bilibili') {
        const active = document.activeElement
        const fullPlayer = fullscreenElement()
        if (
          active instanceof HTMLElement &&
          fullPlayer &&
          fullPlayer.contains(active) &&
          active.matches(
            "input, textarea, [contenteditable]:not([contenteditable='false']), [role='textbox']",
          )
        ) {
          active.blur()
        }
        dismissBilibiliQuickInput()
      }
    }

    release()
    if (platformId === 'bilibili') {
      // One next-tick blur is enough for the native editor. Long delayed blur
      // cycles interfere with selecting the next danmaku after a +1 action.
      setTimeout(release, 80)
    }
  }

  function platformEmojiToggleSelectors() {
    return BILIBILI_EMOJI_TOGGLE_SELECTORS
  }

  function platformEmojiSurfaceSelectors() {
    return BILIBILI_EMOJI_SURFACE_SELECTORS
  }

  function platformEmojiItemCandidates(includeHidden = false) {
    const results = []
    const seen = new Set()
    const add = (element) => {
      if (
        !(element instanceof Element) ||
        seen.has(element) ||
        (!includeHidden && !isVisible(element)) ||
        closestMatching(element, config.messages) ||
        closestMatching(element, config.overlayMessages) ||
        closestMatching(element, PLATFORM_EMOJI_CATEGORY_SELECTORS) ||
        isOwned(element)
      ) {
        return
      }
      seen.add(element)
      results.push(element)
    }
    queryAllDeep(PLATFORM_EMOJI_ITEM_SELECTORS).forEach(add)
    queryAllDeep(platformEmojiSurfaceSelectors()).forEach((surface) => {
      if (
        (!includeHidden && !isVisible(surface)) ||
        closestMatching(surface, config.messages) ||
        closestMatching(surface, config.overlayMessages)
      ) {
        return
      }
      surface
        .querySelectorAll(
          [
            'img',
            '[data-emoji]',
            '[data-emoji-name]',
            '[data-emoji-text]',
            '[data-emoticon]',
            '[data-emoticon-name]',
            '[data-emoticon-text]',
            '[data-emoticon-unique]',
            '[data-file-id]',
            "[role='button']",
            'button',
            'li',
          ].join(','),
        )
        .forEach(add)
    })
    return results.slice(0, platformId === 'bilibili' ? 1200 : 500)
  }

  function findMatchingPlatformEmoji(asset, includeHidden = false) {
    let best = null
    let bestScore = 0
    platformEmojiItemCandidates(includeHidden).forEach((element) => {
      const score = assetMatchScore(element, asset)
      if (score > bestScore) {
        bestScore = score
        best = element
      }
    })
    if (!best || bestScore < 4) {
      return null
    }
    return platformEmojiInteractiveItem(best)
  }

  function platformEmojiInteractiveItem(element) {
    const interactive = element.closest("button,[role='button'],li")
    if (interactive) return interactive
    const parentItem =
      element.parentElement &&
      element.parentElement.closest(PLATFORM_EMOJI_ITEM_SELECTORS.join(','))
    return parentItem || element.closest(PLATFORM_EMOJI_ITEM_SELECTORS.join(',')) || element
  }

  function isUnavailablePlatformEmojiItem(element) {
    if (!(element instanceof Element)) return true
    const item = platformEmojiInteractiveItem(element)
    try {
      return Boolean(
        item.matches('[disabled],.lock,.locked,[aria-disabled="true"]') ||
        item.querySelector('[disabled],.lock,.locked,[aria-disabled="true"]'),
      )
    } catch {
      return false
    }
  }

  function findUniqueBilibiliPlatformEmoji(asset, includeHidden = false) {
    if (platformId !== 'bilibili') return null
    const matches = new Map()
    const expectedToken = normalizedEmojiToken(asset && asset.token, 'emoji')
    platformEmojiItemCandidates(includeHidden).forEach((element) => {
      let score = assetMatchScore(element, asset)
      if (
        score < 4 &&
        expectedToken &&
        normalizedEmojiToken(assetDescriptorFromElement(element)?.token, 'emoji') === expectedToken
      ) {
        // Some Bilibili builds expose only a display name on the native panel
        // and only an image URL on the rendered danmaku. An exact bracketed
        // token is safe only when it resolves to one native interactive item.
        score = 3
      }
      if (score < 3) return
      const item = platformEmojiInteractiveItem(element)
      if (isUnavailablePlatformEmojiItem(item)) return
      const descriptor = assetDescriptorFromElement(element)
      const resourceIdentity = descriptor?.keys?.find((key) => {
        const normalized = String(key || '').toLowerCase()
        return (
          normalized.startsWith(NATIVE_PANEL_ASSET_KEY_PREFIX) ||
          normalized.startsWith(LEGACY_BILIBILI_EXCLUSIVE_ASSET_KEY_PREFIX)
        )
      })
      const matchKey = resourceIdentity || item
      const previous = matches.get(matchKey)
      if (
        !previous ||
        score > previous.score ||
        (score === previous.score && isVisible(item) && !isVisible(previous.item))
      ) {
        matches.set(matchKey, { item, score })
      }
    })
    const ranked = Array.from(matches.values()).sort((first, second) => second.score - first.score)
    if (!ranked.length) return null
    const bestScore = ranked[0].score
    const best = ranked.filter((match) => match.score === bestScore)
    return best.length === 1 ? best[0].item : null
  }

  function platformEmojiCategoryCandidates(includeHidden = false) {
    const results = []
    const seen = new Set()
    queryAllDeep(platformEmojiSurfaceSelectors()).forEach((surface) => {
      if (
        (!includeHidden && !isVisible(surface)) ||
        closestMatching(surface, config.messages) ||
        closestMatching(surface, config.overlayMessages)
      )
        return
      surface.querySelectorAll(PLATFORM_EMOJI_CATEGORY_SELECTORS.join(',')).forEach((element) => {
        if (
          !(element instanceof Element) ||
          seen.has(element) ||
          (!includeHidden && !isVisible(element)) ||
          isOwned(element) ||
          element.getAttribute('aria-selected') === 'true'
        ) {
          return
        }
        seen.add(element)
        results.push(element)
      })
    })
    return results.slice(0, platformId === 'bilibili' ? 64 : 16)
  }

  function findPlatformEmojiToggle(input, includeHidden = false) {
    const inputRect = input && input.getBoundingClientRect()
    const candidates = queryAllDeep(platformEmojiToggleSelectors()).filter(
      (element) =>
        element.isConnected &&
        (includeHidden || isVisible(element)) &&
        !closestMatching(element, config.messages) &&
        !isOwned(element),
    )
    candidates.sort((first, second) => {
      const score = (element) => {
        const marker = elementMarker(element)
        const rect = element.getBoundingClientRect()
        const visible = isVisible(element)
        const distance =
          inputRect && visible
            ? Math.abs(rect.left - inputRect.right) + Math.abs(rect.top - inputRect.top)
            : 0
        let scopeBonus = 0
        let parent = input && input.parentElement
        for (let depth = 0; parent && depth < 6; depth += 1, parent = parent.parentElement) {
          if (parent.contains(element)) {
            scopeBonus = 1200 - depth * 160
            break
          }
        }
        return (
          scopeBonus +
          (/(emoji|emoticon|emotion|face|表情)/i.test(marker) ? 500 : 0) -
          (visible ? 0 : 180) -
          Math.min(300, distance / 5)
        )
      }
      return score(second) - score(first)
    })
    return candidates[0] || null
  }

  async function waitForPlatformEmoji(asset, timeout) {
    const deadline = Date.now() + timeout
    let match = findMatchingPlatformEmoji(asset)
    while (!match && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      match = findMatchingPlatformEmoji(asset)
    }
    return match
  }

  async function waitForUniqueBilibiliPlatformEmoji(asset, timeout, includeHidden = false) {
    const deadline = Date.now() + timeout
    let match = findUniqueBilibiliPlatformEmoji(asset, includeHidden)
    while (!match && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      match = findUniqueBilibiliPlatformEmoji(asset, includeHidden)
    }
    return match
  }

  async function scanBilibiliEmojiPacks(input, asset, includeHidden = false) {
    if (platformId !== 'bilibili') return null
    const catalog = await loadBilibiliEmojiCatalog(input, includeHidden)
    const selected = selectUniqueBilibiliCatalogEntry(catalog.entries, asset)
    if (!selected) return null
    const panels = queryAllDeep([BILIBILI_EMOTICON_PANEL_SELECTOR])
    const panel = panels[selected.panelIndex]
    const tabs = panel ? Array.from(panel.querySelectorAll(BILIBILI_EMOTICON_TAB_SELECTOR)) : []
    const tab = tabs[selected.tabIndex]
    if (tab && typeof tab.click === 'function') {
      tab.click()
      await new Promise((resolve) => setTimeout(resolve, 180))
    }
    return waitForUniqueBilibiliPlatformEmoji(asset, 700, includeHidden)
  }

  async function loadBilibiliEmojiCatalog(input, includeHidden) {
    const roomKey = bilibiliEmojiCatalogRoomKey()
    if (
      state.bilibiliEmojiCatalog?.roomKey === roomKey &&
      state.bilibiliEmojiCatalog.entries.length > 0
    ) {
      return state.bilibiliEmojiCatalog
    }
    if (state.bilibiliEmojiCatalogBuild) return state.bilibiliEmojiCatalogBuild
    const build = buildBilibiliEmojiCatalog(input, includeHidden)
    state.bilibiliEmojiCatalogBuild = build
    try {
      const catalog = await build
      // An early content-script run can happen before Bilibili mounts the
      // editor/panel. Do not cache an empty result; the warmup retry can then
      // pick up the panel once the room has finished mounting.
      if (catalog.entries.length > 0) state.bilibiliEmojiCatalog = catalog
      return catalog
    } finally {
      if (state.bilibiliEmojiCatalogBuild === build) state.bilibiliEmojiCatalogBuild = null
    }
  }

  async function buildBilibiliEmojiCatalog(input, includeHidden) {
    const roomKey = bilibiliEmojiCatalogRoomKey()
    let panels = queryAllDeep([BILIBILI_EMOTICON_PANEL_SELECTOR])
    const toggle = findPlatformEmojiToggle(input, true)
    if (toggle && typeof toggle.click === 'function' && !panels.some((panel) => isVisible(panel))) {
      toggle.click()
      state.emojiPanelOpenedByPlugin = true
      await new Promise((resolve) => setTimeout(resolve, 180))
      panels = queryAllDeep([BILIBILI_EMOTICON_PANEL_SELECTOR])
    }

    const entries = []
    for (let panelIndex = 0; panelIndex < panels.length; panelIndex += 1) {
      const panel = panels[panelIndex]
      if (!(panel instanceof Element)) continue
      const tabs = Array.from(panel.querySelectorAll(BILIBILI_EMOTICON_TAB_SELECTOR))
      const candidates = tabs.length ? tabs : [null]
      for (let tabIndex = 0; tabIndex < candidates.length; tabIndex += 1) {
        const tab = candidates[tabIndex]
        if (tab && typeof tab.click === 'function') {
          tab.click()
          await new Promise((resolve) => setTimeout(resolve, 180))
        }
        const seenItems = new Set()
        platformEmojiItemCandidates(includeHidden).forEach((element) => {
          if (!panel.contains(element)) return
          const item = platformEmojiInteractiveItem(element)
          if (seenItems.has(item)) return
          seenItems.add(item)
          const descriptor = assetDescriptorFromElement(item)
          if (!descriptor) return
          const identity =
            descriptor.keys?.find((key) =>
              /^(?:native-panel|legacy-bilibili-exclusive|fragment|stem|file|path):/.test(key),
            ) ||
            descriptor.src ||
            descriptor.token ||
            `panel:${panelIndex}:tab:${tabIndex}:item:${seenItems.size}`
          entries.push({
            available: !isUnavailablePlatformEmojiItem(item),
            descriptor,
            identity,
            panelIndex,
            tabIndex,
            value: null,
          })
        })
      }
    }
    return {
      builtAt: Date.now(),
      entries,
      fingerprint: bilibiliEmojiPanelFingerprint(),
      roomKey,
    }
  }

  function bilibiliEmojiCatalogRoomKey() {
    const roomId = /^\/(\d+)/.exec(location.pathname)?.[1]
    return `${location.hostname}/${roomId || location.pathname.replace(/\/+$/, '') || '/'}`
  }

  function requestBilibiliEmoticonApi(request, timeout = 8000) {
    return new Promise((resolve) => {
      let settled = false
      const finish = (value) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(value)
      }
      const timer = setTimeout(
        () => finish({ ok: false, error: 'extension-response-timeout' }),
        timeout,
      )
      try {
        chrome.runtime.sendMessage({ type: BILIBILI_EMOTICON_MESSAGE, ...request }, (response) => {
          if (chrome.runtime.lastError) {
            finish({ ok: false, error: chrome.runtime.lastError.message })
            return
          }
          finish(response || { ok: false, error: 'empty-extension-response' })
        })
      } catch (error) {
        finish({ ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    })
  }

  async function loadBilibiliApiEmojiCatalog() {
    if (platformId !== 'bilibili') return null
    const roomKey = bilibiliEmojiCatalogRoomKey()
    if (state.bilibiliApiEmojiCatalog?.roomKey === roomKey) {
      return state.bilibiliApiEmojiCatalog
    }
    if (state.bilibiliApiEmojiCatalogBuild) return state.bilibiliApiEmojiCatalogBuild
    const build = (async () => {
      const response = await requestBilibiliEmoticonApi({ operation: 'catalog' })
      if (!response?.ok || !Array.isArray(response.emoticons)) {
        console.warn(
          '[bililive-danmaku-plus-one] Bilibili Emoji catalog API unavailable',
          String(response?.error || 'invalid-catalog-response'),
        )
        return null
      }
      const entries = response.emoticons.map((emoticon) => {
        const keys = new Set([
          `${NATIVE_PANEL_ASSET_KEY_PREFIX}${String(emoticon.emoticonUnique).toLowerCase()}`,
        ])
        ;[emoticon.url, emoticon.emoticonUnique, emoticon.emoji].forEach((value) => {
          normalizedRichAssetKeys(value, location.href).forEach((key) => keys.add(key))
        })
        return {
          available: true,
          descriptor: {
            keys: Array.from(keys).slice(0, 48),
            src: emoticon.url,
            token: normalizedEmojiToken(emoticon.emoji, 'emoji'),
          },
          identity: emoticon.emoticonUnique,
          value: emoticon,
        }
      })
      const catalog = { entries, roomKey }
      state.bilibiliApiEmojiCatalog = catalog
      return catalog
    })()
    state.bilibiliApiEmojiCatalogBuild = build
    try {
      return await build
    } finally {
      if (state.bilibiliApiEmojiCatalogBuild === build) {
        state.bilibiliApiEmojiCatalogBuild = null
      }
    }
  }

  async function resolveBilibiliApiEmoji(asset) {
    if (platformId !== 'bilibili' || !asset) return null
    const catalog = await loadBilibiliApiEmojiCatalog()
    return catalog ? selectUniqueBilibiliCatalogEntry(catalog.entries, asset) : null
  }

  function warmBilibiliApiEmojiCatalog() {
    if (platformId !== 'bilibili' || document.hidden || window.top !== window) return
    window.setTimeout(() => {
      void loadBilibiliApiEmojiCatalog().catch(() => null)
    }, 300)
  }

  function bilibiliEmojiPanelFingerprint() {
    return queryAllDeep([BILIBILI_EMOTICON_PANEL_SELECTOR])
      .map((panel) =>
        Array.from(panel.querySelectorAll(BILIBILI_EMOTICON_TAB_SELECTOR))
          .map((tab) => shared.normalizeWhitespace(tab.textContent))
          .join('|'),
      )
      .join('||')
  }

  async function openUniqueBilibiliPlatformEmoji(input, asset) {
    const includeHidden = fullscreenActive()
    let item =
      findUniqueBilibiliPlatformEmoji(asset) ||
      (includeHidden ? findUniqueBilibiliPlatformEmoji(asset, true) : null)
    if (item && assetMatchScore(item, asset) >= 4) return item
    if (item) {
      const scanned = await scanBilibiliEmojiPacks(input, asset, includeHidden)
      if (scanned) return scanned
    }
    const toggle = findPlatformEmojiToggle(input, includeHidden)
    if (toggle && typeof toggle.click === 'function') {
      toggle.click()
      state.emojiPanelOpenedByPlugin = true
      item = await waitForUniqueBilibiliPlatformEmoji(asset, 900, includeHidden)
      if (item) return item
      item = await scanBilibiliEmojiPacks(input, asset, includeHidden)
      if (item) return item
    }
    for (const category of platformEmojiCategoryCandidates(includeHidden)) {
      if (!category.isConnected || typeof category.click !== 'function') continue
      category.click()
      item = await waitForUniqueBilibiliPlatformEmoji(asset, 320, includeHidden)
      if (item) return item
    }
    item = await scanBilibiliEmojiPacks(input, asset, includeHidden)
    return item || findUniqueBilibiliPlatformEmoji(asset, true)
  }

  async function findPlatformEmojiAcrossCategories(asset) {
    let match = findMatchingPlatformEmoji(asset)
    if (match || platformId !== 'bilibili') return match

    for (const category of platformEmojiCategoryCandidates()) {
      if (!category.isConnected || typeof category.click !== 'function') continue
      category.click()
      match = await waitForPlatformEmoji(asset, 320)
      if (match) return match
    }

    // Some Bilibili builds keep every pack mounted and hide inactive packs
    // without exposing semantic tab markup. A programmatic click on the exact
    // hidden native item still runs Bilibili's own event handler.
    return findMatchingPlatformEmoji(asset, true)
  }

  async function openPlatformEmojiForAsset(input, asset) {
    let item = findMatchingPlatformEmoji(asset)
    if (item) return item
    const toggle = findPlatformEmojiToggle(input)
    if (toggle && typeof toggle.click === 'function') {
      toggle.click()
      state.emojiPanelOpenedByPlugin = true
      item = await waitForPlatformEmoji(asset, 900)
    }
    return item || findPlatformEmojiAcrossCategories(asset)
  }

  function countMatchingChatAssets(asset) {
    let count = 0
    queryAllDeep(config.messages)
      .slice(-120)
      .forEach((row) => {
        row.querySelectorAll('img').forEach((image) => {
          if (assetMatchScore(image, asset) >= 4) {
            count += 1
          }
        })
      })
    return count
  }

  function richInputFingerprint(input) {
    if (!input || !input.isConnected) {
      return ''
    }
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      return input.value
    }
    return `${input.textContent || ''}|${input.innerHTML || ''}`.slice(0, 4096)
  }

  function richInputIsEmpty(input) {
    if (!input || !input.isConnected) {
      return true
    }
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      return !shared.normalizeWhitespace(input.value)
    }
    if (shared.normalizeWhitespace(input.textContent)) {
      return false
    }
    try {
      return !input.querySelector(
        [
          'img',
          '[data-emoji]',
          '[data-emoji-id]',
          '[data-emoticon]',
          '[data-emoticon-id]',
          '[data-emoticon-unique]',
          "[class*='emoji' i]",
          "[class*='emoticon' i]",
        ].join(','),
      )
    } catch {
      return !richInputFingerprint(input)
    }
  }

  async function waitForPlatformEmojiResult(
    input,
    asset,
    previousCount,
    previousInput,
    clickedItem,
    clickedItemWasVisible,
    timeout,
  ) {
    const deadline = Date.now() + timeout
    let dispatchedAt = 0
    while (Date.now() < deadline) {
      if (countMatchingChatAssets(asset) > previousCount) {
        return 'sent'
      }
      if (richInputFingerprint(input) !== previousInput && !richInputIsEmpty(input)) {
        return 'inserted'
      }
      if (
        clickedItemWasVisible &&
        clickedItem &&
        (!clickedItem.isConnected || !isVisible(clickedItem))
      ) {
        if (!dispatchedAt) dispatchedAt = Date.now()
        // Bilibili closes its native Emoji panel before committing a delayed
        // insert into the editor. Keep observing that native update window.
        if (platformId !== 'bilibili' || Date.now() - dispatchedAt >= 600) {
          return 'dispatched'
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 60))
    }
    return 'none'
  }

  async function waitForPlatformEmojiSubmission(input, asset, previousCount, timeout) {
    const deadline = Date.now() + timeout
    let activeInput = input
    while (Date.now() < deadline) {
      if (countMatchingChatAssets(asset) > previousCount) {
        return { input: activeInput, sent: true }
      }
      if (!activeInput || !activeInput.isConnected) {
        activeInput = findInput()
      }
      if (activeInput && richInputIsEmpty(activeInput)) {
        return { input: activeInput, sent: true }
      }
      await new Promise((resolve) => setTimeout(resolve, 60))
    }
    return {
      input: activeInput,
      sent:
        countMatchingChatAssets(asset) > previousCount ||
        Boolean(activeInput && richInputIsEmpty(activeInput)),
    }
  }

  async function waitForPlatformSendButton(input, timeout) {
    const deadline = Date.now() + timeout
    let activeInput = input
    while (Date.now() < deadline) {
      if (!activeInput || !activeInput.isConnected) {
        activeInput = findInput()
      }
      if (activeInput) {
        const button = findSendButton(activeInput)
        if (button) {
          return { button, input: activeInput }
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    return { button: null, input: activeInput }
  }

  async function submitInsertedPlatformEmoji(input, asset, previousCount) {
    let activeInput = input
    let sendControl = await waitForPlatformSendButton(
      activeInput,
      platformId === 'bilibili' ? 900 : 300,
    )
    activeInput = sendControl.input || activeInput
    if (sendControl.button) {
      sendControl.button.click()
    } else if (activeInput) {
      pressEnter(activeInput)
    }

    let submission = await waitForPlatformEmojiSubmission(
      activeInput,
      asset,
      previousCount,
      platformId === 'bilibili' ? 1200 : 600,
    )
    if (submission.sent) {
      return submission
    }

    activeInput = submission.input || activeInput
    if (activeInput) {
      pressEnter(activeInput)
      submission = await waitForPlatformEmojiSubmission(activeInput, asset, previousCount, 700)
      if (submission.sent) {
        return submission
      }
    }

    activeInput = submission.input || activeInput
    sendControl = await waitForPlatformSendButton(activeInput, 500)
    activeInput = sendControl.input || activeInput
    if (sendControl.button) {
      sendControl.button.click()
      submission = await waitForPlatformEmojiSubmission(activeInput, asset, previousCount, 900)
    }
    return submission
  }

  async function repeatPlatformRichPayload(payload, options) {
    const unicodeFallback = unicodeEmojiFallbackText(payload)
    if (unicodeFallback) {
      return repeatMessage(unicodeFallback)
    }
    const initialBilibiliClassification =
      platformId === 'bilibili' ? classifyBilibiliRichPayload(payload) : null
    if (
      initialBilibiliClassification?.kind === 'inline-emoji-text' &&
      hasBilibiliInlineTextContent(payload)
    ) {
      return repeatMessage(initialBilibiliClassification.text)
    }
    const preferUniqueBilibiliPanelItem =
      platformId === 'bilibili' &&
      Boolean(options && options.preferUniqueBilibiliPanelItem) &&
      isSingleBilibiliEmojiPayload(payload)
    if (
      platformId === 'bilibili' &&
      payload &&
      Array.isArray(payload.assets) &&
      payload.assets.length
    ) {
      // Player-rendered inline Emoji frequently expose only image URLs. Resolve
      // every asset before classifying the payload so mixed text keeps all
      // bracket tokens in order and can never degrade to one panel click.
      await enrichRichPayloadAssetNames(payload, { resolveBilibiliNative: true })
    }
    const asset = payload && Array.isArray(payload.assets) ? payload.assets[0] : null
    const apiBilibiliEntry =
      platformId === 'bilibili' && asset ? await resolveBilibiliApiEmoji(asset) : null
    const preferredBilibiliPanelItem =
      !apiBilibiliEntry && preferUniqueBilibiliPanelItem && asset
        ? findUniqueBilibiliPlatformEmoji(asset, fullscreenActive()) ||
          (await openUniqueBilibiliPlatformEmoji(findBilibiliEmojiEditor() || findInput(), asset))
        : null
    const bilibiliSingleImagePayload = bilibiliFavoriteImagePayload(payload)
    const bilibiliClassification =
      platformId === 'bilibili' ? classifyBilibiliRichPayload(payload) : null
    if (
      bilibiliClassification &&
      (bilibiliClassification.kind === 'unicode-emoji-text' ||
        (bilibiliClassification.kind === 'inline-emoji-text' &&
          (hasBilibiliInlineTextContent(payload) || !preferredBilibiliPanelItem)))
    ) {
      return repeatMessage(bilibiliClassification.text)
    }
    if (bilibiliClassification?.kind === 'panel-emoji-mixed') {
      updateSendLog({ error: 'panel-emoji-mixed', method: 'not-attempted' })
      showToast(t('toastRoomEmojiMustBeSentAlone'), 'error')
      return false
    }
    if (
      platformId === 'bilibili' &&
      bilibiliClassification?.kind === 'unknown-image' &&
      !isSingleBilibiliEmojiPayload(payload)
    ) {
      updateSendLog({ error: 'mixed-emoji-assets-unresolved', method: 'not-attempted' })
      showToast(t('toastMixedEmojiUnresolved'), 'error')
      return false
    }
    const nativeBilibiliAsset =
      Boolean(apiBilibiliEntry || preferredBilibiliPanelItem) ||
      (platformId === 'bilibili' &&
        bilibiliClassification?.kind === 'panel-emoji-single' &&
        isBilibiliNativePanelAsset(asset))
    if (bilibiliSingleImagePayload && !nativeBilibiliAsset) {
      updateSendLog({ error: 'official-emoji-not-unique', method: 'not-attempted' })
      showToast(t('toastOfficialEmojiNotUnique', bilibiliSingleImagePayload.text), 'error')
      return false
    }
    const now = Date.now()
    if (now - state.lastActionAt < 700) {
      updateSendLog({ error: 'action-too-fast', method: 'not-attempted' })
      showToast(t('toastActionTooFast'), 'warning')
      return false
    }
    state.lastActionAt = now
    if (apiBilibiliEntry) {
      updateSendLog({
        method: 'page-context-api',
        resultContent: String(apiBilibiliEntry.descriptor.token || payload.text || ''),
      })
      const response = await requestBilibiliEmoticonApi(
        { emoticon: apiBilibiliEntry.value, operation: 'send' },
        7000,
      )
      if (response?.ok) {
        updateSendLog({ confirmation: 'page-api-confirmed', error: '' })
        showToast(t('toastImageEmojiSent'), 'success')
        return true
      }
      // Bilibili can temporarily reject the API route during a rollout. Keep
      // the verified native-panel path as a compatibility fallback.
      updateSendLog({ error: 'native-emoji-api-failed' })
    }
    const input = nativeBilibiliAsset ? findBilibiliEmojiEditor() || findInput() : findInput()
    if (!asset || !input) {
      updateSendLog({ error: 'image-resource-or-editor-not-found', method: 'not-attempted' })
      showToast(t('toastImageResourceNotFound', platformName), 'error')
      return false
    }
    const item =
      preferredBilibiliPanelItem ||
      (nativeBilibiliAsset
        ? await openUniqueBilibiliPlatformEmoji(input, asset)
        : await openPlatformEmojiForAsset(input, asset))
    if (!item || typeof item.click !== 'function') {
      updateSendLog({ error: 'emoji-panel-no-match', method: 'not-attempted' })
      showToast(t('toastEmojiPanelNoMatch', platformName), 'error')
      return false
    }
    enrichRichPayloadAsset(payload, 0, item)
    const previousCount = countMatchingChatAssets(asset)
    const beforeInput = richInputFingerprint(input)
    const itemWasVisible = isVisible(item)
    updateSendLog({
      method: 'native-emoji-panel',
      resultContent: String(asset.token || payload.text || ''),
    })
    item.click()
    const resultTimeout = platformId === 'bilibili' ? 2400 : 900
    let result = await waitForPlatformEmojiResult(
      input,
      asset,
      previousCount,
      beforeInput,
      item,
      itemWasVisible,
      resultTimeout,
    )
    if (result === 'inserted' && richInputFingerprint(input) !== beforeInput) {
      const submission = await submitInsertedPlatformEmoji(input, asset, previousCount)
      result = submission.sent ? 'sent' : 'none'
    }
    if (result === 'none' && platformId !== 'bilibili') {
      const button = findSendButton(input)
      if (button) {
        button.click()
        result = await waitForPlatformEmojiResult(
          input,
          asset,
          previousCount,
          beforeInput,
          item,
          itemWasVisible,
          900,
        )
      }
    }
    if (result !== 'sent') {
      updateSendLog({ error: 'native-panel-send-unconfirmed' })
      showToast(t('toastImageUnconfirmed', platformName), 'error')
      return false
    }
    releaseInputFocus(input)
    updateSendLog({ confirmation: 'native-panel-confirmed', error: '' })
    showToast(t('toastImageEmojiSent'), 'success')
    return true
  }

  function bilibiliFavoriteImagePayload(payload) {
    if (platformId !== 'bilibili' || !payload) return null
    const assets = Array.isArray(payload.assets) ? payload.assets : []
    if (assets.length > 1) return null
    const asset = assets[0] || null
    const token = shared.normalizeWhitespace((asset && asset.token) || payload.text)
    if (!/^\[[^\]\n]{1,40}\]$/.test(token)) return null

    if (Array.isArray(payload.parts) && payload.parts.length) {
      const meaningfulParts = payload.parts.filter((part) => {
        if (!part || typeof part !== 'object') return false
        if (part.type === 'emoji') return true
        return part.type === 'text' && Boolean(shared.normalizeWhitespace(part.text))
      })
      const isSingleEmojiPart =
        meaningfulParts.length === 1 &&
        (meaningfulParts[0].type === 'emoji' ||
          (assets.length === 0 &&
            meaningfulParts[0].type === 'text' &&
            shared.normalizeWhitespace(meaningfulParts[0].text) === token))
      if (!isSingleEmojiPart) return null
    }

    const runtimeAsset = asset || {
      keys: normalizedRichAssetKeys(token, location.href),
      src: '',
      token,
    }
    return {
      ...payload,
      assets: [runtimeAsset],
      parts: [{ asset: runtimeAsset, type: 'emoji' }],
      plainText: '',
      text: token,
    }
  }

  function markBilibiliPayloadAsNativePanel(payload, item) {
    markBilibiliPayloadAssetAsNativePanel(payload, 0, item)
  }

  function markBilibiliPayloadAssetAsNativePanel(payload, assetIndex, item) {
    enrichRichPayloadAsset(payload, assetIndex, item)
    const asset = payload && Array.isArray(payload.assets) ? payload.assets[assetIndex] : null
    if (!asset || isBilibiliNativePanelAsset(asset)) return
    const identity = shared
      .normalizeWhitespace(asset.token || asset.src || 'resolved')
      .toLowerCase()
      .slice(0, 180)
    const marker = `${NATIVE_PANEL_ASSET_KEY_PREFIX}resolved:${identity}`
    asset.keys = Array.from(
      new Set([marker, ...(Array.isArray(asset.keys) ? asset.keys : [])]),
    ).slice(0, 48)
    const emojiPart = Array.isArray(payload.parts)
      ? payload.parts.filter((part) => part && part.type === 'emoji' && part.asset)[assetIndex]
      : null
    if (emojiPart && emojiPart.asset !== asset) {
      emojiPart.asset.keys = Array.from(
        new Set([marker, ...(Array.isArray(emojiPart.asset.keys) ? emojiPart.asset.keys : [])]),
      ).slice(0, 48)
    }
  }

  async function repeatBilibiliFavoritePayload(payload) {
    const logEntry = beginSendLog('favorite', payload?.text || '', payload)
    let success = false
    let failure = ''
    try {
      const imagePayload = bilibiliFavoriteImagePayload(payload)
      if (!imagePayload) {
        success = await (payload.assets.length
          ? repeatPlatformRichPayload(payload)
          : repeatMessage(payload.text))
        return success
      }
      if (imagePayload.assets.some(isBilibiliNativePanelAsset)) {
        success = await repeatPlatformRichPayload(imagePayload)
        return success
      }

      const input = findBilibiliEmojiEditor() || findInput()
      if (!input) {
        failure = 'editor-not-found'
        updateSendLog({ error: failure })
        showToast(t('toastEditorNotFound', platformName), 'error')
        return false
      }
      const item = await openUniqueBilibiliPlatformEmoji(input, imagePayload.assets[0])
      if (!item) {
        failure = 'official-emoji-not-found'
        updateSendLog({ error: failure })
        showToast(t('toastOfficialEmojiNotFound', imagePayload.text), 'error')
        return false
      }
      markBilibiliPayloadAsNativePanel(imagePayload, item)
      success = await repeatPlatformRichPayload(imagePayload)
      return success
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      persistSendLog(logEntry, success, failure)
    }
  }

  async function repeatMessage(message) {
    const now = Date.now()
    if (state.sendInProgress || now - state.lastActionAt < 700) {
      updateSendLog({ error: 'action-too-fast', method: 'not-attempted', resultContent: message })
      showToast(t('toastActionTooFast'), 'warning')
      return false
    }
    state.lastActionAt = now
    state.sendInProgress = true
    state.ui?.setSending(true)

    try {
      // Bilibili's fullscreen editors are mounted lazily and reject synthetic
      // key events in several player variants. Send plain text through the
      // site's authenticated page context first while fullscreen is active.
      if (fullscreenActive() && (await sendBilibiliViaPageContext(message))) {
        updateSendLog({
          confirmation: 'page-api-confirmed',
          error: '',
          method: 'page-context-api',
          resultContent: message,
        })
        showToast(t('toastPlusOneSent'), 'success')
        return true
      }

      const input = findInput()
      if (!input) {
        updateSendLog({
          error: 'editor-not-found',
          method: 'not-attempted',
          resultContent: message,
        })
        showToast(t('toastEditorNotFound', platformName), 'error')
        return false
      }

      setNativeValue(input, message)
      await new Promise((resolve) => setTimeout(resolve, 80))
      let button = findSendButton(input)

      if (button) {
        updateSendLog({ method: 'editor-button', resultContent: message })
        button.click()
      } else {
        updateSendLog({ method: 'editor-enter', resultContent: message })
        pressEnter(input)
      }

      // Live sites occasionally replace or temporarily disable their send
      // control after the editor updates. Do not report success merely because a
      // stale button accepted click(); a successful send consumes the editor.
      let consumed = await waitForInputConsumption(input, message, 320)
      if (!consumed) {
        updateSendLog({ error: 'editor-content-not-consumed' })
        pressEnter(input)
        consumed = await waitForInputConsumption(input, message, 260)
      }

      // Re-query after the framework has processed the input event. Bilibili in
      // particular may mount an enabled send control only after that update.
      if (!consumed) {
        button = findSendButton(input)
        if (button) {
          button.click()
          consumed = await waitForInputConsumption(input, message, 320)
        }
      }

      if (!consumed) {
        showToast(t('toastAutomaticSendFailed'), 'error')
        return false
      }

      releaseInputFocus(input)
      updateSendLog({ confirmation: 'editor-consumed', error: '' })
      showToast(t('toastPlusOneSent'), 'success')
      return true
    } finally {
      state.sendInProgress = false
      state.ui?.setSending(false)
    }
  }

  function sendBilibiliViaPageContext(message) {
    return new Promise((resolve) => {
      let settled = false
      const finish = (success) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(success)
      }
      const timer = setTimeout(() => finish(false), 5000)
      try {
        chrome.runtime.sendMessage({ type: BILIBILI_SEND_MESSAGE, message }, (response) => {
          if (chrome.runtime.lastError) {
            finish(false)
            return
          }
          finish(Boolean(response?.ok))
        })
      } catch {
        finish(false)
      }
    })
  }

  function onPlusOneClick(event) {
    event.preventDefault()
    event.stopPropagation()
    if (!visibleActionsForSurface(state.settings, platformId, state.candidateKind).plusOne) {
      return
    }
    const message = state.message
    const richPayload = state.richPayload
    const source = state.candidateKind || 'unknown'
    const logEntry = beginSendLog(source, message, richPayload)
    diagnostics.record({ type: 'action.plus-one', stage: state.candidateKind || 'unknown' })
    const sendOperation =
      richPayload && richPayload.assets.length
        ? repeatPlatformRichPayload(richPayload, {
            preferUniqueBilibiliPanelItem:
              state.candidateKind === 'overlay' &&
              isBilibiliExplicitPanelOnlyPayload(state.candidate, richPayload),
          })
        : message
          ? repeatMessage(message)
          : null
    // The send operation has captured its payload. Release the frozen clone
    // and resume the original animation immediately so the next danmaku can
    // be selected without waiting for hover timers or moving off the toolbar.
    clearSelection()
    if (!sendOperation) {
      persistSendLog(logEntry, false, 'empty-message')
      return
    }
    void Promise.resolve(sendOperation).then(
      (success) => persistSendLog(logEntry, Boolean(success)),
      (error) =>
        persistSendLog(logEntry, false, error instanceof Error ? error.message : String(error)),
    )
  }

  function onPointerOver(event) {
    if (!isEnabled()) {
      return
    }

    const path = event.composedPath ? event.composedPath() : [event.target]
    if (isOwned(event.target)) {
      cancelHide()
      return
    }

    if (
      isInsideFrozenHoverZone(event.clientX, event.clientY) ||
      isInsideChatHoverZone(event.clientX, event.clientY)
    ) {
      cancelHide()
      return
    }

    if (
      !pathInsideEnabledBilibiliSurface(path) ||
      pathTouchesBilibiliQuickInput(path) ||
      pathTouchesBilibiliChatActions(path) ||
      pathTouchesBilibiliChatAdvertisement(path)
    ) {
      if (state.candidate) clearSelection()
      return
    }

    const found = findCandidate(path)
    if (found && found.element !== state.candidate) {
      selectCandidate(found.element, found.kind)
    } else if (!found && platformId === 'bilibili') {
      const elements = document.elementsFromPoint(event.clientX, event.clientY)
      const pointFound = findCandidate(elements)
      if (pointFound && pointFound.kind === 'overlay' && pointFound.element !== state.candidate) {
        selectCandidate(pointFound.element, pointFound.kind)
      }
    }
  }

  function restoreBilibiliQuickBars(event, force) {
    if (platformId !== 'bilibili') {
      return
    }
    if (event && !event.isTrusted) {
      return
    }

    const path = event ? (event.composedPath ? event.composedPath() : [event.target]) : []
    const elements = path.filter((item) => item instanceof Element).slice(0, 8)
    const marker = elements.map(elementMarker).join(' ')
    const targetsQuickInput = elements.some((element) => isBilibiliQuickInputRegion(element))
    const keyboardOpensQuickInput = Boolean(
      event && event.type === 'keydown' && event.key === 'Enter' && fullscreenActive(),
    )
    const markerRequestsQuickInput =
      /(?:danmaku|danmu|dm)[-_ ]?(?:input|send)|(?:input|send)[-_ ]?(?:danmaku|danmu|dm)|弹幕|快捷(?:输入|发送)|发送|send|input/i.test(
        marker,
      )
    const requestsQuickInput =
      targetsQuickInput || keyboardOpensQuickInput || markerRequestsQuickInput

    if (event && !requestsQuickInput) {
      return
    }
    if (event) {
      // A real user interaction takes ownership of the native editor. Cancel
      // all delayed blur/hide callbacks left by the previous +1 operation.
      state.bilibiliDismissToken += 1
    }
    if (!state.hiddenBilibiliQuickBars.size) {
      return
    }

    const now = Date.now()
    for (const [container, saved] of state.hiddenBilibiliQuickBars) {
      if (!event && !force && now - saved.hiddenAt < 500) {
        continue
      }
      if (container.isConnected) {
        for (const property of ['display', 'visibility', 'opacity', 'pointer-events']) {
          const style = saved.styles && saved.styles[property]
          if (style && style.value) {
            container.style.setProperty(property, style.value, style.priority)
          } else {
            container.style.removeProperty(property)
          }
        }
      }
      state.hiddenBilibiliQuickBars.delete(container)
    }
  }

  function onPointerMove(event) {
    if (!isEnabled()) {
      return
    }

    if (isOwned(event.target)) {
      cancelHide()
      return
    }

    state.pointerX = event.clientX
    state.pointerY = event.clientY

    if (isInsideChatHoverZone(state.pointerX, state.pointerY)) {
      cancelHide()
      return
    }

    // A long frozen danmaku can extend beyond the player bounds. Keep the
    // selection while the pointer is still over that exact snapshot so its
    // action bar remains reachable outside the video rectangle.
    if (
      state.candidateKind === 'overlay' &&
      state.frozenClone &&
      state.frozenClone.isConnected &&
      isInsideFrozenHoverZone(state.pointerX, state.pointerY)
    ) {
      cancelHide()
      return
    }

    const path = event.composedPath ? event.composedPath() : [event.target]
    if (
      !pathInsideEnabledBilibiliSurface(path) ||
      pathTouchesBilibiliQuickInput(path) ||
      pathTouchesBilibiliChatActions(path) ||
      pathTouchesBilibiliChatAdvertisement(path)
    ) {
      if (state.candidate) clearSelection()
      return
    }

    if (state.candidateKind === 'overlay' && state.frozenClone && state.frozenClone.isConnected) {
      scheduleHide()
      return
    }

    if (state.pointerFrame) {
      return
    }

    state.pointerFrame = requestAnimationFrame(() => {
      state.pointerFrame = 0
      const candidate = findOverlayAtPoint(state.pointerX, state.pointerY)
      if (candidate) {
        cancelHide()
        if (candidate !== state.candidate) {
          selectCandidate(candidate, 'overlay')
        }
      } else if (state.candidateKind === 'overlay') {
        scheduleHide()
      }
    })
  }

  function onPointerOut(event) {
    if (!state.candidate) {
      return
    }

    const next = event.relatedTarget
    if (next && (state.candidate.contains(next) || isOwned(next))) {
      return
    }

    if (
      isInsideFrozenHoverZone(event.clientX, event.clientY) ||
      isInsideChatHoverZone(event.clientX, event.clientY)
    ) {
      cancelHide()
      return
    }

    const path = event.composedPath ? event.composedPath() : [event.target]
    if (path.includes(state.candidate)) {
      scheduleHide()
    }
  }

  function onAltClick(event) {
    if (
      !isEnabled() ||
      !state.settings.actions.plusOne ||
      !state.settings.altClick ||
      !event.altKey ||
      isOwned(event.target)
    ) {
      return
    }

    const path = event.composedPath ? event.composedPath() : [event.target]
    if (
      !pathInsideEnabledBilibiliSurface(path) ||
      pathTouchesBilibiliQuickInput(path) ||
      pathTouchesBilibiliChatActions(path) ||
      pathTouchesBilibiliChatAdvertisement(path)
    ) {
      return
    }
    let found = findCandidate(path)
    if (!found) {
      const overlay = findOverlayAtPoint(event.clientX, event.clientY)
      found = overlay ? { element: overlay, kind: 'overlay' } : null
    }
    if (!found || !selectCandidate(found.element, found.kind, true)) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    const message = state.message
    const richPayload = state.richPayload
    const logEntry = beginSendLog('alt-click', message, richPayload)
    clearSelection()
    void repeatMessage(message).then(
      (success) => persistSendLog(logEntry, success),
      (error) =>
        persistSendLog(logEntry, false, error instanceof Error ? error.message : String(error)),
    )
  }

  function onViewportChange() {
    if (state.candidateKind === 'chat') {
      updateButtonPosition()
      return
    }
    requestAnimationFrame(updateButtonPosition)
  }

  function onDiagnosticsMessage(message, _sender, sendResponse) {
    if (!message || message.type !== 'danmaku-echo.diagnostics.snapshot') return false
    sendResponse({ ok: true, snapshot: diagnostics.snapshot() })
    return false
  }

  function onStorageChanged(_changes, areaName) {
    if (areaName === 'sync') {
      storageGet().then(applySettings)
    }
  }

  function releaseTransientResources() {
    clearSelection()
    if (state.hideTimer) clearTimeout(state.hideTimer)
    if (state.senderScanTimer) clearTimeout(state.senderScanTimer)
    if (state.pointerFrame) cancelAnimationFrame(state.pointerFrame)
    state.hideTimer = 0
    state.senderScanTimer = 0
    state.pointerFrame = 0
    state.senderObserver?.disconnect()
    state.senderObserver = null
    state.senderCorrelation.clear()
    state.roots = [document]
    state.rootsCachedAt = 0
    state.bilibiliOverlayCandidates = []
    state.bilibiliOverlayCandidatesCachedAt = 0
    platformAdapter.cleanup()
  }

  function invalidateDomDiscoveryCaches() {
    state.roots = [document]
    state.rootsCachedAt = 0
    state.bilibiliOverlayCandidates = []
    state.bilibiliOverlayCandidatesCachedAt = 0
  }

  function onVisibilityChange() {
    if (document.hidden) {
      releaseTransientResources()
    } else {
      startSenderObserver()
    }
  }

  function resumeRuntime(stage) {
    invalidateDomDiscoveryCaches()
    ensureButton()
    startSenderObserver()
    scheduleSenderCacheScan(0)
    diagnostics.record({ type: 'runtime.resumed', stage })
  }

  function onPageHide(event) {
    if (event && event.persisted) {
      releaseTransientResources()
      diagnostics.record({ type: 'runtime.suspended', stage: 'bfcache' })
      return
    }
    destroyRuntime()
  }

  function onPageShow(event) {
    if (event && event.persisted) {
      resumeRuntime('bfcache')
    }
  }

  function destroyRuntime() {
    releaseTransientResources()
    state.favoritesRuntime?.destroy()
    state.ui?.destroy()
    document.removeEventListener('pointerover', onPointerOver, true)
    document.removeEventListener('pointermove', onPointerMove, true)
    document.removeEventListener('pointerout', onPointerOut, true)
    document.removeEventListener('click', onAltClick, true)
    document.removeEventListener('pointerdown', restoreBilibiliQuickBars, true)
    document.removeEventListener('keydown', restoreBilibiliQuickBars, true)
    document.removeEventListener('fullscreenchange', onFullscreenChange, true)
    document.removeEventListener('webkitfullscreenchange', onFullscreenChange, true)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    removeEventListener('pagehide', onPageHide)
    removeEventListener('pageshow', onPageShow)
    removeEventListener('scroll', onViewportChange, true)
    removeEventListener('resize', onViewportChange)
    chrome.runtime.onMessage.removeListener(onDiagnosticsMessage)
    chrome.storage.onChanged.removeListener(onStorageChanged)
    globalThis.__bulletPlusOneLoaded = false
  }

  function onFullscreenChange() {
    restoreBilibiliQuickBars(null)
    ensurePortal()
    requestAnimationFrame(updateButtonPosition)
  }

  function applySettings(saved) {
    state.settings = shared.mergeSettings(saved)
    shared.applyPlatformColors(document.documentElement, state.settings.colors[platformId])
    renderActionBar()
    if (!isEnabled()) {
      clearSelection()
    }
  }

  function startSenderObserver() {
    if (state.senderObserver || !document.documentElement) return
    state.senderObserver = new MutationObserver((mutations) => {
      const playerStructureChanged = mutations.some((mutation) =>
        Array.from(mutation.addedNodes || []).some((node) => {
          if (!(node instanceof Element)) return false
          if (matchesAny(node, config.videoRoots)) return true
          try {
            return Boolean(node.querySelector(config.videoRoots.join(',')))
          } catch {
            return false
          }
        }),
      )
      if (playerStructureChanged) {
        invalidateDomDiscoveryCaches()
        ensurePortal()
        diagnostics.record({ type: 'runtime.player-remounted', stage: 'mutation' })
      }
      const relevant = mutations.some((mutation) => {
        const target =
          mutation.target instanceof Element
            ? mutation.target
            : mutation.target && mutation.target.parentElement
        if (target && isInsideBilibiliPlayerOutsideChat(target)) {
          return false
        }
        if (
          target &&
          (closestMatching(target, config.chatRoots) ||
            closestMatching(target, config.messages) ||
            closestMatching(target, config.overlayMessages))
        ) {
          return true
        }
        return Array.from(mutation.addedNodes || []).some((node) => {
          if (!(node instanceof Element)) return false
          if (isInsideBilibiliPlayerOutsideChat(node)) return false
          if (
            matchesAny(node, config.chatRoots) ||
            matchesAny(node, config.messages) ||
            matchesAny(node, config.overlayMessages)
          )
            return true
          try {
            return Boolean(
              node.querySelector(
                [...config.chatRoots, ...config.messages, ...config.overlayMessages].join(','),
              ),
            )
          } catch {
            return false
          }
        })
      })
      if (relevant) {
        scheduleSenderCacheScan(40)
      }
    })
    const observerOptions = {
      childList: true,
      subtree: true,
      characterData: true,
    }
    state.senderObserver.observe(document.documentElement, observerOptions)
    scheduleSenderCacheScan(0)
    warmBilibiliApiEmojiCatalog()
  }

  storageGet().then(applySettings)
  ensureButton()
  startSenderObserver()
  warmBilibiliApiEmojiCatalog()
  state.favoritesRuntime = createFavoritesRuntime({
    enabled: () => isEnabled() && state.settings.actions.favorite,
    maxMessageLength: config.maxLength,
    platform: platformId,
    sendFavorite: repeatBilibiliFavoritePayload,
    showToast,
  })
  document.addEventListener('pointerover', onPointerOver, true)
  document.addEventListener('pointermove', onPointerMove, true)
  document.addEventListener('pointerout', onPointerOut, true)
  document.addEventListener('click', onAltClick, true)
  document.addEventListener('pointerdown', restoreBilibiliQuickBars, true)
  document.addEventListener('keydown', restoreBilibiliQuickBars, true)
  document.addEventListener('fullscreenchange', onFullscreenChange, true)
  document.addEventListener('webkitfullscreenchange', onFullscreenChange, true)
  document.addEventListener('visibilitychange', onVisibilityChange)
  addEventListener('pagehide', onPageHide)
  addEventListener('pageshow', onPageShow)
  addEventListener('scroll', onViewportChange, true)
  addEventListener('resize', onViewportChange, { passive: true })
  chrome.runtime.onMessage.addListener(onDiagnosticsMessage)

  if (globalThis.chrome && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(onStorageChanged)
  }
})()
