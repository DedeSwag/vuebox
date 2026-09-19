<script setup lang="ts">
import ToolWrapper from './ToolWrapper.vue'
import '@/assets/toolkit.css'
defineProps<{ title: string; description: string; wide?: boolean }>()
</script>
<template>
  <ToolWrapper
    :title="title"
    :description="description"
    :class="{ 'dev-tool-wide': wide }"
    ><div class="dev-tool"><slot /></div
  ></ToolWrapper>
</template>
