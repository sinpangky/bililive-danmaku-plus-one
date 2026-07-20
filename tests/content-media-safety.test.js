"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const contentSource = fs.readFileSync(
  path.join(__dirname, "..", "src", "entries", "content.ts"),
  "utf8"
);

test("rejects media-bearing overlay candidates and sanitizes frozen clones", () => {
  assert.match(
    contentSource,
    /const ACTIVE_MEDIA_SELECTOR = "video, audio, iframe, object, embed";/
  );
  assert.match(
    contentSource,
    /element\.matches\(ACTIVE_MEDIA_SELECTOR\)/
  );
  assert.match(
    contentSource,
    /element\.querySelector\(ACTIVE_MEDIA_SELECTOR\)/
  );
  assert.match(
    contentSource,
    /clone\.querySelectorAll\(ACTIVE_MEDIA_SELECTOR\)\.forEach\(\(media\) => media\.remove\(\)\);/
  );
});
