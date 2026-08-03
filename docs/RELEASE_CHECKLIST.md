# Release checklist

## Automated gates

- [ ] Release commit is on `main` and the working tree is clean.
- [ ] `package.json`, `public/manifest.json`, the `v*` tag, and the CHANGELOG heading use the same version.
- [ ] `npm ci` and `npm run check` pass on Windows and Fedora.
- [ ] Stable Chrome and Edge E2E pass without assertion retries.
- [ ] Three consecutive full CI runs pass before a store submission.
- [ ] The Windows release job produces one ZIP and `SHA256SUMS`.

## Manual live-room acceptance

- [ ] Chrome and Edge: Huya, Bilibili, Douyin, and Douyu side chat.
- [ ] Chrome and Edge: on-video danmaku and native fullscreen.
- [ ] Plain text, Unicode emoji, consecutive image emotes, and mixed text/image order.
- [ ] +1, reply preparation, favorite, sender correlation, and own-message outline.
- [ ] Existing schema-v2 favorites remain available after updating the unpacked/store build.
- [ ] No active rate-limit or mute testing through repeated real messages.

## Store submission

- [ ] Review Chinese and English listing text and screenshots.
- [ ] Confirm permissions and host matches are unchanged and necessary.
- [ ] Confirm remote-code answer is “No”.
- [ ] Confirm privacy disclosures match `docs/privacy/index.html`.
- [ ] Upload Chrome and Edge packages manually; no store API keys are stored in this repository.
