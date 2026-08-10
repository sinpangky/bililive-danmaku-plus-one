# Release checklist

## Automated gates

- [ ] Release commit is on `main` and the working tree is clean.
- [ ] `package.json`, `public/manifest.json`, the `v*` tag, and the CHANGELOG heading use the same version.
- [ ] `npm ci` and `npm run check` pass on Windows and Fedora.
- [ ] Stable Chrome and Edge E2E pass without assertion retries.
- [ ] Three consecutive full CI runs pass before a store submission.
- [ ] The Windows release job produces one ZIP and `SHA256SUMS`.
- [ ] The ZIP contains `LICENSE`, `NOTICE.md`, and `README.md`, and the matching Git tag exposes the complete corresponding source.

## Manual live-room acceptance

- [ ] Chrome: Bilibili on-video danmaku in normal, web-fullscreen, and native fullscreen modes.
- [ ] The side chat and areas outside the player do not activate on-video danmaku selection.
- [ ] Plain text, Unicode emoji, consecutive image emotes, and mixed text/image order.
- [ ] +1, reply preparation, favorite, sender correlation, and own-message outline.
- [ ] Existing schema-v2 favorites remain available after updating the unpacked/store build.
- [ ] Manual favorites, custom drag order, unicycle configuration, and favorites-to-unicycle transfers work.
- [ ] No active rate-limit or mute testing through repeated real messages.

## Store submission

- [ ] Review Chinese and English listing text and screenshots.
- [ ] Confirm permissions and host matches are unchanged and necessary.
- [ ] Confirm remote-code answer is “No”.
- [ ] Confirm privacy disclosures match `docs/privacy/index.html`.
- [ ] Load or upload the Chrome package manually; no store API keys are stored in this repository.
