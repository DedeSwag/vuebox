import test from 'node:test'
import assert from 'node:assert/strict'
import { parseThemePreferences, resolveThemeMode, themeStorageKey } from '../src/utils/themePreferences.ts'
import { initializeTheme, setThemeColor, setThemeMode, themeColor, themeMode, brandIcon } from '../src/theme.ts'

test('主题偏好：默认蓝色、跟随系统；损坏和不支持的字段分别回退', () => {
  for (const value of [null, '', 'broken', 'null', '42', '[]', '"purple"']) {
    assert.deepEqual(parseThemePreferences(value), { color: 'blue', mode: 'system' })
  }
  assert.deepEqual(parseThemePreferences('{"color":"green","mode":"dark"}'), { color: 'green', mode: 'dark' })
  assert.deepEqual(parseThemePreferences('{"color":"red","mode":"light"}'), { color: 'blue', mode: 'light' })
  assert.deepEqual(parseThemePreferences('{"color":"purple","mode":"invalid"}'), { color: 'purple', mode: 'system' })
})

test('显示模式：显式选择优先于系统，自动模式跟随系统', () => {
  for (const systemDark of [true, false]) {
    assert.equal(resolveThemeMode('dark', systemDark), 'dark')
    assert.equal(resolveThemeMode('light', systemDark), 'light')
    assert.equal(resolveThemeMode('system', systemDark), systemDark ? 'dark' : 'light')
  }
})

test('主题生命周期：恢复、即时切换、保存、跨标签同步、存储异常和监听器去重', () => {
  const globals = ['window', 'document', 'localStorage', 'getComputedStyle'] as const
  const original = globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const)
  const systemListeners = new Set<() => void>()
  const storageListeners = new Set<(event: { key: string | null; newValue: string | null; storageArea: unknown }) => void>()
  const media = { matches: true, addEventListener: (_: string, fn: () => void) => systemListeners.add(fn), removeEventListener: (_: string, fn: () => void) => systemListeners.delete(fn) }
  const root = { dataset: {} as Record<string, string> }
  const favicon = { href: '' }
  let saved = '{"color":"purple","mode":"light"}'
  let denied = false
  const storage = {
    getItem(key: string) { assert.equal(key, themeStorageKey); if (denied) throw new Error('denied'); return saved },
    setItem(key: string, value: string) { assert.equal(key, themeStorageKey); if (denied) throw new Error('denied'); saved = value },
  }
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: { matchMedia: () => media, addEventListener: (_: string, fn: (event: never) => void) => storageListeners.add(fn as never), removeEventListener: (_: string, fn: (event: never) => void) => storageListeners.delete(fn as never) } },
    document: { configurable: true, value: { documentElement: root, querySelector: () => favicon } },
    localStorage: { configurable: true, value: storage },
    getComputedStyle: { configurable: true, value: () => ({ getPropertyValue: () => '#ffffff' }) },
  })
  try {
    initializeTheme()
    assert.deepEqual(root.dataset, { themeColor: 'purple', themeMode: 'light' })
    assert.equal(favicon.href, brandIcon.value)
    assert.ok(favicon.href.startsWith('data:image/svg+xml,'))
    setThemeColor('green')
    setThemeMode('dark')
    assert.deepEqual(JSON.parse(saved), { color: 'green', mode: 'dark' })
    media.matches = false
    systemListeners.forEach(fn => fn())
    assert.equal(root.dataset.themeMode, 'dark')
    setThemeMode('system')
    assert.equal(root.dataset.themeMode, 'light')
    media.matches = true
    systemListeners.forEach(fn => fn())
    assert.equal(root.dataset.themeMode, 'dark')
    storageListeners.forEach(fn => fn({ key: themeStorageKey, newValue: '{"color":"blue","mode":"light"}', storageArea: storage }))
    assert.equal(themeColor.value, 'blue')
    assert.equal(themeMode.value, 'light')
    storageListeners.forEach(fn => fn({ key: 'unrelated', newValue: null, storageArea: storage }))
    assert.equal(themeMode.value, 'light')
    storageListeners.forEach(fn => fn({ key: null, newValue: null, storageArea: storage }))
    assert.equal(themeMode.value, 'system')
    denied = true
    initializeTheme()
    assert.equal(systemListeners.size, 1)
    assert.equal(storageListeners.size, 1)
    assert.equal(themeColor.value, 'blue')
    assert.doesNotThrow(() => setThemeColor('purple'))
    assert.equal(root.dataset.themeColor, 'purple')
  } finally {
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  }
})
