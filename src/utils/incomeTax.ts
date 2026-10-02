export type IncomeTaxMode = 'monthly' | 'annual'

export interface IncomeTaxInput {
  mode: IncomeTaxMode
  monthlyIncome: number
  monthlyInsurance: number
  monthlyBasicDeduction: number
  monthlyAdditionalDeduction: number
  month: number
  annualPrepaid: number
  annualMedicalDeduction: number
}

// 国家税务总局居民个人工资薪金累计预扣及综合所得税率表；核对日期：2026-10-02。
export const incomeTaxSources = {
  withholding: 'https://www.chinatax.gov.cn/n810219/n810744/n3752930/n3752974/c3963396/content.html',
  law: 'https://www.chinatax.gov.cn/n810219/n810744/n3752930/n3752974/c3970366/content.html',
  deductions: 'https://fgk.chinatax.gov.cn/zcfgk/c100012/c5196775/content.html',
}
export const incomeTaxBrackets = [
  { upper: 36000, rate: 3, quickDeduction: 0, label: '不超过 36,000 元' },
  { upper: 144000, rate: 10, quickDeduction: 2520, label: '超过 36,000 元至 144,000 元' },
  { upper: 300000, rate: 20, quickDeduction: 16920, label: '超过 144,000 元至 300,000 元' },
  { upper: 420000, rate: 25, quickDeduction: 31920, label: '超过 300,000 元至 420,000 元' },
  { upper: 660000, rate: 30, quickDeduction: 52920, label: '超过 420,000 元至 660,000 元' },
  { upper: 960000, rate: 35, quickDeduction: 85920, label: '超过 660,000 元至 960,000 元' },
  { upper: Infinity, rate: 45, quickDeduction: 181920, label: '超过 960,000 元' },
] as const

function toCents(value: number, label: string) {
  const cents = Math.round(value * 100)
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000_000 || Math.abs(value * 100 - cents) > 0.0001) {
    throw new Error(`${label}需为 0～1,000,000,000 元的数字，最多保留两位小数。`)
  }
  return cents
}

export function comprehensiveTax(taxableCents: number) {
  if (!Number.isSafeInteger(taxableCents) || taxableCents < 0 || taxableCents > 1_200_000_000_000) throw new Error('应纳税所得额无效。')
  const bracket = incomeTaxBrackets.find(item => taxableCents <= item.upper * 100)!
  return { taxCents: Math.max(0, Math.round(taxableCents * bracket.rate / 100) - bracket.quickDeduction * 100), bracket }
}

export function calculateIncomeTax(input: IncomeTaxInput) {
  if (input.mode !== 'monthly' && input.mode !== 'annual') throw new Error('请选择有效的计算模式。')
  const incomeCents = toCents(input.monthlyIncome, '税前月收入')
  const insuranceCents = toCents(input.monthlyInsurance, '每月五险一金')
  const basicCents = toCents(input.monthlyBasicDeduction, '每月基本减除费用')
  const additionalCents = toCents(input.monthlyAdditionalDeduction, '每月专项附加扣除')
  if (insuranceCents > incomeCents) throw new Error('每月五险一金个人缴纳部分不能超过税前月收入。')
  const monthlyDeductionCents = insuranceCents + basicCents + additionalCents
  const common = { incomeCents, insuranceCents, basicCents, additionalCents, monthlyDeductionCents }
  if (input.mode === 'monthly') {
    if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) throw new Error('计算月份需为 1～12 的整数。')
    const cumulativeIncomeCents = incomeCents * input.month
    const cumulativeDeductionCents = monthlyDeductionCents * input.month
    const taxableCents = Math.max(0, cumulativeIncomeCents - cumulativeDeductionCents)
    const { taxCents: cumulativeTaxCents, bracket } = comprehensiveTax(taxableCents)
    // 按从1月起同一单位、每月收入扣除不变且前期正常预扣的情形推算。
    const previousTaxCents = comprehensiveTax(Math.max(0, (incomeCents - monthlyDeductionCents) * (input.month - 1))).taxCents
    const currentTaxCents = Math.max(0, cumulativeTaxCents - previousTaxCents)
    return {
      ...common, mode: 'monthly' as const, month: input.month,
      cumulativeIncomeCents, cumulativeDeductionCents, taxableCents, cumulativeTaxCents, previousTaxCents, currentTaxCents, bracket,
      // 基本减除费用和专项附加扣除只减少计税基数，不从到手工资中再次扣除。
      takeHomeCents: incomeCents - insuranceCents - currentTaxCents,
    }
  }
  const prepaidCents = toCents(input.annualPrepaid, '已累计预缴个税')
  const medicalCents = toCents(input.annualMedicalDeduction, '年度大病医疗可扣除额')
  const annualIncomeCents = incomeCents * 12
  const annualDeductionCents = monthlyDeductionCents * 12 + medicalCents
  const taxableCents = Math.max(0, annualIncomeCents - annualDeductionCents)
  const { taxCents: annualTaxCents, bracket } = comprehensiveTax(taxableCents)
  const balanceCents = annualTaxCents - prepaidCents
  return {
    ...common, mode: 'annual' as const, annualIncomeCents, annualDeductionCents, medicalCents,
    taxableCents, annualTaxCents, prepaidCents, bracket,
    payableCents: Math.max(0, balanceCents), refundableCents: Math.max(0, -balanceCents),
  }
}

export type IncomeTaxResult = ReturnType<typeof calculateIncomeTax>
export const formatTaxMoney = (cents: number) => (cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatIncomeTaxResult(result: IncomeTaxResult) {
  const money = (cents: number) => `${formatTaxMoney(cents)} 元`
  const lines = result.mode === 'monthly' ? [
    `月度工资累计预扣 · 第${result.month}月`,
    `月度应发：${money(result.incomeCents)}`,
    `五险一金个人缴纳：${money(result.insuranceCents)}`,
    `税前扣除总额：${money(result.monthlyDeductionCents)}`,
    `累计应纳税所得额：${money(result.taxableCents)}`,
    `累计应纳税额：${money(result.cumulativeTaxCents)}`,
    `前期已预扣税额（推算）：${money(result.previousTaxCents)}`,
    `当月个税 / 本期应预扣预缴：${money(result.currentTaxCents)}`,
    `税后到手收入：${money(result.takeHomeCents)}`,
  ] : [
    '年度综合所得汇算（工资薪金测算）',
    `年度总收入：${money(result.annualIncomeCents)}`,
    `年度总扣除：${money(result.annualDeductionCents)}`,
    `其中年度大病医疗可扣除额：${money(result.medicalCents)}`,
    `年度应纳税所得额：${money(result.taxableCents)}`,
    `全年个税总额：${money(result.annualTaxCents)}`,
    `已预缴税额：${money(result.prepaidCents)}`,
    result.payableCents ? `应补税额（测算差额）：${money(result.payableCents)}`
      : result.refundableCents ? `应退税额（测算差额）：${money(result.refundableCents)}` : '无需补退税：0.00 元',
    '补退税为计算差额，未判断免办汇算条件或其他减免政策。',
  ]
  return [
    ...lines,
    `每月基本减除费用：${money(result.basicCents)}${result.basicCents !== 500000 ? '（自定义模拟值）' : ''}`,
    `每月专项附加扣除：${money(result.additionalCents)}`,
    `适用税率：${result.bracket.rate}%；速算扣除数：${money(result.bracket.quickDeduction * 100)}`,
    '按全年仅有工资薪金、从1月起收入及月度扣除不变估算。',
    '仅为估算，实际个税以个税APP及税局核算为准。',
  ].join('\n')
}
