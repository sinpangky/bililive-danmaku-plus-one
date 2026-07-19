import type { PlatformId } from "../../core/types";
import type { RoomContext } from "./types";

function safeUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    return new URL("https://invalid.local/");
  }
}

function titleRoomName(title: string, platform: PlatformId, roomId: string): string {
  const suffixes: Record<PlatformId, RegExp[]> = {
    bilibili: [/\s*[-_|]\s*哔哩哔哩直播.*$/i, /\s*[-_|]\s*bilibili.*$/i],
    douyin: [/\s*[-_|]\s*抖音直播.*$/i, /\s*[-_|]\s*抖音.*$/i],
    huya: [/\s*[-_|]\s*虎牙直播.*$/i, /\s*[-_|]\s*虎牙.*$/i]
  };
  let normalized = String(title || "").replace(/\s+/g, " ").trim();
  suffixes[platform].forEach((pattern) => {
    normalized = normalized.replace(pattern, "").trim();
  });
  return normalized || `直播间 ${roomId}`;
}

function pathSegments(url: URL): string[] {
  return url.pathname.split("/").map((part) => part.trim()).filter(Boolean);
}

export function roomIdFromLocation(platform: PlatformId, href: string): string {
  const url = safeUrl(href);
  const segments = pathSegments(url);
  if (platform === "bilibili") {
    return segments.find((part) => /^\d+$/.test(part)) || segments[0] || url.hostname;
  }
  if (platform === "huya") {
    return segments[0] || url.searchParams.get("roomid") || url.hostname;
  }
  return url.searchParams.get("room_id")
    || url.searchParams.get("roomId")
    || segments.find((part) => /^\d{5,}$/.test(part))
    || url.searchParams.get("anchor_id")
    || segments.at(-1)
    || url.hostname;
}

export function currentRoomContext(
  platform: PlatformId,
  href = location.href,
  title = document.title
): RoomContext {
  const roomId = roomIdFromLocation(platform, href);
  return {
    platform,
    roomId,
    roomKey: `${platform}:${roomId}`,
    roomName: titleRoomName(title, platform, roomId),
    url: href
  };
}
