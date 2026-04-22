<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

/* ── 天地图 Key（免费申请） ── */
const TDT_KEY = 'a1397e444b1da4d690df613aa79a34b6'

const mapContainer = ref<HTMLDivElement>()
let map: any = null

/* ── 城市坐标 ── */
const cities: Record<string, [number, number]> = {
  福州: [119.296, 26.074],
  龙岩: [117.017, 25.075],
  赣州: [114.935, 25.831],
  南昌: [115.858, 28.682],
  吉安: [114.992, 27.113],
//   吉水: [115.135, 27.229],
//   南康: [114.765, 25.661],
}

/* ── 行程路线段 ── */
const routes = [
  { from: '福州', to: '龙岩', color: '#f56c6c', day: 1 },
  { from: '龙岩', to: '赣州', color: '#e6a23c', day: 2 },
  { from: '赣州', to: '龙岩', color: '#67c23a', day: 3 },
  { from: '龙岩', to: '福州', color: '#67c23a', day: 3 },
  { from: '福州', to: '南昌', color: '#409eff', day: 4 },
  { from: '南昌', to: '吉安', color: '#409eff', day: 4 },
  { from: '吉安', to: '南昌', color: '#9b59b6', day: 5 },
  { from: '南昌', to: '福州', color: '#9b59b6', day: 5 },
]

/* ── 每日行程数据 ── */
const schedule = [
  {
    date: '5月1日',
    weekday: '周五',
    color: '#f56c6c',
    items: [
      { time: '上午', icon: '🚗', text: '福州 → 龙岩' },
    ],
  },
  {
    date: '5月2日',
    weekday: '周六',
    color: '#e6a23c',
    items: [
      { time: '上午', icon: '🚗', text: '龙岩 → 赣州' },
      { time: '18:00', icon: '💒', text: '赣州市南康区万佳国际酒店三楼三厅 — 林熙婚礼' },
    ],
  },
  {
    date: '5月3日',
    weekday: '周日',
    color: '#67c23a',
    items: [
      { time: '上午', icon: '🚗', text: '赣州 → 龙岩' },
      { time: '下午', icon: '🚗', text: '龙岩 → 福州' },
    ],
  },
  {
    date: '5月4日',
    weekday: '周一',
    color: '#409eff',
    items: [
      { time: '11:09~14:44', icon: '🚄', text: '福州 → 南昌西 G1684 11车06A' },
      { time: '15:05~16:08', icon: '🚄', text: '南昌西 → 吉安西 G4887 08车08A' },
    ],
  },
  {
    date: '5月5日',
    weekday: '周二',
    color: '#9b59b6',
    items: [
      { time: '12:08', icon: '💒', text: '吉水伯爵文山酒店 — 张蓉婚礼' },
      { time: '14:44~15:45', icon: '🚄', text: '吉安西 → 南昌西 G4864 无座' },
      { time: '16:47~19:39', icon: '🚄', text: '南昌西 → 福州 G1758 05车07A' },
    ],
  },
]

/* ── 生成贝塞尔曲线点（用于往返路线区分） ── */
function bezierCurvePoints(
  from: [number, number],
  to: [number, number],
  offset: number = 0.4,
  segments: number = 40,
): [number, number][] {
  const midX = (from[0] + to[0]) / 2
  const midY = (from[1] + to[1]) / 2
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  // 法向量偏移，让曲线弯曲
  const cx = midX - dy * offset
  const cy = midY + dx * offset
  const points: [number, number][] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const x = (1 - t) ** 2 * from[0] + 2 * (1 - t) * t * cx + t ** 2 * to[0]
    const y = (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * cy + t ** 2 * to[1]
    points.push([x, y])
  }
  return points
}

/* ── 记录已绘制的路段，检测往返 ── */
const drawnPairs = new Set<string>()

function getCurveOffset(from: string, to: string): { offset: number; isReturn: boolean } {
  const reverseKey = `${to}-${from}`
  const forwardKey = `${from}-${to}`
  if (drawnPairs.has(reverseKey)) {
    // 返程：用相同正偏移，因为起终点互换后曲线自然弯向另一侧
    drawnPairs.add(forwardKey)
    return { offset: 0.2, isReturn: true }
  }
  drawnPairs.add(forwardKey)
  return { offset: 0.2, isReturn: false }
}

