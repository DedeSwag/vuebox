<script setup lang="ts">
import { computed, nextTick, reactive, ref, shallowRef, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
import { calculateCarLoan, formatCarLoanResult, formatCarMoney as money } from '@/utils/carLoan'
import type { CarLoanResult, CarLoanPlan, CarLoanFeeMode } from '@/utils/carLoan'

type NumericInput = number | string
const defaults = () => ({
  price: 200000 as NumericInput, downPayment: 20 as NumericInput,
  downPaymentMode: 'ratio' as 'ratio' | 'amount', years: 3,
  plan: 'standard' as CarLoanPlan, freeYears: 2 as 2 | 5,
  feeMode: 'annual-rate' as CarLoanFeeMode, annualFeeRate: 2.99 as NumericInput, monthlyFeeRate: '' as NumericInput, monthlyFeeAmount: '' as NumericInput,
  purchaseTax: '' as NumericInput, insurance: '' as NumericInput, registrationFee: '' as NumericInput,
})
const form = reactive(defaults())
const result = shallowRef<CarLoanResult | null>(null)
const errorMessage = ref('')
const { copy, feedback } = useLocalClipboard()
const years = computed({ get: () => form.plan === 'five-two' ? 5 : form.plan === 'interest-free' ? form.freeYears : form.years, set: value => { form.years = value } })
const feeField = computed(() => form.feeMode === 'annual-rate' ? 'annualFeeRate' : form.feeMode === 'monthly-rate' ? 'monthlyFeeRate' : 'monthlyFeeAmount')
const feeValue = computed({ get: () => form.plan === 'interest-free' ? 0 : form[feeField.value], set: value => { form[feeField.value] = value } })
const feeLabel = computed(() => form.feeMode === 'annual-rate' ? '年手续费率（%）' : form.feeMode === 'monthly-rate' ? '月手续费率（%）' : '每期固定手续费（元）')
function clearResult() { result.value = null; errorMessage.value = ''; feedback.value = '' }
watch(form, clearResult, { flush: 'sync' })
function changeDownPaymentMode(event: Event) {
  const next = (event.target as HTMLSelectElement).value as 'ratio' | 'amount'
  const price = Number(form.price)
  const value = Number(form.downPayment)
  if (String(form.downPayment).trim() && Number.isFinite(price) && price > 0 && Number.isFinite(value) && value >= 0) {
    form.downPayment = next === 'amount' ? Math.round(price * value) / 100 : value / price * 100
  } else {
    form.downPayment = ''
  }
  form.downPaymentMode = next
}
async function calculate() {
  clearResult()
  if ([form.price, form.downPayment, feeValue.value].some(value => String(value).trim() === '')) {
    errorMessage.value = '请填写车辆总价、首付和分期手续费。'
    return
  }
  try {
    result.value = calculateCarLoan({
      ...form, price: Number(form.price), downPayment: Number(form.downPayment), feeValue: Number(feeValue.value),
      purchaseTax: Number(form.purchaseTax), insurance: Number(form.insurance), registrationFee: Number(form.registrationFee),
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '请检查输入。'
    return
  }
  await nextTick()
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
}
function reset() { Object.assign(form, defaults()); clearResult() }
const firstPayment = computed(() => result.value?.schedule[0]?.paymentCents ?? 0)
const lastPayment = computed(() => result.value?.schedule.at(-1)?.paymentCents ?? 0)
const chargedPayment = computed(() => result.value?.schedule[24]?.paymentCents ?? 0)
function copyResult() { if (result.value) void copy(formatCarLoanResult(result.value)) }
</script>

<template>
  <DevTool title="车贷计算器" description="固定本金 + 固定分期手续费 · 支持贷五免二、2年 / 5年全期免手续费">
    <form novalidate @submit.prevent="calculate">
      <div class="price-row">
        <label>车辆总价（元）<input v-model="form.price" type="number" min="0.01" max="1000000000" step="0.01" inputmode="decimal" /></label>
        <button type="button" class="reset-button" @click="reset">重置</button>
      </div>
      <div class="input-grid">
        <label>首付输入方式<select :value="form.downPaymentMode" @change="changeDownPaymentMode"><option value="ratio">首付比例</option><option value="amount">首付金额</option></select></label>
        <label>{{ form.downPaymentMode === 'ratio' ? '首付比例（%）' : '首付金额（元）' }}<input v-model="form.downPayment" type="number" min="0" :max="form.downPaymentMode === 'ratio' ? 100 : Number(form.price)" :step="form.downPaymentMode === 'ratio' ? 'any' : '0.01'" inputmode="decimal" /></label>
      </div>
      <fieldset class="plan-options">
        <legend>分期方案</legend>
        <label :class="{ selected: form.plan === 'standard' }"><input v-model="form.plan" type="radio" name="car-loan-plan" value="standard" /><span><strong>固定手续费分期</strong><small>每期本金和手续费固定</small></span></label>
        <label :class="{ selected: form.plan === 'five-two' }"><input v-model="form.plan" type="radio" name="car-loan-plan" value="five-two" /><span><strong>贷五免二</strong><small>分60期，前24期免手续费</small></span></label>
        <label :class="{ selected: form.plan === 'interest-free' }"><input v-model="form.plan" type="radio" name="car-loan-plan" value="interest-free" /><span><strong>全期免手续费</strong><small>2年 / 5年免息方案</small></span></label>
      </fieldset>
      <div class="input-grid">
        <label>贷款年限<select v-model="years" :disabled="form.plan !== 'standard'"><option v-for="year in 5" :key="year" :value="year">{{ year }} 年</option></select></label>
        <label v-if="form.plan === 'interest-free'">免息期<select v-model="form.freeYears"><option :value="2">2年免息（免手续费）</option><option :value="5">5年免息（免手续费）</option></select></label>
      </div>
      <div class="input-grid fee-inputs">
        <label>手续费输入方式<select v-model="form.feeMode" :disabled="form.plan === 'interest-free'"><option value="annual-rate">年手续费率</option><option value="monthly-rate">月手续费率</option><option value="monthly-amount">每期固定金额</option></select></label>
        <label>{{ feeLabel }}<input v-model="feeValue" :disabled="form.plan === 'interest-free'" type="number" min="0" :max="form.feeMode === 'monthly-amount' ? 1000000000 : 100" :step="form.feeMode === 'monthly-amount' ? '0.01' : 'any'" inputmode="decimal" placeholder="按分期方案填写" /></label>
      </div>
      <p class="note">
        每期本金 = 原始贷款本金 ÷ 总期数，末期调整分币尾差。
        <template v-if="form.plan === 'interest-free'">所选期限内全部免手续费。</template>
        <template v-else>
          <template v-if="form.plan === 'five-two'">本金分60期偿还，第1～24期只还本金，第25～60期每期收取固定手续费。</template>
          <template v-if="form.feeMode === 'annual-rate'">收费期每期手续费 = 原始贷款本金 × 年手续费率 ÷ 12。</template>
          <template v-else-if="form.feeMode === 'monthly-rate'">收费期每期手续费 = 原始贷款本金 × 月手续费率。</template>
          <template v-else>收费期每期手续费按填写的固定金额收取。</template>
          手续费不随剩余本金减少；手续费率不代表实际年化利率。
        </template>
      </p>
      <fieldset class="extra-costs">
        <legend>额外落地成本（选填）</legend>
        <p class="muted">按实际金额填写，留空按 0 计算，单独统计，不计入贷款本金。</p>
        <div class="input-grid extra-grid">
          <label>购置税（元）<input v-model="form.purchaseTax" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal" /></label>
          <label>保险（元）<input v-model="form.insurance" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal" /></label>
          <label>上牌费（元）<input v-model="form.registrationFee" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal" /></label>
        </div>
      </fieldset>
      <div class="calculate-actions"><button type="submit" class="calculate-button">计算</button></div>
    </form>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <section v-if="result" aria-labelledby="car-result-title">
      <div class="box-head"><h2 id="car-result-title">计算结果</h2><button type="button" @click="copyResult">复制结果</button></div>
      <div class="result-grid" aria-live="polite">
        <div class="box"><span>首付金额（元）</span><strong>{{ money(result.downPaymentCents) }}</strong></div>
        <div class="box"><span>贷款本金（元）</span><strong>{{ money(result.principalCents) }}</strong></div>
        <div class="box primary"><span>{{ result.plan === 'five-two' ? '第1～24期月供（元）' : '每月月供（元）' }}</span><strong>{{ money(firstPayment) }}</strong><small>末期 {{ money(lastPayment) }} 元 · 共 {{ result.months }} 期</small></div>
        <div class="box"><span>总手续费（元）</span><strong>{{ money(result.totalFeeCents) }}</strong><small>收费期每期 {{ money(result.monthlyFeeCents) }} 元 × {{ result.chargedMonths }} 期</small></div>
        <div class="box"><span>总还款额（元）</span><strong>{{ money(result.totalPaymentCents) }}</strong><small>贷款本金 + 分期手续费</small></div>
        <div class="box primary"><span>车辆落地总价（元）</span><strong>{{ money(result.landedPriceCents) }}</strong><small>车价 + 额外费用 + 分期手续费</small></div>
      </div>
      <p v-if="result.plan === 'five-two' && result.principalCents" class="note phase-summary">
        第1～24期：每期本金 {{ money(result.monthlyPrincipalCents) }} 元，手续费 0.00 元。<br />
        第25～60期：每期本金 {{ money(result.monthlyPrincipalCents) }} 元 + 固定手续费 {{ money(result.monthlyFeeCents) }} 元，<strong>月供 {{ money(chargedPayment) }} 元</strong>（末期本金调整尾差）。<br />
        手续费基数始终为原始贷款本金 {{ money(result.principalCents) }} 元，后36期手续费固定。
      </p>
      <p class="note">额外落地成本合计：<strong>{{ money(result.extraCostsCents) }} 元</strong>（购置税 {{ money(result.purchaseTaxCents) }} 元 + 保险 {{ money(result.insuranceCents) }} 元 + 上牌费 {{ money(result.registrationFeeCents) }} 元）。</p>
      <p v-if="!result.principalCents" class="note">首付已覆盖全部车价，无需贷款。</p>
      <details v-else>
        <summary>展开还款明细 · 共 {{ result.months }} 期</summary>
        <p class="muted">单位：元。每期本金固定，收费期手续费固定，金额保留到分；末期本金结清尾差。</p>
        <div class="table-wrap schedule-table" tabindex="0" role="region" aria-label="车贷还款明细，可滚动查看">
          <table>
            <thead><tr><th scope="col">期数</th><th scope="col">月供</th><th scope="col">本金</th><th scope="col">手续费</th><th scope="col">剩余本金</th></tr></thead>
            <tbody><tr v-for="row in result.schedule" :key="row.period" :class="{ 'fee-start': result.plan === 'five-two' && row.period === 25 }"><th scope="row">{{ row.period }}</th><td>{{ money(row.paymentCents) }}</td><td>{{ money(row.principalCents) }}</td><td>{{ money(row.feeCents) }}</td><td>{{ money(row.remainingCents) }}</td></tr></tbody>
            <tfoot><tr><th scope="row">合计</th><td>{{ money(result.totalPaymentCents) }}</td><td>{{ money(result.principalCents) }}</td><td>{{ money(result.totalFeeCents) }}</td><td>0.00</td></tr></tfoot>
          </table>
        </div>
      </details>
    </section>
    <p v-if="feedback" class="feedback" role="status">{{ feedback }}</p>
    <p class="note disclaimer">仅估算，实际以金融机构方案为准。</p>
  </DevTool>
</template>

<style scoped>
@layer components {
.price-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 18px; margin-bottom: 18px; }
.input-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.input-grid input, .price-row input { width: 100%; }
.fee-inputs { margin-top: 18px; }
input:disabled, select:disabled { opacity: 0.65; cursor: not-allowed; background: var(--code-bg); }
.plan-options, .extra-costs { border: 0; padding: 0; margin: 22px 0; }
legend { color: var(--text-h); margin-bottom: 10px; }
.plan-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.plan-options label { flex-direction: row; align-items: center; gap: 10px; padding: 14px; border: 1px solid var(--border); border-radius: 10px; cursor: pointer; }
.plan-options label.selected { background: var(--accent-bg); border-color: var(--accent-border); }
.plan-options input { accent-color: var(--accent); }
.plan-options span { display: grid; gap: 5px; }
.plan-options small { color: var(--text); }
.extra-costs p { margin: 0 0 12px; }
.extra-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.calculate-actions { margin: 24px 0; }
.calculate-actions .calculate-button { width: 100%; min-height: 44px; padding: 9px 32px;    border-radius: 10px;  font-size: 16px; line-height: 1.5; font-weight: 700; letter-spacing: 2px; }
.result-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.result-grid .box { display: flex; flex-direction: column; gap: 10px; }
.result-grid strong { font: 600 clamp(18px, 2vw, 25px)/1.3 var(--mono); color: var(--text-h); overflow-wrap: anywhere; }
.result-grid span, .result-grid small { color: var(--text); }
.result-grid .primary { background: var(--accent-bg); border-color: var(--accent-border); }
.primary strong { color: var(--accent); }
.schedule-table { max-height: 520px; font-variant-numeric: tabular-nums; }
.schedule-table :is(th, td) { white-space: nowrap; text-align: right; }
.schedule-table :is(th, td):first-child { text-align: left; }
.schedule-table thead th { position: sticky; top: 0; background: var(--bg); }
.schedule-table tfoot { font-weight: 600; background: var(--accent-bg); }
.fee-start { background: var(--accent-bg); }
.schedule-table:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.disclaimer { text-align: center; }
@media (max-width: 700px) { .input-grid, .plan-options, .result-grid { grid-template-columns: 1fr; } }
}
</style>
