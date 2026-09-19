<script setup lang="ts">
import { computed, ref } from 'vue'
import { customZone, offsetLabel, parseZoneTime, presetZones, zoneInput, zoneOffset, type TimeZone } from '@/utils/timezones'
const emit = defineEmits<{ notify: [message: string] }>()
const zones = ref<TimeZone[]>([...presetZones])
const sourceId = ref('Asia/Shanghai')
const targets = ref(['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'])
const instant = ref<number | null>(Math.floor(Date.now() / 1000) * 1000)
const source = computed(() => zones.value.find(z => z.id === sourceId.value)!)
const sourceTime = ref(zoneInput(instant.value!, source.value))
const drafts = ref<Record<string, string>>({})
const error = ref('')
const ambiguous = ref(false)
const occurrence = ref<'earlier' | 'later'>('earlier')
const lastEditor = ref('source')
const offset = ref('+05:30')
const addId = ref('Asia/Singapore')
const targetZones = computed(() => targets.value.map(id => zones.value.find(z => z.id === id)!))
const available = computed(() => zones.value.filter(z => !targets.value.includes(z.id)))
function edit(value: string, zone: TimeZone, editor: string) {
  lastEditor.value = editor
  if (editor === 'source') sourceTime.value = value
  else drafts.value[editor] = value
  error.value = ''
  ambiguous.value = false
  instant.value = null
  try {
    const parsed = parseZoneTime(value, zone, occurrence.value)
    instant.value = parsed.instant
    ambiguous.value = parsed.ambiguous
    sourceTime.value = zoneInput(parsed.instant, source.value)
    drafts.value = {}
  } catch (reason) { error.value = (reason as Error).message }
}
function chooseOccurrence() {
  const zone = lastEditor.value === 'source' ? source.value : zones.value.find(z => z.id === lastEditor.value) ?? source.value
  const value = lastEditor.value === 'source' ? sourceTime.value : drafts.value[zone.id] ?? (instant.value === null ? '' : zoneInput(instant.value, zone))
  edit(value, zone, lastEditor.value)
}
function current() {
  instant.value = Math.floor(Date.now() / 1000) * 1000
  sourceTime.value = zoneInput(instant.value, source.value)
  drafts.value = {}; error.value = ''; ambiguous.value = false; lastEditor.value = 'source'
}
function reset() {
  zones.value = [...presetZones]; sourceId.value = 'Asia/Shanghai'
  targets.value = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo']
  occurrence.value = 'earlier'; lastEditor.value = 'source'; offset.value = '+05:30'; addId.value = 'Asia/Singapore'
  current(); emit('notify', '已重置时区转换')
}
function add(id: string) {
  if (!id || targets.value.includes(id)) return
  targets.value.push(id)
  addId.value = available.value[0]?.id ?? ''
}
function addCustom() {
  try {
    const zone = customZone(offset.value)
    if (!zones.value.some(z => z.id === zone.id)) zones.value.push(zone)
    add(zone.id); emit('notify', `已添加 ${zone.label}`)
  } catch (reason) { emit('notify', (reason as Error).message) }
}
async function copy(zone: TimeZone) {
  if (instant.value === null) return
  try {
    await navigator.clipboard.writeText(`${zoneInput(instant.value, zone).replace('T', ' ')} ${offsetLabel(zoneOffset(instant.value, zone))} · ${zone.label}`)
    emit('notify', `已复制${zone.label}时间`)
  } catch { emit('notify', '复制失败，请手动选择时间复制。') }
}
</script>

<template>
  <div class="time-actions"><p>修改任意一侧的时间，所有时区同步换算。</p><button @click="reset">重置</button></div>
  <div class="zone-layout">
    <section class="time-panel source-panel">
      <h2>源时间与时区</h2>
      <label for="source-zone">源时区</label>
      <select id="source-zone" v-model="sourceId" @change="edit(sourceTime, source, 'source')"><option v-for="zone in zones" :key="zone.id" :value="zone.id">{{ zone.label }} · {{ zone.offset === undefined ? zone.id : offsetLabel(zone.offset) }}</option></select>
      <p v-if="instant !== null" class="time-hint">所选日期的时区偏移：{{ offsetLabel(zoneOffset(instant, source)) }}</p>
      <label for="source-time">源日期时间</label>
      <input id="source-time" :value="sourceTime" type="datetime-local" step="1" min="1900-01-01T00:00" max="9998-12-31T23:59:59" @input="edit(($event.target as HTMLInputElement).value, source, 'source')" />
      <div class="time-actions"><button class="accent" @click="current">使用当前时间</button><button :disabled="instant === null" @click="copy(source)">复制源时间</button></div>
      <label for="dst-choice">夏令时重复时间</label>
      <select id="dst-choice" v-model="occurrence" @change="chooseOccurrence"><option value="earlier">使用第一次出现的时间</option><option value="later">使用第二次出现的时间</option></select>
      <p v-if="ambiguous" class="time-hint">该时间出现两次，当前采用{{ occurrence === 'earlier' ? '第一次' : '第二次' }}对应的 UTC 时刻。</p>
      <p v-if="error" class="time-error" role="alert">{{ error }}</p>
      <div class="time-note">纽约、伦敦等城市自动应用所选日期的夏令时规则。更换源时区会按新时区重新解释源时间。</div>
      <h3>添加自定义偏移</h3>
      <label for="custom-zone-offset">固定 UTC 偏移（±HH:mm）</label>
      <div class="inline-controls"><input id="custom-zone-offset" v-model="offset" placeholder="+05:30" @keyup.enter="addCustom" /><button @click="addCustom">添加</button></div>
      <p class="time-hint">添加后可用于源时区和目标时区；固定偏移不使用夏令时。</p>
    </section>
    <section class="target-panel">
      <div class="time-actions"><h2>目标时区</h2><span class="time-hint">{{ targets.length }} 个时区 · 实时联动</span></div>
      <div class="inline-controls"><select v-model="addId" aria-label="添加目标时区"><option value="" disabled>选择目标时区</option><option v-for="zone in available" :key="zone.id" :value="zone.id">{{ zone.label }}</option></select><button :disabled="!addId || targets.includes(addId)" @click="add(addId)">添加</button></div>
      <p v-if="!targets.length" class="time-note">暂无目标时区，请从上方添加。</p>
      <article v-for="zone in targetZones" :key="zone.id" class="time-panel target-card">
        <div class="time-actions"><h3>{{ zone.label }}</h3><span class="offset-badge">{{ instant === null ? '—' : offsetLabel(zoneOffset(instant, zone)) }}</span><button :aria-label="`移除目标时区${zone.label}`" @click="targets = targets.filter(id => id !== zone.id); addId = zone.id">移除</button></div>
        <label :for="`target-${zone.id}`">{{ zone.label }}日期时间</label>
        <input :id="`target-${zone.id}`" :value="drafts[zone.id] ?? (instant === null ? '' : zoneInput(instant, zone))" type="datetime-local" step="1" min="1900-01-01T00:00" max="9998-12-31T23:59:59" @input="edit(($event.target as HTMLInputElement).value, zone, zone.id)" />
        <div class="time-actions"><span class="time-hint">可编辑，反向更新源时间</span><button :disabled="instant === null" :aria-label="`复制${zone.label}时间`" @click="copy(zone)">复制</button></div>
      </article>
    </section>
  </div>
</template>
