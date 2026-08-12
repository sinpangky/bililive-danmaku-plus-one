interface EmojiAssetLike {
  token?: unknown
}

export type BilibiliPayloadPart =
  { asset: EmojiAssetLike; type: 'emoji' } | { text: string; type: 'text' }

function normalizedLabel(value: unknown): string {
  return String(value || '')
    .replace(/[\u200B\u200C\u2060\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isBilibiliMedalAccessibilityLabel(value: unknown): boolean {
  const label = normalizedLabel(value)
  return /^(?:这是\s*TA\s*的)?(?:荣耀等级|粉丝团等级|粉丝牌等级)?(?:勋章|徽章)(?:\s*\(.*)?$/i.test(
    label,
  )
}

function unbracketedLabel(value: unknown): string {
  const label = normalizedLabel(value)
  const match = /^\[([^\]\n]{1,120})\]$/.exec(label)
  return normalizedLabel(match ? match[1] : label)
}

function duplicatesPreviousEmojiLabel(text: string, token: unknown): boolean {
  const normalizedText = normalizedLabel(text)
  const normalizedToken = normalizedLabel(token)
  if (!normalizedText || !normalizedToken) return false
  return (
    normalizedText === normalizedToken ||
    unbracketedLabel(normalizedText) === unbracketedLabel(normalizedToken)
  )
}

/**
 * Side-chat Emoji are rendered as an image followed by a duplicate accessible
 * label. Remove only that immediately-adjacent label; repeated image nodes are
 * retained, so two identical Emoji sent by the user remain two Emoji.
 */
export function normalizeBilibiliPayloadParts(
  value: readonly BilibiliPayloadPart[],
): BilibiliPayloadPart[] {
  const normalized: BilibiliPayloadPart[] = []
  let previousEmojiToken: unknown = ''

  for (const part of value) {
    if (part.type === 'emoji') {
      normalized.push(part)
      previousEmojiToken = part.asset?.token
      continue
    }

    if (previousEmojiToken && duplicatesPreviousEmojiLabel(part.text, previousEmojiToken)) {
      previousEmojiToken = ''
      continue
    }
    previousEmojiToken = ''
    if (!part.text) continue
    const previous = normalized.at(-1)
    if (previous?.type === 'text') previous.text += part.text
    else normalized.push({ text: part.text, type: 'text' })
  }

  return normalized
}

export function bilibiliPayloadTextFromParts(value: readonly BilibiliPayloadPart[]): string {
  return value
    .map((part) => (part.type === 'text' ? part.text : String(part.asset?.token || '')))
    .join('')
}

export function authoritativeBilibiliText(value: unknown): string {
  return String(value || '')
    .replace(/[\u200B\u200C\u2060\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

export function textPayloadFromAuthoritativeBilibiliText(value: unknown): {
  assets: []
  parts: [{ text: string; type: 'text' }]
  plainText: string
  text: string
} | null {
  const text = authoritativeBilibiliText(value)
  if (!text) return null
  return { assets: [], parts: [{ text, type: 'text' }], plainText: text, text }
}
