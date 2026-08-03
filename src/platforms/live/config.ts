import type { PlatformId } from '../../core/types'

export interface LivePlatformConfig {
  chatRoots: string[]
  inputs: string[]
  maxLength: number
  messageText: string[]
  messages: string[]
  name: string
  overlayMessages: string[]
  sendButtons: string[]
  userNames: string[]
  videoRoots: string[]
}

export type SupportedContentPlatform = Exclude<PlatformId, 'douyin'>

export const LIVE_PLATFORM_CONFIG: Record<SupportedContentPlatform, LivePlatformConfig> = {
  huya: {
    name: '虎牙直播',
    maxLength: 1000,
    chatRoots: [
      '#chat-room__list',
      '.chat-room__list',
      '.chat-room__bd',
      '.room-chat-messages',
      "[class*='chat-room'][class*='list']",
      "[class*='chatRoom'][class*='list']",
    ],
    videoRoots: [
      '#player-wrap',
      '#player-container',
      '.player-wrap',
      '.player-container',
      "[class*='player-wrap']",
      "[class*='player-container']",
    ],
    overlayMessages: [
      '.danmu-item',
      '.danmaku-item',
      '.bullet-item',
      '.player-danmu-item',
      "[class*='danmu-item']",
      "[class*='danmaku-item']",
      "[class*='danmuItem']",
      "[class*='bullet-item']",
    ],
    messages: [
      '.J_msg',
      '.msg-item',
      '.msg-normal',
      '[data-cid]',
      "[class*='message-item']",
      "[class*='messageItem']",
    ],
    messageText: [
      '.msg',
      '.txt',
      '.msg-content',
      '.message-content',
      "[class*='message-content']",
      "[class*='messageContent']",
    ],
    userNames: [
      '.name',
      '.nick',
      '.username',
      '[data-username]',
      '[data-user-name]',
      '[data-nickname]',
      '[data-author-name]',
      "[class*='user-name' i]",
      "[class*='userName' i]",
      "[class*='username' i]",
      "[class*='nickname' i]",
      "[class*='nick-name' i]",
      "[class*='author-name' i]",
      "a[href*='/user/' i]",
    ],
    inputs: [
      '#pub_msg_input',
      "textarea[placeholder*='弹幕']",
      "textarea[placeholder*='发言']",
      '.chat-room__input textarea',
      ".chat-room__input [contenteditable='true']",
      "[class*='chat-input'] [contenteditable='true']",
    ],
    sendButtons: [
      '#msg_send_bt',
      '.btn-send',
      '.chat-room__input button',
      "button[class*='send']",
      "[class*='send-btn']",
    ],
  },
  bilibili: {
    name: '哔哩哔哩直播',
    maxLength: 1000,
    chatRoots: [
      '#chat-items',
      '#chat-history-list',
      '.chat-history-list',
      '.chat-items',
      "[class*='chat-history']",
      "[class*='danmaku-list']",
    ],
    videoRoots: [
      '#live-player',
      '.live-player-mounter',
      '.bpx-player-container',
      '.bilibili-live-player-video-area',
      "[class*='live-player']",
      "[class*='player-container']",
    ],
    overlayMessages: [
      '.bili-danmaku-x-dm',
      '.bili-danmaku-x-dm-content',
      '.b-danmaku',
      '.bilibili-player-video-danmaku .b-danmaku',
      '.bpx-player-dm-wrap .bili-danmaku-x-dm',
      ".bilibili-live-player-video-danmaku [class*='danmaku-item']",
      ".bpx-player-dm-wrap [class*='danmaku-item']",
      "[class*='video-danmaku-item']",
    ],
    messages: [
      '.danmaku-item',
      '.chat-item',
      '[data-danmaku]',
      "[data-id][class*='danmaku']",
      "[class*='message-item']",
    ],
    messageText: [
      '.danmaku-content',
      '.danmaku-item-right',
      '.message-content',
      "[class*='danmaku-content']",
      "[class*='danmakuContent']",
    ],
    userNames: [
      '.user-name',
      '.username',
      '.uname',
      '[data-username]',
      '[data-user-name]',
      '[data-nickname]',
      '[data-author-name]',
      "[class*='user-name' i]",
      "[class*='userName' i]",
      "[class*='username' i]",
      "[class*='nickname' i]",
      "[class*='author-name' i]",
      "a[href*='space.bilibili.com' i]",
      "a[href*='/user/' i]",
    ],
    inputs: [
      'textarea.chat-input',
      '.chat-input-ctnr textarea',
      '.bpx-player-dm-input',
      '.bilibili-player-video-danmaku-input',
      '.bpx-player-ctrl-dm-input input',
      '.bpx-player-ctrl-dm-input textarea',
      ".bpx-player-ctrl-dm-input [contenteditable]:not([contenteditable='false'])",
      ".bpx-player-ctrl-dm-input [role='textbox']",
      "textarea[placeholder*='弹幕']",
      "textarea[placeholder*='说点什么']",
      "[contenteditable]:not([contenteditable='false'])[data-placeholder*='弹幕']",
      ".chat-input[contenteditable]:not([contenteditable='false'])",
      "[role='textbox'][data-placeholder*='弹幕']",
    ],
    sendButtons: [
      ".chat-input-ctnr button[type='submit']",
      '.chat-input-ctnr .bl-button--primary',
      '.bpx-player-dm-btn',
      '.bpx-player-ctrl-dm-btn',
      '.send-btn',
      "button[class*='send']",
      "[class*='send-button']",
    ],
  },
  douyu: {
    name: '斗鱼直播',
    maxLength: 500,
    chatRoots: [
      '#js-barrage-container',
      '#js-barrage-list',
      '.Barrage-container',
      '.Barrage-main',
      '.Barrage-list',
      '.layout-Player-chat',
      "[class*='Barrage-container']",
    ],
    videoRoots: [
      '#js-player-main',
      '#js-player-video',
      '.layout-Player-video',
      '.layout-Player-barrageStage',
      '.layout-Player-barrage',
      "[class*='player__']",
      "[class*='video__']",
    ],
    overlayMessages: [
      "[class*='danmuItem-']",
      "[data-comment-uuid][class*='danmu']",
      "[class*='danmu-item' i]",
      "[class*='danmuItem']",
    ],
    messages: [
      '.Barrage-listItem:has(.Barrage-nickName):has(.Barrage-content)',
      "#js-barrage-list > li:has([data-chatid])",
      "[class*='Barrage-listItem']:has([class*='Barrage-content'])",
      "[data-chatid]",
    ],
    messageText: [
      '.Barrage-content',
      '[data-chatid]',
      "[class*='text-']",
      "[class*='danmuText-']",
      "[class*='message-content' i]",
    ],
    userNames: [
      '.Barrage-nickName:not(.is-colon)',
      '.js-nick:not(.is-colon)',
      '[data-uid][title]:not(.is-colon)',
      "[class*='hostname-']",
      "[class*='nickName']",
      '[data-username]',
      '[data-user-name]',
      '[data-nickname]',
      '[data-author-name]',
    ],
    inputs: [
      ".ChatSend-txt[contenteditable='true']",
      "[contenteditable='true'][data-placeholder*='聊天内容']",
      "[class*='inputView-'][placeholder*='发送弹幕']",
      "input[placeholder*='发送弹幕']",
      "textarea[placeholder*='发送弹幕']",
      "[class*='fullScreenSendor-'] input",
    ],
    sendButtons: [
      '.ChatSend-button',
      "[class*='sendDanmu-']",
      "button[title='发送']",
      ".ChatSend button",
      "button[class*='send' i]",
    ],
  },
}

export function isSupportedContentPlatform(value: unknown): value is SupportedContentPlatform {
  return value === 'bilibili' || value === 'douyu' || value === 'huya'
}
