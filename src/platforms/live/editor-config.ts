export const EDITABLE_CONTROL_SELECTOR = [
  'input',
  'textarea',
  "[contenteditable]:not([contenteditable='false'])",
  "[role='textbox']",
].join(',')

export const TEXT_EDITOR_SELECTOR = [
  'textarea',
  'input:not([type])',
  "input[type='text']",
  "input[type='search']",
  "[contenteditable]:not([contenteditable='false'])",
  "[role='textbox']",
].join(',')

export const HUYA_EMOJI_TOGGLE_SELECTORS = [
  "[data-testid*='emoji' i]",
  "[data-e2e*='emoji' i]",
  "[aria-label*='表情']",
  "[title*='表情']",
  "[class*='emoji-btn' i]",
  "[class*='emoticon-btn' i]",
  "[class*='emotion-btn' i]",
  "[class*='face-btn' i]",
  "[class*='faceBtn']",
  "button[class*='emoji' i]",
  "button[class*='face' i]",
  "[role='button'][class*='face' i]",
]

export const HUYA_EMOJI_SURFACE_SELECTORS = [
  "[data-testid*='emoji-panel' i]",
  "[data-e2e*='emoji-panel' i]",
  "[class*='emoji-panel' i]",
  "[class*='emoticon-panel' i]",
  "[class*='emotion-panel' i]",
  "[class*='face-panel' i]",
  "[class*='facePanel']",
  "[class*='emoji-list' i]",
  "[class*='emoticon-list' i]",
  "[class*='face-list' i]",
  "[class*='faceList']",
]

export const DOUYU_EMOJI_TOGGLE_SELECTORS = [
  '.EmotionSwitcher',
  ".EmotionSwitcher[title='表情']",
  '.ChatEmotion > [title]',
  "[class*='EmotionSwitcher']",
]

export const DOUYU_EMOJI_SURFACE_SELECTORS = [
  '.Emotion-wrap',
  '.Emotion-container',
  '.EmotionList',
  '.AssembleExpressHeader',
  "[class*='EmotionList']",
]

export const PLATFORM_EMOJI_ITEM_SELECTORS = [
  '[data-emoji]',
  '[data-emoji-name]',
  '[data-emoji-text]',
  '[data-emoji-code]',
  '[data-emoji-id]',
  '[data-emoticon]',
  '[data-emoticon-name]',
  '[data-emoticon-text]',
  '[data-emoticon-unique]',
  '[data-emoticon-id]',
  '[data-file-id]',
  "[class*='emoji-item' i]",
  "[class*='emojiItem']",
  "[class*='emote-item' i]",
  "[class*='emoteItem']",
  "[class*='emoticon-item' i]",
  "[class*='face-item' i]",
  "[class*='faceItem']",
  "[class*='emotion-item' i]",
  "[class*='EmotionList-item']",
]

export const PLATFORM_EMOJI_CATEGORY_SELECTORS = [
  "[role='tab']",
  '.tab-pane-item',
  "[class*='tab-item' i]",
  "[class*='tabItem']",
  "[class*='category-item' i]",
  "[class*='categoryItem']",
  "[class*='pack-item' i]",
  "[class*='packItem']",
  "[class*='group-item' i]",
  "[class*='groupItem']",
]

export const BILIBILI_EMOTICON_PANEL_SELECTOR = '.emoticons-pane'
export const BILIBILI_EMOTICON_PACK_SELECTOR = '.emotion-wrap'
export const BILIBILI_INLINE_EMOJI_PACK_SELECTOR = '.emotion-wrap.emoji-wrap'
export const BILIBILI_EMOTICON_ITEM_SELECTOR = '.emoticon-item'
export const BILIBILI_EMOTICON_TAB_SELECTOR = '.tab-pane-item'

export const EMOJI_METADATA_ATTRIBUTES = [
  'data-text',
  'data-emoji-name',
  'data-emoji-text',
  'data-emoticon-name',
  'data-emoticon-text',
  'alt',
  'title',
  'aria-label',
  'data-name',
  'data-emoji',
  'data-emoticon',
  'data-emoticon-unique',
  'data-emoji-unique',
  'data-room-emoticon',
  'data-room-emoji',
  'data-anchor-emoticon',
  'data-anchor-emoji',
  'data-emoji-code',
  'data-emoji-id',
  'data-emoticon-id',
  'data-file-id',
  'data-id',
]

export const BILIBILI_NATIVE_PANEL_IDENTITY_ATTRIBUTES = [
  'data-file-id',
  'data-emoticon-unique',
  'data-emoji-unique',
  'data-room-emoticon',
  'data-room-emoji',
  'data-anchor-emoticon',
  'data-anchor-emoji',
]

export const NATIVE_PANEL_ASSET_KEY_PREFIX = 'native-panel:'
export const LEGACY_BILIBILI_EXCLUSIVE_ASSET_KEY_PREFIX = 'bili-exclusive:'
export const EMOJI_DISPLAY_ATTRIBUTES = new Set([
  'data-text',
  'data-emoji-name',
  'data-emoji-text',
  'data-emoticon-name',
  'data-emoticon-text',
  'alt',
  'title',
  'aria-label',
  'data-name',
])
