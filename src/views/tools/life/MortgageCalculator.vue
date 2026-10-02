<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { calculateMortgage } from '@/utils/mortgage'
import type { LoanMethod } from '@/utils/loan'

const principal = ref<number | string>('')
const years = ref<number | string>('')
const annualRate = ref<number | string>('')
const method = ref<LoanMethod>('equal-payment')
const result = shallowRef<ReturnType<typeof calculateMortgage> | null>(null)
const errorMessage = ref('')
const detailsOpen = ref(false)
const money = (cents: number) => (cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const firstPayment = computed(() => result.value?.schedule[0]?.paymentCents ?? 0)
const lastPayment = computed(() => result.value?.schedule.at(-1)?.paymentCents ?? 0)

function clearResult() {
  result.value = null
  errorMessage.value = ''
  detailsOpen.value = false
}
watch([principal, years, annualRate, method], clearResult, { flush: 'sync' })
function calculate() {
  clearResult()
  if ([principal.value, years.value, annualRate.value].some(value => String(value).trim() === '')) {
    errorMessage.value = '请填写贷款总额、贷款年限和年利率。'
    return
  }
  try {
    result.value = calculateMortgage({ principal: Number(principal.value), years: Number(years.value), annualRate: Number(annualRate.value), method: method.value })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '请检查输入。'
  }
}
function reset() {
  principal.value = ''
  years.value = ''
  annualRate.value = ''
  method.value = 'equal-payment'
  clearResult()
}
</script>

<template>
  <DevTool title="房贷计算器" description="等额本息 / 等额本金 · 月供与利息测算 · 逐期还款明细">
    <form novalidate @submit.prevent="calculate">
      <div class="mortgage-inputs">
        <label>贷款总额（元）<input v-model="principal" type="number" min="0.01" max="1000000000" step="0.01" inputmode="decimal" placeholder="请输入贷款总额" /></label>
        <label>贷款年限（年）<input v-model="years" type="number" min="1" max="30" step="1" inputmode="numeric" placeholder="1～30 年，整数" /></label>
        <label>年利率（%）<input v-model="annualRate" type="number" min="0" max="100" step="any" inputmode="decimal" placeholder="请输入年利率，支持 0" /></label>
        <button type="button" class="reset-button" @click="reset">重置</button>
      </div>
      <fieldset class="method-options">
        <legend>还款方式</legend>
        <label :class="{ selected: method === 'equal-payment' }">
          <input v-model="method" type="radio" name="mortgage-method" value="equal-payment" />
          <span><strong>等额本息</strong><small>每月还款额基本相同</small></span>
        </label>
        <label :class="{ selected: method === 'equal-principal' }">
          <input v-model="method" type="radio" name="mortgage-method" value="equal-principal" />
          <span><strong>等额本金</strong><small>每月本金基本相同，月供逐月递减</small></span>
        </label>
      </fieldset>
      <div class="calculate-actions"><button type="submit" class="calculate-button">计算</button></div>
    </form>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <section v-if="result" aria-labelledby="mortgage-result-title">
      <div class="box-head"><h2 id="mortgage-result-title">计算结果</h2><span class="muted">共 {{ result.months }} 期 · 单位：元</span></div>
      <div class="mortgage-summary" aria-live="polite">
        <div class="box primary"><span>{{ result.method === 'equal-principal' ? '首月月供（元）' : '每月月供（元）' }}</span><strong>{{ money(firstPayment) }}</strong><small>末月月供 {{ money(lastPayment) }} 元</small></div>
        <div class="box"><span>总还款金额（元）</span><strong>{{ money(result.totalPaymentCents) }}</strong><small>贷款本金 + 总利息</small></div>
        <div class="box"><span>总利息（元）</span><strong>{{ money(result.totalInterestCents) }}</strong><small>年利率 {{ result.annualRate }}%</small></div>
      </div>
      <div v-if="result.monthlyDecreaseCents !== null" class="decrease box">
        <span>每月递减金额（元）</span><strong>{{ money(result.monthlyDecreaseCents) }}</strong>
        <small>理论递减额 = 贷款总额 ÷ 总期数 × 月利率；实际逐期差额受分币舍入影响，以明细为准。</small>
      </div>
      <p class="note">按固定年利率、每月一期计算，月利率 = 年利率 ÷ 12。金额按分舍入，等额本息末期结清尾差，等额本金的分币余数分摊至前几期。</p>
      <button type="button" class="details-toggle" :aria-expanded="detailsOpen" aria-controls="mortgage-schedule" @click="detailsOpen = !detailsOpen">{{ detailsOpen ? '收起还款明细' : '展开还款明细' }} · 共 {{ result.months }} 期</button>
      <div v-show="detailsOpen" id="mortgage-schedule" class="table-wrap schedule-table" tabindex="0" role="region" aria-label="房贷还款明细，可滚动查看">
        <table>
          <thead><tr><th scope="col">期数</th><th scope="col">每月月供</th><th scope="col">本金</th><th scope="col">利息</th><th scope="col">剩余本金</th></tr></thead>
          <tbody><tr v-for="row in result.schedule" :key="row.period"><th scope="row">{{ row.period }}</th><td>{{ money(row.paymentCents) }}</td><td>{{ money(row.principalCents) }}</td><td>{{ money(row.interestCents) }}</td><td>{{ money(row.remainingCents) }}</td></tr></tbody>
          <tfoot><tr><th scope="row">合计</th><td>{{ money(result.totalPaymentCents) }}</td><td>{{ money(result.principalCents) }}</td><td>{{ money(result.totalInterestCents) }}</td><td>0.00</td></tr></tfoot>
        </table>
      </div>
    </section>
  </DevTool>
</template>

<style scoped>
@layer components {
.mortgage-inputs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; align-items: end; gap: 18px; }
.mortgage-inputs input { width: 100%; }
.method-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; border: 0; padding: 0; margin: 22px 0 18px; }
.method-options legend { margin-bottom: 10px; color: var(--text-h); }
.method-options label { flex-direction: row; align-items: center; gap: 10px; padding: 14px; border: 1px solid var(--border); border-radius: 10px; cursor: pointer; }
.method-options .selected { background: var(--accent-bg); border-color: var(--accent-border); }
.method-options input { accent-color: var(--accent); }
.method-options span { display: grid; gap: 5px; }
.method-options small { color: var(--text); }
.calculate-actions { margin: 24px 0; }
.calculate-actions .calculate-button { width: 100%; min-height: 44px; padding: 9px 32px;    border-radius: 10px;  font-size: 16px; line-height: 1.5; font-weight: 700; letter-spacing: 2px; }
.mortgage-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.mortgage-summary .box { display: flex; flex-direction: column; gap: 10px; }
.mortgage-summary strong, .decrease strong { font: 600 clamp(18px, 2vw, 25px)/1.3 var(--mono); color: var(--text-h); overflow-wrap: anywhere; }
.mortgage-summary span, .mortgage-summary small, .decrease small { color: var(--text); }
.mortgage-summary .primary { background: var(--accent-bg); border-color: var(--accent-border); }
.primary strong { color: var(--accent); }
.decrease { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
.decrease small { flex-basis: 100%; line-height: 1.7; }
.schedule-table { max-height: 520px; font-variant-numeric: tabular-nums; }
.schedule-table :is(th, td) { white-space: nowrap; text-align: right; }
.schedule-table :is(th, td):first-child { text-align: left; }
.schedule-table thead th { position: sticky; top: 0; background: var(--bg); }
.schedule-table tfoot { font-weight: 600; background: var(--accent-bg); }
.schedule-table:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (max-width: 700px) {
  .mortgage-inputs { grid-template-columns: minmax(0, 1fr) auto; }
  .mortgage-inputs > label { grid-column: 1 / -1; }
  .mortgage-inputs > label:first-child { grid-column: 1; }
  .reset-button { grid-column: 2; grid-row: 1; }
  .mortgage-summary, .method-options { grid-template-columns: 1fr; }
}
}
</style>
