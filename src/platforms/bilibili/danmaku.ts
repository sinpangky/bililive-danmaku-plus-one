import type {
  FavoriteAsset,
  FavoritePart,
  FavoritePayload,
} from "../../features/favorites/types";
import { BILIBILI_EXCLUSIVE_ASSET_KEY_PREFIX } from "./emoji-payload";

export type BilibiliDanmakuDescriptorSource = "chat" | "favorite" | "overlay";

export interface BilibiliDanmakuDescriptor {
  emoticonUnique?: string;
  emojiName?: string;
  imageUrl?: string;
  imageUrls: string[];
  kind: "image" | "inline";
  legacyInlineFallback?: boolean;
  messageId?: string;
  observedAt: number;
  plainText: string;
  senderUid?: string;
  source: BilibiliDanmakuDescriptorSource;
  text: string;
}

export interface BilibiliEchoExpectation {
  emoticonUnique?: string;
  kind: "image" | "inline";
  messageId?: string;
  sentAt: number;
  text: string;
  uid?: string;
}

export interface BilibiliOverlayResolution {
  descriptor?: BilibiliDanmakuDescriptor;
  status: "ambiguous" | "matched" | "missing";
}

export interface BilibiliOwnOverlayCandidate {
  element: Element;
  firstSeenAt: number;
  preexisting?: boolean;
}

export interface BilibiliOwnOverlaySelection {
  element?: Element;
  status: "ambiguous" | "matched" | "missing";
}

interface FavoritePayloadLike {
  assets?: unknown;
  parts?: unknown;
  plainText?: unknown;
  text?: unknown;
}

const BRACKET_TOKEN_GLOBAL = /\[[^\]\n]{1,40}\]/gu;
const GENERIC_IMAGE_LABEL =
  /^(?:图片|图片表情|表情|emoji|emote|image|sticker|贴纸)$/iu;
export const BILIBILI_INLINE_ASSET_KEY = "bili-inline";

function clean(value: unknown, limit = 4_096): string {
  return String(value ?? "").trim().slice(0, limit);
}

function normalizeText(value: unknown): string {
  return clean(value, 1_000).replace(/\s+/gu, " ").trim();
}

function bracketName(value: unknown): string {
  const name = clean(value, 120).replace(/^\[|\]$/gu, "");
  return name ? `[${name}]` : "";
}

function attribute(element: Element, ...names: string[]): string {
  for (const name of names) {
    const value = clean(element.getAttribute(name));
    if (value) return value;
  }
  return "";
}

function imageSources(row: Element): string[] {
  const contentRoots = row.matches("[data-danmaku]")
    ? Array.from(row.querySelectorAll<Element>(
      ".danmaku-item-right,.danmaku-content,[class*='danmaku-content']",
    ))
    : [];
  const roots = contentRoots.length ? contentRoots : [row];
  const values = [
    attribute(row, "data-image", "data-image-url", "data-src"),
    ...roots.flatMap((root) =>
      Array.from(root.querySelectorAll<HTMLImageElement>("img"))
        .filter((image) => {
          const marker = [
            image.className,
            image.parentElement?.className,
            image.closest("[class]")?.className,
          ].join(" ");
          return !/(?:avatar|badge|medal|level|rank|guard|fans?[-_]?club)/iu.test(marker);
        })
        .flatMap((image) => [
          image.currentSrc,
          image.getAttribute("src"),
          image.getAttribute("data-src"),
        ]),
    ),
  ];
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((raw) => {
    const source = clean(raw);
    if (!source) return;
    const normalized = normalizeBilibiliAssetUrl(source);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(source);
  });
  return result;
}

function assetForToken(
  token: string,
  source = "",
  unique = "",
  inline = false,
): FavoriteAsset {
  const name = token.replace(/^\[|\]$/gu, "");
  const keys = [
    token ? `raw:${token}` : "",
    name ? `name:${name.toLocaleLowerCase()}` : "",
    source ? `url:${normalizeBilibiliAssetUrl(source)}` : "",
    unique ? `${BILIBILI_EXCLUSIVE_ASSET_KEY_PREFIX}${unique}` : "",
    inline ? BILIBILI_INLINE_ASSET_KEY : "",
  ].filter(Boolean);
  return {
    keys: Array.from(new Set(keys)).slice(0, 24),
    src: source,
    token,
  };
}

