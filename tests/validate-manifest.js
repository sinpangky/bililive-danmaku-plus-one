"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

if (manifest.manifest_version !== 3) {
  throw new Error("manifest_version must be 3");
}

const referencedFiles = [
  manifest.action && manifest.action.default_popup,
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

console.log(`Manifest OK (${referencedFiles.length} referenced files, ${matches.length} host matches)`);
