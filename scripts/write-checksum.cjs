"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const archiveName = `bililive-danmaku-plus-one-v${packageJson.version}.zip`;
const archivePath = path.join(dist, archiveName);
if (!fs.existsSync(archivePath)) {
  throw new Error(`Current release ZIP is missing: ${archiveName}.`);
}
const digest = crypto.createHash("sha256").update(fs.readFileSync(archivePath)).digest("hex");
const lines = [`${digest}  ${archiveName}`];
fs.writeFileSync(path.join(dist, "SHA256SUMS"), `${lines.join("\n")}\n`, "utf8");
console.log(lines.join("\n"));