function inlineParts(text: string, sources: string[]): {
  assets: FavoriteAsset[];
  parts: FavoritePart[];
} {
  const assets: FavoriteAsset[] = [];
  const parts: FavoritePart[] = [];
  let sourceIndex = 0;
  let offset = 0;

  for (const match of text.matchAll(BRACKET_TOKEN_GLOBAL)) {
    const index = match.index ?? 0;
    if (index > offset) {
      parts.push({ text: text.slice(offset, index), type: "text" });
    }
    const token = match[0];
    const asset = assetForToken(token, sources[sourceIndex] || "", "", true);
    assets.push(asset);
    parts.push({ asset, type: "emoji" });
    sourceIndex += 1;
    offset = index + token.length;
  }
  if (offset < text.length) {
    parts.push({ text: text.slice(offset), type: "text" });
  }
  return { assets, parts };
}

function favoriteAssets(value: unknown): FavoriteAsset[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    return [{
      keys: Array.isArray(record.keys)
        ? record.keys.map((key) => clean(key, 256)).filter(Boolean)
        : [],
      src: clean(record.src),
      token: clean(record.token, 120),
    }];
  });
}

function exclusiveUnique(asset: FavoriteAsset | undefined): string {
  if (!asset) return "";
  const key = asset.keys.find((candidate) =>
    candidate.startsWith(BILIBILI_EXCLUSIVE_ASSET_KEY_PREFIX),
  );
  return clean(key?.slice(BILIBILI_EXCLUSIVE_ASSET_KEY_PREFIX.length), 256);
}

function halfIfRepeated(value: string): string {
  const normalized = normalizeText(value);
  const points = Array.from(normalized);
  if (points.length >= 2 && points.length % 2 === 0) {
    const half = points.length / 2;
    const first = points.slice(0, half).join("");
    if (first === points.slice(half).join("")) return first;
  }
  const compact = normalized.replace(/\s+/gu, "");
  const compactPoints = Array.from(compact);
  if (compactPoints.length >= 2 && compactPoints.length % 2 === 0) {
    const half = compactPoints.length / 2;
    const first = compactPoints.slice(0, half).join("");
    if (first === compactPoints.slice(half).join("")) return first;
  }
  return normalized;
}

function visibleTextFromElement(element: Element): string {
  const pieces: string[] = [];
  const visit = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      pieces.push(node.textContent || "");
      return;
    }
    if (!(node instanceof Element)) return;
    if (
      node instanceof HTMLImageElement
      || node.matches(
        "script,style,svg,button,[aria-hidden='true'],[data-bcp-one-owned]",
      )
    ) {
      return;
    }
    Array.from(node.childNodes).forEach(visit);
  };
  visit(element);
  return halfIfRepeated(pieces.join(""));
}

function descriptorSignature(descriptor: BilibiliDanmakuDescriptor): string {
  return [
    descriptor.kind,
    descriptor.text,
    descriptor.emoticonUnique || "",
    descriptor.senderUid || "",
    descriptor.imageUrls.map(normalizeBilibiliAssetUrl).sort().join(","),
  ].join("\u0001");
}

/**
 * Bilibili appends CDN resize/conversion suffixes such as
 * `.png@96w_96h.webp`. They identify the same emote as the original URL.
 */
