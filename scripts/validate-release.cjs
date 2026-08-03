"use strict";

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "public", "manifest.json"), "utf8"));
const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
const tag = String(process.argv[2] || process.env.GITHUB_REF_NAME || "").trim();
const expectedTag = `v${packageJson.version}`;

if (tag !== expectedTag) {
  throw new Error(`Release tag '${tag || "<empty>"}' must equal '${expectedTag}'.`);
}
if (manifest.version !== packageJson.version) {
  throw new Error(`Manifest ${manifest.version} does not match package ${packageJson.version}.`);
}
if (!new RegExp(`^## \\[${packageJson.version.replace(/\./g, "\\.")}\\](?:\\s|$)`, "m").test(changelog)) {
  throw new Error(`CHANGELOG.md is missing a [${packageJson.version}] heading.`);
}

execFileSync("git", ["merge-base", "--is-ancestor", "HEAD", "origin/main"], {
  cwd: root,
  stdio: "inherit",
});

console.log(`Release metadata validated for ${tag}.`);
