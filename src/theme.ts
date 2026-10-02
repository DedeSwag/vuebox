import { shallowRef } from 'vue'
import { parseThemePreferences, resolveThemeMode, themeStorageKey, type ThemeColor, type ThemeMode, type ThemePreferences } from './utils/themePreferences.ts'

export const brandIcon = shallowRef('')
export const themeColor = shallowRef<ThemeColor>('blue')
export const themeMode = shallowRef<ThemeMode>('system')
let applyTheme: (() => void) | undefined
let disposeTheme: (() => void) | undefined

export function setThemeColor(color: ThemeColor) { themeColor.value = color; saveTheme() }
export function setThemeMode(mode: ThemeMode) { themeMode.value = mode; saveTheme() }
function saveTheme() {
  applyTheme?.()
  try { localStorage.setItem(themeStorageKey, JSON.stringify({ color: themeColor.value, mode: themeMode.value })) }
  catch { /* Theme switching still works when browser storage is unavailable. */ }
}
function restore(preferences: ThemePreferences) {
  themeColor.value = preferences.color
  themeMode.value = preferences.mode
  applyTheme?.()
}

/** The header and browser tab icon use the same colors as the global theme. */
export function initializeTheme() {
  disposeTheme?.()
  const scheme = window.matchMedia('(prefers-color-scheme: dark)')
  function refreshIcon() {
    const styles = getComputedStyle(document.documentElement)
    const background = styles.getPropertyValue('--accent').trim()
    const foreground = styles.getPropertyValue('--on-accent').trim()
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="${background}"/><g stroke="${foreground}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12V9a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3"/><rect x="7" y="12" width="18" height="13" rx="2"/><path d="M7 18h18M16 18v3"/></g></svg>`
    brandIcon.value = `data:image/svg+xml,${encodeURIComponent(svg)}`
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (favicon) favicon.href = brandIcon.value
  }
  applyTheme = () => {
    document.documentElement.dataset.themeColor = themeColor.value
    document.documentElement.dataset.themeMode = resolveThemeMode(themeMode.value, scheme.matches)
    refreshIcon()
  }
  let saved: string | null = null
  try { saved = localStorage.getItem(themeStorageKey) } catch { /* Use defaults. */ }
  restore(parseThemePreferences(saved))
  function onSystemChange() { if (themeMode.value === 'system') applyTheme?.() }
  function onStorage(event: StorageEvent) {
    if (event.key !== themeStorageKey && event.key !== null) return
    try { if (event.storageArea !== localStorage) return } catch { return }
    restore(parseThemePreferences(event.newValue))
  }
  scheme.addEventListener('change', onSystemChange)
  window.addEventListener('storage', onStorage)
  disposeTheme = () => {
    scheme.removeEventListener('change', onSystemChange)
    window.removeEventListener('storage', onStorage)
    applyTheme = undefined
  }
  if (import.meta.hot) import.meta.hot.dispose(() => disposeTheme?.())
}
