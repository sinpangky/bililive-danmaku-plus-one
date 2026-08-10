export const UNICYCLE_STORAGE_KEY = "bilibiliDanmakuUnicycleV1";

export type UnicycleRunMode = "count" | "duration";
export type UnicycleIntervalMode = "fixed" | "random";

export interface UnicycleConfig {
  content: string;
  fixedIntervalSeconds: number;
  intervalMode: UnicycleIntervalMode;
  maxIntervalSeconds: number;
  maxMessageLength: number;
  minIntervalSeconds: number;
  runMode: UnicycleRunMode;
  totalCount: number;
  totalDurationSeconds: number;
}

export const DEFAULT_UNICYCLE_CONFIG: Readonly<UnicycleConfig> = Object.freeze({
  content: "",
  fixedIntervalSeconds: 5,
  intervalMode: "fixed",
  maxIntervalSeconds: 10,
  maxMessageLength: 40,
  minIntervalSeconds: 5,
  runMode: "count",
  totalCount: 10,
  totalDurationSeconds: 60,
});

function integer(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(parsed, maximum)) : fallback;
}

export function normalizeUnicycleConfig(value: unknown): UnicycleConfig {
  const source = value && typeof value === "object"
    ? value as Partial<UnicycleConfig>
    : {};
  const minimum = integer(source.minIntervalSeconds, 5, 1, 3_600);
  const maximum = Math.max(minimum, integer(source.maxIntervalSeconds, 10, 1, 3_600));
  return {
    content: String(source.content || "").slice(0, 50_000),
    fixedIntervalSeconds: integer(source.fixedIntervalSeconds, 5, 1, 3_600),
    intervalMode: source.intervalMode === "random" ? "random" : "fixed",
    maxIntervalSeconds: maximum,
    maxMessageLength: integer(source.maxMessageLength, 40, 1, 1_000),
    minIntervalSeconds: minimum,
    runMode: source.runMode === "duration" ? "duration" : "count",
    totalCount: integer(source.totalCount, 10, 1, 10_000),
    totalDurationSeconds: integer(source.totalDurationSeconds, 60, 1, 86_400),
  };
}

function normalizeLine(value: string): string {
  return value
    .normalize("NFKC")
    // oxlint-disable-next-line no-control-regex -- wheelbarrow lines reject C0 controls.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u200B\u200C\u2060\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function unicycleMessages(
  content: string,
  configuredMaxLength: number,
  platformMaxLength: number,
): string[] {
  const limit = Math.max(1, Math.min(
    integer(configuredMaxLength, 40, 1, 1_000),
    integer(platformMaxLength, 1_000, 1, 1_000),
  ));
  return String(content || "").split(/\r?\n/).flatMap((rawLine) => {
    const characters = Array.from(normalizeLine(rawLine));
    const chunks: string[] = [];
    for (let index = 0; index < characters.length; index += limit) {
      chunks.push(characters.slice(index, index + limit).join(""));
    }
    return chunks;
  });
}

export function unicycleIntervalMilliseconds(
  configValue: UnicycleConfig,
  random: () => number = Math.random,
): number {
  const config = normalizeUnicycleConfig(configValue);
  if (config.intervalMode === "fixed") return config.fixedIntervalSeconds * 1_000;
  const span = config.maxIntervalSeconds - config.minIntervalSeconds;
  return (config.minIntervalSeconds + Math.floor(Math.max(0, Math.min(random(), 0.999999)) * (span + 1)))
    * 1_000;
}
