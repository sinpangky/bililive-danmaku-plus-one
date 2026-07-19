import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "vite";
import vue from "@vitejs/plugin-vue";

const projectRoot = resolve(import.meta.dirname, "..");
const outputRoot = resolve(projectRoot, "build", "extension");

const staticDirectories = ["assets"];
const staticFiles = [
  ["manifest.json", "manifest.json"],
  ["README.md", "README.md"],
  ["LICENSE", "LICENSE"],
  ["src/popup/popup.html", "popup/popup.html"],
  ["src/popup/popup.css", "popup/popup.css"],
  ["src/styles/content.css", "src/content.css"],
  ["src/styles/douyin-content.css", "src/douyin-content.css"]
];
const bundles = [
  ["src/entries/service-worker.ts", "background/service-worker.js", "DanmakuEchoBackground"],
  ["src/core/shared.ts", "src/shared.js", "BulletPlusOneShared"],
  ["src/entries/content.ts", "src/content.js", "DanmakuEchoContent"],
  ["src/entries/douyin-bootstrap.ts", "src/douyin-bootstrap.js", "DanmakuEchoDouyinBootstrap"],
  ["src/entries/douyin-content.ts", "src/douyin-content.js", "DanmakuEchoDouyinContent"],
  ["src/entries/douyin-page-hook.ts", "src/douyin-page-hook.js", "DanmakuEchoDouyinPageHook"],
  ["src/popup/main.ts", "popup/popup.js", "DanmakuEchoPopup"]
];

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await Promise.all(["background", "popup", "src"].map((directory) => mkdir(
  resolve(outputRoot, directory),
  { recursive: true }
)));

for (const [entry, fileName, name] of bundles) {
  await build({
    configFile: false,
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      __VUE_OPTIONS_API__: "false",
      __VUE_PROD_DEVTOOLS__: "false",
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false"
    },
    plugins: [vue({ template: { transformAssetUrls: false } })],
    root: projectRoot,
    publicDir: false,
    logLevel: "warn",
    build: {
      emptyOutDir: false,
      lib: {
        entry: resolve(projectRoot, entry),
        formats: ["iife"],
        name,
        fileName: () => fileName
      },
      minify: false,
      outDir: outputRoot,
      sourcemap: false,
      target: "chrome110"
    }
  });
}

// Vite may reserve an HTML-shaped output path while emitting the popup bundle.
// Copy static extension files after every bundle so popup.html cannot be left as
// a zero-filled placeholder on Windows.
await Promise.all([
  ...staticDirectories.map((directory) => cp(
    resolve(projectRoot, directory),
    resolve(outputRoot, directory),
    { recursive: true }
  )),
  ...staticFiles.map(([source, target]) => cp(
    resolve(projectRoot, source),
    resolve(outputRoot, target)
  ))
]);

console.log(`Built extension: ${outputRoot}`);
