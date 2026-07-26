import { describe, expect, it } from "vitest";

import {
  BilibiliDanmakuCorrelationCache,
  BILIBILI_INLINE_ASSET_KEY,
  bilibiliDescriptorFromChatElement,
  bilibiliDescriptorFromFavoritePayload,
  bilibiliOverlayMatchesDescriptor,
  bilibiliPayloadFromDescriptor,
  normalizeBilibiliAssetUrl,
  selectBilibiliOwnOverlayCandidate,
} from "../danmaku";
import { BILIBILI_EXCLUSIVE_ASSET_KEY_PREFIX } from "../emoji-payload";

function element(markup: string): Element {
  const host = document.createElement("div");
  host.innerHTML = markup;
  return host.firstElementChild!;
}

function payloadText(
  parts: ReturnType<typeof bilibiliPayloadFromDescriptor>["parts"],
): string {
  return parts.map((part) =>
    part.type === "text" ? part.text : part.asset.token,
  ).join("");
}

describe("Bilibili authoritative danmaku descriptors", () => {
  it.each([
    "[大哭]",
    "加油啊[大哭][大哭]",
    "[哇]文字[大哭]",
    "[哇][哇]继续",
    "开头[哇]中间[大哭]结尾",
  ])("preserves exact inline order for %s", (message) => {
    const row = element(`
      <div class="chat-item danmaku-item" data-type="0"
        data-danmaku="${message}" data-id_str="9001" data-uid="42">
        <span class="danmaku-item-right">
          <span>DOM 顺序不可信</span>
          <img alt="[大哭]" src="//i0.hdslb.com/bfs/emote/cry.png@20h.webp">
          <span class="fallback">[大哭]</span>
        </span>
      </div>
    `);
    const descriptor = bilibiliDescriptorFromChatElement(row, 1_000)!;
    const payload = bilibiliPayloadFromDescriptor(descriptor);

    expect(descriptor.text).toBe(message);
    expect(payload.text).toBe(message);
    expect(payloadText(payload.parts)).toBe(message);
    expect(payload.assets.map((asset) => asset.token)).toEqual(
      Array.from(message.matchAll(/\[[^\]]+\]/gu), (match) => match[0]),
    );
    expect(payload.assets.every((asset) =>
      asset.keys.includes(BILIBILI_INLINE_ASSET_KEY),
    )).toBe(true);
  });

  it("does not duplicate hidden fallback labels after image nodes", () => {
    const row = element(`
      <div data-type="0" data-danmaku="加油啊[大哭][大哭]">
        <span>加油啊</span>
        <img alt="[大哭]" src="//i0.hdslb.com/cry.png">
        <span>[大哭]</span>
        <img alt="[大哭]" src="//i0.hdslb.com/cry.png">
        <span>[大哭]</span>
      </div>
    `);
    const payload = bilibiliPayloadFromDescriptor(
      bilibiliDescriptorFromChatElement(row)!,
    );

    expect(payloadText(payload.parts)).toBe("加油啊[大哭][大哭]");
    expect(payload.assets).toHaveLength(2);
  });

  it("captures anchor-exclusive image identity without changing schema v2", () => {
    const row = element(`
      <div class="chat-item bulge-emoticon" data-type="1"
        data-danmaku="卖萌" data-file-id="room_3990387_104804"
        data-image="//i0.hdslb.com/bfs/live/emoji.png@96w.webp"
        data-id_str="7007" data-uid="88">
        <img alt="卖萌" src="//i0.hdslb.com/bfs/live/emoji.png@48w.webp">
        <span>卖萌</span>
      </div>
    `);
    const descriptor = bilibiliDescriptorFromChatElement(row, 2_000)!;
    const payload = bilibiliPayloadFromDescriptor(descriptor);

    expect(descriptor).toMatchObject({
      emojiName: "[卖萌]",
      emoticonUnique: "room_3990387_104804",
      kind: "image",
      messageId: "7007",
      senderUid: "88",
    });
    expect(payload.text).toBe("[卖萌]");
    expect(payload.assets[0].keys).toContain(
      `${BILIBILI_EXCLUSIVE_ASSET_KEY_PREFIX}room_3990387_104804`,
    );
    expect(
      bilibiliDescriptorFromFavoritePayload(payload)?.emoticonUnique,
    ).toBe("room_3990387_104804");
  });

  it("marks a legacy single bracket Emoji for safe catalog-first fallback", () => {
    const legacy = bilibiliDescriptorFromFavoritePayload({
      assets: [{
        keys: ["name:大哭"],
        src: "//i0.hdslb.com/bfs/emote/cry.png",
        token: "[大哭]",
      }],
      parts: [{
        asset: {
          keys: ["name:大哭"],
          src: "//i0.hdslb.com/bfs/emote/cry.png",
          token: "[大哭]",
        },
        type: "emoji",
      }],
      plainText: "",
      text: "[大哭]",
    });

    expect(legacy).toMatchObject({
      kind: "image",
      legacyInlineFallback: true,
      text: "[大哭]",
    });
  });

  it("sends a newly captured single bracket Emoji directly as inline text", () => {
    const descriptor = bilibiliDescriptorFromChatElement(element(`
      <div data-type="0" data-danmaku="[大哭]">
        <span class="danmaku-item-right">
          <img alt="[大哭]" src="//i0.hdslb.com/bfs/emote/cry.png">
        </span>
      </div>
    `))!;
    const favoriteDescriptor = bilibiliDescriptorFromFavoritePayload(
      bilibiliPayloadFromDescriptor(descriptor),
    );

    expect(favoriteDescriptor).toMatchObject({
      kind: "inline",
      text: "[大哭]",
    });
  });

  it("keeps an old mixed named-Emoji favorite as exact inline text", () => {
    const legacy = bilibiliDescriptorFromFavoritePayload({
      assets: [{
        keys: ["name:大哭"],
        src: "//i0.hdslb.com/bfs/emote/cry.png",
        token: "[大哭]",
      }],
      parts: [
        { text: "加油啊", type: "text" },
        {
          asset: {
            keys: ["name:大哭"],
            src: "//i0.hdslb.com/bfs/emote/cry.png",
            token: "[大哭]",
          },
          type: "emoji",
        },
      ],
      plainText: "加油啊",
      text: "加油啊[大哭]",
    });

    expect(legacy).toMatchObject({
      kind: "inline",
      text: "加油啊[大哭]",
    });
  });

  it("normalizes Bilibili CDN transform variants", () => {
    expect(
      normalizeBilibiliAssetUrl(
        "https://i0.hdslb.com/bfs/live/emoji.png@96w_96h.webp?x=1",
      ),
    ).toBe("i0.hdslb.com/bfs/live/emoji.png");
    expect(
      normalizeBilibiliAssetUrl(
        "//i0.hdslb.com/bfs/live/emoji.png@20h.webp",
      ),
    ).toBe("i0.hdslb.com/bfs/live/emoji.png");
  });
});

