import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";
import { build } from "vite";

const root = resolve(import.meta.dirname, "..");
const buildResult = await build({
  configFile: false,
  logLevel: "silent",
  publicDir: false,
  root,
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(root, "src", "features", "favorites", "index.ts"),
      fileName: () => "favorites-model.js",
      formats: ["iife"],
      name: "DanmakuEchoFavoritesModel"
    },
    minify: false,
    outDir: resolve(root, "build", "test-artifacts"),
    sourcemap: false,
    target: "chrome110",
    write: false
  }
});
const output = Array.isArray(buildResult) ? buildResult[0] : buildResult;
const source = output.output.find((entry) => entry.type === "chunk")?.code;
if (!source) throw new Error("Could not build favorites model test module");
const context = { crypto: globalThis.crypto, URL };
context.globalThis = context;
vm.runInNewContext(source, context, { filename: "favorites-model.js" });
const favorites = context.DanmakuEchoFavoritesModel;

function memoryStorage(initial = {}) {
  const values = JSON.parse(JSON.stringify(initial));
  return {
    get(key, callback) {
      callback({ [key]: values[key] });
    },
    set(update, callback) {
      Object.assign(values, JSON.parse(JSON.stringify(update)));
      callback();
    }
  };
}

const roomA = {
  platform: "bilibili",
  roomId: "100",
  roomKey: "bilibili:100",
  roomName: "A主播",
  url: "https://live.bilibili.com/100"
};
const roomB = {
  platform: "bilibili",
  roomId: "200",
  roomKey: "bilibili:200",
  roomName: "B主播",
  url: "https://live.bilibili.com/200"
};

test("normalizes first-version plain text while preserving Unicode emoji", () => {
  assert.equal(favorites.normalizeFavoriteText("  前方\n高能 😀\u200B  "), "前方 高能 😀");
  assert.equal(favorites.normalizeFavoriteText("程序员 👩‍💻 一起加油"), "程序员 👩‍💻 一起加油");
  assert.equal(favorites.favoriteKey("ＡＢＣ！"), "abc!");
  assert.equal(Array.from(favorites.normalizeFavoriteText("弹".repeat(1_100))).length, 1_000);
});

test("deduplicates global content and records multiple room origins", async () => {
  const repository = favorites.createFavoritesRepository(memoryStorage());
  await repository.load();
  await repository.favorite("主播太强了 😀", roomA);
  await repository.favorite("主播太强了 😀", roomB);
  assert.equal(repository.database.items.length, 1);
  assert.deepEqual(
    Array.from(repository.database.items[0].origins, (origin) => origin.roomKey).sort(),
    [roomA.roomKey, roomB.roomKey]
  );
});

test("stores image Emoji and mixed content as a resendable favorite payload", async () => {
  const repository = favorites.createFavoritesRepository(memoryStorage());
  await repository.load();
  const waving = {
    keys: ["raw:https://example.com/wave.png?sign=old", "file:wave.png", "name:主播挥手"],
    src: "https://example.com/wave.png?sign=old",
    token: "[主播挥手]"
  };
  const saved = await repository.favorite("晚上好 [主播挥手]", roomA, {
    text: "晚上好 [主播挥手]",
    plainText: "晚上好",
    assets: [waving],
    parts: [
      { type: "text", text: "晚上好 " },
      { type: "emoji", asset: waving }
    ]
  });

  assert.equal(saved.item.payload.assets.length, 1);
  assert.equal(saved.item.payload.assets[0].token, "[主播挥手]");
  assert.deepEqual(
    Array.from(saved.item.payload.parts, (part) => part.type),
    ["text", "emoji"]
  );
  assert.equal(saved.item.payload.plainText, "晚上好");
  assert.equal(saved.item.text, "晚上好 [主播挥手]");
});

test("shows platform image names from tokens and metadata instead of generic labels", async () => {
  assert.equal(favorites.favoriteAssetDisplayName({
    keys: ["file:emoji_100.webp"],
    src: "https://example.com/emoji_100.webp",
    token: "[害羞]"
  }), "[害羞]");
  assert.equal(favorites.favoriteAssetDisplayName({
    keys: [
      "name:https://example.com/emoji.webp?sign=temporary",
      "name:害羞",
      "file:4fe19d82280f42ab.webp"
    ],
    src: "https://example.com/emoji.webp?sign=temporary",
    token: ""
  }), "[害羞]");

  const repository = favorites.createFavoritesRepository(memoryStorage());
  await repository.load();
  const shy = {
    keys: ["name:害羞", "file:4fe19d82280f42ab.webp"],
    src: "https://example.com/4fe19d82280f42ab.webp",
    token: ""
  };
  const saved = await repository.favorite("表情", roomA, {
    text: "表情",
    plainText: "真的",
    assets: [shy],
    parts: [
      { type: "text", text: "真的" },
      { type: "emoji", asset: shy }
    ]
  });

  assert.equal(saved.item.text, "真的 [害羞]");
  assert.equal(saved.item.normalizedText.includes("害羞"), true);
});

