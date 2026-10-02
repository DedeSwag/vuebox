<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { setThemeColor, setThemeMode, themeColor, themeMode } from '@/theme'
import { themeColors, themeModes, type ThemeMode } from '@/utils/themePreferences'

const open = ref(false)
const container = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
function closeFromKeyboard() { open.value = false; trigger.value?.focus() }
function closeOutside(event: PointerEvent) {
  if (event.target instanceof Node && !container.value?.contains(event.target)) open.value = false
}
onMounted(() => document.addEventListener('pointerdown', closeOutside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOutside))
</script>

<template>
  <div ref="container" class="theme-selector" @keydown.esc.stop.prevent="closeFromKeyboard">
    <button ref="trigger" class="button-icon" type="button" :aria-expanded="open" aria-controls="theme-settings" aria-label="主题设置" title="主题设置" @click="open = !open">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.4-3.4 1.5 1.5 0 0 1 1.1-2.6H17a4 4 0 0 0 4-4 9 9 0 0 0-9-8Z" />
        <circle cx="7.5" cy="10" r=".8" /><circle cx="11" cy="7" r=".8" /><circle cx="15.5" cy="8.5" r=".8" />
      </svg>
    </button>
    <section v-if="open" id="theme-settings" class="theme-panel" aria-label="主题设置选项">
      <h2>主题颜色</h2>
      <div class="theme-colors" role="group" aria-label="选择主题颜色">
        <button v-for="item in themeColors" :key="item.value" type="button" :aria-pressed="themeColor === item.value" @click="setThemeColor(item.value)">
          <span class="color-swatch" :style="{ '--swatch': `var(--theme-${item.value})` }" aria-hidden="true" />{{ item.label }}
        </button>
      </div>
      <label for="theme-mode">显示模式</label>
      <select id="theme-mode" :value="themeMode" @change="setThemeMode(($event.target as HTMLSelectElement).value as ThemeMode)">
        <option v-for="item in themeModes" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
      <p>自动记住选择，下次打开继续使用。</p>
    </section>
  </div>
</template>

<style scoped>
@layer components {
  .theme-selector { position: relative; font-size: 13px; }
  .theme-selector button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; white-space: nowrap; }
  .button-icon svg { flex-shrink: 0; }
  .color-swatch { display: inline-block; width: 10px; height: 10px; flex-shrink: 0; border-radius: 50%; }
  .color-swatch { background: var(--swatch); border: 1px solid var(--on-accent); }
  .theme-panel { position: absolute; right: 0; top: calc(100% + 12px); width: 284px; max-width: calc(100vw - 32px); padding: 18px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); color: var(--text-h); box-shadow: var(--shadow); }
  h2 { margin: 0 0 12px; font-size: 14px; }
  .theme-colors { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  label { display: block; margin: 18px 0 8px; }
  select { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 7px; color: var(--text-h); background: var(--bg); font: inherit; }
  select:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  p { margin: 12px 0 0; font-size: 12px; color: var(--text); }
}
</style>
