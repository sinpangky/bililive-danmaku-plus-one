"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const douyinMatches = [
  "*://live.douyin.com/*",
  "*://www.douyin.com/follow/live/*"
];

function hasAllDouyinMatches(entry) {
  return douyinMatches.every((match) => (entry.matches || []).includes(match));
}

if (manifest.manifest_version !== 3) {
  throw new Error("manifest_version must be 3");
}

const referencedFiles = [
  manifest.action && manifest.action.default_popup,
  manifest.background && manifest.background.service_worker,
  ...Object.values(manifest.icons || {}),
  ...Object.values((manifest.action && manifest.action.default_icon) || {}),
  ...manifest.content_scripts.flatMap((entry) => [...(entry.js || []), ...(entry.css || [])])
].filter(Boolean);

for (const relativePath of referencedFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    throw new Error(`Manifest references missing file: ${relativePath}`);
  }
}

const matches = manifest.content_scripts.flatMap((entry) => entry.matches);
for (const required of ["huya.com", "bilibili.com", "douyin.com"]) {
  if (!matches.some((match) => match.includes(required))) {
    throw new Error(`Missing host match for ${required}`);
  }
}

const bilibiliContentScript = manifest.content_scripts.find((entry) =>
  (entry.matches || []).includes("*://live.bilibili.com/*")
  && (entry.js || []).includes("src/content.js")
);
if (!bilibiliContentScript || bilibiliContentScript.all_frames !== true) {
  throw new Error("Bilibili content script must run in embedded activity-page frames");
}

const douyinContentScript = manifest.content_scripts.find((entry) =>
  hasAllDouyinMatches(entry)
  && (entry.js || []).includes("src/douyin-content.js")
);
if (!douyinContentScript || (douyinContentScript.js || []).includes("src/content.js")) {
  throw new Error("Douyin must use its dedicated content adapter");
}

const douyinPageHook = manifest.content_scripts.find((entry) =>
  hasAllDouyinMatches(entry)
  && (entry.js || []).includes("src/douyin-page-hook.js")
);
if (!douyinPageHook || douyinPageHook.run_at !== "document_start"
    || douyinPageHook.world !== "MAIN") {
  throw new Error("Douyin page hook must run in MAIN at document_start for every entry point");
}

const douyinBootstrap = manifest.content_scripts.find((entry) =>
  hasAllDouyinMatches(entry)
  && (entry.js || []).includes("src/douyin-bootstrap.js")
);
if (!douyinBootstrap || douyinBootstrap.run_at !== "document_start") {
  throw new Error("Douyin recovery bootstrap must run at document_start");
}
if (!(manifest.permissions || []).includes("scripting")
    || manifest.background?.service_worker !== "background/service-worker.js") {
  throw new Error("Douyin recovery requires the scripting fallback service worker");
}
if (!douyinMatches.every((match) => (manifest.host_permissions || []).includes(match))) {
  throw new Error("Douyin recovery permissions must cover direct and follow-live entry points");
}

console.log(`Manifest OK (${referencedFiles.length} referenced files, ${matches.length} host matches)`);
