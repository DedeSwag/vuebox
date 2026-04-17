<script setup lang="ts">
import { ref, computed } from 'vue'

// ── 用餐人数 ─────────────────────────────────
const diners = ref(2)
function addDiners() {
  if (diners.value < 20) diners.value++
}
function subDiners() {
  if (diners.value > 1) diners.value--
}

// ── 折扣 ─────────────────────────────────────
const discount = ref<0.68 | 0.58>(0.68)

// ── 菜品 ─────────────────────────────────────
interface Dish {
  key: string
  name: string
  price: number
  color: string
  bg: string
  border: string
  count: number
}

const dishes = ref<Dish[]>([
  { key: 'iron',   name: '铁盘', price: 22, color: '#78716c', bg: '#f5f5f4', border: '#d6d3d1', count: 0 },
  { key: 'red',    name: '红盘', price: 15, color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', count: 0 },
  { key: 'yellow', name: '黄盘', price: 10, color: '#ca8a04', bg: '#fefce8', border: '#fde047', count: 0 },
  { key: 'green',  name: '绿盘', price: 5,  color: '#16a34a', bg: '#f0fdf4', border: '#86efac', count: 0 },
])

function add(d: Dish) { if (d.count < 99) d.count++ }
function sub(d: Dish) { if (d.count > 0) d.count-- }

// ── 饮料 ─────────────────────────────────────
interface Drink {
  key: string
  name: string
  price: number
  count: number
}

const drinks = ref<Drink[]>([
  { key: 'glass-bottle',  name: '玻璃瓶',   price: 3,  count: 0 },
  { key: 'cola',          name: '可乐雪芬', price: 5,  count: 0 },
  { key: 'wanglaoji',     name: '王老吉',   price: 6,  count: 0 },
  { key: 'jianlibao',     name: '健力宝',   price: 6,  count: 0 },
  { key: 'guava',         name: '番石榴',   price: 6,  count: 0 },
  { key: 'vita-tea',      name: '维他茶',   price: 6,  count: 0 },
  { key: 'podu',          name: '破独',     price: 6,  count: 0 },
  { key: 'soy-milk',      name: '豆奶',     price: 7,  count: 0 },
  { key: 'coconut-water', name: '椰子水',   price: 7,  count: 0 },
  { key: 'oolong',        name: '乌龙茶',   price: 7,  count: 0 },
  { key: 'hopwater',      name: '好望水',   price: 7,  count: 0 },
  { key: 'small-coconut', name: '小椰汁',   price: 7,  count: 0 },
  { key: 'songyouzhi',    name: '宋柚汁',   price: 8,  count: 0 },
  { key: 'beiqiyecai',    name: '贝奇野菜', price: 8,  count: 0 },
  { key: 'xianguofengmi', name: '鲜果蜂蜜水', price: 8,  count: 0 },
  { key: 'budweiser',     name: '百威',     price: 8,  count: 0 },
  { key: 'jiashibo',      name: '嘉士伯',   price: 8,  count: 0 },
  { key: 'zhaori',        name: '朝日',     price: 10,  count: 0 },
  { key: 'heineken',      name: '喜力',     price: 10, count: 0 },
  { key: 'corona',        name: '科罗娜',   price: 10, count: 0 },
  { key: 'hoegaarden',    name: '福佳白',   price: 10, count: 0 },
  { key: 'blue-girl',     name: '蓝妹',     price: 10, count: 0 },
  { key: 'big-coconut',   name: '大椰汁',   price: 20, count: 0 },
])

function addDrink(d: Drink) { if (d.count < 99) d.count++ }
function subDrink(d: Drink) { if (d.count > 0) d.count-- }

const drinkExpanded = ref(false)
const visibleDrinks = computed(() => drinkExpanded.value ? drinks.value : drinks.value.slice(0, 2))
const hiddenDrinkCount = computed(() => drinks.value.length - 2)

// ── 结算 ─────────────────────────────────────
const showBill = ref(false)

// ── 即时计算 ─────────────────────────────────
const potFee = computed(() => diners.value * 12)
const sauceFee = computed(() => diners.value * 4)
const dishRaw = computed(() => dishes.value.reduce((s, d) => s + d.price * d.count, 0))
const dishFee = computed(() => Math.round(dishRaw.value * discount.value * 100) / 100)
const drinkTotal = computed(() => drinks.value.reduce((s, d) => s + d.price * d.count, 0))
const total = computed(() => potFee.value + sauceFee.value + dishFee.value + drinkTotal.value)
const hasDishes = computed(() => dishes.value.some((d) => d.count > 0))
const hasDrinks = computed(() => drinks.value.some((d) => d.count > 0))
const discountText = computed(() => discount.value === 0.68 ? '会员6.8折' : '5.8折')
</script>

<template>
  <div class="page">
    <!-- 标题 -->
    <header class="header">
      <span class="logo">🍲</span>
      <h1>朱富贵火锅</h1>
      <p class="subtitle">菜价计算器</p>
    </header>

    <!-- 用餐人数 -->
    <section class="card">
      <div class="card-title">👥 用餐人数</div>
      <div class="diner-row">
        <div class="stepper">
          <button class="st-btn" :disabled="diners <= 1" @click="subDiners">−</button>
          <span class="st-num">{{ diners }}</span>
          <button class="st-btn" :disabled="diners >= 20" @click="addDiners">+</button>
        </div>
        <span class="diner-hint">锅底 ¥12/人 · 小料 ¥4/人</span>
      </div>
    </section>

    <!-- 折扣选择 -->
    <section class="card">
      <div class="card-title">🏷️ 折扣选择</div>
      <div class="discount-row">
        <label class="dc" :class="{ active: discount === 0.68 }">
          <input type="radio" :value="0.68" v-model="discount" />
          <div class="dc-inner">
            <span class="dc-num">6.8<small>折</small></span>
          </div>
        </label>
        <label class="dc vip" :class="{ active: discount === 0.58 }">
          <input type="radio" :value="0.58" v-model="discount" />
          <div class="dc-inner">
            <span class="dc-num">5.8<small>折</small></span>
          </div>
        </label>
      </div>
    </section>

    <!-- 菜品选择 -->
    <section class="card">
      <div class="card-title">🍽️ 选择菜品</div>
      <div class="dish-list">
        <div
          v-for="d in dishes"
          :key="d.key"
          class="dish"
          :style="{ '--c': d.color, '--dbg': d.bg, '--dbc': d.border }"
        >
          <span class="dish-dot" />
          <span class="dish-name">{{ d.name }}</span>
          <span class="dish-price">¥{{ d.price }}</span>
          <div class="stepper mini">
            <button class="st-btn sm" :disabled="d.count <= 0" @click="sub(d)">−</button>
            <span class="st-num sm">{{ d.count }}</span>
            <button class="st-btn sm" :disabled="d.count >= 99" @click="add(d)">+</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 饮料选择 -->
    <section class="card">
      <div class="card-title">🥤 饮料选择</div>
      <div class="drink-grid">
        <div v-for="d in visibleDrinks" :key="d.key" class="drink-item">
          <div class="drink-info">
            <span class="drink-name">{{ d.name }}</span>
            <span class="drink-price">¥{{ d.price }}</span>
          </div>
          <div class="stepper tiny">
            <button class="st-btn xs" :disabled="d.count <= 0" @click="subDrink(d)">−</button>
            <span class="st-num xs">{{ d.count }}</span>
            <button class="st-btn xs" :disabled="d.count >= 99" @click="addDrink(d)">+</button>
          </div>
        </div>
      </div>
      <button class="expand-btn" @click="drinkExpanded = !drinkExpanded">
        <span v-if="!drinkExpanded">展开全部 ({{ hiddenDrinkCount }}+) ▼</span>
        <span v-else>收起 ▲</span>
      </button>
    </section>

    <!-- 结算按钮 -->
    <button v-if="!showBill" class="settle-btn" @click="showBill = true">
      <span class="settle-icon">💰</span>
      <span class="settle-label">结算</span>
    </button>

    <!-- 账单明细 -->
    <section v-if="showBill" class="card bill-card">
      <div class="bill-top">
        <span class="card-title">📋 账单明细</span>
        <button class="fold-btn" @click="showBill = false">收起 ▲</button>
      </div>

      <div class="bill-row">
        <span class="bl">🫕 锅底费</span>
        <span class="bd">{{ diners }}人 × ¥12</span>
        <span class="ba">¥{{ potFee }}</span>
      </div>
      <div class="bill-row">
        <span class="bl">🥣 小料费</span>
        <span class="bd">{{ diners }}人 × ¥4</span>
        <span class="ba">¥{{ sauceFee }}</span>
      </div>

      <div class="sep" />

      <template v-if="hasDishes">
        <div v-for="d in dishes.filter(x => x.count > 0)" :key="d.key" class="bill-row sub">
          <span class="bl"><span class="dot" :style="{ background: d.color }" />{{ d.name }}</span>
          <span class="bd">{{ d.count }}盘 × ¥{{ d.price }}</span>
          <span class="ba">¥{{ d.count * d.price }}</span>
        </div>
        <div class="bill-row highlight">
          <span class="bl">🍽️ 菜品费</span>
          <span class="bd">¥{{ dishRaw }} × {{ discountText }}</span>
          <span class="ba hi">¥{{ dishFee }}</span>
        </div>
      </template>
      <div v-else class="empty-dish">暂未选择菜品</div>

      <template v-if="hasDrinks">
        <div class="sep" />
        <div v-for="d in drinks.filter(x => x.count > 0)" :key="d.key" class="bill-row sub">
          <span class="bl"><span class="dot" style="background: #3b82f6" />{{ d.name }}</span>
          <span class="bd">{{ d.count }}瓶 × ¥{{ d.price }}</span>
          <span class="ba">¥{{ d.count * d.price }}</span>
        </div>
        <div class="bill-row highlight">
          <span class="bl">🥤 饮料费</span>
          <span class="bd"></span>
          <span class="ba hi-drink">¥{{ drinkTotal }}</span>
        </div>
      </template>

      <div class="sep thick" />

      <div class="total-row">
        <span>💰 合计</span>
        <span class="total-price">¥{{ total }}</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ── 页面 & 主题变量 ───────────────────────── */
.page {
  --red: #E53E3E;
  --red-light: #FFF5F5;
  --red-border: #FEB2B2;
  --gold: #D69E2E;
  --gold-bg: #FFFFF0;
  --gold-border: #F6E05E;
  --card-bg: #fff;
  --card-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  --text-1: #1a202c;
  --text-2: #718096;
  --text-3: #a0aec0;
  --line: #e2e8f0;
  --radius: 16px;
  --font: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --mono: ui-monospace, 'Cascadia Code', Consolas, monospace;

  min-height: 100vh;
  min-height: 100dvh;
  touch-action: manipulation;
  background: var(--red-light);
  font-family: var(--font);
  color: var(--text-1);
  max-width: 480px;
  margin: 0 auto;
  padding: clamp(12px, 3vw, 20px);
  padding-bottom: env(safe-area-inset-bottom, 16px);
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
}

/* ── 标题 ──────────────────────────────────── */
.header {
  text-align: center;
  padding: clamp(10px, 2.5vw, 18px) 0 clamp(6px, 1.5vw, 12px);
}

.logo {
  font-size: clamp(32px, 8vw, 44px);
  display: block;
  line-height: 1.1;
}

.header h1 {
  font-size: clamp(20px, 5.5vw, 26px);
  font-weight: 800;
  margin: 4px 0 0;
  color: var(--red);
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: clamp(12px, 3vw, 14px);
  color: var(--text-2);
  margin: 2px 0 0;
}

/* ── 卡片通用 ──────────────────────────────── */
.card {
  background: var(--card-bg);
  border-radius: var(--radius);
  box-shadow: var(--card-shadow);
  padding: clamp(14px, 3.5vw, 20px);
  margin-bottom: clamp(10px, 2.5vw, 14px);
}

.card-title {
  font-size: clamp(14px, 3.5vw, 16px);
  font-weight: 700;
  color: var(--text-1);
  margin-bottom: clamp(10px, 2.5vw, 14px);
}

/* ── 用餐人数 ──────────────────────────────── */
.diner-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.diner-hint {
  font-size: clamp(11px, 2.8vw, 13px);
  color: var(--text-3);
}

/* ── Stepper 通用 ──────────────────────────── */
.stepper {
  display: inline-flex;
  align-items: center;
  background: var(--red-light);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
}

.st-btn {
  width: clamp(36px, 9vw, 42px);
  height: clamp(34px, 8.5vw, 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  font-size: clamp(16px, 4.5vw, 20px);
  font-weight: 700;
  color: var(--red);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;
}

.st-btn:active:not(:disabled) {
  background: var(--red-border);
  transform: scale(0.92);
}

.st-btn:disabled {
  color: var(--text-3);
  opacity: 0.4;
  cursor: not-allowed;
}

.st-num {
  min-width: clamp(32px, 8vw, 40px);
  text-align: center;
  font-size: clamp(16px, 4.5vw, 20px);
  font-weight: 800;
  color: var(--text-1);
  font-family: var(--mono);
}

/* Stepper mini（菜品用） */
.stepper.mini {
  border-color: var(--dbc);
  background: var(--dbg);
  border-radius: 10px;
}

.st-btn.sm {
  width: clamp(30px, 7.5vw, 36px);
  height: clamp(28px, 7vw, 34px);
  font-size: clamp(14px, 3.8vw, 18px);
  color: var(--c);
}

.st-btn.sm:active:not(:disabled) {
  background: var(--dbc);
}

.st-num.sm {
  min-width: clamp(24px, 6vw, 32px);
  font-size: clamp(14px, 3.8vw, 18px);
  color: var(--c);
}

/* ── 折扣 ──────────────────────────────────── */
.discount-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.dc {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.dc input { display: none; }

.dc-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: clamp(10px, 2.5vw, 14px) 8px;
  border: 2px solid var(--line);
  border-radius: 14px;
  transition: all 0.18s;
}

.dc-inner:active {
  transform: scale(0.96);
}

.dc-num {
  font-size: clamp(22px, 5.5vw, 28px);
  font-weight: 800;
  font-family: var(--mono);
  color: var(--text-2);
  line-height: 1;
}

.dc-num small {
  font-size: 0.5em;
  font-weight: 600;
  margin-left: 1px;
}

.dc-note {
  font-size: clamp(10px, 2.2vw, 11px);
  color: var(--text-3);
  margin-top: 4px;
  transition: color 0.18s;
}

/* 选中态 */
.dc.active .dc-inner {
  border-color: var(--red);
  background: var(--red-light);
  box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.15);
}

.dc.active .dc-num {
  color: var(--red);
}

.dc.vip.active .dc-inner {
  border-color: var(--gold);
  background: var(--gold-bg);
  box-shadow: 0 0 0 3px rgba(214, 158, 46, 0.15);
}

.dc.vip.active .dc-num {
  color: var(--gold);
}

.dc.vip.active .dc-note {
  color: var(--gold);
}

/* ── 菜品列表 ──────────────────────────────── */
.dish-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dish {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: clamp(10px, 2.5vw, 14px) clamp(12px, 3vw, 16px);
  border: 1.5px solid var(--dbc);
  border-radius: 14px;
  background: var(--dbg);
  transition: box-shadow 0.2s;
}

.dish:active {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.dish-dot {
  width: clamp(10px, 2.5vw, 14px);
  height: clamp(10px, 2.5vw, 14px);
  border-radius: 50%;
  background: var(--c);
}

.dish-name {
  font-size: clamp(14px, 3.5vw, 16px);
  font-weight: 700;
  color: var(--c);
}

.dish-price {
  font-size: clamp(12px, 3vw, 14px);
  font-family: var(--mono);
  color: var(--text-2);
  text-align: right;
  padding-right: 4px;
}

/* ── 饮料列表 ──────────────────────────────── */
.drink-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.drink-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: clamp(6px, 1.5vw, 10px) clamp(8px, 2vw, 12px);
  border: 1.5px solid var(--line);
  border-radius: 10px;
  background: #f8fafc;
  transition: box-shadow 0.15s;
}

.drink-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.drink-name {
  font-size: clamp(12px, 3vw, 14px);
  font-weight: 600;
  color: var(--text-1);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drink-price {
  font-size: clamp(11px, 2.5vw, 12px);
  font-family: var(--mono);
  color: #3b82f6;
  font-weight: 700;
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 8px;
  padding: clamp(6px, 1.5vw, 8px) 0;
  border: 1.5px dashed var(--line);
  border-radius: 10px;
  background: transparent;
  color: var(--text-3);
  font-size: clamp(12px, 2.8vw, 13px);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.expand-btn:hover {
  color: var(--text-2);
  border-color: var(--text-3);
}

.expand-btn:active {
  transform: scale(0.97);
}

/* Stepper tiny（饮料用） */
.stepper.tiny {
  border: 1.5px solid var(--line);
  background: #f1f5f9;
  border-radius: 8px;
  flex-shrink: 0;
}

.st-btn.xs {
  width: clamp(24px, 6vw, 30px);
  height: clamp(22px, 5.5vw, 28px);
  font-size: clamp(13px, 3.2vw, 16px);
  color: #3b82f6;
}

.st-btn.xs:active:not(:disabled) {
  background: #bfdbfe;
}

.st-num.xs {
  min-width: clamp(18px, 4.5vw, 24px);
  font-size: clamp(12px, 3vw, 15px);
  color: #3b82f6;
}

.ba.hi-drink {
  color: #3b82f6;
}

/* ── 结算按钮 ──────────────────────────────── */
.settle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: clamp(14px, 3.5vw, 18px) 20px;
  border: none;
  border-radius: var(--radius);
  background: linear-gradient(135deg, #ED6A3B, #E8452E);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(232, 69, 46, 0.35);
  transition: transform 0.12s, box-shadow 0.12s;
  -webkit-tap-highlight-color: transparent;
}

.settle-btn:hover {
  box-shadow: 0 6px 24px rgba(232, 69, 46, 0.45);
  transform: translateY(-1px);
}

.settle-btn:active {
  transform: scale(0.97);
  box-shadow: 0 2px 10px rgba(232, 69, 46, 0.3);
}

.settle-icon {
  font-size: clamp(18px, 4vw, 22px);
}

.settle-label {
  font-size: clamp(16px, 3.8vw, 19px);
  font-weight: 700;
  letter-spacing: 0.5px;
}

.settle-price {
  font-size: clamp(20px, 5vw, 26px);
  font-weight: 900;
  font-family: var(--mono);
  letter-spacing: -0.5px;
  margin-left: 4px;
}

/* ── 账单 ──────────────────────────────────── */
.bill-card {
  animation: billSlideUp 0.28s ease-out;
  background: linear-gradient(180deg, #fff 0%, var(--red-light) 100%);
  border: 1.5px solid var(--red-border);
}

@keyframes billSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.bill-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: clamp(8px, 2vw, 12px);
}

.bill-top .card-title {
  margin: 0;
}

.fold-btn {
  border: none;
  background: transparent;
  color: var(--text-3);
  font-size: clamp(12px, 2.8vw, 14px);
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 8px;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.fold-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-2);
}

.fold-btn:active {
  transform: scale(0.94);
}

.bill-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: clamp(4px, 1vw, 8px);
  padding: clamp(5px, 1.2vw, 7px) 0;
}

.bill-row.sub {
  padding: clamp(3px, 0.8vw, 5px) 0;
}

.bl {
  font-size: clamp(13px, 3.2vw, 15px);
  color: var(--text-1);
  display: flex;
  align-items: center;
  gap: 5px;
}

.bd {
  font-size: clamp(11px, 2.8vw, 13px);
  color: var(--text-3);
  font-family: var(--mono);
  text-align: right;
  white-space: nowrap;
}

.ba {
  font-size: clamp(13px, 3.2vw, 15px);
  font-weight: 700;
  color: var(--text-1);
  text-align: right;
  min-width: clamp(42px, 10vw, 56px);
  font-family: var(--mono);
}

.ba.hi {
  color: var(--red);
}

.bill-row.highlight .bl {
  font-weight: 700;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.empty-dish {
  text-align: center;
  font-size: clamp(12px, 3vw, 14px);
  color: var(--text-3);
  padding: clamp(8px, 2vw, 12px) 0;
  font-style: italic;
}

.sep {
  height: 1px;
  background: var(--line);
  margin: clamp(4px, 1vw, 6px) 0;
}

.sep.thick {
  height: 2px;
  background: var(--red-border);
  margin: clamp(6px, 1.5vw, 10px) 0;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: clamp(4px, 1vw, 8px);
}

.total-row > span:first-child {
  font-size: clamp(15px, 3.8vw, 18px);
  font-weight: 800;
}

.total-price {
  font-size: clamp(26px, 7vw, 34px);
  font-weight: 900;
  color: var(--red);
  font-family: var(--mono);
  letter-spacing: -1px;
}

/* ── 深色模式（仅桌面端） ─────────────────── */
@media (prefers-color-scheme: dark) and (min-width: 768px) {
  .page {
    --red-light: #1a1215;
    --card-bg: #1e1a1f;
    --card-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
    --text-1: #f5f0f0;
    --text-2: #9b8e8e;
    --text-3: #6b5e5e;
    --line: #3d2f2f;
    --red-border: #5c2424;
    --gold-bg: #1f1c12;
    --gold-border: #5c4e1a;
    background: var(--red-light);
  }

  .dish {
    background: var(--card-bg) !important;
  }

  .bill-card {
    background: linear-gradient(180deg, var(--card-bg) 0%, #1a1215 100%);
  }

  .settle-btn {
    background: linear-gradient(135deg, #c0522e, #b91c1c);
    box-shadow: 0 4px 18px rgba(185, 28, 28, 0.4);
  }

  .fold-btn:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .drink-item {
    background: var(--card-bg) !important;
    border-color: var(--line);
  }

  .expand-btn {
    border-color: var(--line);
    color: var(--text-3);
  }

  .expand-btn:hover {
    color: var(--text-2);
    border-color: var(--text-2);
  }

  .drink-price {
    color: #60a5fa;
  }

  .stepper.tiny {
    border-color: var(--line);
    background: #1e293b;
  }

  .st-btn.xs {
    color: #60a5fa;
  }

  .st-btn.xs:active:not(:disabled) {
    background: #1e3a5f;
  }

  .st-num.xs {
    color: #60a5fa;
  }

  .ba.hi-drink {
    color: #60a5fa;
  }
}
</style>