test("distinguishes rich favorites with the same display text by resource identity", async () => {
  const repository = favorites.createFavoritesRepository(memoryStorage());
  await repository.load();
  const payload = (file) => ({
    text: "图片表情",
    plainText: "",
    assets: [{ keys: [`file:${file}`], src: `https://example.com/${file}`, token: "" }]
  });

  await repository.favorite("图片表情", roomA, payload("first.png"));
  await repository.favorite("图片表情", roomA, payload("second.png"));
  await repository.favorite("图片表情", roomB, payload("first.png"));

  assert.equal(repository.database.items.length, 2);
  const shared = repository.database.items.find((item) =>
    item.payload.assets[0].keys.includes("file:first.png"));
  assert.deepEqual(
    Array.from(shared.origins, (origin) => origin.roomKey).sort(),
    [roomA.roomKey, roomB.roomKey]
  );
});

test("loads legacy text favorites into the rich-capable schema without data loss", async () => {
  const legacy = {
    danmakuEchoFavoritesV1: {
      schemaVersion: 1,
      updatedAt: 1,
      items: [{
        id: "legacy",
        text: "旧版收藏 😀",
        normalizedText: "旧版收藏 😀",
        createdAt: 1,
        updatedAt: 1,
        lastSentAt: 0,
        totalSendCount: 0,
        globalPinned: false,
        origins: [],
        roomStats: {}
      }]
    }
  };
  const repository = favorites.createFavoritesRepository(memoryStorage(legacy));
  await repository.load();

  assert.equal(repository.database.schemaVersion, 2);
  assert.equal(repository.database.items[0].text, "旧版收藏 😀");
  assert.equal(repository.database.items[0].payload.text, "旧版收藏 😀");
  assert.equal(repository.database.items[0].payload.assets.length, 0);
});

test("upgrades an existing generic rich favorite to its saved image name on load", async () => {
  const legacy = {
    danmakuEchoFavoritesV1: {
      schemaVersion: 2,
      updatedAt: 1,
      items: [{
        id: "generic-rich",
        text: "图片表情",
        payload: {
          text: "图片表情",
          plainText: "",
          assets: [{ keys: ["name:害羞"], src: "", token: "" }],
          parts: [{
            type: "emoji",
            asset: { keys: ["name:害羞"], src: "", token: "" }
          }]
        },
        normalizedText: "图片表情",
        createdAt: 1,
        updatedAt: 1,
        lastSentAt: 0,
        totalSendCount: 0,
        globalPinned: false,
        origins: [],
        roomStats: {}
      }]
    }
  };
  const repository = favorites.createFavoritesRepository(memoryStorage(legacy));
  await repository.load();

  assert.equal(repository.database.items[0].text, "[害羞]");
  assert.equal(repository.database.items[0].normalizedText.includes("害羞"), true);
});

test("sorts favorites by send count by default while preserving room filters", async () => {
  const repository = favorites.createFavoritesRepository(memoryStorage());
  await repository.load();
  const fromA = await repository.favorite("A房收藏", roomA);
  const fromB = await repository.favorite("B房收藏", roomB);
  await repository.recordSent(fromB.item.id, roomA);
  const all = favorites.rankedFavorites(repository.database.items, roomA, "all");
  assert.equal(all[0].id, fromB.item.id);
  assert.equal(all.some((item) => item.id === fromB.item.id), true);
  assert.deepEqual(
    Array.from(favorites.rankedFavorites(repository.database.items, roomA, "current"), (item) => item.id),
    [fromA.item.id]
  );
  assert.deepEqual(
    Array.from(favorites.rankedFavorites(repository.database.items, roomA, "other"), (item) => item.id),
    [fromB.item.id]
  );
});

