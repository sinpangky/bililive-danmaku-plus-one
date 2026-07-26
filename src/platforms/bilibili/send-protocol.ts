export const BILIBILI_CONTENT_MESSAGE_SOURCE = "danmaku-echo-bilibili-content";
export const BILIBILI_PAGE_MESSAGE_SOURCE = "danmaku-echo-bilibili-page";

export type BilibiliDanmakuKind = "image" | "inline";

export interface BilibiliSendIntent {
  emojiName?: string;
  emoticonUnique?: string;
  imageUrl?: string;
  kind: BilibiliDanmakuKind;
  legacyInlineFallback?: boolean;
  requestId: string;
  roomHint?: string;
  text: string;
}

export type BilibiliSendResultStatus =
  | "accepted"
  | "confirmed"
  | "rejected"
  | "transport-error"
  | "unconfirmed";

export interface BilibiliSendResult {
  code?: number;
  content?: string;
  dmType?: number;
  emoticonUnique?: string;
  httpStatus?: number;
  message: string;
  messageId?: string;
  requestId: string;
  status: BilibiliSendResultStatus;
  uid?: string;
}

export interface BilibiliPageSendMessage {
  intent: BilibiliSendIntent;
  source: typeof BILIBILI_CONTENT_MESSAGE_SOURCE;
  type: "send";
}

export interface BilibiliPageDebugMessage {
  details: Record<string, unknown>;
  requestId: string;
  source: typeof BILIBILI_CONTENT_MESSAGE_SOURCE;
  stage:
    | "confirmed"
    | "overlay-ambiguous"
    | "overlay-framed"
    | "unconfirmed";
  type: "debug-result";
}

export interface BilibiliContentResultMessage extends BilibiliSendResult {
  source: typeof BILIBILI_PAGE_MESSAGE_SOURCE;
  type: "send-result";
}

export class BilibiliSendGate {
  #active = false;

  get active(): boolean {
    return this.#active;
  }

  begin(): boolean {
    if (this.#active) return false;
    this.#active = true;
    return true;
  }

  finish(): void {
    this.#active = false;
  }
}

type JsonRecord = Record<string, unknown>;

const ERROR_TOKEN_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  f: "弹幕含有敏感词",
  fire: "弹幕含有违禁词汇",
  k: "内容含有房间屏蔽词",
});

const CODE_FALLBACK_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  "-101": "账号未登录或登录状态已失效",
  "-111": "登录状态校验失败，请刷新页面后重试",
  "-400": "发送参数错误",
  "10031": "一分钟内发送弹幕过多（发送频率过快）",
  "1003212": "弹幕长度超出限制",
});

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cleanMessage(value: unknown): string {
  return String(value ?? "").trim().slice(0, 500);
}

function isEmptySuccessMessage(value: string): boolean {
  return !value || value === "0";
}

function apiCode(value: unknown): number | undefined {
  const code = Number(value);
  return Number.isFinite(code) ? code : undefined;
}

function parseExtra(value: unknown): JsonRecord | null {
  if (isRecord(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function errorMessage(record: JsonRecord, code: number | undefined): string {
  const msg = cleanMessage(record.msg);
  const message = cleanMessage(record.message);
  if (!isEmptySuccessMessage(msg)) {
    return ERROR_TOKEN_MESSAGES[msg] || msg;
  }
  if (!isEmptySuccessMessage(message)) {
    return ERROR_TOKEN_MESSAGES[message] || message;
  }
  if (code !== undefined && CODE_FALLBACK_MESSAGES[String(code)]) {
    return CODE_FALLBACK_MESSAGES[String(code)];
  }
  return "Bilibili 拒绝发送弹幕";
}

function mismatchResult(
  intent: BilibiliSendIntent,
  code: number | undefined,
  message: string,
): BilibiliSendResult {
  return {
    code,
    message,
    requestId: intent.requestId,
    status: "unconfirmed",
  };
}

/**
 * Classifies Bilibili's /msg/send JSON without treating code=0 alone as
 * success. Bilibili can return terse rejection tokens in `msg`, and a valid
 * acceptance includes mode_info.extra with send_from_me=true.
 */
export function classifyBilibiliApiResponse(
  value: unknown,
  intent: BilibiliSendIntent,
): BilibiliSendResult {
  if (!isRecord(value)) {
    return mismatchResult(intent, undefined, "Bilibili 返回了无法识别的响应");
  }

  const code = apiCode(value.code);
  const msg = cleanMessage(value.msg);
  const message = cleanMessage(value.message);
  const explicitError = !isEmptySuccessMessage(msg)
    ? ERROR_TOKEN_MESSAGES[msg] || msg
    : !isEmptySuccessMessage(message)
      ? ERROR_TOKEN_MESSAGES[message] || message
      : "";

  if (code !== 0 || explicitError) {
    return {
      code,
      message: explicitError || errorMessage(value, code),
      requestId: intent.requestId,
      status: "rejected",
    };
  }

  const data = isRecord(value.data) ? value.data : null;
  const modeInfo = data && isRecord(data.mode_info) ? data.mode_info : null;
  const extra = modeInfo ? parseExtra(modeInfo.extra) : null;
  if (!modeInfo || !extra || extra.send_from_me !== true) {
    return mismatchResult(intent, code, "平台返回成功码，但缺少可验证的本人发送回执");
  }

  const content = cleanMessage(extra.content);
  const emoticonUnique = cleanMessage(extra.emoticon_unique);
  const dmType = apiCode(extra.dm_type);
  const messageId = cleanMessage(extra.id_str);
  const user = isRecord(modeInfo.user) ? modeInfo.user : null;
  const uid = cleanMessage(user?.uid);

  if (intent.kind === "inline" && content !== intent.text) {
    return mismatchResult(intent, code, "平台回执内容与原弹幕不一致，未确认发送成功");
  }
  if (
    intent.kind === "image"
    && (!intent.emoticonUnique
      || emoticonUnique !== intent.emoticonUnique
      || dmType !== 1)
  ) {
    return mismatchResult(intent, code, "平台回执中的图片表情与原弹幕不一致");
  }

  return {
    code,
    content,
    dmType,
    emoticonUnique,
    message: "Bilibili 已接收，正在等待聊天栏确认",
    messageId: messageId || undefined,
    requestId: intent.requestId,
    status: "accepted",
    uid: uid || undefined,
  };
}

export function formatBilibiliSendError(result: BilibiliSendResult): string {
  const message = cleanMessage(result.message) || "Bilibili 弹幕发送失败";
  return result.code === undefined ? message : `${message}（code ${result.code}）`;
}
