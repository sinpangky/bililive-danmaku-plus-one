import { describe, expect, it } from "vitest";

import {
  BilibiliSendGate,
  classifyBilibiliApiResponse,
  formatBilibiliSendError,
  type BilibiliSendIntent,
} from "../send-protocol";

function intent(
  overrides: Partial<BilibiliSendIntent> = {},
): BilibiliSendIntent {
  return {
    kind: "inline",
    requestId: "attempt-1",
    text: "加油啊[大哭][大哭]",
    ...overrides,
  };
}

function acceptedExtra(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    code: 0,
    message: "0",
    data: {
      mode_info: {
        extra: JSON.stringify({
          content: "加油啊[大哭][大哭]",
          dm_type: 0,
          id_str: "message-7",
          send_from_me: true,
          ...extra,
        }),
        user: { uid: 42 },
      },
    },
  };
}

describe("classifyBilibiliApiResponse", () => {
  it("allows only one in-flight request and unlocks after completion", () => {
    const gate = new BilibiliSendGate();

    expect(gate.begin()).toBe(true);
    expect(gate.active).toBe(true);
    expect(gate.begin()).toBe(false);
    gate.finish();
    expect(gate.active).toBe(false);
    expect(gate.begin()).toBe(true);
  });

  it("accepts a valid inline receipt but does not call it confirmed", () => {
    expect(classifyBilibiliApiResponse(acceptedExtra(), intent())).toEqual({
      code: 0,
      content: "加油啊[大哭][大哭]",
      dmType: 0,
      emoticonUnique: "",
      message: "Bilibili 已接收，正在等待聊天栏确认",
      messageId: "message-7",
      requestId: "attempt-1",
      status: "accepted",
      uid: "42",
    });
  });

  it("accepts an exact image-emote receipt", () => {
    const imageIntent = intent({
      emoticonUnique: "room_3990387_104804",
      kind: "image",
      text: "[卖萌]",
    });
    const result = classifyBilibiliApiResponse(
      acceptedExtra({
        content: "",
        dm_type: 1,
        emoticon_unique: "room_3990387_104804",
      }),
      imageIntent,
    );

    expect(result).toMatchObject({
      emoticonUnique: "room_3990387_104804",
      status: "accepted",
    });
  });

  it.each([
    ["f", "弹幕含有敏感词"],
    ["fire", "弹幕含有违禁词汇"],
    ["k", "内容含有房间屏蔽词"],
  ])("rejects code=0 with %s", (token, expected) => {
    const result = classifyBilibiliApiResponse(
      { code: 0, msg: token },
      intent(),
    );
    expect(result.status).toBe("rejected");
    expect(result.message).toBe(expected);
  });

  it("provides a readable fallback for code 10031", () => {
    const result = classifyBilibiliApiResponse(
      { code: 10031, message: "0" },
      intent(),
    );
    expect(formatBilibiliSendError(result)).toBe(
      "一分钟内发送弹幕过多（发送频率过快）（code 10031）",
    );
  });

  it.each([
    [-101, "账号未登录"],
    [-111, "登录状态校验失败"],
    [1003212, "弹幕长度超出限制"],
  ])("maps common platform code %s", (code, expected) => {
    const result = classifyBilibiliApiResponse(
      { code, message: "0" },
      intent(),
    );
    expect(result.status).toBe("rejected");
    expect(result.message).toContain(expected);
  });

  it("keeps a complete platform mute reason", () => {
    const result = classifyBilibiliApiResponse(
      { code: 1003, message: "您已被主播禁言，暂时无法发送弹幕" },
      intent(),
    );
    expect(result).toMatchObject({
      code: 1003,
      message: "您已被主播禁言，暂时无法发送弹幕",
      status: "rejected",
    });
  });

  it("does not accept code=0 without a verifiable mode_info.extra", () => {
    const result = classifyBilibiliApiResponse(
      { code: 0, data: {} },
      intent(),
    );
    expect(result.status).toBe("unconfirmed");
    expect(result.message).toContain("缺少可验证");
  });

  it("rejects reordered or truncated inline content", () => {
    const result = classifyBilibiliApiResponse(
      acceptedExtra({ content: "[大哭][大哭]加油啊" }),
      intent(),
    );
    expect(result.status).toBe("unconfirmed");
    expect(result.message).toContain("原弹幕不一致");
  });

  it("rejects a mismatched image unique id", () => {
    const result = classifyBilibiliApiResponse(
      acceptedExtra({
        content: "",
        dm_type: 1,
        emoticon_unique: "room_wrong",
      }),
      intent({
        emoticonUnique: "room_expected",
        kind: "image",
        text: "[卖萌]",
      }),
    );
    expect(result.status).toBe("unconfirmed");
    expect(result.message).toContain("图片表情与原弹幕不一致");
  });
});
