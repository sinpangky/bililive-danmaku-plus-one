import { resolveBilibiliEmoticonCatalog } from "../platforms/bilibili/emoticon-catalog";
import {
  BILIBILI_CONTENT_MESSAGE_SOURCE,
  BILIBILI_PAGE_MESSAGE_SOURCE,
  type BilibiliContentResultMessage,
  type BilibiliPageDebugMessage,
  type BilibiliPageSendMessage,
  type BilibiliSendIntent,
  type BilibiliSendResult,
} from "../platforms/bilibili/send-protocol";
import { postBilibiliSendRequest } from "../platforms/bilibili/send-transport";

interface DebugEvent {
  code?: number;
  elapsedMs?: number;
  httpStatus?: number;
  kind?: string;
  message?: string;
  messageId?: string;
  requestId?: string;
  stage: string;
  timestamp: number;
}

interface BilibiliDebugApi {
  clear(): void;
  readonly events: readonly DebugEvent[];
}

type JsonRecord = Record<string, unknown>;
type DebugScope = typeof globalThis & {
  __danmakuEchoBilibiliDebug?: BilibiliDebugApi;
};

class BilibiliPreparationTransportError extends Error {}
class BilibiliCatalogNoMatchError extends Error {}
class BilibiliCatalogInlineFallback extends Error {}

const SEND_TIMEOUT_MS = 8_000;
const DEBUG_LIMIT = 200;
const debugEvents: DebugEvent[] = [];
const roomIdCache = new Map<string, string>();
const completedRequestIds = new Set<string>();
const activeRequestIds = new Set<string>();

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clean(value: unknown, limit = 500): string {
  return String(value ?? "").trim().slice(0, limit);
}

