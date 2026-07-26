export const DOUYU_NATIVE_DANMAKU_ACTION_MARKER = 'data-bcp-douyu-native-action-hidden'

export const DOUYU_NATIVE_DANMAKU_ACTION_SELECTORS = [
  "[class*='interactive-element-']",
  "[class*='reply-button-']",
  "[class*='action-button-']",
  "[data-action='plus-one' i]",
  "[data-action='plusOne' i]",
  "[data-action='reply' i]",
  "[data-action='collect' i]",
  "[data-action='favorite' i]",
  "[aria-label='+1']",
  "[aria-label='回复']",
  "[aria-label='收藏']",
  "[title='+1']",
  "[title='回复']",
  "[title='收藏']",
] as const

export const DOUYU_NATIVE_DANMAKU_CAPSULE_CONTAINER_SELECTORS = [
  ":is(div, span):not([class*='danmuItem-']):has(> [class*='interactive-element-']):has(> [class*='reply-button-'])",
  ":is(div, span):not([class*='danmuItem-']):has(> [class*='interactive-element-']):has(> [class*='action-button-'])",
  ":is(div, span):not([class*='danmuItem-']):has(> [class*='reply-button-']):has(> [class*='action-button-'])",
] as const

const ACTION_LABELS = new Set(['+1', '回复', '收藏'])
const DANMAKU_ITEM_SELECTOR = "[class*='danmuItem-']"
const ACTION_KIND_SELECTORS = {
  plusOne: [
    "[class*='interactive-element-']",
    "[data-action='plus-one' i]",
    "[data-action='plusOne' i]",
    "[aria-label='+1']",
    "[title='+1']",
  ],
  reply: [
    "[class*='reply-button-']",
    "[data-action='reply' i]",
    "[aria-label='回复']",
    "[title='回复']",
  ],
  favorite: [
    "[class*='action-button-']",
    "[data-action='collect' i]",
    "[data-action='favorite' i]",
    "[aria-label='收藏']",
    "[title='收藏']",
  ],
} as const
const HIDDEN_STYLE_PROPERTIES = ['display', 'visibility', 'pointer-events'] as const

interface InlineStyleSnapshot {
  priority: string
  value: string
}

interface VisibilitySnapshot {
  ariaHidden: string | null
  hidden: string | null
  styles: Record<(typeof HIDDEN_STYLE_PROPERTIES)[number], InlineStyleSnapshot>
}

function readInlineStyle(
  element: HTMLElement,
  property: (typeof HIDDEN_STYLE_PROPERTIES)[number],
): InlineStyleSnapshot {
  return {
    priority: element.style.getPropertyPriority(property),
    value: element.style.getPropertyValue(property),
  }
}

function restoreInlineStyle(
  element: HTMLElement,
  property: (typeof HIDDEN_STYLE_PROPERTIES)[number],
  snapshot: InlineStyleSnapshot,
): void {
  if (snapshot.value) {
    element.style.setProperty(property, snapshot.value, snapshot.priority)
  } else {
    element.style.removeProperty(property)
  }
}

function setAttributeValue(element: HTMLElement, name: string, value: string | null): void {
  if (value === null) {
    element.removeAttribute(name)
  } else {
    element.setAttribute(name, value)
  }
}

function captureVisibility(element: HTMLElement): VisibilitySnapshot {
  return {
    ariaHidden: element.getAttribute('aria-hidden'),
    hidden: element.getAttribute('hidden'),
    styles: {
      display: readInlineStyle(element, 'display'),
      visibility: readInlineStyle(element, 'visibility'),
      'pointer-events': readInlineStyle(element, 'pointer-events'),
    },
  }
}

function forceHidden(element: HTMLElement): void {
  if (!element.hidden) element.hidden = true
  if (element.getAttribute('aria-hidden') !== 'true') {
    element.setAttribute('aria-hidden', 'true')
  }
  if (element.getAttribute(DOUYU_NATIVE_DANMAKU_ACTION_MARKER) !== 'true') {
    element.setAttribute(DOUYU_NATIVE_DANMAKU_ACTION_MARKER, 'true')
  }
  for (const property of HIDDEN_STYLE_PROPERTIES) {
    const expected =
      property === 'pointer-events' ? 'none' : property === 'display' ? 'none' : 'hidden'
    if (
      element.style.getPropertyValue(property) !== expected ||
      element.style.getPropertyPriority(property) !== 'important'
    ) {
      element.style.setProperty(property, expected, 'important')
    }
  }
}

