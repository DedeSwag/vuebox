<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ToolWrapper from '@/components/ToolWrapper.vue'
import UrlToolkit from './UrlToolkit.vue'
import TextCodec from '@/components/encoding/TextCodec.vue'
import UuidGenerator from '@/components/encoding/UuidGenerator.vue'
const tabs = [
  { key: 'url', title: 'URL 解析与编解码' },
  { key: 'base64', title: 'Base64 编解码' },
  { key: 'uuid', title: 'UUID 生成' },
  { key: 'escape', title: '文本转义' },
]
const route = useRoute()
const router = useRouter()
const active = computed({
  get: () => Math.max(0, tabs.findIndex(tab => tab.key === route.query.tab)),
  set: index => { void router.replace({ query: { ...route.query, tab: tabs[index]!.key } }) },
})
const toast = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
async function notify(message: string) {
  clearTimeout(timer)
  toast.value = ''
  await nextTick()
  toast.value = message
  timer = setTimeout(() => { toast.value = '' }, 3500)
}
function tabKey(event: KeyboardEvent, index: number) {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length
  active.value = next
  document.getElementById(`encoding-tab-${next}`)?.focus()
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <ToolWrapper title="编码工具箱" description="URL、Base64、UUID 与文本转义，全部在浏览器本地完成，不上传数据。">
    <div class="encoding-toolkit">
      <div class="encoding-tabs" role="tablist" aria-label="编码子工具">
        <button v-for="(tab, index) in tabs" :id="`encoding-tab-${index}`" :key="tab.key" role="tab" :aria-selected="active === index" :aria-controls="`encoding-panel-${index}`" :tabindex="active === index ? 0 : -1" @click="active = index" @keydown="tabKey($event, index)">{{ tab.title }}</button>
      </div>
      <section v-show="active === 0" id="encoding-panel-0" role="tabpanel" aria-labelledby="encoding-tab-0"><UrlToolkit @notify="notify" /></section>
      <section v-show="active === 1" id="encoding-panel-1" role="tabpanel" aria-labelledby="encoding-tab-1"><TextCodec kind="base64" @notify="notify" /></section>
      <section v-show="active === 2" id="encoding-panel-2" role="tabpanel" aria-labelledby="encoding-tab-2"><UuidGenerator @notify="notify" /></section>
      <section v-show="active === 3" id="encoding-panel-3" role="tabpanel" aria-labelledby="encoding-tab-3"><TextCodec kind="escape" @notify="notify" /></section>
      <div class="encoding-toast" :class="{ visible: toast }" role="status" aria-live="polite" aria-atomic="true">{{ toast }}</div>
    </div>
  </ToolWrapper>
</template>

<style>
.encoding-toolkit { font-size: 14px; }
.encoding-toolkit :is(.encoding-controls, .encoding-tabs) :is(button, input, select, textarea) { font: inherit; border: 1px solid var(--border); border-radius: 7px; background: var(--bg); color: var(--text-h); }
.encoding-toolkit :is(.encoding-controls, .encoding-tabs) button { padding: 7px 12px; cursor: pointer; }
.encoding-controls button:hover:not(:disabled), .encoding-controls button.accent { color: var(--accent); background: var(--accent-bg); border-color: var(--accent-border); }
.encoding-controls button:disabled { opacity: .45; cursor: not-allowed; }
.encoding-toolkit :is(button, input, select, textarea):focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.encoding-tabs { display: flex; gap: 6px; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
.encoding-toolkit .encoding-tabs button { flex: 1; border-color: transparent; padding: 11px 8px; color: var(--text); }
.encoding-toolkit .encoding-tabs button[aria-selected=true] { background: var(--accent-bg); border-color: var(--accent-border); color: var(--accent); font-weight: 600; }
.encoding-actions { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin: 14px 0; }
.encoding-actions:first-child { margin-top: 0; }
.encoding-actions:last-child { margin-bottom: 0; }
.encoding-actions .encoding-actions { margin: 0; }
.encoding-panel { border: 1px solid var(--border); border-radius: 10px; padding: 18px; min-width: 0; }
.encoding-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.encoding-controls h2 { font-size: 16px; margin: 0; }
.encoding-controls label { display: block; margin: 16px 0 8px; color: var(--text-h); }
.encoding-controls h2 label, .encoding-controls .mode-label { margin: 0; }
.encoding-controls :is(input, select) { min-width: 0; max-width: 100%; padding: 8px 10px; }
.encoding-controls input[type=number] { width: 100%; }
.encoding-controls .check-label { display: flex; gap: 8px; align-items: center; }
.encoding-controls textarea { display: block; width: 100%; padding: 12px; resize: vertical; font: 13px/1.8 var(--mono); min-height: 140px; }
.encoding-controls textarea[readonly] { background: var(--social-bg); }
.encoding-note { background: var(--social-bg); padding: 14px; border-radius: 8px; font-size: 12px; line-height: 1.8; margin-bottom: 20px; overflow-wrap: anywhere; }
.encoding-hint { font-size: 12px; color: var(--text); margin-top: 8px; }
.encoding-error { color: #c53942; margin-top: 14px; overflow-wrap: anywhere; }
.encoding-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); opacity: 0; pointer-events: none; z-index: 200; max-width: calc(100vw - 32px); padding: 12px 20px; background: var(--text-h); color: var(--bg); border-radius: 10px; box-shadow: var(--shadow); transition: opacity .15s; }
.encoding-toast.visible { opacity: 1; }
@media (prefers-color-scheme: dark) { .encoding-error { color: #ff9299; } }
@media (max-width: 700px) {
  .encoding-grid { grid-template-columns: minmax(0, 1fr); }
  .encoding-panel { padding: 14px; }
  .encoding-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .encoding-toolkit .encoding-tabs button { font-size: 12px; padding: 10px 4px; }
  .encoding-toolkit .operation-actions { width: 100%; justify-content: flex-start; }
}
</style>
