<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ToolWrapper from '@/components/ToolWrapper.vue'
import TimestampConverter from './TimestampConverter.vue'
import CronGenerator from './CronGenerator.vue'
import TimeZoneConverter from '@/components/time/TimeZoneConverter.vue'
import WorldClock from '@/components/time/WorldClock.vue'
const tabs = ['时间戳转换', 'Cron 表达式生成器', '时区转换', '世界时钟']
const tabKeys = ['timestamp', 'cron', 'timezone', 'clock']
const route = useRoute()
const router = useRouter()
const active = computed({
  get: () => Math.max(0, tabKeys.indexOf(String(route.query.tab ?? 'timestamp'))),
  set: index => { void router.replace({ query: { ...route.query, tab: tabKeys[index] } }) },
})
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
async function notify(message: string) {
  clearTimeout(toastTimer)
  toast.value = ''
  await nextTick()
  toast.value = message
  toastTimer = setTimeout(() => { toast.value = '' }, 3500)
}
function tabKey(event: KeyboardEvent, index: number) {
  const key = event.key
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(key)) return
  event.preventDefault()
  const next = key === 'Home' ? 0 : key === 'End' ? tabs.length - 1 : (index + (key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length
  active.value = next
  document.getElementById(`time-tab-${next}`)?.focus()
}
onBeforeUnmount(() => clearTimeout(toastTimer))
</script>

<template>
  <ToolWrapper title="时间工具箱" description="时间戳、Cron、时区转换与世界时钟，所有计算均在本地完成，不上传数据。">
    <div class="time-toolkit">
      <div class="time-tabs" role="tablist" aria-label="时间子工具">
        <button v-for="(title, index) in tabs" :id="`time-tab-${index}`" :key="title" role="tab" :aria-selected="active === index" :aria-controls="`time-panel-${index}`" :tabindex="active === index ? 0 : -1" @click="active = index" @keydown="tabKey($event, index)">{{ title }}</button>
      </div>
      <section v-show="active === 0" id="time-panel-0" role="tabpanel" aria-labelledby="time-tab-0"><TimestampConverter @notify="notify" /></section>
      <section v-show="active === 1" id="time-panel-1" role="tabpanel" aria-labelledby="time-tab-1"><CronGenerator @notify="notify" /></section>
      <section v-show="active === 2" id="time-panel-2" class="time-controls" role="tabpanel" aria-labelledby="time-tab-2"><TimeZoneConverter @notify="notify" /></section>
      <section v-show="active === 3" id="time-panel-3" class="time-controls" role="tabpanel" aria-labelledby="time-tab-3"><WorldClock @notify="notify" /></section>
      <div class="time-toast" :class="{ visible: toast }" role="status" aria-live="polite" aria-atomic="true">{{ toast }}</div>
    </div>
  </ToolWrapper>
</template>

<style>
.time-toolkit { font-size: 14px; }
.time-toolkit :is(.time-controls, .time-tabs) :is(button, input, select) { font: inherit; border: 1px solid var(--border); border-radius: 7px; background: var(--bg); color: var(--text-h); }
.time-toolkit :is(.time-controls, .time-tabs) button { padding: 7px 12px; cursor: pointer; white-space: nowrap; }
.time-controls button:hover:not(:disabled), .time-controls button.accent { color: var(--accent); background: var(--accent-bg); border-color: var(--accent-border); }
.time-controls button:disabled { opacity: .45; cursor: not-allowed; }
.time-toolkit :is(button, input, select):focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.time-controls input, .time-controls select { display: block; width: 100%; min-width: 0; height: 43px; padding: 8px 10px; }
.time-controls input { font-family: var(--mono); }
.time-controls label { display: block; margin: 16px 0 8px; color: var(--text-h); font-weight: 500; }
.time-controls h2 { font-size: 17px; margin: 0; }
.time-controls h3 { font-size: 14px; margin: 0; }
.time-tabs { display: flex; gap: 6px; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
.time-toolkit .time-tabs button { flex: 1; border-color: transparent; padding: 11px 8px; color: var(--text); }
.time-toolkit .time-tabs button[aria-selected=true] { background: var(--accent-bg); border-color: var(--accent-border); color: var(--accent); font-weight: 600; }
.time-actions { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin: 14px 0; }
.time-actions:first-child { margin-top: 0; }
.time-actions:last-child { margin-bottom: 0; }
.time-actions p { flex: 1; }
.time-panel { border: 1px solid var(--border); border-radius: 10px; padding: 20px; min-width: 0; }
.zone-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; align-items: start; }
.target-panel { min-width: 0; }
.target-card { margin-top: 14px; background: var(--social-bg); }
.target-card .time-actions h3 { margin-right: auto; }
.target-card label { font-size: 12px; }
.inline-controls { display: flex; gap: 8px; }
.inline-controls input, .inline-controls select { flex: 1; }
.time-hint { color: var(--text); font-size: 12px; line-height: 1.7; }
p.time-hint { margin-top: 10px; }
.offset-badge { color: var(--accent); font-size: 12px; font-family: var(--mono); }
.time-note { background: var(--social-bg); border-radius: 8px; padding: 14px; margin: 18px 0; color: var(--text); font-size: 12px; line-height: 1.8; }
.time-error { color: #da4242; margin-top: 14px; }
.clock-controls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-bottom: 20px; }
.clock-controls label { margin-top: 0; }
.clock-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.clock-card { background: var(--social-bg); }
.clock-card h2 { font-size: 16px; overflow-wrap: anywhere; }
.clock-card time { display: block; color: var(--text-h); font: 30px/1.8 var(--mono); font-variant-numeric: tabular-nums; margin-top: 12px; }
.clock-date { font-size: 13px; color: var(--text-h); }
.clock-date span { margin-left: 6px; color: var(--text); }
.clock-card .time-hint { overflow-wrap: anywhere; min-width: 0; }
.clock-card button { padding: 4px 8px; font-size: 12px; }
.clock-live { display: inline-block; width: 7px; height: 7px; margin-right: 6px; border-radius: 50%; background: #22a777; }
.time-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(10px); opacity: 0; pointer-events: none; z-index: 200; max-width: calc(100vw - 32px); padding: 12px 20px; background: var(--text-h); color: var(--bg); border-radius: 10px; box-shadow: var(--shadow); transition: opacity .15s, transform .15s; }
.time-toast.visible { opacity: 1; transform: translateX(-50%) translateY(0); }
@media (max-width: 850px) { .clock-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 700px) {
  .zone-layout, .clock-controls, .clock-grid { grid-template-columns: 1fr; }
  .time-panel { padding: 16px; }
  .time-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .time-toolkit .time-tabs button { font-size: 12px; padding: 10px 4px; white-space: normal; }
}
</style>
