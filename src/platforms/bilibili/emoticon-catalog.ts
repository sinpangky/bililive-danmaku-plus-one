import { normalizeBilibiliAssetUrl } from "./danmaku";

export interface BilibiliCatalogLookup {
  emojiName?: string;
  imageUrl?: string;
  legacyInlineFallback?: boolean;
}

export type BilibiliCatalogResolution =
  | { status: "ambiguous" }
  | { status: "image"; unique: string }
  | { status: "inline" }
  | { status: "missing" };

interface EmoticonCatalogEntry {
  imageUrls: string[];
  names: string[];
  unique: string;
}

type JsonRecord = Record<string, unknown>;

function clean(value: unknown, limit = 500): string {
  return String(value ?? "").trim().slice(0, limit);
}

function collectCatalogEntries(
  value: unknown,
  entries: EmoticonCatalogEntry[],
  visited = new Set<object>(),
): void {
  if (!value || typeof value !== "object" || visited.has(value)) return;
  visited.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => collectCatalogEntries(item, entries, visited));
    return;
  }

  const record = value as JsonRecord;
  const unique = clean(
    record.emoticon_unique
      || record.emoticonUnique
      || record.file_id
      || record.fileId,
    256,
  );
  if (unique) {
    const imageUrls = [
      record.url,
      record.image,
      record.image_url,
      record.gif_url,
      record.webp_url,
    ].map((item) => clean(item, 4_096)).filter(Boolean);
    const names = [
      record.emoji,
      record.text,
      record.name,
      record.description,
      record.emoticon_name,
    ].map((item) => clean(item, 120).replace(/^\[|\]$/gu, "")).filter(Boolean);
    entries.push({ imageUrls, names, unique });
  }
  Object.values(record).forEach((item) =>
    collectCatalogEntries(item, entries, visited),
  );
}

export function resolveBilibiliEmoticonCatalog(
  value: unknown,
  lookup: BilibiliCatalogLookup,
): BilibiliCatalogResolution {
  const entries: EmoticonCatalogEntry[] = [];
  collectCatalogEntries(value, entries);
  const expectedUrl = normalizeBilibiliAssetUrl(lookup.imageUrl);
  const expectedName = clean(lookup.emojiName, 120).replace(/^\[|\]$/gu, "");
  const urlMatches = expectedUrl
    ? entries.filter((entry) =>
      entry.imageUrls.some((url) =>
        normalizeBilibiliAssetUrl(url) === expectedUrl,
      ))
    : [];
  const nameMatches = expectedName
    ? entries.filter((entry) =>
      entry.names.some((name) => name === expectedName),
    )
    : [];
  const matches = urlMatches.length ? urlMatches : nameMatches;

  if (lookup.legacyInlineFallback) {
    const roomMatches = Array.from(new Set(
      matches
        .filter((entry) => entry.unique.startsWith("room_"))
        .map((entry) => entry.unique),
    ));
    const hasInlineMatch = matches.some(
      (entry) => !entry.unique.startsWith("room_"),
    );
    if (roomMatches.length && hasInlineMatch) return { status: "ambiguous" };
    if (roomMatches.length === 1) {
      return { status: "image", unique: roomMatches[0] };
    }
    if (roomMatches.length > 1) return { status: "ambiguous" };
    if (
      hasInlineMatch
      || expectedUrl.includes("/bfs/emote/")
    ) {
      return { status: "inline" };
    }
    return { status: "missing" };
  }

  const uniqueMatches = Array.from(new Set(
    matches.map((entry) => entry.unique),
  ));
  if (uniqueMatches.length === 1) {
    return { status: "image", unique: uniqueMatches[0] };
  }
  return { status: uniqueMatches.length > 1 ? "ambiguous" : "missing" };
}