export function normalizeBilibiliAssetUrl(value: unknown): string {
  const source = clean(value);
  if (!source) return "";
  try {
    const url = new URL(
      source.startsWith("//") ? `https:${source}` : source,
      "https://live.bilibili.com/",
    );
    const path = decodeURIComponent(url.pathname)
      .replace(/@[^/]+$/u, "")
      .replace(/\/+/gu, "/");
    return `${url.hostname.toLocaleLowerCase()}${path}`.toLocaleLowerCase();
  } catch {
    return source
      .replace(/^https?:\/\//iu, "")
      .replace(/[?#].*$/u, "")
      .replace(/@[^/]+$/u, "")
      .toLocaleLowerCase();
  }
}

export function bilibiliDescriptorFromChatElement(
  element: Element,
  observedAt = Date.now(),
): BilibiliDanmakuDescriptor | null {
  const row = element.matches("[data-danmaku]")
    ? element
    : element.closest("[data-danmaku]");
  if (!row) return null;

  const text = clean(row.getAttribute("data-danmaku"), 1_000);
  if (!text) return null;
  const type = attribute(row, "data-type");
  const emoticonUnique = attribute(
    row,
    "data-file-id",
    "data-emoticon-unique",
    "data-emoji-unique",
  );
  const kind = type === "1" || Boolean(emoticonUnique) ? "image" : "inline";
  const urls = imageSources(row);
  const rowImageName = GENERIC_IMAGE_LABEL.test(text)
    ? row.querySelector("img")?.getAttribute("alt") || text
    : text;
  const emojiName =
    kind === "image"
      ? bracketName(
        attribute(row, "data-emoticon-name", "data-emoji-name")
          || rowImageName,
      )
      : undefined;

  return {
    emoticonUnique: emoticonUnique || undefined,
    emojiName,
    imageUrl: urls[0],
    imageUrls: urls,
    kind,
    messageId:
      attribute(row, "data-id_str", "data-id-str", "data-message-id")
      || undefined,
    observedAt,
    plainText: kind === "inline"
      ? normalizeText(text.replace(BRACKET_TOKEN_GLOBAL, ""))
      : "",
    senderUid: attribute(row, "data-uid", "data-user-id") || undefined,
    source: "chat",
    text,
  };
}

export function bilibiliPayloadFromDescriptor(
  descriptor: BilibiliDanmakuDescriptor,
): FavoritePayload {
  if (descriptor.kind === "image") {
    const token = descriptor.emojiName || bracketName(descriptor.text);
    const asset = assetForToken(
      token,
      descriptor.imageUrl || descriptor.imageUrls[0] || "",
      descriptor.emoticonUnique || "",
    );
    return {
      assets: [asset],
      parts: [{ asset, type: "emoji" }],
      plainText: "",
      text: token || descriptor.text,
    };
  }

  const { assets, parts } = inlineParts(descriptor.text, descriptor.imageUrls);
  return {
    assets,
    parts: parts.length
      ? parts
      : [{ text: descriptor.text, type: "text" }],
    plainText: descriptor.plainText,
    text: descriptor.text,
  };
}

export function bilibiliDescriptorFromFavoritePayload(
  value: FavoritePayloadLike,
  observedAt = Date.now(),
): BilibiliDanmakuDescriptor | null {
  const text = clean(value.text, 1_000);
  const assets = favoriteAssets(value.assets);
  const exclusiveAsset = assets.find((asset) => exclusiveUnique(asset));
  const unique = exclusiveUnique(exclusiveAsset);
  const explicitlyInline = assets.some((asset) =>
    asset.keys.includes(BILIBILI_INLINE_ASSET_KEY),
  );

  if (unique) {
    const token = exclusiveAsset?.token || text;
    return {
      emoticonUnique: unique,
      emojiName: bracketName(token),
      imageUrl: exclusiveAsset?.src || undefined,
      imageUrls: exclusiveAsset?.src ? [exclusiveAsset.src] : [],
      kind: "image",
      observedAt,
      plainText: "",
      source: "favorite",
      text: token || text,
    };
  }

  const hasBracketToken = BRACKET_TOKEN_GLOBAL.test(text);
  BRACKET_TOKEN_GLOBAL.lastIndex = 0;
  const emojiOnlyParts =
    Array.isArray(value.parts)
    && value.parts.length > 0
    && value.parts.every((part) =>
      Boolean(part && typeof part === "object"
        && (part as Record<string, unknown>).type === "emoji"),
    );
  const isLegacyImage =
    !explicitlyInline
    &&
    assets.length === 1
    && (
      GENERIC_IMAGE_LABEL.test(text)
      || !normalizeText(value.plainText)
      || emojiOnlyParts
    );
  if (isLegacyImage) {
    const asset = assets[0];
    const token = asset.token || text;
    return {
      emojiName: bracketName(token),
      imageUrl: asset.src || undefined,
      imageUrls: asset.src ? [asset.src] : [],
      kind: "image",
      legacyInlineFallback:
        hasBracketToken
        && emojiOnlyParts
        && text === asset.token,
      observedAt,
      plainText: "",
      source: "favorite",
      text: token || text,
    };
  }
  if (!text) return null;
  return {
    imageUrls: assets.map((asset) => asset.src).filter(Boolean),
    kind: "inline",
    observedAt,
    plainText: normalizeText(value.plainText || text.replace(BRACKET_TOKEN_GLOBAL, "")),
    source: "favorite",
    text,
  };
}

export function bilibiliOverlayFingerprint(element: Element): {
  imageUrls: string[];
  plainText: string;
} {
  return {
    imageUrls: imageSources(element),
    plainText: visibleTextFromElement(element),
  };
}

function descendantAttributeValues(
  element: Element,
  attributes: readonly string[],
): string[] {
  const selector = attributes.map((name) => `[${name}]`).join(",");
  const elements = [
    element,
    ...(selector
      ? Array.from(element.querySelectorAll<Element>(selector))
      : []),
  ];
  return elements.flatMap((current) =>
    attributes.map((name) => clean(current.getAttribute(name), 256)),
  ).filter(Boolean);
}

export function bilibiliOverlaySignature(element: Element): string {
  const fingerprint = bilibiliOverlayFingerprint(element);
  return JSON.stringify({
    ids: descendantAttributeValues(element, [
      "data-id_str",
      "data-id-str",
      "data-message-id",
    ]),
    images: fingerprint.imageUrls
      .map(normalizeBilibiliAssetUrl)
      .filter(Boolean),
    text: normalizeText(fingerprint.plainText),
    unique: descendantAttributeValues(element, [
      "data-file-id",
      "data-emoticon-unique",
      "data-emoji-unique",
    ]),
  });
}

export function bilibiliOverlayMatchesDescriptor(
  element: Element,
  descriptor: BilibiliDanmakuDescriptor,
  expectedMessageId = descriptor.messageId || "",
): boolean {
  const observedIds = descendantAttributeValues(element, [
    "data-id_str",
    "data-id-str",
    "data-message-id",
  ]);
  if (expectedMessageId && observedIds.length && !observedIds.includes(expectedMessageId)) {
    return false;
  }

  const observedUnique = descendantAttributeValues(element, [
    "data-file-id",
    "data-emoticon-unique",
    "data-emoji-unique",
  ]);
  const expectedUnique = descriptor.emoticonUnique || "";
  const uniqueMatch =
    Boolean(expectedUnique)
    && observedUnique.includes(expectedUnique);
  if (
    descriptor.emoticonUnique
    && observedUnique.length
    && !uniqueMatch
  ) {
    return false;
  }

  const fingerprint = bilibiliOverlayFingerprint(element);
  const expectedImages = new Set(
    descriptor.imageUrls.map(normalizeBilibiliAssetUrl).filter(Boolean),
  );
  const observedImages = new Set(
    fingerprint.imageUrls.map(normalizeBilibiliAssetUrl).filter(Boolean),
  );
  const imageMatch =
    expectedImages.size > 0
    && Array.from(expectedImages).some((url) => observedImages.has(url));

  const expectedName = clean(descriptor.emojiName, 120).replace(/^\[|\]$/gu, "");
  const observedNames = descendantAttributeValues(element, [
    "alt",
    "data-emoji-name",
    "data-emoticon-name",
  ]).map((value) => value.replace(/^\[|\]$/gu, ""));
  const nameMatch = Boolean(expectedName) && observedNames.includes(expectedName);

  const observedText = halfIfRepeated(fingerprint.plainText);
  const expectedPlainText = normalizeText(
    descriptor.plainText || descriptor.text.replace(BRACKET_TOKEN_GLOBAL, ""),
  );
  BRACKET_TOKEN_GLOBAL.lastIndex = 0;
  const textMatch = expectedPlainText
    ? observedText === expectedPlainText
      || observedText === halfIfRepeated(descriptor.text)
    : true;

  if (descriptor.kind === "image") {
    return uniqueMatch || imageMatch || nameMatch;
  }
  if (expectedImages.size) return imageMatch && textMatch;
  return textMatch && observedText === halfIfRepeated(descriptor.text);
}

export function selectBilibiliOwnOverlayCandidate(
  candidates: readonly BilibiliOwnOverlayCandidate[],
  descriptor: BilibiliDanmakuDescriptor,
  options: {
    expectedMessageId?: string;
    sentAt: number;
  },
): BilibiliOwnOverlaySelection {
  const expectedMessageId = clean(options.expectedMessageId, 256);
  const eligible = candidates.filter(({ element, firstSeenAt, preexisting }) =>
    firstSeenAt >= options.sentAt
    && !preexisting
    && bilibiliOverlayMatchesDescriptor(
      element,
      descriptor,
      expectedMessageId,
    ),
  );

  const exactIdMatches = expectedMessageId
    ? eligible.filter(({ element }) =>
      descendantAttributeValues(element, [
        "data-id_str",
        "data-id-str",
        "data-message-id",
      ]).includes(expectedMessageId),
    )
    : [];
  const matches = exactIdMatches.length ? exactIdMatches : eligible;

  if (!matches.length) return { status: "missing" };
  if (matches.length !== 1) return { status: "ambiguous" };
  return { element: matches[0].element, status: "matched" };
}

export class BilibiliDanmakuCorrelationCache {
  readonly #maxAgeMs: number;
  readonly #maxEntries: number;
  #entries: BilibiliDanmakuDescriptor[] = [];

  constructor(maxEntries = 300, maxAgeMs = 30_000) {
    this.#maxEntries = maxEntries;
    this.#maxAgeMs = maxAgeMs;
  }

  entries(now = Date.now()): BilibiliDanmakuDescriptor[] {
    this.#prune(now);
    return this.#entries.slice();
  }

  remember(descriptor: BilibiliDanmakuDescriptor, now = Date.now()): void {
    this.#prune(now);
    if (descriptor.messageId) {
      const existing = this.#entries.findIndex(
        (entry) => entry.messageId === descriptor.messageId,
      );
      if (existing >= 0) {
        descriptor = {
          ...descriptor,
          observedAt: Math.min(
            descriptor.observedAt,
            this.#entries[existing].observedAt,
          ),
        };
        this.#entries.splice(existing, 1);
      }
    } else {
      const signature = descriptorSignature(descriptor);
      const existing = this.#entries.findIndex(
        (entry) =>
          !entry.messageId
          && descriptorSignature(entry) === signature
          && Math.abs(entry.observedAt - descriptor.observedAt) < 500,
      );
      if (existing >= 0) this.#entries.splice(existing, 1);
    }
    this.#entries.push(descriptor);
    if (this.#entries.length > this.#maxEntries) {
      this.#entries.splice(0, this.#entries.length - this.#maxEntries);
    }
  }

  resolveOverlay(element: Element, now = Date.now()): BilibiliOverlayResolution {
    const fingerprint = bilibiliOverlayFingerprint(element);
    const normalizedImages = new Set(
      fingerprint.imageUrls.map(normalizeBilibiliAssetUrl).filter(Boolean),
    );
    const plainText = normalizeText(fingerprint.plainText);
    const candidates = this.entries(now).filter((entry) => {
      const imageMatch = entry.imageUrls.some((url) =>
        normalizedImages.has(normalizeBilibiliAssetUrl(url)),
      );
      const textMatch =
        Boolean(plainText)
        && (
          plainText === entry.plainText
          || halfIfRepeated(plainText) === entry.plainText
          || plainText === normalizeText(entry.text)
        );
      return normalizedImages.size ? imageMatch && (!plainText || textMatch) : textMatch;
    });
    if (!candidates.length) return { status: "missing" };

    const signatures = new Set(candidates.map(descriptorSignature));
    if (signatures.size !== 1) return { status: "ambiguous" };
    return {
      descriptor: candidates.sort((a, b) => b.observedAt - a.observedAt)[0],
      status: "matched",
    };
  }

  findEcho(
    expectation: BilibiliEchoExpectation,
    now = Date.now(),
  ): BilibiliDanmakuDescriptor | null {
    const recent = this.entries(now).filter(
      (entry) => entry.observedAt >= expectation.sentAt - 100,
    );
    if (expectation.messageId) {
      if (!expectation.uid) return null;
      return recent.find((entry) =>
        entry.messageId === expectation.messageId
        && entry.senderUid === expectation.uid,
      ) || null;
    }
    if (!expectation.uid) return null;
    return recent.find((entry) => {
      if (entry.senderUid !== expectation.uid) return false;
      if (entry.kind !== expectation.kind) return false;
      return expectation.kind === "image"
        ? Boolean(
          expectation.emoticonUnique
          && entry.emoticonUnique === expectation.emoticonUnique,
        )
        : entry.text === expectation.text;
    }) || null;
  }

  #prune(now: number): void {
    const threshold = now - this.#maxAgeMs;
    this.#entries = this.#entries.filter((entry) => entry.observedAt >= threshold);
  }
}
