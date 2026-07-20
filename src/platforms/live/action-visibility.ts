import type {
  ActionSettings,
  ExtensionSettings,
  PlatformId
} from "../../core/types";

export type MessageSurface = "chat" | "overlay" | null;

export function visibleActionsForSurface(
  settings: Pick<ExtensionSettings, "actions" | "sideChatCapsule">,
  platform: PlatformId,
  surface: MessageSurface
): ActionSettings {
  const sideChatControlsCapsule = surface === "chat"
    && (platform === "huya" || platform === "bilibili");
  if (sideChatControlsCapsule && !settings.sideChatCapsule[platform]) {
    return { plusOne: false, reply: false, favorite: false };
  }
  return { ...settings.actions };
}