test("supports ascending and descending collection-time sorting", async () => {
  const repository = favorites.createFavoritesRepository(memoryStorage());
  await repository.load();
  const older = await repository.favorite("较早收藏", roomA);
  const newer = await repository.favorite("较晚收藏", roomA);
  older.item.createdAt = 1_000;
  older.item.origins[0].collectedAt = 1_000;
  older.item.roomStats[roomA.roomKey].addedToRoomAt = 1_000;
  newer.item.createdAt = 2_000;
  newer.item.origins[0].collectedAt = 2_000;
  newer.item.roomStats[roomA.roomKey].addedToRoomAt = 2_000;
  older.item.totalSendCount = 5;

  assert.deepEqual(
    Array.from(favorites.rankedFavorites(
      repository.database.items, roomA, "current", "", "send-count"
    ), (item) => item.text),
    ["较早收藏", "较晚收藏"]
  );
  assert.deepEqual(
    Array.from(favorites.rankedFavorites(
      repository.database.items, roomA, "current", "", "time-desc"
    ), (item) => item.text),
    ["较晚收藏", "较早收藏"]
  );
  assert.deepEqual(
    Array.from(favorites.rankedFavorites(
      repository.database.items, roomA, "current", "", "time-asc"
    ), (item) => item.text),
    ["较早收藏", "较晚收藏"]
  );
});

test("groups other and all favorites by room before exposing messages", async () => {
  const repository = favorites.createFavoritesRepository(memoryStorage());
  await repository.load();
  const onlyA = await repository.favorite("A房弹幕", roomA);
  const shared = await repository.favorite("跨房弹幕", roomA);
  await repository.favorite("跨房弹幕", roomB);
  const onlyB = await repository.favorite("B房弹幕", roomB);
  shared.item.totalSendCount = 4;
  onlyB.item.totalSendCount = 2;
  onlyA.item.totalSendCount = 1;

  const otherGroups = favorites.groupedFavorites(
    repository.database.items, roomA, "other"
  );
  assert.deepEqual(Array.from(otherGroups, (group) => group.roomName), ["B主播"]);
  assert.deepEqual(
    Array.from(otherGroups[0].items, (item) => item.text),
    ["跨房弹幕", "B房弹幕"]
  );

  const allGroups = favorites.groupedFavorites(
    repository.database.items, roomA, "all"
  );
  assert.equal(allGroups[0].roomKey, roomA.roomKey);
  assert.equal(allGroups[0].isCurrentRoom, true);
  assert.deepEqual(
    Array.from(allGroups, (group) => [group.roomName, group.items.length]),
    [["A主播", 2], ["B主播", 2]]
  );
});

test("can promote an other-room favorite into the current room without duplicating it", async () => {
  const repository = favorites.createFavoritesRepository(memoryStorage());
  await repository.load();
  const saved = await repository.favorite("跨房间也能发送", roomB);
  assert.equal(favorites.rankedFavorites(repository.database.items, roomA, "current").length, 0);
  await repository.addToRoom(saved.item.id, roomA);
  const current = favorites.rankedFavorites(repository.database.items, roomA, "current");
  assert.equal(current.length, 1);
  assert.equal(current[0].id, saved.item.id);
  assert.equal(current[0].belongsToCurrentRoom, true);
  assert.equal(
    saved.item.origins.some((origin) => origin.roomKey === roomA.roomKey
      && origin.roomName === roomA.roomName),
    true
  );
  assert.equal(repository.database.items.length, 1);
});

test("derives stable platform room identifiers from live URLs", () => {
  assert.equal(favorites.roomIdFromLocation("bilibili", "https://live.bilibili.com/12345?x=1"), "12345");
  assert.equal(favorites.roomIdFromLocation("douyin", "https://live.douyin.com/923572354274"), "923572354274");
  assert.equal(
    favorites.roomIdFromLocation(
      "douyin",
      "https://live.douyin.com/923572354274?anchor_id=3712416599779096"
    ),
    "923572354274"
  );
  assert.equal(favorites.roomIdFromLocation("huya", "https://www.huya.com/some-room"), "some-room");
});

test("keeps only the themed outer ring on the favorites radial menu", () => {
  const styles = readFileSync(resolve(root, "src", "styles", "favorites.css"), "utf8");
  assert.doesNotMatch(styles, /\.bcp-favorites-panel::before/);
  assert.match(styles, /\.bcp-favorites-radial::before\s*\{[\s\S]*?border:\s*2px solid var\(--bcp-favorite-accent\)/);
  assert.match(styles, /\.bcp-favorites-radial-item\s*\{[\s\S]*?border:\s*0;/);
  assert.doesNotMatch(styles, /\.bcp-favorites-radial-item\.is-selected\s*\{[\s\S]*?border-color:/);
});
