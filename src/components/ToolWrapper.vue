<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>
<template>
  <div class="tool-wrapper">
    <header class="tool-header"><h1 class="tool-title">{{ title }}</h1><p v-if="description" class="tool-description">{{ description }}</p></header>
    <div class="tool-body"><slot /></div>
  </div>
</template>
<style scoped>
.tool-wrapper { width: 100%; min-width: 0; }
.tool-header { margin-bottom: 22px; }
.tool-title { font-size: 26px; margin: 0 0 6px; letter-spacing: -.5px; }
.tool-description { font-size: 14px; color: var(--text); margin: 0; }
.tool-body { background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 22px; min-width: 0; }
@media (max-width: 800px) { .tool-body { padding: 14px; } .tool-title { font-size: 23px; } }
</style>
