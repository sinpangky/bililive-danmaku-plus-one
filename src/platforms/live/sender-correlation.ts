import { normalizeSenderName } from '../../core/reply'

export interface SenderCorrelationHints {
  ids?: readonly unknown[]
  now?: number
  observedAt?: number
}

interface SenderObservation {
  at: number
  ids: string[]
  keys: string[]
  sender: string
}

const DEFAULT_TTL = 10 * 60_000
const DEFAULT_LIMIT = 480

function values(value: unknown | readonly unknown[]): unknown[] {
  return Array.isArray(value) ? value : [value]
}

export function senderMessageKey(value: unknown): string {
  return String(value == null ? '' : value)
    .replace(/[\u200B\u200C\u2060\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, '')
    .trim()
    .toLocaleLowerCase()
}

function messageKeys(input: unknown | readonly unknown[]): string[] {
  return Array.from(new Set(values(input).map(senderMessageKey).filter(Boolean)))
}

function idKeys(input: readonly unknown[] | undefined): string[] {
  return Array.from(
    new Set(
      (input || [])
        .map((value) => String(value == null ? '' : value).trim())
        .filter((value) => value && value.length <= 160),
    ),
  )
}

export class SenderCorrelationCache {
  private entries: SenderObservation[] = []

  constructor(
    private readonly ttl = DEFAULT_TTL,
    private readonly limit = DEFAULT_LIMIT,
  ) {}

  remember(
    messages: unknown | readonly unknown[],
    senderValue: unknown,
    hints: SenderCorrelationHints = {},
  ): string {
    const sender = normalizeSenderName(senderValue)
    const keys = messageKeys(messages)
    const ids = idKeys(hints.ids)
    if (!sender || (!keys.length && !ids.length)) {
      return ''
    }
    const now = Number.isFinite(hints.now) ? Number(hints.now) : Date.now()
    const at = Number.isFinite(hints.observedAt) ? Number(hints.observedAt) : now
    this.prune(now)
    this.entries.push({ at, ids, keys, sender })
    if (this.entries.length > this.limit) {
      this.entries.splice(0, this.entries.length - this.limit)
    }
    return sender
  }

  resolve(messages: unknown | readonly unknown[], hints: SenderCorrelationHints = {}): string {
    const keys = messageKeys(messages)
    const ids = idKeys(hints.ids)
    if (!keys.length && !ids.length) {
      return ''
    }
    const now = Number.isFinite(hints.now) ? Number(hints.now) : Date.now()
    const observedAt = Number.isFinite(hints.observedAt) ? Number(hints.observedAt) : 0
    this.prune(now)

    let best: SenderObservation | null = null
    let bestScore = -Infinity
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      const entry = this.entries[index]
      let score = -Infinity
      if (ids.some((id) => entry.ids.includes(id))) {
        score = 1800
      } else if (keys.some((key) => entry.keys.includes(key))) {
        score = 1100
      } else {
        for (const expected of keys) {
          for (const actual of entry.keys) {
            const shorter = Math.min(expected.length, actual.length)
            if (shorter >= 4 && (expected.includes(actual) || actual.includes(expected))) {
              score = Math.max(
                score,
                650 + (shorter / Math.max(expected.length, actual.length)) * 200,
              )
            }
          }
        }
      }
      if (!Number.isFinite(score)) continue
      if (observedAt) {
        const distance = Math.abs(entry.at - observedAt)
        score += Math.max(-500, 350 - distance / 10)
      } else {
        score += Math.max(0, 160 - (now - entry.at) / 100)
      }
      if (score > bestScore) {
        bestScore = score
        best = entry
      }
    }
    return best && bestScore >= 620 ? best.sender : ''
  }

  prune(now = Date.now()): void {
    this.entries = this.entries.filter((entry) => now - entry.at <= this.ttl)
  }
}
