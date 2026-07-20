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
      entry: resolve(root, "src", "platforms", "live", "action-visibility.ts"),
      fileName: () => "live-action-visibility.js",
      formats: ["iife"],
      name: "DanmakuEchoLiveActionVisibility"
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
if (!source) throw new Error("Could not build live action visibility test module");
const context = {};
context.globalThis = context;
vm.runInNewContext(source, context, { filename: "live-action-visibility.js" });
const { visibleActionsForSurface } = context.DanmakuEchoLiveActionVisibility;

const settings = {
  actions: { plusOne: true, reply: true, favorite: true },
  sideChatCapsule: { huya: false, bilibili: false }
};

test("hides the complete side-chat capsule by default", () => {
  assert.deepEqual(
    { ...visibleActionsForSurface(settings, "huya", "chat") },
    { plusOne: false, reply: false, favorite: false }
  );
  assert.deepEqual(
    { ...visibleActionsForSurface(settings, "bilibili", "chat") },
    { plusOne: false, reply: false, favorite: false }
  );
});

test("enables each platform side-chat capsule independently", () => {
  const enabled = {
    ...settings,
    sideChatCapsule: { huya: true, bilibili: false }
  };
  assert.deepEqual(
    { ...visibleActionsForSurface(enabled, "huya", "chat") },
    { plusOne: true, reply: true, favorite: true }
  );
  assert.deepEqual(
    { ...visibleActionsForSurface(enabled, "bilibili", "chat") },
    { plusOne: false, reply: false, favorite: false }
  );
});

test("uses the existing global action choices inside an enabled capsule", () => {
  const customized = {
    actions: { plusOne: false, reply: true, favorite: false },
    sideChatCapsule: { huya: true, bilibili: true }
  };
  assert.deepEqual(
    { ...visibleActionsForSurface(customized, "bilibili", "chat") },
    { plusOne: false, reply: true, favorite: false }
  );
});

test("keeps video-overlay plus-one controlled by the existing global action", () => {
  assert.equal(visibleActionsForSurface(settings, "huya", "overlay").plusOne, true);
  assert.equal(visibleActionsForSurface(settings, "bilibili", "overlay").plusOne, true);
  assert.equal(visibleActionsForSurface({
    ...settings,
    actions: { ...settings.actions, plusOne: false }
  }, "huya", "overlay").plusOne, false);
});
