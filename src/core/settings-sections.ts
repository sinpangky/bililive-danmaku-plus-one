export const SETTINGS_SECTION_IDS = [
  'general-settings',
  'platform-connections',
  'side-chat-capsule',
  'platform-colors',
  'favorites-guide',
  'send-logs',
] as const

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number]
