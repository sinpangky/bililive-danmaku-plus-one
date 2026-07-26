"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const packagePath = path.join(root, "package.json");
const manifestPath = path.join(root, "public", "manifest.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const manifestSource = fs.readFileSync(manifestPath, "utf8");
const manifest = JSON.parse(manifestSource);
const version = String(packageJson.version || "").trim();

if (!/^\d+(?:\.\d+){1,3}$/.test(version)) {
  throw new Error(`package.json contains an invalid extension version: ${version || "<empty>"}`);
}

if (manifest.version === version) {
  console.log(`Version already synchronized: ${version}`);
  process.exit(0);
}

const versionPattern = /("version"\s*:\s*")([^"]+)(")/;
if (!versionPattern.test(manifestSource)) {
  throw new Error("Could not find public/manifest.json version field");
}

fs.writeFileSync(
  manifestPath,
  manifestSource.replace(versionPattern, `$1${version}$3`),
  "utf8"
);
console.log(`Synchronized public/manifest.json version: ${manifest.version} -> ${version}`);
