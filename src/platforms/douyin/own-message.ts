import type { EmojiAssetDescriptor } from "./rich-data";

export interface RichPayload {
  assets: EmojiAssetDescriptor[];
  parts: Array<{ asset: EmojiAssetDescriptor; type: "emoji" } | { text: string; type: "text" }>;
  plainText: string;
  text: string;
}

type TextParser = (value: unknown) => string;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function sanitizeAsset(value: unknown): EmojiAssetDescriptor | null {
  if (!isRecord(value) || !Array.isArray(value.keys) || !value.keys.length) {
    return null;
  }
  return {
    src: String(value.src || "").slice(0, 4096),
    token: String(value.token || "").slice(0, 120),
    keys: value.keys.map((key) => String(key).slice(0, 520)).slice(0, 24)
  };
}

export function normalizeRichPayload(value: unknown, parseText: TextParser, maxLength: number): RichPayload {
  if (typeof value === "string") {
    const text = parseText(value);
    return { text, plainText: text, assets: [], parts: [{ type: "text", text }] };
  }
  const record = isRecord(value) ? value : {};
  const text = parseText(record.text);
  const plainText = Object.hasOwn(record, "plainText") ? parseText(record.plainText) : text;
  const assets = Array.isArray(record.assets)
    ? record.assets.map(sanitizeAsset).filter((asset): asset is EmojiAssetDescriptor => Boolean(asset)).slice(0, 8)
    : [];
  const parts = Array.isArray(record.parts)
    ? record.parts.slice(0, 40).map((part) => {
      if (!isRecord(part)) return null;
      if (part.type === "emoji") {
        const asset = sanitizeAsset(part.asset);
        return asset ? { type: "emoji" as const, asset } : null;
      }
      return part.type === "text"
        ? { type: "text" as const, text: String(part.text || "").slice(0, maxLength) }
        : null;
    }).filter((part): part is RichPayload["parts"][number] => Boolean(part))
    : [{ type: "text" as const, text: plainText }, ...assets.map((asset) => ({ type: "emoji" as const, asset }))];
  return { text, plainText, assets, parts };
}

export function assetsMatch(first: EmojiAssetDescriptor | null | undefined, second: EmojiAssetDescriptor | null | undefined): boolean {
  return Boolean(first && second && first.keys.some((key) => second.keys.includes(key)));
}

export function payloadSignature(payload: RichPayload, comparableText: (value: unknown) => string): string {
  const textKey = comparableText(payload.plainText || payload.text);
  const assetKey = payload.assets.map((asset) => asset.keys.slice().sort()[0] || "")
    .filter(Boolean).join("|");
  return `${textKey}::${assetKey}`.slice(0, 1000);
}
