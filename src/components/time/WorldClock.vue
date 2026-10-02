<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import { offsetLabel, presetZones, zoneOffset, zoneParts } from '@/utils/timezones'
import { clockRegions, filterWorldTimeZones, getSupportedWorldTimeZones, relativeToBeijing, type ClockRegion } from '@/utils/worldTimeZones'
defineEmits<{ notify: [message: string] }>()
const availableZones = getSupportedWorldTimeZones()
const commonZones = presetZones.map(zone => ({ ...availableZones.find(item => item.id === zone.id), ...zone }))
const mode = ref<'common' | 'world'>('common')
const query = ref('')
const region = ref<ClockRegion | 'all'>('all')
const page = ref(1)
const pageSize = 24
const browserTop = ref<HTMLElement>()
const licenseUrl = `${import.meta.env.BASE_URL}licenses/Unicode-3.0.txt`
const filteredZones = computed(() => mode.value === 'common' ? commonZones : filterWorldTimeZones(availableZones, query.value, region.value))
const pageCount = computed(() => Math.ceil(filteredZones.value.length / pageSize))
const pageStart = computed(() => (page.value - 1) * pageSize)
const visibleZones = computed(() => filteredZones.value.slice(pageStart.value, pageStart.value + pageSize))
watch([mode, query, region], () => { page.value = 1 })
function switchMode(value: 'common' | 'world') {
  mode.value = value
  query.value = ''
  region.value = 'all'
}
async function changePage(value: number) {
  page.value = Math.max(1, Math.min(value, pageCount.value))
  await nextTick()
  browserTop.value?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
}
const now = ref(Date.now())
const beijingZone = presetZones.find(zone => zone.id === 'Asia/Shanghai')!
const cards = computed(() => {
  const beijingOffset = zoneOffset(now.value, beijingZone)
  return visibleZones.value.map(zone => {
    const offset = zoneOffset(now.value, zone)
    const relative = relativeToBeijing(offset, beijingOffset)
    return { zone, ...zoneParts(now.value, zone), offset: offsetLabel(offset), relative }
  })
})
const timer = setInterval(() => { now.value = Date.now() }, 1000)
onBeforeUnmount(() => clearInterval(timer))
</script>
<template>
  <div ref="browserTop" class="clock-browser">
    <div class="clock-toolbar">
      <SegmentedControl :model-value="mode" label="时钟范围" :options="[{ value: 'common', label: `常用` }, { value: 'world', label: `全球` }]" @update:model-value="switchMode" />
      <p class="clock-intro"><span class="clock-live" />每秒更新 · 自动适配夏令时</p>
    </div>
    <div v-if="mode === 'world'" class="clock-filters">
      <div><label for="clock-search">搜索国家 / 城市</label><input id="clock-search" v-model="query" type="search" placeholder="例如：印度、迪拜、New York" /></div>
      <div><label for="clock-region">地区</label><select id="clock-region" v-model="region"><option value="all">全部地区</option><option v-for="item in clockRegions" :key="item.id" :value="item.id">{{ item.label }}</option></select></div>
    </div>
    <p v-if="mode === 'world'" class="clock-results" role="status">找到 {{ filteredZones.length }} 个城市 / 地区<span v-if="filteredZones.length">，当前显示 {{ pageStart + 1 }}–{{ Math.min(pageStart + pageSize, filteredZones.length) }}</span>。支持中文名称、英文名称及国家代码搜索。</p>
  </div>
  <div class="clock-grid">
    <article v-for="card in cards" :key="card.zone.id" class="time-panel clock-card">
      <div class="clock-heading"><h2>{{ card.zone.label }}</h2><p v-if="mode === 'world'" class="clock-country">{{ card.zone.country }}</p></div>
      <time :datetime="new Date(now).toISOString()">{{ card.time }}</time>
      <p class="clock-date">{{ card.date }} <span>{{ card.weekday }}</span></p>
      <p class="clock-offset"><span class="offset-badge">{{ card.offset }}</span><span>（{{ card.relative }}）</span></p>
    </article>
  </div>
  <p v-if="!cards.length" class="time-note">没有找到匹配的城市或地区，请换一个关键词，或选择“全部地区”。</p>
  <nav v-if="pageCount > 1" class="clock-pagination" aria-label="全球时钟分页"><button :disabled="page === 1" @click="changePage(page - 1)">上一页</button><span>第 {{ page }} / {{ pageCount }} 页</span><button :disabled="page === pageCount" @click="changePage(page + 1)">下一页</button></nav>
  <p v-if="mode === 'world'" class="clock-source">当前浏览器可显示 {{ availableZones.length }} 个城市 / 地区。目录：<a href="https://www.iana.org/time-zones" target="_blank" rel="noopener noreferrer">IANA</a>；中文名称：Unicode CLDR（<a :href="licenseUrl" target="_blank" rel="noopener noreferrer">使用许可</a>）。</p>
</template>
