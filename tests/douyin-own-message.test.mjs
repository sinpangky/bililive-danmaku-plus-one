import assert from "node:assert/strict";
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
      entry: resolve(root, "src", "platforms", "douyin", "own-message.ts"),
      fileName: () => "douyin-own-message.js",
      formats: ["iife"],
      name: "DanmakuEchoDouyinOwnMessage"
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
if (!source) throw new Error("Could not build Douyin own-message test module");
const context = {};
context.globalThis = context;
vm.runInNewContext(source, context, { filename: "douyin-own-message.js" });
const ownMessage = context.DanmakuEchoDouyinOwnMessage;

const asset = (...keys) => ({ src: "", token: "", keys });

test("matches a self-sent native Emoji by stable resource identity", () => {
  assert.equal(ownMessage.allAssetsMatch(
    [asset("path:/emoji/smile.png", "raw:old-signature")],
    [asset("path:/emoji/smile.png", "raw:new-signature")]
  ), true);
});

test("does not frame a different user's unrelated image Emoji", () => {
  assert.equal(ownMessage.allAssetsMatch(
    [asset("path:/emoji/smile.png")],
    [asset("path:/emoji/wave.png")]
  ), false);
  assert.equal(ownMessage.allAssetsMatch([], [asset("path:/emoji/smile.png")]), false);
});

test("requires a distinct observed asset for every expected Emoji", () => {
  assert.equal(ownMessage.allAssetsMatch(
    [asset("name:wave"), asset("name:wave")],
    [asset("name:wave")]
  ), false);
  assert.equal(ownMessage.allAssetsMatch(
    [asset("name:wave"), asset("name:wave")],
    [asset("name:wave"), asset("name:wave")]
  ), true);
});
