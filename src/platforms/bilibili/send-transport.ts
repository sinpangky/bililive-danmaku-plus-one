import {
  classifyBilibiliApiResponse,
  type BilibiliSendIntent,
  type BilibiliSendResult,
} from "./send-protocol";

export interface BilibiliTransportOptions {
  fetcher?: typeof fetch;
  timeoutMs?: number;
  url?: string;
}

function transportError(
  intent: BilibiliSendIntent,
  message: string,
  httpStatus?: number,
): BilibiliSendResult {
  return {
    httpStatus,
    message,
    requestId: intent.requestId,
    status: "transport-error",
  };
}

/**
 * Performs exactly one POST. In particular, it never retries after dispatch:
 * a lost response may still mean Bilibili accepted the danmaku.
 */
export async function postBilibiliSendRequest(
  body: BodyInit,
  intent: BilibiliSendIntent,
  options: BilibiliTransportOptions = {},
): Promise<BilibiliSendResult> {
  const fetcher = options.fetcher || fetch;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(
      options.url || "https://api.live.bilibili.com/msg/send",
      {
        body,
        credentials: "include",
        method: "POST",
        signal: controller.signal,
      },
    );
    const raw = await response.text();
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return transportError(
        intent,
        response.ok
          ? "Bilibili 返回了无效 JSON"
          : `Bilibili 请求失败（HTTP ${response.status}）`,
        response.ok ? undefined : response.status,
      );
    }

    const result = classifyBilibiliApiResponse(value, intent);
    if (!response.ok && result.status !== "rejected") {
      return transportError(
        intent,
        `Bilibili 请求失败（HTTP ${response.status}）`,
        response.status,
      );
    }
    return result;
  } catch (error) {
    if (
      (error instanceof DOMException && error.name === "AbortError")
      || (
        error
        && typeof error === "object"
        && "name" in error
        && error.name === "AbortError"
      )
    ) {
      return transportError(
        intent,
        `Bilibili 发送请求超时（${Math.ceil(timeoutMs / 1_000)} 秒）`,
      );
    }
    return transportError(
      intent,
      `Bilibili 发送请求失败：${error instanceof Error ? error.message : "网络异常"}`,
    );
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
