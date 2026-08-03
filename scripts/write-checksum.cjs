"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const archives = fs.readdirSync(dist).filter((name) => name.endsWith(".zip")).sort();
if (archives.length !== 1) {
  throw new Error(`Expected exactly one release ZIP, found ${archives.length}.`);
}
const lines = archives.map((name) => {
  const digest = crypto.createHash("sha256").update(fs.readFileSync(path.join(dist, name))).digest("hex");
  return `${digest}  ${name}`;
});
fs.writeFileSync(path.join(dist, "SHA256SUMS"), `${lines.join("\n")}\n`, "utf8");
console.log(lines.join("\n"));
