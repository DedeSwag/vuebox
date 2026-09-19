<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { customZone, offsetLabel, presetZones, zoneOffset, zoneParts, type TimeZone } from '@/utils/timezones'
const emit = defineEmits<{ notify: [message: string] }>()
const now = ref(Date.now())
const zones = ref<TimeZone[]>([...presetZones])
const selected = ref('')
const offset = ref('+05:30')
const available = computed(() => presetZones.filter(zone => !zones.value.some(z => z.id === zone.id)))
const cards = computed(() => zones.value.map(zone => ({ zone, ...zoneParts(now.value, zone), offset: offsetLabel(zoneOffset(now.value, zone)) })))
const timer = setInterval(() => { now.value = Date.now() }, 1000)
onBeforeUnmount(() => clearInterval(timer))
function add(zone: TimeZone) {
  if (zones.value.some(z => z.id === zone.id)) { emit('notify', '该时区已在面板中'); return }
  zones.value.push(zone); emit('notify', `已添加${zone.label}`)
  selected.value = available.value[0]?.id ?? ''
}
function addPreset() { const zone = presetZones.find(z => z.id === selected.value); if (zone) add(zone) }
function addCustom() {
  try { add(customZone(offset.value)) } catch (reason) { emit('notify', (reason as Error).message) }
}
function remove(id: string) { zones.value = zones.value.filter(z => z.id !== id); selected.value = available.value[0]?.id ?? '' }
function reset() { zones.value = [...presetZones]; selected.value = ''; offset.value = '+05:30'; now.value = Date.now(); emit('notify', '已恢复默认的 7 个世界时钟') }
async function copy(card: typeof cards.value[number]) {
  try { await navigator.clipboard.writeText(`${card.zone.label} ${card.date} ${card.time} ${card.weekday} ${card.offset}`); emit('notify', `已复制${card.zone.label}时间`) }
  catch { emit('notify', '复制失败，请手动选择时间复制。') }
}
</script>
<template>
  <div class="time-actions"><p><span class="clock-live" />每秒更新 · 城市时区自动适配夏令时</p><button @click="reset">重置</button></div>
  <div class="clock-controls time-panel">
    <div><label for="clock-zone">添加预设时区</label><div class="inline-controls"><select id="clock-zone" v-model="selected"><option value="">{{ available.length ? '选择时区' : '所有预设时区均已添加' }}</option><option v-for="zone in available" :key="zone.id" :value="zone.id">{{ zone.label }}</option></select><button :disabled="!available.some(z => z.id === selected)" @click="addPreset">添加</button></div></div>
    <div><label for="clock-offset">自定义固定偏移（±HH:mm）</label><div class="inline-controls"><input id="clock-offset" v-model="offset" placeholder="+05:30" @keyup.enter="addCustom" /><button @click="addCustom">添加</button></div></div>
  </div>
  <div class="clock-grid">
    <article v-for="card in cards" :key="card.zone.id" class="time-panel clock-card">
      <div class="time-actions"><h2>{{ card.zone.label }}</h2><button :aria-label="`移除世界时钟${card.zone.label}`" @click="remove(card.zone.id)">移除</button></div>
      <span class="offset-badge">{{ card.offset }}</span>
      <time :datetime="new Date(now).toISOString()">{{ card.time }}</time>
      <p class="clock-date">{{ card.date }} <span>{{ card.weekday }}</span></p>
      <div class="time-actions"><span class="time-hint">{{ card.zone.offset === undefined ? card.zone.id : '固定 UTC 偏移' }}</span><button :aria-label="`复制世界时钟${card.zone.label}`" @click="copy(card)">复制</button></div>
    </article>
  </div>
  <p v-if="!cards.length" class="time-note">暂无时钟。添加时区，或点击“重置”恢复默认面板。</p>
</template>
