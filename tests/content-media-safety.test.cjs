'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const contentSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'entries', 'content.ts'),
  'utf8',
)

test('rejects media-bearing overlay candidates and builds inert frozen snapshots', () => {
  assert.match(contentSource, /from ['"]\.\.\/platforms\/live\/inert-snapshot['"]/)
  const freezeOverlaySource = contentSource.match(
    /function freezeOverlayCandidate\(candidate\) \{[\s\S]*?\n  \}/,
  )
  assert.ok(freezeOverlaySource, 'freezeOverlayCandidate should exist')
  assert.match(
    freezeOverlaySource[0],
    /createInertOverlaySnapshot\(candidate, \{[\s\S]*?skipSelector: INERT_SNAPSHOT_SKIP_SELECTOR/,
  )
  assert.match(
    freezeOverlaySource[0],
    /snapshot\.classList\.add\(["']bcp-one-frozen["'], ["']bcp-one-target["']\)/,
  )
  assert.doesNotMatch(freezeOverlaySource[0], /cloneNode/)
  assert.doesNotMatch(contentSource, /\.cloneNode\(/)
  assert.match(contentSource, /INERT_SNAPSHOT_SKIP_SELECTOR/)
})

test('keeps long-running Bilibili hover work bounded', () => {
  assert.match(contentSource, /const BILIBILI_OVERLAY_CACHE_TTL = 180/)
  assert.match(contentSource, /const BILIBILI_OVERLAY_CACHE_LIMIT = 240/)
  assert.match(contentSource, /const BILIBILI_OVERLAY_ROW_SELECTOR = ['"]\.bili-danmaku-x-dm['"]/)
  assert.match(contentSource, /const SENDER_SCAN_MIN_INTERVAL = 240/)

  const overlayCandidatesSource = contentSource.match(
    /function overlayMessageCandidates\(\) \{[\s\S]*?\n  \}/,
  )
  assert.ok(overlayCandidatesSource, 'overlayMessageCandidates should exist')
  assert.match(overlayCandidatesSource[0], /queryDocumentElements\(config\.overlayMessages\)/)
  assert.match(overlayCandidatesSource[0], /\.map\(normalizeOverlayCandidate\)/)
  assert.match(contentSource, /function normalizeOverlayCandidate\(element\)/)
  assert.match(
    contentSource,
    /function richPayloadFromCandidate\(candidate\) \{[\s\S]*?candidate\.matches\(BILIBILI_OVERLAY_ROW_SELECTOR\)[\s\S]*?!candidate\.querySelector\(['"]img['"]\)[\s\S]*?content\.textContent/,
  )
  assert.match(
    contentSource,
    /function messageRows\(\) \{[\s\S]*?isInsideBilibiliVideoOverlay\(element\)/,
  )

  const findCandidateSource = contentSource.match(/function findCandidate\(path\) \{[\s\S]*?\n  \}/)
  assert.ok(findCandidateSource, 'findCandidate should exist')
  assert.match(findCandidateSource[0], /closestFromPath\(path, config\.overlayMessages\)/)
  assert.match(
    findCandidateSource[0],
    /closestFromPath\(path, config\.messages\)/,
    'Bilibili side-chat messages should remain discoverable when their capsule is enabled',
  )
  assert.doesNotMatch(findCandidateSource[0], /if \(platformId === ['"]bilibili['"]\) return null/)
  assert.match(
    contentSource,
    /function pathInsideEnabledBilibiliSurface\(path\)[\s\S]*?state\.settings\.sideChatCapsule\.bilibili[\s\S]*?findChatRoot\(path\)/,
  )

  const selectCandidateSource = contentSource.match(
    /function selectCandidate\(candidate, kind, allowNoVisibleActions\) \{[\s\S]*?\n  \}/,
  )
  assert.ok(selectCandidateSource, 'selectCandidate should exist')
  assert.match(selectCandidateSource[0], /freezeOverlayCandidate\(candidate\)/)
  assert.match(selectCandidateSource[0], /\{\s*scanDom:\s*false,?\s*\}/)
  assert.ok(
    selectCandidateSource[0].indexOf('freezeOverlayCandidate(candidate)') <
      selectCandidateSource[0].indexOf('senderFromCandidate('),
    'the moving overlay must be frozen before sender correlation work',
  )
  const pointerMoveSource = contentSource.match(/function onPointerMove\(event\) \{[\s\S]*?\n  \}/)
  assert.ok(pointerMoveSource, 'onPointerMove should exist')
  assert.match(contentSource, /function pathInsideEnabledBilibiliSurface\(path\)/)
  assert.match(
    contentSource,
    /function onPointerOver\(event\)[\s\S]*?!pathInsideEnabledBilibiliSurface\(path\)/,
  )
  assert.match(
    contentSource,
    /function onPointerMove\(event\)[\s\S]*?!pathInsideEnabledBilibiliSurface\(path\)[\s\S]*?findOverlayAtPoint/,
  )
  assert.match(
    contentSource,
    /function onAltClick\(event\)[\s\S]*?!pathInsideEnabledBilibiliSurface\(path\)/,
  )
  assert.match(
    contentSource,
    /if \(target && isInsideBilibiliPlayerOutsideChat\(target\)\) \{\s*return false/,
  )
})

test('resumes the Bilibili runtime after BFCache restore and starts before idle', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'public', 'manifest.json'), 'utf8'),
  )
  const bilibiliEntry = manifest.content_scripts.find((entry) =>
    (entry.matches || []).includes('*://live.bilibili.com/*'),
  )
  assert.equal(bilibiliEntry?.run_at, 'document_end')
  assert.match(contentSource, /function onPageHide\(event\)/)
  assert.match(
    contentSource,
    /if \(event && event\.persisted\)[\s\S]*?releaseTransientResources\(\)/,
  )
  assert.match(
    contentSource,
    /function onPageShow\(event\)[\s\S]*?resumeRuntime\(['"]bfcache['"]\)/,
  )
  assert.match(contentSource, /addEventListener\(['"]pageshow['"], onPageShow\)/)
  assert.match(contentSource, /runtime\.player-remounted/)
})

test('positions overlay actions below danmaku and side-chat actions outside the selected row', () => {
  const positionSource = contentSource.match(/function updateButtonPosition\(\) \{[\s\S]*?\n  \}/)
  assert.ok(positionSource, 'updateButtonPosition should exist')
  assert.match(
    positionSource[0],
    /if \(state\.candidateKind === ['"]chat['"]\)[\s\S]*?const preferredLeft = rect\.left - buttonRect\.width - 6[\s\S]*?const fallbackRight = rect\.right \+ 6[\s\S]*?left = preferredLeft >= 8 \? preferredLeft : fallbackRight[\s\S]*?top = rect\.top \+ \(rect\.height - buttonRect\.height\) \/ 2/,
  )
  assert.match(positionSource[0], /const preferredTop = rect\.bottom \+ 8/)
  assert.match(positionSource[0], /const fallbackTop = rect\.top - buttonRect\.height - 8/)
  assert.doesNotMatch(positionSource[0], /rect\.right - buttonRect\.width/)
})

test('keeps the selected side-chat row active across the pointer path to its action bar', () => {
  assert.match(
    contentSource,
    /function isInsideChatHoverZone\(x, y\)[\s\S]*?Math\.min\(candidateRect\.left, actionRect\.left\)[\s\S]*?pointInside\(hoverRect, x, y, 4\)/,
  )
  assert.match(
    contentSource,
    /function onPointerOver\(event\)[\s\S]*?isInsideChatHoverZone\(event\.clientX, event\.clientY\)/,
  )
  assert.match(
    contentSource,
    /function onPointerMove\(event\)[\s\S]*?isInsideChatHoverZone\(state\.pointerX, state\.pointerY\)/,
  )
  assert.match(
    contentSource,
    /function onViewportChange\(\)[\s\S]*?state\.candidateKind === ['"]chat['"][\s\S]*?updateButtonPosition\(\)/,
  )
})

test('scales the complete action bar with the rendered danmaku font size', () => {
  const positionSource = contentSource.match(/function updateButtonPosition\(\) \{[\s\S]*?\n  \}/)
  assert.ok(positionSource, 'updateButtonPosition should exist')
  assert.match(positionSource[0], /const renderedFontSize = computedFontSize \* renderedScale/)
  assert.match(positionSource[0], /renderedFontSize \/ state\.actionReferenceFontSize/)
  assert.match(positionSource[0], /setProperty\(['"]--bcp-action-scale['"]/)

  const overlaySource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'live', 'ContentOverlay.vue'),
    'utf8',
  )
  assert.match(overlaySource, /transform:\s*scale\(var\(--bcp-action-scale, 1\)\)/)
  assert.match(overlaySource, /transform-origin:\s*top left/)
})