describe("Bilibili video/chat correlation", () => {
  it("matches a self-sent plain overlay by exact text and message id", () => {
    const descriptor = bilibiliDescriptorFromChatElement(element(`
      <div data-type="0" data-danmaku="这是自己的弹幕"
        data-id_str="self-message" data-uid="42"></div>
    `))!;
    const overlay = element(`
      <div class="bili-danmaku-x-dm" data-id_str="self-message">
        <span class="bili-danmaku-x-dm-content">这是自己的弹幕</span>
      </div>
    `);

    expect(bilibiliOverlayMatchesDescriptor(
      overlay,
      descriptor,
      "self-message",
    )).toBe(true);
    overlay.setAttribute("data-id_str", "another-message");
    expect(bilibiliOverlayMatchesDescriptor(
      overlay,
      descriptor,
      "self-message",
    )).toBe(false);
  });

  it("matches a mixed self-sent overlay without duplicating renderer content", () => {
    const descriptor = bilibiliDescriptorFromChatElement(element(`
      <div data-type="0" data-danmaku="加油啊[大哭][大哭]" data-uid="42">
        <span class="danmaku-item-right">
          <img src="//i0.hdslb.com/bfs/emote/cry.png@20h.webp">
          <img src="//i0.hdslb.com/bfs/emote/cry.png@40h.webp">
        </span>
      </div>
    `))!;
    const overlay = element(`
      <div class="bili-danmaku-x-dm">
        <span>加油啊</span>
        <img src="//i0.hdslb.com/bfs/emote/cry.png@60h.webp">
        <span>加油啊</span>
        <img src="//i0.hdslb.com/bfs/emote/cry.png@80h.webp">
      </div>
    `);

    expect(bilibiliOverlayMatchesDescriptor(overlay, descriptor)).toBe(true);
  });

  it("matches a self-sent room image by data-file-id", () => {
    const descriptor = bilibiliDescriptorFromChatElement(element(`
      <div data-type="1" data-danmaku="卖萌"
        data-file-id="room_3990387_104804" data-uid="42"></div>
    `))!;
    const overlay = element(`
      <div class="bili-danmaku-x-dm"
        data-file-id="room_3990387_104804">
        <img alt="卖萌" src="//i0.hdslb.com/bfs/live/meng.png">
      </div>
    `);

    expect(bilibiliOverlayMatchesDescriptor(overlay, descriptor)).toBe(true);
  });

  it("does not match another plain overlay with different content", () => {
    const descriptor = bilibiliDescriptorFromChatElement(element(`
      <div data-type="0" data-danmaku="自己的弹幕" data-uid="42"></div>
    `))!;
    const overlay = element(`
      <div class="bili-danmaku-x-dm">
        <span>其他人的弹幕</span>
      </div>
    `);

    expect(bilibiliOverlayMatchesDescriptor(overlay, descriptor)).toBe(false);
  });

  it("recovers one authoritative message from a duplicated overlay render", () => {
    const cache = new BilibiliDanmakuCorrelationCache();
    const now = Date.now();
    const row = element(`
      <div data-type="0" data-danmaku="加油啊[大哭]" data-id_str="1" data-uid="9">
        <img alt="[大哭]" src="//i0.hdslb.com/bfs/emote/cry.png@20h.webp">
      </div>
    `);
    cache.remember(bilibiliDescriptorFromChatElement(row, now)!);
    const overlay = element(`
      <div class="bili-danmaku-x-dm">
        <span>加油啊</span>
        <img src="https://i0.hdslb.com/bfs/emote/cry.png@40h.webp">
        <span>加油啊</span>
        <img src="https://i0.hdslb.com/bfs/emote/cry.png@60h.webp">
      </div>
    `);

    const resolution = cache.resolveOverlay(overlay, now + 100);
    expect(resolution.status).toBe("matched");
    expect(resolution.descriptor?.text).toBe("加油啊[大哭]");
  });

  it("cancels correlation when more than one distinct chat descriptor matches", () => {
    const cache = new BilibiliDanmakuCorrelationCache();
    const now = Date.now();
    for (const [id, uid] of [["1", "9"], ["2", "10"]]) {
      const row = element(`
        <div data-type="0" data-danmaku="[大哭]" data-id_str="${id}" data-uid="${uid}">
          <img src="//i0.hdslb.com/bfs/emote/cry.png">
        </div>
      `);
      cache.remember(bilibiliDescriptorFromChatElement(row, now)!);
    }
    const overlay = element(`
      <div><img src="//i0.hdslb.com/bfs/emote/cry.png@20h.webp"></div>
    `);

    expect(cache.resolveOverlay(overlay, now + 100).status).toBe("ambiguous");
  });

  it("requires response id and own uid when an id is available", () => {
    const cache = new BilibiliDanmakuCorrelationCache();
    const now = Date.now();
    const correct = bilibiliDescriptorFromChatElement(element(`
      <div data-type="0" data-danmaku="[大哭]" data-id_str="expected" data-uid="42"></div>
    `), now)!;
    cache.remember(correct);

    expect(cache.findEcho({
      kind: "inline",
      messageId: "expected",
      sentAt: now - 100,
      text: "[大哭]",
      uid: "42",
    }, now + 100)).toBe(correct);
    expect(cache.findEcho({
      kind: "inline",
      messageId: "expected",
      sentAt: now - 100,
      text: "[大哭]",
      uid: "99",
    }, now + 100)).toBeNull();
    expect(cache.findEcho({
      kind: "inline",
      messageId: "wrong",
      sentAt: now - 100,
      text: "[大哭]",
      uid: "42",
    }, now + 100)).toBeNull();
  });

  it("falls back to uid, type and exact content only when response id is absent", () => {
    const cache = new BilibiliDanmakuCorrelationCache();
    const now = Date.now();
    const echo = bilibiliDescriptorFromChatElement(element(`
      <div data-type="0" data-danmaku="加油啊[大哭]" data-id_str="new-id" data-uid="42"></div>
    `), now)!;
    cache.remember(echo);

    expect(cache.findEcho({
      kind: "inline",
      sentAt: now - 100,
      text: "加油啊[大哭]",
      uid: "42",
    }, now + 100)).toBe(echo);
    expect(cache.findEcho({
      kind: "inline",
      sentAt: now - 100,
      text: "[大哭]加油啊",
      uid: "42",
    }, now + 100)).toBeNull();
  });
});

