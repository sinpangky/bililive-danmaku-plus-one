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
      entry: resolve(root, "src", "platforms", "douyin", "input-order.ts"),
      fileName: () => "douyin-input-order.js",
      formats: ["iife"],
      name: "DanmakuEchoDouyinInputOrder"
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
if (!source) throw new Error("Could not build Douyin input-order test module");
const context = {};
context.globalThis = context;
vm.runInNewContext(source, context, { filename: "douyin-input-order.js" });
const { appendedMutationValue } = context.DanmakuEchoDouyinInputOrder;

test("keeps consecutive Douyin image Emoji after existing text", () => {
  assert.equal(
    appendedMutationValue("你好", "[微笑][微笑]你好"),
    "你好[微笑][微笑]"
  );
});

test("moves an Emoji inserted at a stale caret back to the current end", () => {
  assert.equal(
    appendedMutationValue("打得不错啊[微笑]", "[微笑]打得不错啊[微笑]"),
    "打得不错啊[微笑][微笑]"
  );
});

test("leaves an already appended Emoji unchanged", () => {
  assert.equal(
    appendedMutationValue("你好", "你好[微笑]"),
    "你好[微笑]"
  );
});

test("does not rewrite unrelated editor mutations", () => {
  assert.equal(appendedMutationValue("你好", "您好啊"), null);
});
