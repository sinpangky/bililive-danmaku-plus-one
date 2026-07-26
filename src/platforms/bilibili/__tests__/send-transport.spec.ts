import { describe, expect, it, vi } from "vitest";

import type { BilibiliSendIntent } from "../send-protocol";
import { postBilibiliSendRequest } from "../send-transport";

const intent: BilibiliSendIntent = {
  kind: "inline",
  requestId: "request-1",
  text: "[大哭]",
};

function response(
  value: string,
  options: { ok?: boolean; status?: number } = {},
): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    text: async () => value,
  } as Response;
}

function acceptedBody(): string {
  return JSON.stringify({
    code: 0,
    data: {
      mode_info: {
        extra: JSON.stringify({
          content: "[大哭]",
          dm_type: 0,
          id_str: "message-1",
          send_from_me: true,
        }),
        user: { uid: 42 },
      },
    },
  });
}

describe("postBilibiliSendRequest", () => {
  it("returns accepted for one valid request", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response(acceptedBody()));
    const result = await postBilibiliSendRequest("payload", intent, {
      fetcher: fetcher as typeof fetch,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("accepted");
  });

  it("reports invalid JSON without retrying", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () => response("<html>bad gateway</html>"),
    );
    const result = await postBilibiliSendRequest("payload", intent, {
      fetcher: fetcher as typeof fetch,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      message: "Bilibili 返回了无效 JSON",
      status: "transport-error",
    });
  });

  it("reports an HTTP error even if its JSON resembles success", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      response(acceptedBody(), { ok: false, status: 503 }),
    );
    const result = await postBilibiliSendRequest("payload", intent, {
      fetcher: fetcher as typeof fetch,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      httpStatus: 503,
      message: "Bilibili 请求失败（HTTP 503）",
      status: "transport-error",
    });
  });

  it("keeps a platform rejection returned with an HTTP error", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      response(
        JSON.stringify({ code: -101, message: "账号未登录" }),
        { ok: false, status: 403 },
      ),
    );
    const result = await postBilibiliSendRequest("payload", intent, {
      fetcher: fetcher as typeof fetch,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      code: -101,
      message: "账号未登录",
      status: "rejected",
    });
  });

  it("aborts on timeout without retrying", async () => {
    const fetcher = vi.fn<typeof fetch>((_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      }),
    );
    const result = await postBilibiliSendRequest("payload", intent, {
      fetcher: fetcher as typeof fetch,
      timeoutMs: 10,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      message: "Bilibili 发送请求超时（1 秒）",
      status: "transport-error",
    });
  });

  it("reports a network error without retrying", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw new TypeError("Failed to fetch");
    });
    const result = await postBilibiliSendRequest("payload", intent, {
      fetcher: fetcher as typeof fetch,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      message: "Bilibili 发送请求失败：Failed to fetch",
      status: "transport-error",
    });
  });
});
