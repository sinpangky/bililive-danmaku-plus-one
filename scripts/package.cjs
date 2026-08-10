"use strict";

const { createHash } = require("node:crypto");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} = require("node:fs");
const { extname, isAbsolute, join, relative, resolve, sep } = require("node:path");
const { unzipSync, zipSync } = require("fflate");

const root = resolve(__dirname, "..");
const REQUIRED_ENTRIES = Object.freeze([
  "manifest.json",
  "LICENSE",
  "NOTICE.md",
  "README.md",
  "index.html",
  "assets/danmaku-echo-icon.png",
  "assets/icons/icon-128.png",
  "background/service-worker.js",
  "src/shared.js",
  "src/content.js",
]);
const STORED_EXTENSIONS = new Set([".avif", ".gif", ".jpg", ".jpeg", ".png", ".webp", ".zip"]);

function normalizedRelativePath(base, file) {
  return relative(base, file).split(sep).join("/");
}

function extensionFiles(directory) {
  const files = [];
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = join(current, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Build output contains an unsupported symbolic link: ${absolute}`);
      }
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  };
  visit(directory);
  return files;
}

function archiveInput(extensionRoot, licensePath, noticePath, readmePath) {
  const input = Object.create(null);
  for (const file of extensionFiles(extensionRoot)) {
    const name = normalizedRelativePath(extensionRoot, file);
    if (name === "LICENSE") continue;
    const level = STORED_EXTENSIONS.has(extname(name).toLowerCase()) ? 0 : 9;
    input[name] = [readFileSync(file), { level }];
  }
  input.LICENSE = [readFileSync(licensePath), { level: 9 }];
  input["NOTICE.md"] = [readFileSync(noticePath), { level: 9 }];
  input["README.md"] = [readFileSync(readmePath), { level: 9 }];
  return input;
}

function verifyArchive(data) {
  const entries = Object.keys(unzipSync(data)).sort();
  if (entries.some((entry) => entry.includes("\\"))) {
    throw new Error("ZIP contains non-standard backslash entry names.");
  }
  for (const required of REQUIRED_ENTRIES) {
    if (!entries.includes(required)) {
      throw new Error(`ZIP is missing required entry: ${required}`);
    }
  }
  return entries;
}

function packageArchive(options = {}) {
  const projectRoot = resolve(options.root || root);
  const extensionRoot = join(projectRoot, "build", "extension");
  const manifestPath = join(extensionRoot, "manifest.json");
  const licensePath = join(projectRoot, "LICENSE");
  const noticePath = join(projectRoot, "NOTICE.md");
  const readmePath = join(projectRoot, "README.md");
  if (!existsSync(manifestPath)) {
    throw new Error("Build output is missing. Run npm run build first.");
  }
  if (!existsSync(licensePath) || !statSync(licensePath).isFile()) {
    throw new Error("Project LICENSE is missing.");
  }
  if (!existsSync(noticePath) || !statSync(noticePath).isFile()) {
    throw new Error("Project NOTICE.md is missing.");
  }
  if (!existsSync(readmePath) || !statSync(readmePath).isFile()) {
    throw new Error("Project README.md is missing.");
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const outputArgument = String(options.outputDir || "").trim();
  const outputDir = outputArgument
    ? isAbsolute(outputArgument)
      ? resolve(outputArgument)
      : resolve(projectRoot, outputArgument)
    : join(projectRoot, "dist");
  const destination = join(outputDir, `bililive-danmaku-plus-one-v${manifest.version}.zip`);

  mkdirSync(outputDir, { recursive: true });
  rmSync(destination, { force: true });
  const data = zipSync(archiveInput(extensionRoot, licensePath, noticePath, readmePath), {
    level: 9,
    // ZIP stores local wall-clock fields. Constructing a local date keeps the
    // encoded timestamp identical on runners in different time zones.
    mtime: new Date(1980, 0, 1, 0, 0, 0),
  });
  verifyArchive(data);
  writeFileSync(destination, data);

  const hash = createHash("sha256").update(data).digest("hex").toUpperCase();
  return { destination, entries: verifyArchive(data), hash };
}

function run() {
  const result = packageArchive({ outputDir: process.argv[2] || "" });
  console.log(`Created: ${result.destination}`);
  console.log(`SHA256: ${result.hash}`);
}

if (require.main === module) run();

module.exports = { REQUIRED_ENTRIES, archiveInput, packageArchive, verifyArchive };
