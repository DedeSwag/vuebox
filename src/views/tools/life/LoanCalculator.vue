<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { calculateLoan } from '@/utils/loan'
import type { LoanMethod, LoanTermUnit } from '@/utils/loan'

const principal = ref<number | string>(100000)
const term = ref<number | string>(3)
const termUnit = ref<LoanTermUnit>('year')
const annualRate = ref<number | string>(4.8)
const method = ref<LoanMethod>('equal-payment')
const result = shallowRef<ReturnType<typeof calculateLoan> | null>(null)
const errorMessage = ref('')
function clearResult() {
  result.value = null
  errorMessage.value = ''
}
watch([principal, term, termUnit, annualRate, method], clearResult, { flush: 'sync' })
function calculate() {
  clearResult()
  if ([principal.value, term.value, annualRate.value].some(value => String(value).trim() === '')) {
    errorMessage.value = '请填写贷款本金、贷款期限和年利率。'
    return
  }
  try {
    result.value = calculateLoan({ principal: Number(principal.value), term: Number(term.value), termUnit: termUnit.value, annualRate: Number(annualRate.value), method: method.value })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '请检查输入。'
  }
}
const firstPayment = computed(() => result.value?.schedule[0]?.paymentCents ?? 0)
const lastPayment = computed(() => result.value?.schedule.at(-1)?.paymentCents ?? 0)
const money = (cents: number) => (cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
function reset() {
  clearResult()
  principal.value = 100000
  term.value = 3
  termUnit.value = 'year'
  annualRate.value = 4.8
  method.value = 'equal-payment'
}
</script>

<template>
  <DevTool title="贷款计算器" description="自定义消费贷、经营贷 · 等额本息 / 等额本金 · 按月还款测算">
    <form novalidate @submit.prevent="calculate">
      <div class="loan-inputs">
        <label>贷款本金（元）<input v-model="principal" type="number" min="0.01" max="1000000000" step="0.01" inputmode="decimal" /></label>
        <div class="term-field">
          <label for="loan-term">贷款期限</label>
          <div class="term-controls">
            <input id="loan-term" v-model="term" type="number" min="0" :max="termUnit === 'year' ? 50 : 600" :step="termUnit === 'year' ? 'any' : 1" inputmode="decimal" aria-describedby="term-hint" />
            <select v-model="termUnit" aria-label="贷款期限单位"><option value="year">年</option><option value="month">月</option></select>
          </div>
          <small id="term-hint" class="muted">1 年 = 12 期，期限需折合为整月</small>
        </div>
        <label>年利率（%）<input v-model="annualRate" type="number" min="0" max="100" step="any" inputmode="decimal" /></label>
        <button type="button" class="reset-button" @click="reset">重置</button>
      </div>
      <fieldset class="method-options">
        <legend>还款方式</legend>
        <label class="method-option" :class="{ selected: method === 'equal-payment' }">
          <input v-model="method" type="radio" value="equal-payment" name="loan-method" />
          <span><strong>等额本息</strong><small>每月还款额基本相同</small></span>
        </label>
        <label class="method-option" :class="{ selected: method === 'equal-principal' }">
          <input v-model="method" type="radio" value="equal-principal" name="loan-method" />
          <span><strong>等额本金</strong><small>每月本金基本相同，利息逐月减少</small></span>
        </label>
      </fieldset>
      <div class="calculate-actions"><button type="submit" class="calculate-button">计算</button></div>
    </form>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <template v-if="result">
      <div class="loan-summary" aria-live="polite">
        <div class="box summary-primary">
          <span>{{ method === 'equal-payment' ? '每期还款（元）' : '首期还款（元）' }}</span>
          <strong>{{ money(firstPayment) }}</strong>
          <small>末期 {{ money(lastPayment) }} 元 · 共 {{ result.months }} 期</small>
        </div>
        <div class="box"><span>总利息（元）</span><strong>{{ money(result.totalInterestCents) }}</strong><small>年利率 {{ annualRate }}%</small></div>
        <div class="box"><span>总还款（元）</span><strong>{{ money(result.totalPaymentCents) }}</strong><small>本金 {{ money(result.principalCents) }} 元 + 利息</small></div>
      </div>
      <p class="note">按固定年利率、每月一期计算，月利率 = 年利率 ÷ 12，不含手续费、提前还款或利率调整。金额按分舍入，等额本息末期结清尾差，等额本金的分币余数分摊至前几期；实际还款以贷款合同为准。</p>
      <section aria-labelledby="schedule-title">
        <h2 id="schedule-title">还款明细 <span class="muted">共 {{ result.months }} 期 · 单位：元</span></h2>
        <div class="table-wrap schedule-table" tabindex="0" role="region" aria-label="逐期还款明细，可滚动查看">
          <table>
            <thead><tr><th scope="col">期数</th><th scope="col">还款金额</th><th scope="col">偿还本金</th><th scope="col">支付利息</th><th scope="col">剩余本金</th></tr></thead>
            <tbody><tr v-for="row in result.schedule" :key="row.period"><th scope="row">{{ row.period }}</th><td>{{ money(row.paymentCents) }}</td><td>{{ money(row.principalCents) }}</td><td>{{ money(row.interestCents) }}</td><td>{{ money(row.remainingCents) }}</td></tr></tbody>
            <tfoot><tr><th scope="row">合计</th><td>{{ money(result.totalPaymentCents) }}</td><td>{{ money(result.principalCents) }}</td><td>{{ money(result.totalInterestCents) }}</td><td>0.00</td></tr></tfoot>
          </table>
        </div>
      </section>
    </template>
  </DevTool>
</template>

<style scoped>
@layer components {
.calculate-actions { display: flex; justify-content: center; width: 100%; margin: 24px 0 18px; }
.calculate-actions .calculate-button { width: 100%; min-height: 44px; padding: 9px 32px;    border-radius: 10px;  font-size: 16px; line-height: 1.5; font-weight: 700; letter-spacing: 2px; transition: background 0.15s, box-shadow 0.15s; }
.loan-inputs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; gap: 18px; }
.loan-inputs .reset-button { grid-column: 4; grid-row: 1; align-self: start; margin-top: 25px; }
.loan-inputs input { width: 100%; }
.term-field { display: flex; flex-direction: column; gap: 7px; }
.term-controls { display: flex; gap: 8px; }
.term-controls input { flex: 1; min-width: 0; }
.term-controls select { flex-shrink: 0; }
.method-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; border: 0; margin: 22px 0 18px; padding: 0; }
.method-options legend { margin-bottom: 10px; color: var(--text-h); }
.method-options .method-option { flex-direction: row; align-items: center; gap: 10px; border: 1px solid var(--border); border-radius: 10px; padding: 14px; cursor: pointer; }
.method-option.selected { border-color: var(--accent-border); background: var(--accent-bg); }
.method-option input { accent-color: var(--accent); }
.method-option span { display: grid; gap: 5px; }
.method-option small { color: var(--text); }
.loan-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.loan-summary .box { display: flex; flex-direction: column; gap: 10px; }
.loan-summary strong { font: 600 clamp(18px, 2.2vw, 26px)/1.3 var(--mono); color: var(--text-h); overflow-wrap: anywhere; }
.loan-summary small, .loan-summary span { color: var(--text); }
.loan-summary .summary-primary { background: var(--accent-bg); border-color: var(--accent-border); }
.summary-primary strong { color: var(--accent); }
.schedule-table { max-height: 520px; }
.schedule-table table { font-variant-numeric: tabular-nums; white-space: nowrap; }
.schedule-table :is(th, td) { text-align: right; }
.schedule-table :is(th, td):first-child { text-align: left; }
.schedule-table thead th { position: sticky; top: 0; background: var(--bg); z-index: 1; }
.schedule-table tfoot { font-weight: 600; background: var(--accent-bg); }
.schedule-table:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (max-width: 700px) {
  .loan-summary, .method-options { grid-template-columns: 1fr; }
  .loan-inputs { grid-template-columns: minmax(0, 1fr) auto; }
  .loan-inputs > :not(.reset-button) { grid-column: 1 / -1; }
  .loan-inputs > label:first-child { grid-column: 1; }
  .loan-inputs .reset-button { grid-column: 2; }
}
}
</style>
