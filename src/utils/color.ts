export interface Color {
  r: number
  g: number
  b: number
  a: number
}
const bound = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new Error(`颜色分量必须在 ${min}–${max} 范围内。`)
  return value
}
const round = (n: number) => Math.round(n * 1000) / 1000
export function parseColor(text: string): Color {
  const input = text.trim().toLowerCase()
  if (/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/.test(input)) {
    let hex = input.slice(1)
    if (hex.length <= 4) hex = [...hex].map((c) => c + c).join('')
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1,
    }
  }
  const match = /^(rgba?|hsla?)\(([^()]*)\)$/.exec(input)
  if (!match)
    throw new Error(
      '支持 #RGB / #RGBA / #RRGGBB / #RRGGBBAA、RGB(A) 和 HSL(A)。',
    )
  const parts = match[2]!.trim().split(/\s*[,/]\s*|\s+/)
  if (parts.length < 3 || parts.length > 4 || parts.some((s) => !s))
    throw new Error('颜色需要 3 个分量，可选第 4 个透明度。')
  const num = (v: string) => {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)%?$/.test(v))
      throw new Error('颜色数值格式无效。')
    return Number(v.replace('%', ''))
  }
  const alpha = parts[3] ?? '1'
  const a = bound(num(alpha) / (alpha.endsWith('%') ? 100 : 1), 0, 1)
  if (match[1]!.startsWith('rgb')) {
    const values = parts
      .slice(0, 3)
      .map(
        (s) =>
          bound(num(s), 0, s.endsWith('%') ? 100 : 255) *
          (s.endsWith('%') ? 2.55 : 1),
      )
    return { r: values[0]!, g: values[1]!, b: values[2]!, a }
  }
  if (!parts[1]!.endsWith('%') || !parts[2]!.endsWith('%'))
    throw new Error('HSL 的饱和度和亮度需要使用百分比。')
  const hue = parts[0]!.replace(/deg$/, '')
  if (hue.endsWith('%')) throw new Error('色相需要角度数字。')
  const h = ((num(hue) % 360) + 360) % 360,
    s = bound(num(parts[1]!), 0, 100) / 100,
    l = bound(num(parts[2]!), 0, 100) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  return { r: (r! + m) * 255, g: (g! + m) * 255, b: (b! + m) * 255, a }
}
export function colorFormats(c: Color) {
  const r = c.r / 255,
    g = c.g / 255,
    b = c.b / 255,
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min,
    l = (max + min) / 2
  const h =
    d === 0
      ? 0
      : (max === r
          ? ((g - b) / d) % 6
          : max === g
            ? (b - r) / d + 2
            : (r - g) / d + 4) * 60
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  const hex =
    '#' +
    [c.r, c.g, c.b]
      .map((v) => Math.round(v).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  return {
    hex:
      hex +
      (c.a === 1
        ? ''
        : Math.round(c.a * 255)
            .toString(16)
            .padStart(2, '0')
            .toUpperCase()),
    rgb: `rgba(${round(c.r)}, ${round(c.g)}, ${round(c.b)}, ${round(c.a)})`,
    hsl: `hsla(${round((h + 360) % 360)}, ${round(s * 100)}%, ${round(l * 100)}%, ${round(c.a)})`,
  }
}
export function contrastRatio(foreground: Color, background: Color): number {
  const blend = (f: Color, b: Color): Color => ({
    r: f.r * f.a + b.r * (1 - f.a),
    g: f.g * f.a + b.g * (1 - f.a),
    b: f.b * f.a + b.b * (1 - f.a),
    a: 1,
  })
  const bg = blend(background, { r: 255, g: 255, b: 255, a: 1 }),
    fg = blend(foreground, bg)
  const lum = (c: Color) =>
    [c.r, c.g, c.b]
      .map((v) => v / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i]!, 0)
  return (
    (Math.max(lum(fg), lum(bg)) + 0.05) / (Math.min(lum(fg), lum(bg)) + 0.05)
  )
}
