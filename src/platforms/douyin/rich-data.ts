import { normalizeText } from "./barrage-model";

export interface EmojiAssetDescriptor {
  keys: string[];
  src: string;
  token: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function normalizedAssetKeys(value: unknown, baseUrl: string): string[] {
  const raw = normalizeText(value);
  if (!raw) {
    return [];
  }
  const keys = new Set([`raw:${raw.toLowerCase().slice(0, 512)}`]);
  const unwrapped = raw.replace(/^\[|\]$/g, "").trim().toLowerCase();
  if (unwrapped) {
    keys.add(`name:${unwrapped.slice(0, 120)}`);
  }
  try {
    const url = new URL(raw, baseUrl);
    const pathname = decodeURIComponent(url.pathname).toLowerCase();
    if (pathname) {
      keys.add(`path:${pathname}`);
      const file = pathname.split("/").filter(Boolean).at(-1);
      if (file) {
        keys.add(`file:${file}`);
        keys.add(`stem:${file.split(/[@~!]/, 1)[0]}`);
      }
      const fragments = pathname.match(/[a-z0-9][a-z0-9_-]{9,}/g) || [];
      fragments.slice(-12).forEach((fragment) => {
        if (!/^(?:webcast|douyin|douyinpic|byteimg|tos-cn|webcast-platform)/.test(fragment)) {
          keys.add(`fragment:${fragment.slice(0, 240)}`);
        }
      });
    }
    url.searchParams.forEach((parameter, name) => {
      if (/(?:sign|signature|expire|timestamp|token|auth)/i.test(name)) return;
      const fragments = decodeURIComponent(parameter).toLowerCase()
        .match(/[a-z0-9][a-z0-9_-]{9,}/g) || [];
      fragments.slice(0, 8).forEach((fragment) =>
        keys.add(`fragment:${fragment.slice(0, 240)}`));
    });
  } catch {
    // Emoji names and internal ids are not necessarily URLs.
  }
  return [...keys];
}

function serializedAssetDescriptor(value: unknown, baseUrl: string): EmojiAssetDescriptor | null {
  if (!isRecord(value) || value.type !== "image" || typeof value.src !== "string" || !value.src) {
    return null;
  }
  const keys = new Set(normalizedAssetKeys(value.src, baseUrl));
  if (Array.isArray(value.assetHints)) {
    value.assetHints.slice(0, 20).forEach((hint) => {
      normalizedAssetKeys(hint, baseUrl).forEach((key) => keys.add(key));
    });
  }
  return {
    src: value.src.slice(0, 4096),
    token: "",
    keys: [...keys].slice(0, 48)
  };
}

export function serializedEmojiAssets(content: unknown, baseUrl: string): EmojiAssetDescriptor[] {
  const assets: EmojiAssetDescriptor[] = [];
  const visit = (item: unknown): void => {
    const asset = serializedAssetDescriptor(item, baseUrl);
    if (asset) {
      assets.push(asset);
    }
    if (isRecord(item) && Array.isArray(item.content)) {
      item.content.forEach(visit);
    }
  };
  (Array.isArray(content) ? content : []).forEach(visit);
  return assets.slice(0, 8);
}

export function comparableText(value: unknown): string {
  return normalizeText(value)
    .replace(/\[[^\]\n]{1,40}\]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, "");
}
