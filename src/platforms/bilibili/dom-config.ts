/** Bilibili-only DOM selectors and action heuristics. */
export const BILIBILI_QUICK_BAR_SELECTORS = [
    ".bpx-player-ctrl-dm-input",
    ".bilibili-player-video-danmaku-input-wrap",
    ".bilibili-player-video-danmaku-input",
    "[class*='danmaku-input']",
    "[class*='dm-input']"
  ];
export const BILIBILI_QUICK_INPUTS = [
    ".bpx-player-dm-input",
    ".bilibili-player-video-danmaku-input",
    ".bpx-player-ctrl-dm-input input",
    ".bpx-player-ctrl-dm-input textarea",
    ".bpx-player-ctrl-dm-input [contenteditable]:not([contenteditable='false'])",
    ".bpx-player-ctrl-dm-input [role='textbox']",
    ".bilibili-player-video-danmaku-input-wrap input",
    ".bilibili-player-video-danmaku-input-wrap textarea",
    ".bilibili-player-video-danmaku-input-wrap [contenteditable]:not([contenteditable='false'])",
    ".bilibili-player-video-danmaku-input-wrap [role='textbox']"
  ];
export const BILIBILI_CHAT_ACTION_SURFACES = [
    "[role='dialog']",
    "[role='menu']",
    "[role='listbox']",
    "[class*='user-card']",
    "[class*='userCard']",
    "[class*='user-info']",
    "[class*='userInfo']",
    "[class*='user-panel']",
    "[class*='userPanel']",
    "[class*='profile-card']",
    "[class*='profileCard']",
    "[class*='danmaku-menu']",
    "[class*='danmakuMenu']",
    "[class*='action-panel']",
    "[class*='actionPanel']",
    "[class*='popover']",
    "[class*='popper']",
    "[class*='context-menu']",
    "[class*='contextMenu']"
  ];
export const BILIBILI_CHAT_ACTION_TEXT = /(?:@|举报|禁言|关注|取关|拉黑|屏蔽|用户资料|个人主页)/i;
export const BILIBILI_CHAT_STRONG_ACTION_TEXT = /(?:举报|禁言|关注|取关|拉黑|屏蔽|用户资料|个人主页)/i;
export const BILIBILI_CHAT_AD_SELECTORS = [
    "[data-ad-id]",
    "[data-adid]",
    "[data-ad-report]",
    "[data-ad-type]",
    "[data-advertisement]",
    "[data-advertise]",
    "[data-promotion]",
    "[data-promo]",
    "[class~='ad' i]",
    "[class*='chat-ad' i]",
    "[class*='chatAd']",
    "[class*='ad-card' i]",
    "[class*='adCard']",
    "[class*='advert' i]",
    "[class*='commercial' i]",
    "[class*='marketing' i]",
    "[class*='promotion' i]",
    "[class*='promote' i]",
    "[class*='recommend-card' i]",
    "[class*='recommendCard']"
  ];
export const BILIBILI_CHAT_AD_LABEL_SELECTORS = [
    "[data-ad-label]",
    "[class*='ad-label' i]",
    "[class*='adLabel']",
    "[class*='advert-label' i]",
    "[class*='promotion-label' i]",
    "[class*='tag' i]",
    "[class*='badge' i]",
    "[class*='label' i]"
  ];

export function isBilibiliAdvertisementMarker(value: unknown): boolean {
  return /(?:^|[\s_-])(?:ad|ads|advert|advertise|advertisement|commercial|marketing|promo|promote|promotion)(?:$|[\s_-])/i
    .test(String(value || ""));
}

export function isBilibiliAdvertisementLabel(value: unknown): boolean {
  return /^(?:广告|推广|推广内容|赞助|赞助内容|商业推广|活动推荐|推荐活动|去看看|立即查看|了解详情)$/i
    .test(String(value || "").replace(/\s+/g, "").trim());
}
export const BILIBILI_EMOJI_TOGGLE_SELECTORS = [
    "[data-testid*='emoji' i]",
    "[data-e2e*='emoji' i]",
    "[aria-label*='表情']",
    "[title*='表情']",
    "[class*='emoji-btn' i]",
    "[class*='emojiBtn']",
    "[class*='emoticon-btn' i]",
    "[class*='emotion-btn' i]",
    "[class*='face-btn' i]",
    "button[class*='emoji' i]",
    "button[class*='emoticon' i]",
    "button[class*='face' i]",
    "[role='button'][class*='emoji' i]",
    "[role='button'][class*='face' i]"
  ];
export const BILIBILI_EMOJI_SURFACE_SELECTORS = [
    "[data-testid*='emoji' i]",
    "[data-e2e*='emoji' i]",
    "[data-emoji-panel]",
    "[data-emoticon-panel]",
    "[class*='emoji-panel' i]",
    "[class*='emojiPanel']",
    "[class*='emoji-box' i]",
    "[class*='emojiBox']",
    "[class*='emote-panel' i]",
    "[class*='emotePanel']",
    "[class*='emoticon-panel' i]",
    "[class*='emoticonPanel']",
    "[class*='emoticon-wrap' i]",
    "[class*='emoticonWrap']",
    "[class*='emotion-panel' i]",
    "[class*='emotionPanel']",
    "[class*='emotion-box' i]",
    "[class*='emotionBox']",
    "[class*='face-panel' i]",
    "[class*='facePanel']",
    "[class*='emoji-list' i]",
    "[class*='emojiList']",
    "[class*='emote-list' i]",
    "[class*='emoteList']",
    "[class*='emoticon-list' i]",
    "[class*='emoticonList']",
    "[class*='emotion-list' i]",
    "[class*='emotionList']",
    "[class*='face-list' i]",
    "[class*='faceList']"
  ];
