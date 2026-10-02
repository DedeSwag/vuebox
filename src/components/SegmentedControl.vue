<script setup lang="ts" generic="T extends string">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: T
  label: string
  options: readonly { value: T; label: string }[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
const group = ref<HTMLElement>()

function select(value: T) {
  if (value !== props.modelValue) emit('update:modelValue', value)
}
function navigate(event: KeyboardEvent, index: number) {
  let target: number
  const count = props.options.length
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = (index + 1) % count
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = (index + count - 1) % count
  else if (event.key === 'Home') target = 0
  else if (event.key === 'End') target = count - 1
  else return
  event.preventDefault()
  const option = props.options[target]
  if (!option) return
  select(option.value)
  group.value?.querySelectorAll<HTMLButtonElement>('button')[target]?.focus()
}
</script>

<template>
  <div ref="group" class="segmented-control" role="radiogroup" :aria-label="label">
    <button v-for="(option, index) in options" :key="option.value" type="button" role="radio"
      :aria-checked="modelValue === option.value" :tabindex="modelValue === option.value ? 0 : -1"
      @click="select(option.value)" @keydown="navigate($event, index)">{{ option.label }}</button>
  </div>
</template>

<style scoped>
@layer components {
  .segmented-control { display: inline-flex; align-items: stretch; gap: 4px; padding: 4px; max-width: 100%; border: 1px solid var(--border); border-radius: 10px; background: var(--social-bg); }
  .segmented-control > button { flex: 1; min-width: 0; white-space: nowrap; }
}
</style>
