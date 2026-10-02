<script setup lang="ts">
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
import { calculateIncomeTax, formatIncomeTaxResult, formatTaxMoney as money, incomeTaxBrackets, incomeTaxSources } from '@/utils/incomeTax'
import type { IncomeTaxMode, IncomeTaxResult } from '@/utils/incomeTax'

type NumericInput = number | string
const defaults = () => ({
  mode: 'monthly' as IncomeTaxMode, month: 1,
  monthlyIncome: '' as NumericInput, monthlyInsurance: 0 as NumericInput,
  monthlyBasicDeduction: 5000 as NumericInput, monthlyAdditionalDeduction: 0 as NumericInput,
  annualPrepaid: 0 as NumericInput, annualMedicalDeduction: 0 as NumericInput,
})
const form = reactive(defaults())
const result = shallowRef<IncomeTaxResult | null>(null)
const errorMessage = ref('')
const { copy, feedback } = useLocalClipboard()
function clearResult() { result.value = null; errorMessage.value = ''; feedback.value = '' }
watch(form, clearResult, { flush: 'sync' })
function reset() { Object.assign(form, defaults()); clearResult() }
function calculate() {
  clearResult()
  const fields = [form.monthlyIncome, form.monthlyInsurance, form.monthlyBasicDeduction, form.monthlyAdditionalDeduction]
  if (form.mode === 'annual') fields.push(form.annualPrepaid, form.annualMedicalDeduction)
  if (fields.some(value => String(value).trim() === '')) {
    errorMessage.value = '请填写所有金额，无扣除或预缴税额时请输入 0。'
    return
  }
  try {
    result.value = calculateIncomeTax({
      ...form, monthlyIncome: Number(form.monthlyIncome), monthlyInsurance: Number(form.monthlyInsurance),
      monthlyBasicDeduction: Number(form.monthlyBasicDeduction), monthlyAdditionalDeduction: Number(form.monthlyAdditionalDeduction),
      annualPrepaid: Number(form.annualPrepaid), annualMedicalDeduction: Number(form.annualMedicalDeduction),
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '请检查输入。'
  }
}
const cards = computed(() => {
  const data = result.value
  if (!data) return []
  if (data.mode === 'monthly') return [
    { label: '月度应发', value: data.incomeCents },
    { label: '五险一金', value: data.insuranceCents, hint: '个人缴纳部分' },
    { label: '税前扣除总额', value: data.monthlyDeductionCents, hint: '五险一金 + 基本减除 + 专项附加' },
    { label: '当月个税', value: data.currentTaxCents, hint: `第${data.month}月应预扣预缴税额`, primary: true },
    { label: '税后到手收入', value: data.takeHomeCents, hint: '应发 − 五险一金 − 当月个税', primary: true },
  ]
  return [
    { label: '年度总收入', value: data.annualIncomeCents, hint: '税前月收入 × 12' },
    { label: '年度总扣除', value: data.annualDeductionCents, hint: '月度扣除 × 12 + 年度大病医疗扣除' },
    { label: '年度应纳税所得额', value: data.taxableCents },
    { label: '全年个税总额', value: data.annualTaxCents },
    { label: '已预缴税额', value: data.prepaidCents },
    { label: data.payableCents ? '应补税额' : data.refundableCents ? '应退税额' : '无需补退税', value: data.payableCents || data.refundableCents, hint: '测算差额，未判断免办汇算条件', primary: true },
  ]
})
function copyResult() { if (result.value) void copy(formatIncomeTaxResult(result.value)) }
</script>

<template>
  <DevTool title="个税计算器" description="月度工资累计预扣 / 年度综合所得汇算 · 税后收入与补退税测算">
    <form novalidate @submit.prevent="calculate">
      <fieldset class="mode-options">
        <legend>计算模式</legend>
        <label :class="{ selected: form.mode === 'monthly' }"><input v-model="form.mode" type="radio" name="income-tax-mode" value="monthly" /><span><strong>月度工资累计预扣</strong><small>按计算月份查看当月个税及到手收入</small></span></label>
        <label :class="{ selected: form.mode === 'annual' }"><input v-model="form.mode" type="radio" name="income-tax-mode" value="annual" /><span><strong>年度综合所得汇算</strong><small>工资薪金全年汇总，测算应补或应退税额</small></span></label>
      </fieldset>
      <div class="income-row">
        <label>税前月收入（元）<input v-model="form.monthlyIncome" type="number" min="0" max="1000000000" step="0.01" inputmode="decimal" placeholder="工资薪金收入" /></label>
        <button type="button" @click="reset">重置</button>
      </div>
      <div class="input-grid">
        <label>每月五险一金个人缴纳（元）<input v-model="form.monthlyInsurance" type="number" min="0" step="0.01" inputmode="decimal" /></label>
        <label>每月基本减除费用（元）<input v-model="form.monthlyBasicDeduction" type="number" min="0" step="0.01" inputmode="decimal" /><small class="muted">默认 5,000 元；修改后仅用于自定义模拟。</small></label>
        <label>每月专项附加扣除（元）<input v-model="form.monthlyAdditionalDeduction" type="number" min="0" step="0.01" inputmode="decimal" /><small class="muted">子女教育、房贷利息或房租、赡养老人、继续教育、婴幼儿照护等可扣除额合计，不含大病医疗。</small></label>
        <label v-if="form.mode === 'monthly'">计算月份<select v-model="form.month"><option v-for="month in 12" :key="month" :value="month">第 {{ month }} 月</option></select><small class="muted">假设从1月起在同一单位，前期按相同收入和扣除正常预扣。</small></label>
        <template v-else>
          <label>已累计预缴个税（元）<input v-model="form.annualPrepaid" type="number" min="0" step="0.01" inputmode="decimal" /><small class="muted">填写全年已实际预缴的税额。</small></label>
          <label>年度大病医疗可扣除额（元）<input v-model="form.annualMedicalDeduction" type="number" min="0" step="0.01" inputmode="decimal" /><small class="muted">填写符合条件的年度可扣除额合计，无则填 0，不是医疗费用总额。此项仅在年度汇算扣除。</small></label>
        </template>
      </div>
      <p class="note">按全年仅有工资薪金、各月收入和扣除固定估算。{{ form.mode === 'monthly' ? '累计预扣不是每月独立套用月度税率表；前期已预扣税额由相同参数自动推算。' : '年度收入按月收入乘12计算；补退税为税额差额，未判断免办汇算条件或其他减免政策。' }}</p>
      <div class="calculate-actions"><button type="submit" class="calculate-button">计算</button></div>
    </form>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <section v-if="result" aria-labelledby="tax-result-title">
      <div class="box-head"><h2 id="tax-result-title">计算结果 <span class="muted">{{ result.mode === 'monthly' ? `第${result.month}月` : '全年' }} · 单位：元</span></h2><button type="button" @click="copyResult">复制结果</button></div>
      <div class="tax-summary" aria-live="polite">
        <div v-for="card in cards" :key="card.label" class="box" :class="{ primary: card.primary }"><span>{{ card.label }}（元）</span><strong>{{ money(card.value) }}</strong><small v-if="card.hint">{{ card.hint }}</small></div>
      </div>
      <div v-if="result.mode === 'monthly'" class="cumulative box">
        <h3>累计预扣计算</h3>
        <dl>
          <div><dt>累计应纳税所得额</dt><dd>{{ money(result.taxableCents) }} 元</dd></div>
          <div><dt>累计应纳税额</dt><dd>{{ money(result.cumulativeTaxCents) }} 元</dd></div>
          <div><dt>前期已预扣税额（推算）</dt><dd>{{ money(result.previousTaxCents) }} 元</dd></div>
          <div><dt>本期应预扣预缴税额</dt><dd>{{ money(result.currentTaxCents) }} 元</dd></div>
        </dl>
        <p class="muted">累计收入 {{ money(result.cumulativeIncomeCents) }} 元 − 累计扣除 {{ money(result.cumulativeDeductionCents) }} 元，计税所得额最低为 0。基本减除费用和专项附加扣除不会从到手工资中再次扣除。</p>
      </div>
      <p class="note">适用税率 {{ result.bracket.rate }}%，速算扣除数 {{ money(result.bracket.quickDeduction * 100) }} 元。<template v-if="result.basicCents !== 500000">当前基本减除费用为自定义值，结果仅供模拟。</template></p>
    </section>
    <p v-if="feedback" class="feedback" role="status">{{ feedback }}</p>
    <details class="rate-details">
      <summary>个税税率表说明（综合所得7级超额累进税率）</summary>
      <p>累计 / 年度应纳税额 = 应纳税所得额 × 适用税率 − 速算扣除数。月度本期预扣 = 累计应纳税额 − 前期已预扣税额，最低为 0。</p>
      <div class="table-wrap" tabindex="0" role="region" aria-label="综合所得个税税率表">
        <table><thead><tr><th scope="col">级数</th><th scope="col">累计 / 全年应纳税所得额</th><th scope="col">税率</th><th scope="col">速算扣除数（元）</th></tr></thead><tbody><tr v-for="(bracket, index) in incomeTaxBrackets" :key="bracket.rate"><th scope="row">{{ index + 1 }}</th><td>{{ bracket.label }}</td><td>{{ bracket.rate }}%</td><td>{{ money(bracket.quickDeduction * 100) }}</td></tr></tbody></table>
      </div>
      <p>税率按累计或全年计税所得额选择，不是对每月收入直接套用。依据：<a :href="incomeTaxSources.withholding" target="_blank" rel="noopener noreferrer">累计预扣办法</a>、<a :href="incomeTaxSources.law" target="_blank" rel="noopener noreferrer">个人所得税法</a>、<a :href="incomeTaxSources.deductions" target="_blank" rel="noopener noreferrer">专项附加扣除规则</a>（核对日期：2026-10-02）。</p>
    </details>
    <p class="note disclaimer">仅为估算，实际个税以个税APP及税局核算为准。</p>
  </DevTool>
</template>

<style scoped>
@layer components {
.mode-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; border: 0; padding: 0; margin: 0 0 22px; }
.mode-options legend { margin-bottom: 10px; color: var(--text-h); }
.mode-options label { flex-direction: row; align-items: center; gap: 10px; padding: 14px; border: 1px solid var(--border); border-radius: 10px; cursor: pointer; }
.mode-options .selected { background: var(--accent-bg); border-color: var(--accent-border); }
.mode-options input { accent-color: var(--accent); }
.mode-options span { display: grid; gap: 5px; }
.mode-options small { color: var(--text); }
.income-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 18px; margin-bottom: 18px; }
.input-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.input-grid input, .income-row input { width: 100%; }
.input-grid small { line-height: 1.7; }
.calculate-actions { margin: 24px 0; }
.calculate-actions .calculate-button { width: 100%; min-height: 44px; padding: 9px 32px;    border-radius: 10px;  font-size: 16px; line-height: 1.5; font-weight: 700; letter-spacing: 2px; }
.tax-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.tax-summary .box { display: flex; flex-direction: column; gap: 10px; }
.tax-summary strong { font: 600 clamp(18px, 2vw, 25px)/1.3 var(--mono); color: var(--text-h); overflow-wrap: anywhere; }
.tax-summary span, .tax-summary small { color: var(--text); }
.tax-summary .primary { background: var(--accent-bg); border-color: var(--accent-border); }
.primary strong { color: var(--accent); }
.cumulative { margin-top: 16px; }
.cumulative h3 { font-size: 15px; margin: 0 0 12px; }
.cumulative dl { display: grid; gap: 10px; margin: 0; font-variant-numeric: tabular-nums; }
.cumulative dl > div { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
.cumulative dd { margin: 0; color: var(--text-h); }
.cumulative p { margin: 12px 0 0; line-height: 1.8; }
.rate-details table { white-space: nowrap; font-variant-numeric: tabular-nums; }
.table-wrap:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.disclaimer { text-align: center; }
@media (max-width: 700px) { .mode-options, .input-grid, .tax-summary { grid-template-columns: 1fr; } }
}
</style>
