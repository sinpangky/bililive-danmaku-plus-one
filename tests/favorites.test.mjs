import assert from "node:assert/strict";
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

function memoryStorage() {
  const values = {};
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
