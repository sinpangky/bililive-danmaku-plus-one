import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { resolve } from "node:path";
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
      entry: resolve(root, "src", "platforms", "live", "emoji-fallback.ts"),
      fileName: () => "emoji-fallback.js",
      formats: ["iife"],
      name: "DanmakuEchoEmojiFallback"
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
if (!source) throw new Error("Could not build Emoji fallback test module");
const context = {};
context.globalThis = context;
vm.runInNewContext(source, context, { filename: "emoji-fallback.js" });
const { unicodeEmojiFallbackText } = context.DanmakuEchoEmojiFallback;

test("uses the full message when every image asset has an exact Unicode Emoji token", () => {
  assert.equal(unicodeEmojiFallbackText({
    text: "晚上好 👩🏽‍💻",
    assets: [{ token: "👩🏽‍💻" }]
  }), "晚上好 👩🏽‍💻");
  assert.equal(unicodeEmojiFallbackText({
    text: "👨‍👩‍👧‍👦 🇨🇳 1️⃣",
    assets: [{ token: "👨‍👩‍👧‍👦" }, { token: "🇨🇳" }, { token: "1️⃣" }]
  }), "👨‍👩‍👧‍👦 🇨🇳 1️⃣");
});

test("does not replace platform image Emoji with a bracketed resource name", () => {
  assert.equal(unicodeEmojiFallbackText({
    text: "[主播挥手]",
    assets: [{ token: "[主播挥手]" }]
  }), "");
});

test("requires a Unicode token for every image asset", () => {
  assert.equal(unicodeEmojiFallbackText({
    text: "你好 👋",
    assets: [{ token: "👋" }, { token: "" }]
  }), "");
  assert.equal(unicodeEmojiFallbackText({ text: "你好 👋", assets: [] }), "");
});

test("all three live adapters use the shared lossless Emoji fallback", () => {
  const sharedLiveSource = readFileSync(resolve(root, "src", "entries", "content.ts"), "utf8");
  const douyinSource = readFileSync(resolve(root, "src", "entries", "douyin-content.ts"), "utf8");
  assert.match(sharedLiveSource, /const unicodeFallback = unicodeEmojiFallbackText\(payload\);/);
  assert.match(sharedLiveSource, /repeatPlatformRichPayload\(richPayload\);/);
  assert.match(douyinSource, /const unicodeFallback = unicodeEmojiFallbackText\(payload\);/);
  assert.match(douyinSource, /reason: "unicode-emoji-fallback"/);
});

test("Douyin keeps native image-only Emoji renderable and confirms direct panel sends", () => {
  const contentSource = readFileSync(resolve(root, "src", "entries", "douyin-content.ts"), "utf8");
  const pageHookSource = readFileSync(resolve(root, "src", "entries", "douyin-page-hook.ts"), "utf8");
  assert.match(contentSource, /function richPayloadFromRendererContent\(canvasText, rendererContent\)/);
  assert.match(contentSource, /return mergeRendererPayloadWithChatRow\(rendererPayload, matched, canvasText\)/);
  assert.match(contentSource, /waitForOwnMessageConfirmation\(ownIntentId, 3200\)/);
  assert.match(contentSource, /"\[class\*='emoji-icon' i\]"/);
  assert.match(contentSource, /\(!isVisible\(element\) && !insideEmojiSurface\)/);
  assert.match(contentSource, /debugEvent\("emoji-asset-not-found"/);
  assert.match(pageHookSource, /barrageInteractionText\(description\.text, description\.imageCount\)/);
  assert.match(pageHookSource, /type: "own-message-consumed"/);
});

test("Douyin frames manually sent native Emoji by resource identity", () => {
  const contentSource = readFileSync(resolve(root, "src", "entries", "douyin-content.ts"), "utf8");
  const pageHookSource = readFileSync(resolve(root, "src", "entries", "douyin-page-hook.ts"), "utf8");
  assert.match(contentSource, /function rememberManualEmojiClick\(event\)/);
  assert.match(contentSource, /document\.addEventListener\("click", rememberManualEmojiClick, true\)/);
  assert.match(contentSource, /type: "own-message-intent",[\s\S]*?plainText: payload\.plainText,[\s\S]*?assets: payload\.assets/);
  assert.match(pageHookSource, /allAssetsMatch\(item\.assets, observedAssets\)/);
  assert.match(pageHookSource, /!item\.text \|\| item\.text === normalized/);
  assert.match(pageHookSource, /own: consumeOwnMessage\(description\.text, content\)/);
});

test("Douyin detects manual sends and reconciles a renderer race", () => {
  const contentSource = readFileSync(resolve(root, "src", "entries", "douyin-content.ts"), "utf8");
  const pageHookSource = readFileSync(resolve(root, "src", "entries", "douyin-page-hook.ts"), "utf8");
  assert.match(contentSource, /debugEvent\("manual-send-detected"/);
  assert.match(contentSource, /const clickedSend = path\.find/);
  assert.match(contentSource, /matchesAny\(item, SEND_BUTTON_SELECTORS\)/);
  assert.match(pageHookSource, /function reconcileRecentOwnMessage\(item, now\)/);
  assert.match(pageHookSource, /track\.renderer\.barrage\.dataset\.own = "true"/);
  assert.match(pageHookSource, /"own-barrage-reconciled"/);
});

test("Douyin never selects the whole page while clearing a failed rich +1", () => {
  const contentSource = readFileSync(resolve(root, "src", "entries", "douyin-content.ts"), "utf8");
  assert.doesNotMatch(contentSource, /execCommand\("selectAll"/);
  assert.match(contentSource, /range\.selectNodeContents\(input\)/);
  assert.match(contentSource, /selection\.removeAllRanges\(\);[\s\S]*?selection\.addRange\(range\)/);
  assert.match(contentSource, /cancelOwnMessageAnnouncement\(ownIntentId\);[\s\S]*?setInputValue\(input, ""\)/);
});

test("favorites accepts complete rich payloads instead of rejecting image Emoji", () => {
  const launcherSource = readFileSync(resolve(root, "src", "features", "favorites", "launcher.ts"), "utf8");
  assert.doesNotMatch(launcherSource, /暂不支持收藏/);
  assert.match(launcherSource, /repository\.favorite\(text, room\(\), payload\)/);
  assert.match(launcherSource, /options\.sendFavorite\(item\.payload\)/);
});
