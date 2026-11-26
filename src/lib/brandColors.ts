// White-label colours (pure functions, safe in the browser and on the server).
//
// A workspace chooses two colours:
//   - the MAIN colour: buttons, titles, links and highlights (replaces the gold of Zahir Guest);
//   - the BACKGROUND colour: the tint of the light app background (« Maison » direction, 26 Nov 2026). The interface
//     stays light so that texts and charts remain readable; the colour gives the hue, the lightness steps are fixed.

export const DEFAULT_ACCENT = '#8A5A18'
export const DEFAULT_THEME = '#F7F4EE'
/** Defaults of the former dark theme: a workspace that saved one of them gets today's default. */
const LEGACY_DEFAULTS = ['#0D1B2A', '#C8A45A']
export const HEX_RE = /^#[0-9a-fA-F]{6}$/

type Rgb = [number, number, number]

export function hexToRgb(hex: string): Rgb {
  const h = HEX_RE.test(hex) ? hex : DEFAULT_ACCENT
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex([r, g, b]: Rgb): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase()
}

export function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min
  const l = (max + min) / 2
  if (d === 0) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  let h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4
  h = (h * 60 + 360) % 360
  return [h, s, l]
}

export function hslToRgb([h, s, l]: [number, number, number]): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const lin = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/**
 * The main colour as it is applied on the light background: it serves as text and as the ground of white text, so a
 * colour that would be too light is darkened until it reads (contrast ≥ 4.5:1 on the ivory ground), keeping its hue.
 */
export function readableAccent(hex: string): string {
  const base = HEX_RE.test(hex) && !LEGACY_DEFAULTS.includes(hex.toUpperCase()) ? hex.toUpperCase() : DEFAULT_ACCENT
  const MAX = 0.16
  if (luminance(base) <= MAX) return base
  const [h, s, l0] = rgbToHsl(hexToRgb(base))
  let l = l0
  for (let i = 0; i < 50 && luminance(rgbToHex(hslToRgb([h, s, l]))) > MAX; i++) l = Math.max(0.08, l - 0.02)
  return rgbToHex(hslToRgb([h, s, l]))
}

/** CSS variables of the light theme tinted with the chosen background colour. Null for the default ivory. */
export function themeVars(hex: string | null | undefined): Record<string, string> | null {
  if (!hex || !HEX_RE.test(hex)) return null
  const up = hex.toUpperCase()
  if (up === DEFAULT_THEME || LEGACY_DEFAULTS.includes(up)) return null
  const [h, sat] = rgbToHsl(hexToRgb(hex))
  // grey / black / white choices become a neutral stone; colours keep their hue with a gentle saturation
  const s = sat < 0.1 ? 0.06 : Math.min(0.35, Math.max(0.18, sat * 0.6))
  const at = (l: number) => rgbToHex(hslToRgb([h, s, l]))
  return {
    '--color-deep-ink': at(0.955),
    '--color-midnight-navy': at(0.915),
    '--color-slate-navy': at(0.98),
    '--color-paper': at(0.99),
    '--color-border': at(0.82),
    '--color-border-subtle': at(0.87),
    '--color-line-strong': at(0.76),
  }
}

/**
 * The most characteristic colour of a logo (pixels as RGBA, e.g. from a small canvas): the most present hue among
 * saturated, neither too light nor too dark pixels. Null for a logo that is only black, white or grey.
 */
export function dominantColor(pixels: Uint8ClampedArray | number[]): string | null {
  const BUCKETS = 24
  const weight = new Array<number>(BUCKETS).fill(0)
  const sum: Rgb[] = Array.from({ length: BUCKETS }, () => [0, 0, 0] as Rgb)
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue
    const rgb: Rgb = [pixels[i], pixels[i + 1], pixels[i + 2]]
    const [h, s, l] = rgbToHsl(rgb)
    if (s < 0.25 || l < 0.1 || l > 0.9) continue
    const b = Math.min(BUCKETS - 1, Math.floor((h / 360) * BUCKETS))
    const w = s * (1 - Math.abs(2 * l - 1))
    weight[b] += w
    sum[b][0] += rgb[0] * w; sum[b][1] += rgb[1] * w; sum[b][2] += rgb[2] * w
  }
  let best = -1
  for (let b = 0; b < BUCKETS; b++) if (weight[b] > 0 && (best < 0 || weight[b] > weight[best])) best = b
  if (best < 0) return null
  return rgbToHex([sum[best][0] / weight[best], sum[best][1] / weight[best], sum[best][2] / weight[best]])
}

/** Ready-made backgrounds (light, brand-neutral) offered next to the free colour picker. */
export const THEME_PRESETS: { hex: string; en: string; fr: string }[] = [
  { hex: '#F7F4EE', en: 'Ivory', fr: 'Ivoire' },
  { hex: '#8C8C8C', en: 'Stone', fr: 'Pierre' },
  { hex: '#2F6B4F', en: 'Sage', fr: 'Sauge' },
  { hex: '#8A2E3A', en: 'Rose', fr: 'Rosé' },
  { hex: '#4B3A78', en: 'Lavender', fr: 'Lavande' },
  { hex: '#2C6577', en: 'Mist', fr: 'Brume' },
]
