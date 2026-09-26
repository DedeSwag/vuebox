<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { generatePasswords, type PasswordOptions } from '@/utils/password'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
const options = reactive<PasswordOptions>({ length: 20, count: 1, lowercase: true, uppercase: true, digits: true, symbols: true, excludeAmbiguous: false })
const passwords = ref<string[]>([])
const visible = ref(true)
const error = ref('')
const { copy, feedback } = useLocalClipboard()
watch(options, () => { passwords.value = []; error.value = ''; feedback.value = '' })
function generate() {
  error.value = ''; feedback.value = ''
  try { passwords.value = generatePasswords(options) }
  catch (reason) { passwords.value = []; error.value = (reason as Error).message }
}
function clear() { passwords.value = []; error.value = ''; feedback.value = '' }
</script>
<template>
  <DevTool title="随机密码生成" description="使用浏览器安全随机数生成 · 不上传、不保存密码">
    <div class="two-col"><section class="box stack"><h2>生成选项</h2><label>密码长度（4–128）<input v-model.number="options.length" type="number" min="4" max="128" step="1" /></label><label>生成数量（1–100）<input v-model.number="options.count" type="number" min="1" max="100" step="1" /></label><fieldset><legend>字符类型（至少一种）</legend><label class="check"><input v-model="options.lowercase" type="checkbox" />小写字母 a–z</label><label class="check"><input v-model="options.uppercase" type="checkbox" />大写字母 A–Z</label><label class="check"><input v-model="options.digits" type="checkbox" />数字 0–9</label><label class="check"><input v-model="options.symbols" type="checkbox" />特殊符号 !@#$…</label></fieldset><label class="check"><input v-model="options.excludeAmbiguous" type="checkbox" />排除易混淆字符 I、l、1、O、0、o</label><div class="controls"><button class="active" @click="generate">生成密码</button><button @click="clear">清空结果</button></div><p v-if="error" class="error" role="alert">{{ error }}</p></section>
    <section class="box"><div class="box-head"><h2>生成结果 · {{ passwords.length }} 条</h2><button :disabled="!passwords.length" @click="copy(passwords.join('\n'))">复制全部</button></div><label class="check"><input v-model="visible" type="checkbox" />显示密码</label><div class="password-list"><div v-for="(password, index) in passwords" :key="index" class="password-row"><input :type="visible ? 'text' : 'password'" :value="password" :aria-label="`第 ${index + 1} 条密码`" readonly autocomplete="off" spellcheck="false" /><button :aria-label="`复制第 ${index + 1} 条密码`" @click="copy(password)">复制</button></div></div><p v-if="!passwords.length" class="note">选择生成选项后点击“生成密码”。修改选项会清除旧结果。</p></section></div>
    <p class="note">每条密码至少包含每种已选字符类型中的一个字符。建议保持较长长度，不同账户使用不同密码；本页不会写入本地存储，离开页面即释放生成结果。</p><p class="feedback" role="status">{{ feedback }}</p>
  </DevTool>
</template>
<style scoped>
fieldset { border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: grid; gap: 10px; min-width: 0; }
legend { color: var(--text); font-size: 12px; }
.password-list { max-height: 500px; overflow-y: auto; margin-top: 16px; }
.password-row { display: flex; gap: 8px; margin-bottom: 10px; }
.password-row input { flex: 1; min-width: 0; font-family: var(--mono); }
</style>
