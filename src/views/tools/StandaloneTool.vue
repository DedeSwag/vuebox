<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'
import ToolWrapper from '@/components/ToolWrapper.vue'
import '@/assets/time-tools.css'
import '@/assets/encoding-tools.css'
const route = useRoute()
const pages = {
  'timestamp-converter': { component: defineAsyncComponent(() => import('./dev/TimestampConverter.vue')), theme: 'time-toolkit' },
  'cron-generator': { component: defineAsyncComponent(() => import('./dev/CronGenerator.vue')), theme: 'time-toolkit' },
  'timezone-converter': { component: defineAsyncComponent(() => import('@/components/time/TimeZoneConverter.vue')), theme: 'time-toolkit time-controls' },
  'world-clock': { component: defineAsyncComponent(() => import('@/components/time/WorldClock.vue')), theme: 'time-toolkit time-controls' },
  'base64-codec': { component: defineAsyncComponent(() => import('@/components/encoding/Base64Codec.vue')), theme: 'encoding-toolkit' },
  'uuid-generator': { component: defineAsyncComponent(() => import('@/components/encoding/UuidGenerator.vue')), theme: 'encoding-toolkit' },
}
const page = computed(() => pages[route.name as keyof typeof pages])
const toast = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
function notify(message: string) {
  clearTimeout(timer)
  toast.value = message
  timer = setTimeout(() => { toast.value = '' }, 3500)
}
onBeforeUnmount(() => clearTimeout(timer))
</script>
<template>
  <ToolWrapper :title="String(route.meta.title)" :description="String(route.meta.description)">
    <div v-if="page" :class="page.theme"><component :is="page.component" @notify="notify" /></div>
    <div v-if="toast" class="tool-toast" role="status">{{ toast }}</div>
  </ToolWrapper>
</template>
<style scoped>
.tool-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 200; padding: 12px 20px; max-width: calc(100vw - 32px); border-radius: 10px; background: var(--text-h); color: var(--bg); box-shadow: var(--shadow); }
</style>
