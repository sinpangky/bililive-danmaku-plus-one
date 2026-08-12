# Bilibili Live +1 real-account matrix

This matrix is intentionally local-only. Do not add it to GitHub Actions or run it against a
publicly active room. Use a signed-in Chrome profile, an offline room where the account owns a
fan medal, and the unpacked local build.

## Preconditions

- Build with `npm run build-only` and reload `build/extension` on `chrome://extensions`.
- Open an offline `live.bilibili.com` room where the test account owns a fan medal.
- Enable overlay and side-chat actions in the extension settings.
- Open Bilibili's Emoji panel once and confirm that all equipped tabs have loaded.
- Use a unique text prefix for this run, for example `bcp-local-YYYYMMDD-HHMM`.

## Required cases

Run every payload through both sources: first hover the side-chat copy and click `+1`, then hover
the corresponding player-rendered danmaku and click `+1`. Wait at least one second between sends.

| Case | Payload kind | Expected output | Side chat | Player overlay |
| --- | --- | --- | --- | --- |
| 1 | Plain text | Exact text | Pending | Pending |
| 2 | Text + Unicode Emoji | Exact mixed text | Pending | Pending |
| 3 | Text + Bilibili inline Emoji | Exact text and inline Emoji | Pending | Pending |
| 4 | Room-specific panel Emoji | One native large Emoji | Pending | Pending |
| 5 | Equipped decoration panel Emoji | One native large Emoji | Pending | Pending |
| 6 | Fan-club level panel Emoji | One native large Emoji | Pending | Pending |

## Evidence to record

For each of the 12 cells, record the source message, resulting side-chat DOM kind (`text`, inline
image, or `data-type="1"` large Emoji), resulting player DOM kind, toast text, and whether Bilibili's
native panel tab changed. A large Emoji fails if the result is bracketed/plain text, if the wrong
pack item is sent, or if a locked item is selected.

The run passes only when all 12 cells produce the expected output without manual correction.
