export const DOUYIN_CONTENT_SOURCE = "danmaku-echo-douyin-content";
export const DOUYIN_PAGE_SOURCE = "danmaku-echo-douyin-page";

export type DouyinMessageSource =
  | typeof DOUYIN_CONTENT_SOURCE
  | typeof DOUYIN_PAGE_SOURCE;

interface DouyinProtocolMessage {
  source: DouyinMessageSource;
  type: string;
  [key: string]: unknown;
}

export function isDouyinProtocolMessage(
  value: unknown,
  expectedSource: DouyinMessageSource
): value is DouyinProtocolMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const message = value as { source?: unknown; type?: unknown };
  return message.source === expectedSource && typeof message.type === "string";
}
