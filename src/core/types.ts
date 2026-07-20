export type PlatformId = "bilibili" | "douyin" | "huya";

export type ColorSettingKey =
  | "actionStart"
  | "actionEnd"
  | "actionText"
  | "focusRing"
  | "selection"
  | "panelBackground"
  | "panelText"
  | "success"
  | "warning"
  | "error";

export type ColorSettings = Record<ColorSettingKey, string>;

interface PlatformSettings {
  bilibili: boolean;
  douyin: boolean;
  huya: boolean;
}

export interface SideChatCapsuleSettings {
  bilibili: boolean;
  huya: boolean;
}

export interface ActionSettings {
  favorite: boolean;
  plusOne: boolean;
  reply: boolean;
}

export interface ExtensionSettings {
  actions: ActionSettings;
  altClick: boolean;
  colors: Record<PlatformId, ColorSettings>;
  enabled: boolean;
  platforms: PlatformSettings;
  sideChatCapsule: SideChatCapsuleSettings;
}

export interface SharedExtensionApi {
  COLOR_SETTING_KEYS: readonly ColorSettingKey[];
  DEFAULT_SETTINGS: ExtensionSettings;
  applyPlatformColors(root: unknown, colors: unknown): void;
  detectPlatform(hostname: unknown, pathname: unknown): PlatformId | null;
  isPlausibleMessage(value: unknown, maxLength?: number): boolean;
  mergeSettings(saved?: unknown): ExtensionSettings;
  normalizeHexColor(value: unknown): string;
  normalizeSenderName(value: unknown): string;
  normalizeWhitespace(value: unknown): string;
  parseMessageText(value: unknown, maxLength?: number): string;
  replyDraftValue(currentValue: unknown, sender: unknown): string;
  replyMention(sender: unknown): string;
}

export interface DouyinRuntimeRequest {
  attempt?: number;
  href?: string;
  type: "danmaku-echo.ensure-douyin-runtime" | "danmaku-echo.ensure-douyin-page-hook";
}

declare global {
  var BulletPlusOneShared: SharedExtensionApi | undefined;
}
