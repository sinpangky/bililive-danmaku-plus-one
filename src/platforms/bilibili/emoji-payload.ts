interface BilibiliEmojiAssetLike {
  keys?: unknown
  token?: unknown
}

interface BilibiliRichPartLike {
  asset?: unknown
  text?: unknown
  type?: unknown
}

interface BilibiliRichPayloadLike {
  assets?: unknown
  parts?: unknown
  text?: unknown
}

export const BILIBILI_EXCLUSIVE_ASSET_KEY_PREFIX = 'bili-exclusive:'

export const BILIBILI_EXCLUSIVE_EMOJI_ATTRIBUTES = [
  'data-file-id',
  'data-emoticon-unique',
  'data-emoji-unique',
  'data-room-emoticon',
  'data-room-emoji',
  'data-anchor-emoticon',
  'data-anchor-emoji',
] as const

const BRACKET_EMOJI_TOKEN = /^\[[^\]\n]{1,40}\]$/

function emojiAsset(value: unknown): BilibiliEmojiAssetLike | null {
  return value && typeof value === 'object' ? (value as BilibiliEmojiAssetLike) : null
}

function bracketToken(value: unknown): string {
  const token = String(emojiAsset(value)?.token || '').trim()
  return BRACKET_EMOJI_TOKEN.test(token) ? token : ''
}

function isExclusiveAsset(value: unknown): boolean {
  const keys = emojiAsset(value)?.keys
  return (
    Array.isArray(keys) &&
    keys.some((key) => String(key || '').startsWith(BILIBILI_EXCLUSIVE_ASSET_KEY_PREFIX))
  )
}

function containsTokensInOrder(value: string, tokens: string[]): boolean {
  let offset = 0
  return tokens.every((token) => {
    const index = value.indexOf(token, offset)
    if (index < 0) return false
    offset = index + token.length
    return true
  })
}

/**
 * Ordinary Bilibili named Emoji can be submitted losslessly as their bracketed
 * tokens. Rebuilding from ordered rich parts avoids the native Emoji panel
 * moving images ahead of the text or sending only the first image.
 *
 * Room/anchor-exclusive image Emoji deliberately return an empty fallback so
 * they continue through Bilibili's native Emoji panel and retain their actual
 * room-specific resource identity.
 */
export function bilibiliNamedEmojiFallbackText(
  payload: BilibiliRichPayloadLike | null | undefined,
): string {
  if (!payload || !Array.isArray(payload.assets) || !payload.assets.length) {
    return ''
  }

  const tokens = payload.assets.map(bracketToken)
  if (
    tokens.some((token) => !token) ||
    payload.assets.some(isExclusiveAsset)
  ) {
    return ''
  }

  if (Array.isArray(payload.parts) && payload.parts.length) {
    const pieces: string[] = []
    let emojiCount = 0

    for (const rawPart of payload.parts) {
      if (!rawPart || typeof rawPart !== 'object') return ''
      const part = rawPart as BilibiliRichPartLike
      if (part.type === 'text') {
        pieces.push(String(part.text || ''))
        continue
      }
      if (part.type !== 'emoji' || isExclusiveAsset(part.asset)) {
        return ''
      }
      const token = bracketToken(part.asset)
      if (!token) return ''
      pieces.push(token)
      emojiCount += 1
    }

    const ordered = pieces.join('').trim()
    if (emojiCount === tokens.length && ordered && containsTokensInOrder(ordered, tokens)) {
      return ordered
    }
  }

  // Older favorites may predate ordered rich parts. Their serialized text can
  // still safely repeat all ordinary named Emoji when every token is present.
  const legacyText = String(payload.text || '').trim()
  return legacyText && containsTokensInOrder(legacyText, tokens) ? legacyText : ''
}
