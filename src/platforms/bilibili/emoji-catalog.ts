export interface BilibiliCatalogAsset {
  keys?: unknown
  token?: unknown
}

export interface BilibiliCatalogEntry<T = unknown> {
  available: boolean
  descriptor: BilibiliCatalogAsset
  identity: string
  value: T
}

function normalizedToken(value: unknown): string {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  if (/^\[[^\]\n]{1,80}\]$/.test(text)) return text.toLowerCase()
  return text
}

export function bilibiliCatalogAssetScore(
  descriptor: BilibiliCatalogAsset | null | undefined,
  expected: BilibiliCatalogAsset | null | undefined,
): number {
  if (!descriptor || !expected || !Array.isArray(expected.keys)) return 0
  const expectedKeys = new Set(expected.keys.map(String))
  let score = 0
  if (Array.isArray(descriptor.keys)) {
    descriptor.keys.map(String).forEach((key) => {
      if (!expectedKeys.has(key)) return
      score += key.startsWith('raw:') ? 8 : key.startsWith('path:') ? 6 : 4
    })
  }
  if (score >= 4) return score
  const token = normalizedToken(expected.token)
  return token && normalizedToken(descriptor.token) === token ? 3 : score
}

/** Select one resource identity, never one arbitrary DOM item. */
export function selectUniqueBilibiliCatalogEntry<T>(
  entries: readonly BilibiliCatalogEntry<T>[],
  expected: BilibiliCatalogAsset,
): BilibiliCatalogEntry<T> | null {
  const ranked = entries
    .filter((entry) => entry.available)
    .map((entry) => ({ entry, score: bilibiliCatalogAssetScore(entry.descriptor, expected) }))
    .filter((match) => match.score >= 3)
    .sort((first, second) => second.score - first.score)
  if (!ranked.length) return null

  const bestScore = ranked[0].score
  const best = ranked.filter((match) => match.score === bestScore)
  if (new Set(best.map((match) => match.entry.identity)).size !== 1) return null
  return best[0].entry
}