/* ── 地图初始化 ── */
function initMap() {
  const T = (window as any).T
  if (!T) return

  map = new T.Map(mapContainer.value)
  map.centerAndZoom(new T.LngLat(116.5, 27.0), 7)
  map.addControl(new T.Control.Zoom())

  // 自定义定位图标（SVG 内联）
  const svgIcon = (color: string) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/>
      <circle cx="12" cy="11" r="5" fill="#fff"/>
    </svg>`
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    return new T.Icon({
      iconUrl: url,
      iconSize: new T.Point(20, 26),
      iconAnchor: new T.Point(10, 26),
    })
  }

  // 城市对应颜色
  const cityColors: Record<string, string> = {
    福州: '#409eff',
    龙岩: '#f56c6c',
    赣州: '#e6a23c',
    南昌: '#409eff',
    吉安: '#9b59b6',
    吉水: '#9b59b6',
    南康: '#e6a23c',
  }

  // 添加城市标注
  for (const [name, [lng, lat]] of Object.entries(cities)) {
    const marker = new T.Marker(new T.LngLat(lng, lat), { icon: svgIcon(cityColors[name] || '#409eff') })
    map.addOverLay(marker)
    const label = new T.Label({
      text: name,
      position: new T.LngLat(lng, lat),
      offset: new T.Point(-16, -30),
    })
    label.setFontSize(12)
    label.setFontColor('#333')
    label.setBorderColor('transparent')
    label.setBackgroundColor('rgba(255,255,255,0.85)')
    map.addOverLay(label)
  }

  // 添加曲线路线
  for (const r of routes) {
    const from = cities[r.from]
    const to = cities[r.to]
    const { offset, isReturn } = getCurveOffset(r.from, r.to)
    const curvePoints = bezierCurvePoints(from, to, offset)
    const lngLats = curvePoints.map(([x, y]) => new T.LngLat(x, y))
    const line = new T.Polyline(lngLats, {
      color: r.color,
      weight: 3,
      opacity: 0.85,
      lineStyle: isReturn ? 'dashed' : 'solid',
    })
    map.addOverLay(line)
  }
}

/* ── 加载天地图 JS API ── */
function loadTdtScript(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).T) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.src = `https://api.tianditu.gov.cn/api?v=4.0&tk=${TDT_KEY}`
    s.onload = () => resolve()
    document.head.appendChild(s)
  })
}

onMounted(async () => {
  await loadTdtScript()
  initMap()
})

onUnmounted(() => {
  map = null
})

/* ── 高亮某天路线 ── */
const activeDay = ref<number | null>(null)
</script>

<template>
  <div class="trip-page">
    <!-- 标题栏 -->
    <header class="trip-header">
      <h1>🗓️ 2026 五一行程安排</h1>
    </header>

    <div class="trip-card">
      <div class="trip-body">
        <!-- 左侧地图 -->
        <section class="map-section">
          <div ref="mapContainer" class="map-container" />
          <div class="map-legend">
            <span v-for="s in schedule" :key="s.date" class="legend-item">
              <i :style="{ background: s.color }" />{{ s.date }}
            </span>
          </div>
        </section>

        <!-- 分割线 -->
        <div class="divider" />

        <!-- 右侧行程 -->
        <section class="schedule-section">
          <div
            v-for="(day, idx) in schedule"
            :key="idx"
            class="day-card"
            :class="{ active: activeDay === idx }"
            @mouseenter="activeDay = idx"
            @mouseleave="activeDay = null"
          >
            <div class="day-header" :style="{ '--c': day.color }">
              <span class="day-dot" />
              <span class="day-date">{{ day.date }}</span>
              <span class="day-weekday">{{ day.weekday }}</span>
            </div>
            <div class="day-items">
              <div v-for="(item, i) in day.items" :key="i" class="day-item">
                <span class="item-icon">{{ item.icon }}</span>
                <span class="item-time">{{ item.time }}</span>
                <span class="item-text">{{ item.text }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trip-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f2f5 0%, #d5dde8 100%);
  padding: 16px;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.trip-header {
  text-align: center;
  margin-bottom: 12px;
}
.trip-header h1 {
  font-size: 24px;
  color: #2c3e50;
  margin: 0;
}
.subtitle {
  color: #7f8c8d;
  font-size: 13px;
  margin-top: 4px;
}

/* ── 整体卡片 ── */
.trip-card {
  max-width: 1400px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.trip-body {
  display: flex;
  min-height: 0;
}

.divider {
  width: 1px;
  background: #e8ecf0;
  flex-shrink: 0;
}

/* ── 地图 ── */
.map-section {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.map-container {
  width: 100%;
  flex: 1;
  min-height: 500px;
}
.map-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 12px;
  justify-content: center;
  background: #fafbfc;
  border-top: 1px solid #e8ecf0;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #555;
}
.legend-item i {
  display: inline-block;
  width: 14px;
  height: 4px;
  border-radius: 2px;
}

/* ── 行程列表 ── */
.schedule-section {
  flex: 0 0 550px;
  min-width: 0;
  display: flex;
  flex-direction: column;   
  gap: 0;
  padding: 10px 14px;
  overflow-y: auto;
  max-height: calc(100vh - 100px);
}

.day-card {
  padding: 8px 0;
  border-bottom: 1px solid #f0f1f3;
  transition: background 0.15s;
}
.day-card:last-child {
  border-bottom: none;
}
.day-card:hover,
.day-card.active {
  background: #f6f8fb;
  border-radius: 8px;
  margin: 0 -6px;
  padding: 8px 6px;
}

.day-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.day-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c);
  flex-shrink: 0;
}
.day-date {
  font-size: 16px;
  font-weight: 700;
  color: #2c3e50;
}
.day-weekday {
  font-size: 14px;
  color: #95a5a6;
}

.day-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 14px;
}
.day-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.4;
}
.item-icon {
  font-size: 15px;
  flex-shrink: 0;
}
.item-time {
  font-weight: 600;
  color: #409eff;
  white-space: nowrap;
  min-width: 100px;
  font-size: 14px;
}
.item-text {
  color: #34495e;
  font-size: 15px;
}

/* ── 响应式 ── */
@media (max-width: 768px) {
  .trip-body {
    flex-direction: column;
  }
  .divider {
    width: auto;
    height: 1px;
  }
  .schedule-section {
    flex: none;
    max-height: none;
  }
  .map-container {
    min-height: 300px;
  }
}
</style>