describe("Bilibili own video danmaku selection", () => {
  const descriptor = (): NonNullable<
    ReturnType<typeof bilibiliDescriptorFromChatElement>
  > => bilibiliDescriptorFromChatElement(element(`
    <div data-type="0" data-danmaku="加油啊[大哭]" data-uid="42"></div>
  `), 1_000)!;

  it("selects the new self overlay instead of the hidden +1 source", () => {
    const source = element(`
      <div class="bili-danmaku-x-dm" style="visibility: hidden">
        加油啊[大哭]
      </div>
    `);
    const own = element(`
      <div class="bili-danmaku-x-dm">加油啊[大哭]</div>
    `);

    const selection = selectBilibiliOwnOverlayCandidate([
      { element: source, firstSeenAt: 999, preexisting: true },
      { element: own, firstSeenAt: 1_020 },
    ], descriptor(), { sentAt: 1_000 });

    expect(selection).toEqual({ element: own, status: "matched" });
  });

  it("never selects the preexisting +1 source as self", () => {
    const source = element(`
      <div class="bili-danmaku-x-dm">加油啊[大哭]</div>
    `);

    expect(selectBilibiliOwnOverlayCandidate([
      { element: source, firstSeenAt: 999, preexisting: true },
    ], descriptor(), { sentAt: 1_000 })).toEqual({ status: "missing" });
  });

  it("does not guess when two new overlays have identical content", () => {
    const first = element(`
      <div class="bili-danmaku-x-dm">加油啊[大哭]</div>
    `);
    const second = element(`
      <div class="bili-danmaku-x-dm">加油啊[大哭]</div>
    `);

    expect(selectBilibiliOwnOverlayCandidate([
      { element: first, firstSeenAt: 1_010 },
      { element: second, firstSeenAt: 1_012 },
    ], descriptor(), { sentAt: 1_000 })).toEqual({ status: "ambiguous" });
  });

  it("prefers an exact message id over an id-less content match", () => {
    const sameText = element(`
      <div class="bili-danmaku-x-dm">加油啊[大哭]</div>
    `);
    const own = element(`
      <div class="bili-danmaku-x-dm" data-id_str="self-100">
        加油啊[大哭]
      </div>
    `);

    const selection = selectBilibiliOwnOverlayCandidate([
      { element: sameText, firstSeenAt: 1_010 },
      { element: own, firstSeenAt: 1_012 },
    ], descriptor(), {
      expectedMessageId: "self-100",
      sentAt: 1_000,
    });

    expect(selection).toEqual({ element: own, status: "matched" });
  });
});
