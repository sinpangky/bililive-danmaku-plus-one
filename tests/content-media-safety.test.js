"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const contentSource = fs.readFileSync(
  path.join(__dirname, "..", "src", "entries", "content.ts"),
  "utf8"
);

test("rejects media-bearing overlay candidates and builds inert frozen snapshots", () => {
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
    /function containsActiveMediaDeep\(element\)/
  );
  assert.match(
    contentSource,
    /descendant\.shadowRoot/
  );
  assert.match(
    contentSource,
    /containsActiveMediaDeep\(element\)/
  );
  const freezeOverlaySource = contentSource.match(
    /function freezeOverlayCandidate\(candidate\) \{[\s\S]*?\n  \}/
  );
  assert.ok(freezeOverlaySource, "freezeOverlayCandidate should exist");
  assert.match(
    freezeOverlaySource[0],
    /createInertOverlaySnapshot\(candidate\)/
  );
  assert.doesNotMatch(freezeOverlaySource[0], /cloneNode/);
  assert.doesNotMatch(contentSource, /\.cloneNode\(/);
  assert.match(contentSource, /document\.createElement\("span"\)/);
  assert.match(contentSource, /INERT_SNAPSHOT_SKIP_SELECTOR/);
});
