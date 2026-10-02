export const themeColors = [
  { value: 'blue', label: '蓝色' },
  { value: 'green', label: '绿色' },
  { value: 'purple', label: '紫色' },
] as const
export const themeModes = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色模式' },
  { value: 'dark', label: '深色模式' },
] as const
export type ThemeColor = (typeof themeColors)[number]['value']
export type ThemeMode = (typeof themeModes)[number]['value']
export interface ThemePreferences { color: ThemeColor; mode: ThemeMode }
export const themeStorageKey = 'vuebox.theme'

/** Invalid or old preferences fall back independently, without breaking startup. */
export function parseThemePreferences(raw: string | null): ThemePreferences {
  const defaults: ThemePreferences = { color: 'blue', mode: 'system' }
  if (!raw) return defaults
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults
    const saved = value as Record<string, unknown>
    return {
      color: themeColors.find(item => item.value === saved.color)?.value ?? defaults.color,
      mode: themeModes.find(item => item.value === saved.mode)?.value ?? defaults.mode,
    }
  } catch { return defaults }
}

export function resolveThemeMode(mode: ThemeMode, systemDark: boolean): 'light' | 'dark' {
  return mode === 'system' ? (systemDark ? 'dark' : 'light') : mode
}