function numberCode(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function logDebug(event: Omit<DebugEvent, "timestamp">): void {
  const entry = { ...event, timestamp: Date.now() };
  debugEvents.push(entry);
  if (debugEvents.length > DEBUG_LIMIT) {
    debugEvents.splice(0, debugEvents.length - DEBUG_LIMIT);
  }
  console.debug("[Danmaku Echo][Bilibili]", entry);
}

const debugApi: BilibiliDebugApi = Object.freeze({
  clear(): void {
    debugEvents.splice(0);
  },
  get events(): readonly DebugEvent[] {
    return debugEvents.map((event) => ({ ...event }));
  },
});

Object.defineProperty(globalThis as DebugScope, "__danmakuEchoBilibiliDebug", {
  configurable: true,
  value: debugApi,
});

function postResult(result: BilibiliSendResult): void {
  const message: BilibiliContentResultMessage = {
    ...result,
    source: BILIBILI_PAGE_MESSAGE_SOURCE,
    type: "send-result",
  };
  window.postMessage(message, "*");
}

function cookieValue(name: string): string {
  const prefix = `${encodeURIComponent(name)}=`;
  for (const part of document.cookie.split(";")) {
    const candidate = part.trim();
    if (candidate.startsWith(prefix)) {
      return decodeURIComponent(candidate.slice(prefix.length));
    }
  }
  return "";
}

async function fetchPageJson(
  url: string,
  deadline: number,
): Promise<{ status: number; value: unknown }> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    throw new BilibiliPreparationTransportError("Bilibili 接口请求超时（8 秒）");
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), remaining);
  try {
    const response = await fetch(url, {
      credentials: "include",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new BilibiliPreparationTransportError(
        `Bilibili 请求失败（HTTP ${response.status}）`,
      );
    }
    try {
      return { status: response.status, value: await response.json() };
    } catch {
      throw new BilibiliPreparationTransportError(
        "Bilibili 返回了无法解析的 JSON",
      );
    }
  } catch (error) {
    if (error instanceof BilibiliPreparationTransportError) throw error;
    if (
      error instanceof DOMException
      && error.name === "AbortError"
    ) {
      throw new BilibiliPreparationTransportError(
        "Bilibili 接口请求超时（8 秒）",
      );
    }
    throw new BilibiliPreparationTransportError(
      `Bilibili 请求失败：${error instanceof Error ? error.message : "网络异常"}`,
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

function roomCandidates(intent: BilibiliSendIntent): string[] {
  const candidates = new Set<string>();
  const add = (value: unknown): void => {
    const normalized = clean(value, 200).replace(/[?#].*$/u, "");
    const match = normalized.match(/(?:^|\/)(\d+)(?:\/|$)/u);
    if (match?.[1]) candidates.add(match[1]);
  };
  add(intent.roomHint);
  const uniqueRoom = intent.emoticonUnique?.match(/^room_(\d+)_/u)?.[1];
  if (uniqueRoom) candidates.add(uniqueRoom);

  const scope = globalThis as typeof globalThis & {
    BilibiliLive?: { ROOMID?: unknown };
    ROOMID?: unknown;
    __NEPTUNE_IS_MY_WAIFU__?: JsonRecord;
  };
  add(scope.BilibiliLive?.ROOMID);
  add(scope.ROOMID);
  const neptuneRoom = scope.__NEPTUNE_IS_MY_WAIFU__;
  if (isRecord(neptuneRoom)) {
    const roomInit = isRecord(neptuneRoom.roomInitRes)
      ? neptuneRoom.roomInitRes
      : null;
    const data = roomInit && isRecord(roomInit.data) ? roomInit.data : null;
    add(data?.room_id);
  }
  add(location.pathname);
  add(document.referrer);
  try {
    add(window.top?.location.pathname);
  } catch {
    // Cross-origin activity frames cannot inspect their top-level URL.
  }
  return Array.from(candidates);
}

async function resolveRoomCandidate(
  candidate: string,
  deadline: number,
): Promise<string> {
  const cached = roomIdCache.get(candidate);
  if (cached) return cached;
  const { value } = await fetchPageJson(
    `https://api.live.bilibili.com/room/v1/Room/room_init?id=${encodeURIComponent(candidate)}`,
    deadline,
  );
  const record = isRecord(value) ? value : null;
  const data = record && isRecord(record.data) ? record.data : null;
  const roomId = clean(data?.room_id, 40);
  if (numberCode(record?.code) !== 0 || !/^\d+$/u.test(roomId)) {
    throw new Error(clean(record?.message || record?.msg) || "无法解析真实房间号");
  }
  roomIdCache.set(candidate, roomId);
  return roomId;
}

async function resolveRoomId(
  intent: BilibiliSendIntent,
  deadline: number,
): Promise<string> {
  const candidates = roomCandidates(intent);
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return await resolveRoomCandidate(candidate, deadline);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("无法识别当前 Bilibili 直播间");
}

async function resolveLegacyEmoticon(
  intent: BilibiliSendIntent,
  roomId: string,
  deadline: number,
): Promise<string> {
  const { value } = await fetchPageJson(
    "https://api.live.bilibili.com/xlive/web-room/v1/index/GetEmoticons"
      + `?platform=pc&room_id=${encodeURIComponent(roomId)}`,
    deadline,
  );
  if (!isRecord(value) || numberCode(value.code) !== 0) {
    throw new Error(
      clean(isRecord(value) ? value.message || value.msg : "")
      || "直播间表情目录读取失败",
    );
  }

  const resolution = resolveBilibiliEmoticonCatalog(value.data, {
    emojiName: intent.emojiName,
    imageUrl: intent.imageUrl,
    legacyInlineFallback: intent.legacyInlineFallback,
  });
  if (resolution.status === "image") return resolution.unique;
  if (resolution.status === "inline") {
    throw new BilibiliCatalogInlineFallback(
      "已确认旧收藏是普通行内表情",
    );
  }
  if (resolution.status === "ambiguous") {
    throw new Error("当前房间存在多个匹配的图片表情，已取消发送以避免发错内容");
  }
  throw new BilibiliCatalogNoMatchError(
    "旧收藏缺少图片表情唯一 ID，当前房间表情目录中无法唯一解析",
  );
}

function appendCommonFields(
  body: FormData,
  intent: BilibiliSendIntent,
  roomId: string,
  csrf: string,
): void {
  const values: Record<string, string> = {
    bubble: "0",
    color: "16777215",
    csrf,
    csrf_token: csrf,
    data_extend: JSON.stringify({ trackid: "-99998" }),
    fontsize: "25",
    jumpfrom: "0",
    mode: "1",
    msg: intent.kind === "image" ? intent.emoticonUnique || "" : intent.text,
    playTime: "0.0",
    replay_dmid: "",
    reply_attr: "0",
    reply_mid: "0",
    rnd: String(Math.floor(Date.now() / 1_000)),
    room_type: "0",
    roomid: roomId,
    statistics: JSON.stringify({ appId: 100, platform: 5 }),
  };
  if (intent.kind === "image") {
    values.dm_type = "1";
    values.emoticon_options = "{}";
  }
  Object.entries(values).forEach(([key, value]) => body.append(key, value));
}

async function sendDanmaku(intent: BilibiliSendIntent): Promise<BilibiliSendResult> {
  const startedAt = performance.now();
  const deadline = Date.now() + SEND_TIMEOUT_MS;
  logDebug({
    kind: intent.kind,
    requestId: intent.requestId,
    stage: "preparing",
  });

  const csrf = cookieValue("bili_jct");
  if (!csrf) {
    return {
      code: -111,
      message: "未找到 Bilibili 登录校验信息，请登录或刷新页面后重试",
      requestId: intent.requestId,
      status: "rejected",
    };
  }

  let roomId: string;
  try {
    roomId = await resolveRoomId(intent, deadline);
    if (intent.kind === "image" && !intent.emoticonUnique) {
      try {
        intent = {
          ...intent,
          emoticonUnique: await resolveLegacyEmoticon(intent, roomId, deadline),
        };
      } catch (error) {
        if (
          error instanceof BilibiliCatalogInlineFallback
          && intent.legacyInlineFallback
          && /^\[[^\]\n]{1,40}\]$/u.test(intent.text)
        ) {
          intent = {
            ...intent,
            emoticonUnique: undefined,
            kind: "inline",
          };
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "发送准备失败",
      requestId: intent.requestId,
      status: error instanceof BilibiliPreparationTransportError
        ? "transport-error"
        : "rejected",
    };
  }

  const body = new FormData();
  appendCommonFields(body, intent, roomId, csrf);
  logDebug({
    kind: intent.kind,
    requestId: intent.requestId,
    stage: "sending",
  });

  try {
    const result = await postBilibiliSendRequest(body, intent, {
      timeoutMs: Math.max(1, deadline - Date.now()),
    });
    if (result.status === "accepted" && !result.uid) {
      const ownUid = cookieValue("DedeUserID");
      if (/^\d+$/u.test(ownUid)) return { ...result, uid: ownUid };
    }
    return result;
  } finally {
    logDebug({
      elapsedMs: Math.round(performance.now() - startedAt),
      kind: intent.kind,
      requestId: intent.requestId,
      stage: "request-finished",
    });
  }
}

async function handleSend(message: BilibiliPageSendMessage): Promise<void> {
  const intent = message.intent;
  if (
    !intent
    || !clean(intent.requestId, 100)
    || !["image", "inline"].includes(intent.kind)
    || (intent.kind === "inline" && !clean(intent.text, 1_000))
  ) {
    return;
  }
  if (activeRequestIds.has(intent.requestId) || completedRequestIds.has(intent.requestId)) {
    postResult({
      message: "重复的发送请求已拦截",
      requestId: intent.requestId,
      status: "rejected",
    });
    return;
  }

  activeRequestIds.add(intent.requestId);
  try {
    const result = await sendDanmaku({ ...intent });
    completedRequestIds.add(intent.requestId);
    if (completedRequestIds.size > 500) {
      completedRequestIds.delete(completedRequestIds.values().next().value!);
    }
    logDebug({
      code: result.code,
      httpStatus: result.httpStatus,
      kind: intent.kind,
      message: result.message,
      messageId: result.messageId,
      requestId: intent.requestId,
      stage: result.status,
    });
    postResult(result);
  } finally {
    activeRequestIds.delete(intent.requestId);
  }
}

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (event.source !== window || !isRecord(event.data)) return;
  if (event.data.source !== BILIBILI_CONTENT_MESSAGE_SOURCE) return;
  if (event.data.type === "send") {
    void handleSend(event.data as unknown as BilibiliPageSendMessage);
    return;
  }
  if (event.data.type === "debug-result") {
    const message = event.data as unknown as BilibiliPageDebugMessage;
    logDebug({
      kind: clean(message.details.kind, 40),
      message: clean(message.details.message),
      messageId: clean(message.details.messageId, 200),
      requestId: clean(message.requestId, 100),
      stage: message.stage,
    });
  }
});
