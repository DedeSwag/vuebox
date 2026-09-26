<script setup lang="ts">
import { computed, ref } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
import { filterHttpStatuses, httpStatusGroups, httpStatusSource } from '@/utils/httpStatus'
const query = ref('')
const group = ref(0)
const commonOnly = ref(false)
const results = computed(() => filterHttpStatuses(query.value, group.value, commonOnly.value))
const { copy, feedback } = useLocalClipboard()
function reset() { query.value = ''; group.value = 0; commonOnly.value = false; feedback.value = '' }
</script>
<template>
  <DevTool title="HTTP 状态码速查" description="按状态码、英文名称或中文含义搜索 · 本地速查，无需发起网络请求">
    <div class="controls"><label class="search">搜索状态码<input v-model="query" type="search" placeholder="例如 404、not found、限流、重定向" /></label><label class="check"><input v-model="commonOnly" type="checkbox" />仅看常用</label><button @click="reset">重置</button></div>
    <div class="controls" aria-label="状态码分类"><button :class="{ active: group === 0 }" :aria-pressed="group === 0" @click="group = 0">全部</button><button v-for="item in httpStatusGroups" :key="item.key" :class="{ active: group === item.key }" :aria-pressed="group === item.key" @click="group = item.key">{{ item.title }}</button></div>
    <p class="muted" role="status">找到 {{ results.length }} 个状态码</p>
    <div class="status-list"><article v-for="status in results" :key="status.code" class="box status-card"><div class="code" :class="`group-${Math.floor(status.code / 100)}`">{{ status.code }}</div><div class="status-content"><h2>{{ status.name }}</h2><p class="meaning">{{ status.meaning }}</p><p class="muted">{{ status.note }}</p></div><button :aria-label="`复制 ${status.code} 状态码`" @click="copy(`${status.code} ${status.name}`)">复制</button></article></div>
    <p v-if="!results.length" class="note">没有匹配项，请调整关键词或清除分类筛选。此处不收录 Nginx 等软件的非标准扩展状态码。</p>
    <p class="feedback" role="status">{{ feedback }}</p>
    <p class="note">数据核对日期：2026-09-26。参考 <a :href="httpStatusSource" target="_blank" rel="noopener noreferrer">IANA HTTP 状态码注册表</a>，包含保留、弃用和临时登记项，并在说明中标注。此页为本地数据快照。</p>
  </DevTool>
</template>
<style scoped>
.search { flex: 1; min-width: min(100%, 280px); }
.search input { flex: 1; }
.status-list { display: grid; gap: 10px; margin-top: 16px; }
.status-card { display: flex; align-items: flex-start; gap: 16px; }
.status-content { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.meaning { margin: 5px 0; color: var(--text-h); }
.code { font: 600 24px/1.5 var(--mono); padding: 4px 10px; border-radius: 7px; background: var(--accent-bg); color: var(--accent); }
.group-2 { color: #238454; }.group-4 { color: #b96a12; }.group-5 { color: #c53942; }
@media (prefers-color-scheme: dark) { .group-2 { color: #86d5a9; }.group-4 { color: #edb077; }.group-5 { color: #ff969b; } }
@media (max-width: 600px) { .status-card { flex-wrap: wrap; gap: 10px; }.code { font-size: 20px; }.status-card button { margin-left: auto; }.search { flex-wrap: wrap; }.search input { width: 100%; flex-basis: 100%; } }
</style>
