import { describe, expect, it } from "vitest";

import { resolveBilibiliEmoticonCatalog } from "../emoticon-catalog";

function catalog(...emoticons: Record<string, unknown>[]): unknown {
  return {
    packages: [{
      emoticons,
    }],
  };
}

describe("resolveBilibiliEmoticonCatalog", () => {
  it("resolves one room image by normalized CDN URL", () => {
    const result = resolveBilibiliEmoticonCatalog(catalog({
      emoticon_unique: "room_3990387_104804",
      emoji: "卖萌",
      url: "https://i0.hdslb.com/bfs/live/meng.png@96w.webp",
    }), {
      emojiName: "[卖萌]",
      imageUrl: "//i0.hdslb.com/bfs/live/meng.png@20h.webp",
    });

    expect(result).toEqual({
      status: "image",
      unique: "room_3990387_104804",
    });
  });

  it("uses a unique name only when URL matching has no result", () => {
    const result = resolveBilibiliEmoticonCatalog(catalog({
      emoticon_unique: "room_1_2",
      emoji: "主播开心",
      url: "//i0.hdslb.com/new-url.png",
    }), {
      emojiName: "[主播开心]",
      imageUrl: "//i0.hdslb.com/old-url.png",
    });

    expect(result).toEqual({ status: "image", unique: "room_1_2" });
  });

  it("rejects an ambiguous room-image lookup", () => {
    const result = resolveBilibiliEmoticonCatalog(catalog(
      {
        emoticon_unique: "room_1_2",
        emoji: "同名",
        url: "//i0.hdslb.com/one.png",
      },
      {
        emoticon_unique: "room_1_3",
        emoji: "同名",
        url: "//i0.hdslb.com/two.png",
      },
    ), {
      emojiName: "[同名]",
    });

    expect(result.status).toBe("ambiguous");
  });

  it("identifies a legacy ordinary Emoji instead of treating it as dm_type=1", () => {
    const result = resolveBilibiliEmoticonCatalog(catalog({
      emoticon_unique: "official_147",
      emoji: "大哭",
      url: "//i0.hdslb.com/bfs/emote/cry.png",
    }), {
      emojiName: "[大哭]",
      imageUrl: "//i0.hdslb.com/bfs/emote/cry.png@20h.webp",
      legacyInlineFallback: true,
    });

    expect(result.status).toBe("inline");
  });

  it("cancels a legacy name shared by inline and room-image resources", () => {
    const result = resolveBilibiliEmoticonCatalog(catalog(
      { emoticon_unique: "official_1", emoji: "同名" },
      { emoticon_unique: "room_1_2", emoji: "同名" },
    ), {
      emojiName: "[同名]",
      legacyInlineFallback: true,
    });

    expect(result.status).toBe("ambiguous");
  });

  it("does not guess when a legacy large image is absent from this room", () => {
    const result = resolveBilibiliEmoticonCatalog(catalog(), {
      emojiName: "[主播专属]",
      imageUrl: "//i0.hdslb.com/bfs/live/missing.png",
      legacyInlineFallback: true,
    });

    expect(result.status).toBe("missing");
  });
});
