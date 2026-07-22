interface EmojiAssetLike {
  token?: unknown;
}

interface RichPayloadLike {
  assets?: unknown;
  text?: unknown;
}

function containsUnicodeEmoji(value: string): boolean {
  return /(?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3)/u.test(value);
}

/**
 * Platform image Emoji sometimes expose their exact Unicode equivalent in
 * alt/data attributes. In that case text insertion is both lossless and more
 * reliable than reopening a virtualized Emoji panel. Bracketed platform names
 * are deliberately excluded because sending "[表情名]" is not equivalent to
 * sending the original platform resource.
 */
export function unicodeEmojiFallbackText(payload: RichPayloadLike | null | undefined): string {
  if (!payload || !Array.isArray(payload.assets) || !payload.assets.length) {
    return "";
  }
  const tokens = payload.assets.map((asset) => {
    if (!asset || typeof asset !== "object") return "";
    return String((asset as EmojiAssetLike).token || "").trim();
  });
  if (tokens.some((token) => !token
      || /^\[[^\]\n]{1,80}\]$/.test(token)
      || !containsUnicodeEmoji(token))) {
    return "";
  }
  const text = String(payload.text || "").trim();
  return containsUnicodeEmoji(text) ? text : "";
}
