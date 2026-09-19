<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
import { parseInteger, formatInteger } from '@/utils/radix'
const input = ref(''),
  base = ref(10),
  target = ref(36),
  uppercase = ref(true)
const { feedback, copy } = useLocalClipboard()
const result = computed(() => {
  if (!input.value.trim()) return { value: null, error: '' }
  try {
    return { value: parseInteger(input.value, base.value), error: '' }
  } catch (e) {
    return { value: null, error: (e as Error).message }
  }
})
const outputs = computed(() => {
  if (result.value.value === null) return []
  return [...new Set([2, 8, 10, 16, target.value])].map((b) => ({
    base: b,
    value: formatInteger(result.value.value!, b, uppercase.value),
  }))
})
watch([input, base, target, uppercase], () => (feedback.value = ''))
function example() {
  base.value = 16
  input.value = '0x1FFFFFFFFFFFFF'
}
</script>
<template>
  <DevTool
    title="进制转换"
    description="2–36 进制整数互转 · 使用 BigInt 保留大整数精度"
    ><div class="controls">
      <label
        >输入进制<select v-model.number="base">
          <option v-for="n in 35" :key="n" :value="n + 1">
            {{ n + 1 }} 进制
          </option>
        </select></label
      ><label
        >额外目标进制<select v-model.number="target">
          <option v-for="n in 35" :key="n" :value="n + 1">
            {{ n + 1 }} 进制
          </option>
        </select></label
      ><label class="check"
        ><input v-model="uppercase" type="checkbox" />字母大写</label
      ><button @click="example">载入示例</button
      ><button @click="input = ''">清空</button>
    </div>
    <label
      >输入整数<textarea
        v-model="input"
        spellcheck="false"
        placeholder="支持负数、大整数和数字间下划线"
      />
    </label>
    <p v-if="result.error" class="error" role="alert">{{ result.error }}</p>
    <div class="stack results">
      <section v-for="row in outputs" :key="row.base" class="box">
        <div class="box-head">
          <h2>{{ row.base }} 进制</h2>
          <button @click="copy(row.value)">复制 {{ row.base }} 进制</button>
        </div>
        <pre class="result">{{ row.value }}</pre>
      </section>
    </div>
    <p class="feedback" role="status">{{ feedback }}</p>
    <p class="note">
      仅转换数学整数，不计算固定字长补码。0x、0b、0o
      前缀仅在相应进制下识别；其他进制中字符按其数位解释。最多 4096 字符。
    </p></DevTool
  >
</template>
<style scoped>
.results {
  margin-top: 18px;
}
</style>