/**
 * Applies a reversible, v-show-like visibility state directly to Douyu's
 * native action component. The controller retains the original inline state
 * so enabling the setting restores exactly what Douyu rendered.
 */
export class DouyuNativeCapsuleVisibilityController {
  private readonly snapshots = new Map<HTMLElement, VisibilitySnapshot>()

  get hiddenCount(): number {
    return this.snapshots.size
  }

  hide(targets: Iterable<Element>): void {
    for (const target of targets) {
      if (!(target instanceof HTMLElement)) continue
      if (!this.snapshots.has(target)) {
        this.snapshots.set(target, captureVisibility(target))
      }
      forceHidden(target)
    }
  }

  reinforce(): void {
    for (const target of this.snapshots.keys()) {
      forceHidden(target)
    }
  }

  releaseDisconnected(): void {
    for (const [target, snapshot] of this.snapshots) {
      if (target.isConnected) continue
      this.restore(target, snapshot)
      this.snapshots.delete(target)
    }
  }

  showAll(): void {
    for (const [target, snapshot] of this.snapshots) {
      this.restore(target, snapshot)
    }
    this.snapshots.clear()
  }

  private restore(target: HTMLElement, snapshot: VisibilitySnapshot): void {
    setAttributeValue(target, 'hidden', snapshot.hidden)
    setAttributeValue(target, 'aria-hidden', snapshot.ariaHidden)
    target.removeAttribute(DOUYU_NATIVE_DANMAKU_ACTION_MARKER)
    for (const property of HIDDEN_STYLE_PROPERTIES) {
      restoreInlineStyle(target, property, snapshot.styles[property])
    }
  }
}

function actionLabel(element: Element): string {
  const value = String(element.textContent || '')
    .replace(/[\s|｜·•]/gu, '')
    .trim()
  return ACTION_LABELS.has(value) ? value : ''
}

function actionLabelsWithin(element: Element): Set<string> {
  const labels = new Set<string>()
  for (const candidate of [element, ...element.querySelectorAll('*')]) {
    const label = actionLabel(candidate)
    if (label) labels.add(label)
  }
  return labels
}

function actionKind(element: Element): keyof typeof ACTION_KIND_SELECTORS | '' {
  for (const [kind, selectors] of Object.entries(ACTION_KIND_SELECTORS)) {
    if (selectors.some((selector) => element.matches(selector))) {
      return kind as keyof typeof ACTION_KIND_SELECTORS
    }
  }
  return ''
}

function actionKindsWithin(element: Element): Set<keyof typeof ACTION_KIND_SELECTORS> {
  const kinds = new Set<keyof typeof ACTION_KIND_SELECTORS>()
  const candidates = [
    element,
    ...element.querySelectorAll(DOUYU_NATIVE_DANMAKU_ACTION_SELECTORS.join(',')),
  ]
  for (const candidate of candidates) {
    const kind = actionKind(candidate)
    if (kind) kinds.add(kind)
  }
  return kinds
}

function closestMultiActionContainer(root: Element, element: Element): Element | null {
  let current = element.parentElement
  while (current) {
    // The renderer itself contains the actual danmaku text. It must never be
    // hidden merely because Douyu mounted action controls directly beneath it.
    if (current.matches(DANMAKU_ITEM_SELECTOR)) return null
    if (actionKindsWithin(current).size >= 2 || actionLabelsWithin(current).size >= 2) {
      return current
    }
    if (current === root) break
    current = current.parentElement
  }
  return null
}

export function findDouyuNativeDanmakuCapsuleTargets(root: Element): Element[] {
  const targets = new Set<Element>()
  const actionSelector = DOUYU_NATIVE_DANMAKU_ACTION_SELECTORS.join(',')
  const actionElements = [
    ...(root.matches(actionSelector) ? [root] : []),
    ...root.querySelectorAll(actionSelector),
  ]
  for (const element of actionElements) {
    targets.add(element)
    const container = closestMultiActionContainer(root, element)
    if (container) targets.add(container)
  }

  const labelElements = [root, ...root.querySelectorAll('*')].filter((element) =>
    Boolean(actionLabel(element)),
  )
  for (const element of labelElements) {
    const container = closestMultiActionContainer(root, element)
    if (container) targets.add(container)
  }

  return Array.from(targets)
}
