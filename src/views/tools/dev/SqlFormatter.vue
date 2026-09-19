<script setup lang="ts">
import { ref, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { useWorkerTask } from '@/composables/useWorkerTask'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
import type { SqlRequest } from '@/utils/sql'
const source = ref(''),
  language = ref<SqlRequest['language']>('mysql'),
  keywordCase = ref<SqlRequest['keywordCase']>('upper'),
  tabWidth = ref(2)
const { result, busy, error, run, reset } = useWorkerTask<SqlRequest, string>(
  () =>
    new Worker(new URL('../../../workers/sql.worker.ts', import.meta.url), {
      type: 'module',
    }),
  5000,
)
const { feedback, copy } = useLocalClipboard()
watch([source, language, keywordCase, tabWidth], () => {
  reset()
  feedback.value = ''
})
function format() {
  run({
    source: source.value,
    language: language.value,
    keywordCase: keywordCase.value,
    tabWidth: tabWidth.value,
  })
}
function example() {
  source.value =
    "select u.id,u.name,count(o.id) as order_count from users u left join orders o on o.user_id=u.id where u.active=1 and o.created_at>='2026-01-01' group by u.id,u.name order by order_count desc;"
}
function clearInput() {
  source.value = ''
  reset()
}
</script>
<template>
  <DevTool
    title="SQL 格式化"
    description="常见 SQL 方言排版、关键字大小写和缩进设置"
    wide
  >
    <div class="controls">
      <label
        >SQL 方言<select v-model="language">
          <option value="mysql">MySQL</option>
          <option value="postgresql">PostgreSQL</option>
          <option value="sqlite">SQLite</option>
          <option value="transactsql">SQL Server</option>
          <option value="plsql">Oracle PL/SQL</option>
          <option value="sql">标准 SQL</option>
          <option value="bigquery">BigQuery</option>
          <option value="hive">Hive</option>
        </select></label
      ><label
        >关键字<select v-model="keywordCase">
          <option value="upper">大写</option>
          <option value="lower">小写</option>
          <option value="preserve">保持原样</option>
        </select></label
      ><label
        >缩进<select v-model.number="tabWidth">
          <option :value="2">2 空格</option>
          <option :value="4">4 空格</option>
        </select></label
      ><button :disabled="busy" @click="format">
        {{ busy ? '格式化中…' : '格式化' }}</button
      ><button @click="example">载入示例</button
      ><button @click="clearInput">清空</button>
    </div>
    <div class="two-col">
      <label
        >输入 SQL<textarea
          v-model="source"
          spellcheck="false"
          placeholder="粘贴 SQL，选择对应数据库方言"
        />
      </label>
      <section class="box">
        <div class="box-head">
          <h2>格式化结果</h2>
          <button :disabled="result === null || busy" @click="copy(result!)">
            复制结果
          </button>
        </div>
        <pre class="result">{{ result ?? '等待格式化…' }}</pre>
      </section>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p class="feedback" role="status">{{ feedback }}</p>
    <p class="note">
      仅在浏览器内排版，不连接数据库或执行 SQL。格式化成功不代表 SQL
      语义正确。保留注释及字符串内容；暂不支持 MyBatis/XML 等模板语法。最多 20
      万字符，超时自动停止。
    </p>
  </DevTool>
</template>
