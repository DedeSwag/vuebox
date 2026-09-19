<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from 'vue'
import type { Node } from 'jsonc-parser'
import {
  flattenJsonTree,
  isContainer,
  treeLiteral,
  treeWindow,
  TREE_ROW_HEIGHT,
  type JsonTreeRow,
} from '@/utils/jsonTree'

const props = defineProps<{
  node: Node
  source: string
  expansion: { open: boolean; version: number }
}>()
const viewport = ref<HTMLDivElement>()
const scrollTop = ref(0)
const height = ref(380)
const overrides = shallowRef<ReadonlySet<number>>(new Set())
const selected = shallowRef<JsonTreeRow>()
const rows = computed(() =>
  flattenJsonTree(props.node, props.expansion.open, overrides.value),
)
const window = computed(() =>
  treeWindow(rows.value.length, scrollTop.value, height.value),
)
const visible = computed(() =>
  rows.value.slice(window.value.start, window.value.end),
)
let observer: ResizeObserver | undefined
watch(
  () => [props.node, props.expansion],
  () => {
    overrides.value = new Set()
    selected.value = undefined
    scrollTop.value = 0
    if (viewport.value) viewport.value.scrollTop = 0
  },
)
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry) height.value = entry.contentRect.height
  })
  if (viewport.value) observer.observe(viewport.value)
})
onBeforeUnmount(() => observer?.disconnect())
function toggle(row: JsonTreeRow) {
  const next = new Set(overrides.value)
  if (next.has(row.node.offset)) next.delete(row.node.offset)
  else next.add(row.node.offset)
  overrides.value = next
  // 折叠后保持当前节点的位置，并限制到新的滚动范围。
  const nextTop = Math.min(
    scrollTop.value,
    Math.max(0, rows.value.length * TREE_ROW_HEIGHT - height.value),
  )
  scrollTop.value = nextTop
  if (viewport.value) viewport.value.scrollTop = nextTop
}
function keyLabel(name: string) {
  return JSON.stringify(name.length > 100 ? name.slice(0, 100) + '…' : name)
}
</script>
<template>
  <div class="virtual-tree">
    <div class="tree-summary">
      {{ rows.length.toLocaleString() }} 行 · 按需显示可见节点<span
        >点击值查看完整内容</span
      >
    </div>
    <div
      ref="viewport"
      class="tree-viewport"
      aria-label="JSON 树形节点"
      tabindex="0"
      @scroll="scrollTop = ($event.target as HTMLDivElement).scrollTop"
    >
      <div class="tree-spacer" :style="{ height: `${window.totalHeight}px` }">
        <div
          class="tree-window"
          :style="{ transform: `translateY(${window.offset}px)` }"
        >
          <div
            v-for="row in visible"
            :key="row.id"
            class="virtual-tree-row"
            :style="{ paddingLeft: `${Math.min(row.depth, 20) * 16}px` }"
          >
            <span v-if="row.closing" class="closing">{{
              row.node.type === 'object' ? '}' : ']'
            }}</span>
            <template v-else>
              <button
                v-if="isContainer(row.node)"
                class="node-toggle"
                :aria-expanded="row.open"
                :aria-label="`${row.open ? '折叠' : '展开'} ${row.name ?? '根节点'}`"
                @click="toggle(row)"
              >
                {{ row.open ? '▾' : '▸' }}</button
              ><span v-else class="node-spacer" />
              <button
                v-if="row.name !== undefined"
                class="node-key json-key"
                @click="selected = row"
              >
                {{ keyLabel(row.name) }}<span class="punctuation">: </span>
              </button>
              <template v-if="isContainer(row.node)"
                ><span>{{ row.node.type === 'object' ? '{' : '[' }}</span
                ><span class="node-count"
                  >{{ row.node.children?.length ?? 0 }}
                  {{ row.node.type === 'object' ? '个属性' : '个元素' }}</span
                ><span v-if="!row.open">{{
                  row.node.type === 'object' ? '}' : ']'
                }}</span></template
              >
              <button
                v-else
                class="node-value"
                :class="`json-${row.node.type}`"
                @click="selected = row"
              >
                {{ treeLiteral(row, source) }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
    <div v-if="selected" class="node-detail">
      <div>
        <strong>{{ selected.name ?? '根节点' }}</strong
        ><button @click="selected = undefined">关闭详情</button>
      </div>
      <pre>{{
        source.slice(
          selected.node.offset,
          selected.node.offset + selected.node.length,
        )
      }}</pre>
    </div>
  </div>
</template>
<style scoped>
.virtual-tree {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  color: var(--text-h);
}
.tree-summary {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 11px;
  color: var(--text);
  margin-bottom: 8px;
}
.tree-viewport {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overflow-anchor: none;
  contain: strict;
}
.tree-viewport:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: -1px;
}
.tree-spacer {
  position: relative;
}
.tree-window {
  position: absolute;
  top: 0;
  width: 100%;
}
.virtual-tree-row {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  font: 13px/28px var(--mono);
  white-space: nowrap;
  overflow: hidden;
}
button {
  font: inherit;
  background: transparent;
  border: 0;
  padding: 0;
  color: inherit;
  cursor: pointer;
}
button:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: -1px;
}
.node-toggle,
.node-spacer {
  flex: 0 0 20px;
  width: 20px;
  color: var(--text);
}
.node-key {
  flex-shrink: 1;
  min-width: 0;
  max-width: 55%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.node-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}
.node-count {
  color: var(--text);
  font: 11px var(--sans);
  margin: 0 6px;
  flex-shrink: 0;
}
.punctuation {
  color: var(--text);
}
.closing {
  padding-left: 24px;
}
.node-detail {
  border-top: 1px solid var(--border);
  padding-top: 8px;
  margin-top: 8px;
  max-height: 40%;
  display: flex;
  flex-direction: column;
}
.node-detail > div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
}
.node-detail strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.node-detail button {
  flex-shrink: 0;
  color: var(--accent);
}
.node-detail pre {
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: 12px/20px var(--mono);
  margin: 6px 0 0;
  user-select: text;
}
</style>
