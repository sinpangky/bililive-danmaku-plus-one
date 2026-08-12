import { orderedBracketEmojiText, unicodeEmojiFallbackText } from '../live/emoji-fallback'
import {
  LEGACY_BILIBILI_EXCLUSIVE_ASSET_KEY_PREFIX,
  NATIVE_PANEL_ASSET_KEY_PREFIX,
} from '../live/editor-config'

interface BilibiliAssetLike {
  keys?: unknown
  token?: unknown
}

interface BilibiliPartLike {
  asset?: unknown
  text?: unknown
  type?: unknown
}

interface BilibiliPayloadLike {
  assets?: unknown
  parts?: unknown
  text?: unknown
}

function normalizedPayloadText(value: unknown): string {
  return String(value || '')
    .replace(/[\u200B\u200C\u2060\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function normalizedEmojiLabel(value: unknown): string {
  const text = normalizedPayloadText(value)
  const bracketed = text.match(/^\[([^\]\n]{1,120})\]$/)
  return normalizedPayloadText(bracketed ? bracketed[1] : text)
}

export type BilibiliRichPayloadClassification =
  | { kind: 'inline-emoji-text'; text: string }
  | { kind: 'panel-emoji-single'; text: string }
  | { kind: 'panel-emoji-mixed'; text: string }
  | { kind: 'unicode-emoji-text'; text: string }
  | { kind: 'unknown-image'; text: string }

export function isBilibiliNativePanelAsset(asset: unknown): boolean {
  if (!asset || typeof asset !== 'object') return false
  const keys = (asset as BilibiliAssetLike).keys
  return Boolean(
    Array.isArray(keys) &&
    keys.some((key) => {
      const normalized = String(key || '').toLowerCase()
      return (
        normalized.startsWith(NATIVE_PANEL_ASSET_KEY_PREFIX) ||
        normalized.startsWith(LEGACY_BILIBILI_EXCLUSIVE_ASSET_KEY_PREFIX)
      )
    }),
  )
}

export function isSingleBilibiliEmojiPayload(
  payload: BilibiliPayloadLike | null | undefined,
): boolean {
  const assets = payload && Array.isArray(payload.assets) ? payload.assets : []
  if (assets.length !== 1) return false
  if (!payload || !Array.isArray(payload.parts) || !payload.parts.length) return true
  const assetToken = normalizedPayloadText((assets[0] as BilibiliAssetLike | undefined)?.token)
  const assetLabel = normalizedEmojiLabel(assetToken)
  const payloadText = normalizedPayloadText(payload.text)
  const meaningfulParts = (payload.parts as BilibiliPartLike[]).filter((part) => {
    if (!part || typeof part !== 'object') return false
    if (part.type === 'emoji') return true
    if (part.type !== 'text') return false
    const text = normalizedPayloadText(part.text)
    if (!text) return false
    const duplicatesAssetLabel = assetLabel && normalizedEmojiLabel(text) === assetLabel
    return text !== assetToken && text !== payloadText && !duplicatesAssetLabel
  })
  return meaningfulParts.length === 1 && meaningfulParts[0].type === 'emoji'
}

export function hasBilibiliInlineTextContent(
  payload: BilibiliPayloadLike | null | undefined,
): boolean {
  if (!payload || !Array.isArray(payload.parts)) return false
  const assetLabels = new Set(
    (Array.isArray(payload.assets) ? payload.assets : [])
      .map((asset) => normalizedEmojiLabel((asset as BilibiliAssetLike | undefined)?.token))
      .filter(Boolean),
  )
  return (payload.parts as BilibiliPartLike[]).some((part) => {
    if (!part || part.type !== 'text') return false
    const text = normalizedPayloadText(part.text)
    return Boolean(text) && !assetLabels.has(normalizedEmojiLabel(text))
  })
}

/**
 * Bilibili exposes three lossless send modes. Unicode and common bracket
 * Emoji can be reconstructed as editor text, while panel-only Emoji from room,
 * fan-club, and equipped decoration packs must be selected from the native
 * panel and may only be sent as a single asset.
 */
export function classifyBilibiliRichPayload(
  payload: BilibiliPayloadLike | null | undefined,
): BilibiliRichPayloadClassification {
  const text = String(payload?.text || '').trim()
  const assets = payload && Array.isArray(payload.assets) ? payload.assets : []

  const nativeAssets = assets.filter(isBilibiliNativePanelAsset)
  if (nativeAssets.length) {
    const singlePanelEmoji =
      nativeAssets.length === assets.length && isSingleBilibiliEmojiPayload(payload)
    return {
      kind: singlePanelEmoji ? 'panel-emoji-single' : 'panel-emoji-mixed',
      text: singlePanelEmoji
        ? normalizedPayloadText((nativeAssets[0] as BilibiliAssetLike | undefined)?.token) || text
        : text,
    }
  }

  const unicodeText = unicodeEmojiFallbackText(payload)
  if (unicodeText) return { kind: 'unicode-emoji-text', text: unicodeText }

  const inlineText = orderedBracketEmojiText(payload)
  if (inlineText) return { kind: 'inline-emoji-text', text: inlineText }

  return { kind: 'unknown-image', text }
}
