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
    /from ['"]\.\.\/platforms\/live\/inert-snapshot['"]/
  );
  const freezeOverlaySource = contentSource.match(
    /function freezeOverlayCandidate\(candidate\) \{[\s\S]*?\n  \}/
  );
  assert.ok(freezeOverlaySource, "freezeOverlayCandidate should exist");
  assert.match(
    freezeOverlaySource[0],
    /createInertOverlaySnapshot\(candidate, \{[\s\S]*?skipSelector: INERT_SNAPSHOT_SKIP_SELECTOR/
  );
  assert.match(
    freezeOverlaySource[0],
    /snapshot\.classList\.add\(["']bcp-one-frozen["'], ["']bcp-one-target["']\)/
  );
  assert.doesNotMatch(freezeOverlaySource[0], /cloneNode/);
  assert.doesNotMatch(contentSource, /\.cloneNode\(/);
  assert.match(contentSource, /INERT_SNAPSHOT_SKIP_SELECTOR/);
});

test("keeps long-running Bilibili hover work bounded", () => {
  assert.match(contentSource, /const BILIBILI_OVERLAY_CACHE_TTL = 180/);
  assert.match(contentSource, /const BILIBILI_OVERLAY_CACHE_LIMIT = 240/);
  assert.match(contentSource, /const BILIBILI_OVERLAY_ROW_SELECTOR = ['"]\.bili-danmaku-x-dm['"]/);
  assert.match(contentSource, /const SENDER_SCAN_MIN_INTERVAL = 240/);

  const overlayCandidatesSource = contentSource.match(
    /function overlayMessageCandidates\(\) \{[\s\S]*?\n  \}/
  );
  assert.ok(overlayCandidatesSource, "overlayMessageCandidates should exist");
  assert.match(overlayCandidatesSource[0], /queryDocumentElements\(config\.overlayMessages\)/);
  assert.match(overlayCandidatesSource[0], /\.map\(normalizeOverlayCandidate\)/);
  assert.match(contentSource, /function normalizeOverlayCandidate\(element\)/);
  assert.match(
    contentSource,
    /function richPayloadFromCandidate\(candidate\) \{[\s\S]*?candidate\.matches\(BILIBILI_OVERLAY_ROW_SELECTOR\)[\s\S]*?!candidate\.querySelector\(['"]img['"]\)[\s\S]*?content\.textContent/
  );
  assert.match(
    contentSource,
    /function messageRows\(\) \{[\s\S]*?isInsideBilibiliVideoOverlay\(element\)/
  );

  const findCandidateSource = contentSource.match(
    /function findCandidate\(path\) \{[\s\S]*?\n  \}/
  );
  assert.ok(findCandidateSource, "findCandidate should exist");
  assert.ok(
    findCandidateSource[0].indexOf("closestFromPath(path, config.overlayMessages)")
      < findCandidateSource[0].indexOf("pathTouchesBilibiliQuickInput(path)"),
    "Bilibili video danmaku should take the fast path before chat-only guards"
  );

  const selectCandidateSource = contentSource.match(
    /function selectCandidate\(candidate, kind, allowNoVisibleActions\) \{[\s\S]*?\n  \}/
  );
  assert.ok(selectCandidateSource, "selectCandidate should exist");
  assert.match(selectCandidateSource[0], /freezeOverlayCandidate\(candidate\)/);
  assert.match(selectCandidateSource[0], /\{ scanDom: false \}/);
  assert.ok(
    selectCandidateSource[0].indexOf("freezeOverlayCandidate(candidate)")
      < selectCandidateSource[0].indexOf("senderFromCandidate("),
    "the moving overlay must be frozen before sender correlation work"
  );
  const pointerMoveSource = contentSource.match(
    /function onPointerMove\(event\) \{[\s\S]*?\n  \}/
  );
  assert.ok(pointerMoveSource, "onPointerMove should exist");
  assert.ok(
    pointerMoveSource[0].indexOf("state.frozenClone && state.frozenClone.isConnected")
      < pointerMoveSource[0].indexOf("pathTouchesBilibiliChatActions(path)"),
    "a frozen Bilibili danmaku must bypass chat-action detection"
  );
  assert.match(
    contentSource,
    /if \(target && isInsideBilibiliPlayerOutsideChat\(target\)\) \{\s*return false/
  );
});
