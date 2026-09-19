<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
import { decodeJwt, jwtTime, jwtTiming } from '@/utils/jwt'
const input = ref(''),
  now = ref(Date.now() / 1000)
const timer = setInterval(() => (now.value = Date.now() / 1000), 1000)
onBeforeUnmount(() => clearInterval(timer))
const { feedback, copy } = useLocalClipboard()
watch(input, () => (feedback.value = ''))
const parsed = computed(() => {
  if (!input.value.trim()) return { data: null, error: '' }
  try {
    return { data: decodeJwt(input.value), error: '' }
  } catch (e) {
    return { data: null, error: (e as Error).message }
  }
})
const claims: Record<string, string> = {
  iss: '签发者',
  sub: '主题',
  aud: '受众',
  exp: '到期时间',
  nbf: '生效时间',
  iat: '签发时间',
  jti: '令牌 ID',
}
function example() {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  const t = Math.floor(Date.now() / 1000)
  input.value = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: 'demo-user', iss: 'VueBox', iat: t, exp: t + 3600, roles: ['reader'] })}.`
}
</script>
<template>
  <DevTool
    title="JWT 查看器"
    description="本地解码 Header 与 Payload，检查声明和到期时间"
    ><div class="controls">
      <button @click="example">载入演示令牌</button
      ><button @click="input = ''">清空</button>
    </div>
    <label
      >JWT / Bearer Token<textarea
        v-model="input"
        spellcheck="false"
        placeholder="粘贴三段式 JWT，支持 Bearer 前缀"
      />
    </label>
    <p class="note">
      仅解码，不验证签名。Payload
      可被修改，显示的算法、身份和权限不代表可信。不会上传或保存令牌；演示令牌使用
      alg=none，无签名。
    </p>
    <p v-if="parsed.error" class="error" role="alert">{{ parsed.error }}</p>
    <template v-if="parsed.data"
      ><p class="note" role="status">
        {{ jwtTiming(parsed.data.payload, now) }} · 当前 UTC：{{
          new Date(now * 1000).toISOString()
        }}
      </p>
      <div class="two-col">
        <section
          v-for="part in ['header', 'payload'] as const"
          :key="part"
          class="box"
        >
          <div class="box-head">
            <h2>
              {{ part === 'header' ? 'Header · 头部' : 'Payload · 载荷' }}
            </h2>
            <button @click="copy(JSON.stringify(parsed.data![part], null, 2))">
              复制 {{ part }}
            </button>
          </div>
          <pre class="result">{{
            JSON.stringify(parsed.data[part], null, 2)
          }}</pre>
        </section>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>声明</th>
              <th>含义</th>
              <th>值 / UTC 时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(value, key) in parsed.data.payload" :key="key">
              <td>{{ key }}</td>
              <td>{{ claims[key] ?? '自定义声明' }}</td>
              <td>
                {{
                  ['exp', 'nbf', 'iat'].includes(key)
                    ? jwtTime(value)
                    : JSON.stringify(value)
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="note">
        签名段：{{
          parsed.data.signature
            ? `${parsed.data.signature.length} 个字符，未验签`
            : '空签名'
        }}。数字声明按照 JavaScript 数值读取，超大整数应在原始 JSON 中核对。
      </p></template
    >
    <p class="feedback" role="status">{{ feedback }}</p></DevTool
  >
</template>
