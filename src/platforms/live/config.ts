import type { PlatformId } from "../../core/types";

interface LivePlatformConfig {
  chatRoots: string[];
  inputs: string[];
  maxLength: number;
  messageText: string[];
  messages: string[];
  name: string;
  overlayMessages: string[];
  sendButtons: string[];
  userNames: string[];
  videoRoots: string[];
}

export type SupportedContentPlatform = Exclude<PlatformId, "douyin">;

export const LIVE_PLATFORM_CONFIG: Record<SupportedContentPlatform, LivePlatformConfig> = {
  huya: {
    name: "虎牙直播", maxLength: 1000,
    chatRoots: ["#chat-room__list", ".chat-room__list", ".chat-room__bd", ".room-chat-messages", "[class*='chat-room'][class*='list']", "[class*='chatRoom'][class*='list']"],
    videoRoots: ["#player-wrap", "#player-container", ".player-wrap", ".player-container", "[class*='player-wrap']", "[class*='player-container']"],
    overlayMessages: [".danmu-item", ".danmaku-item", ".bullet-item", ".player-danmu-item", "[class*='danmu-item']", "[class*='danmaku-item']", "[class*='danmuItem']", "[class*='bullet-item']"],
    messages: [".J_msg", ".msg-item", ".msg-normal", "[data-cid]", "[class*='message-item']", "[class*='messageItem']"],
    messageText: [".msg", ".txt", ".msg-content", ".message-content", "[class*='message-content']", "[class*='messageContent']"],
    userNames: [".name", ".nick", ".username", "[class*='user-name']", "[class*='userName']", "[class*='nickname']"],
    inputs: ["#pub_msg_input", "textarea[placeholder*='弹幕']", "textarea[placeholder*='发言']", ".chat-room__input textarea", ".chat-room__input [contenteditable='true']", "[class*='chat-input'] [contenteditable='true']"],
    sendButtons: ["#msg_send_bt", ".btn-send", ".chat-room__input button", "button[class*='send']", "[class*='send-btn']"]
  },
  bilibili: {
    name: "哔哩哔哩直播", maxLength: 1000,
    chatRoots: ["#chat-items", "#chat-history-list", ".chat-history-list", ".chat-items", "[class*='chat-history']", "[class*='danmaku-list']"],
    videoRoots: ["#live-player", ".live-player-mounter", ".bpx-player-container", ".bilibili-live-player-video-area", "[class*='live-player']", "[class*='player-container']"],
    overlayMessages: [".bili-danmaku-x-dm", ".bili-danmaku-x-dm-content", ".b-danmaku", ".bilibili-player-video-danmaku .b-danmaku", ".bpx-player-dm-wrap .bili-danmaku-x-dm", ".bilibili-live-player-video-danmaku [class*='danmaku-item']", ".bpx-player-dm-wrap [class*='danmaku-item']", "[class*='video-danmaku-item']"],
    messages: [".danmaku-item", ".chat-item", "[data-danmaku]", "[data-id][class*='danmaku']", "[class*='message-item']"],
    messageText: [".danmaku-content", ".danmaku-item-right", ".message-content", "[class*='danmaku-content']", "[class*='danmakuContent']"],
    userNames: [".user-name", ".username", ".uname", "[class*='user-name']", "[class*='userName']"],
    inputs: ["textarea.chat-input", ".chat-input-ctnr textarea", ".bpx-player-dm-input", ".bilibili-player-video-danmaku-input", ".bpx-player-ctrl-dm-input input", ".bpx-player-ctrl-dm-input textarea", ".bpx-player-ctrl-dm-input [contenteditable]:not([contenteditable='false'])", ".bpx-player-ctrl-dm-input [role='textbox']", "textarea[placeholder*='弹幕']", "textarea[placeholder*='说点什么']", "[contenteditable]:not([contenteditable='false'])[data-placeholder*='弹幕']", ".chat-input[contenteditable]:not([contenteditable='false'])", "[role='textbox'][data-placeholder*='弹幕']"],
    sendButtons: [".chat-input-ctnr button[type='submit']", ".chat-input-ctnr .bl-button--primary", ".bpx-player-dm-btn", ".bpx-player-ctrl-dm-btn", ".send-btn", "button[class*='send']", "[class*='send-button']"]
  }
};

export function isSupportedContentPlatform(value: unknown): value is SupportedContentPlatform {
  return value === "bilibili" || value === "huya";
}
