export const SEND_LOG_MESSAGE = 'danmaku-echo.send-log'
export const SEND_LOG_STORAGE_KEY = 'sendLogsV1'
export const SEND_LOG_LIMIT = 200

export type SendLogSource = 'chat' | 'overlay' | 'favorite' | 'alt-click' | 'unknown'
export type SendLogMethod =
  | 'editor-button'
  | 'editor-enter'
  | 'native-emoji-panel'
  | 'page-context-api'
  | 'not-attempted'
  | 'unknown'

export interface SendLogAssetV1 {
  matchScore?: number
  nativePanel: boolean
  resolution?: string
  source: string
  token: string
}

export interface SendLogPartV1 {
  text?: string
  token?: string
  type: 'emoji' | 'text'
}

export interface SendLogEntryV1 {
  assets: SendLogAssetV1[]
  classification: string
  confirmation: 'editor-consumed' | 'native-panel-confirmed' | 'page-api-confirmed' | 'none'
  durationMs: number
  error: string
  id: string
  method: SendLogMethod
  normalizedContent: string
  parts: SendLogPartV1[]
  platform: 'bilibili'
  resultContent: string
  source: SendLogSource
  sourceContent: string
  success: boolean
  timestamp: number
  version: 1
}

export type SendLogRequest =
  | { entry: SendLogEntryV1; operation: 'append'; type: typeof SEND_LOG_MESSAGE }
  | { operation: 'clear' | 'list'; type: typeof SEND_LOG_MESSAGE }

export interface SendLogResponse {
  entries?: SendLogEntryV1[]
  error?: string
  ok: boolean
}

export function isSendLogRequest(value: unknown): value is SendLogRequest {
  if (!value || typeof value !== 'object') return false
  const request = value as Partial<SendLogRequest>
  if (request.type !== SEND_LOG_MESSAGE) return false
  if (request.operation === 'list' || request.operation === 'clear') return true
  return (
    request.operation === 'append' && Boolean(request.entry && typeof request.entry === 'object')
  )
}
