export type Rgb = { r: number; g: number; b: number }

export type PaletteColor = Rgb & {
  id: string
  hex: string
  count: number
  source?: 'auto' | 'pick'
}

export type ColorFilterMode = 'off' | 'gray' | 'mask'

/** 1 = мало крупных кластеров, 5 = много узких оттенков */
export type ColorPrecision = 1 | 2 | 3 | 4 | 5

export type PrecisionProfile = {
  level: ColorPrecision
  label: string
  hint: string
  maxColors: number
  quantStep: number
  mergeDistance: number
  /** Default match radius for filter */
  defaultTolerance: number
}

export const PRECISION_PROFILES: Record<ColorPrecision, PrecisionProfile> = {
  1: {
    level: 1,
    label: 'Грубо',
    hint: '6 крупных цветов',
    maxColors: 6,
    quantStep: 36,
    mergeDistance: 58,
    defaultTolerance: 70,
  },
  2: {
    level: 2,
    label: 'Мягко',
    hint: '8 цветов',
    maxColors: 8,
    quantStep: 28,
    mergeDistance: 48,
    defaultTolerance: 56,
  },
  3: {
    level: 3,
    label: 'Норм',
    hint: '12 цветов',
    maxColors: 12,
    quantStep: 22,
    mergeDistance: 36,
    defaultTolerance: 42,
  },
  4: {
    level: 4,
    label: 'Точно',
    hint: '18 оттенков',
    maxColors: 18,
    quantStep: 16,
    mergeDistance: 26,
    defaultTolerance: 30,
  },
  5: {
    level: 5,
    label: 'Макс',
    hint: '24 узких оттенка',
    maxColors: 24,
    quantStep: 12,
    mergeDistance: 18,
    defaultTolerance: 22,
  },
}

const PRECISION_STORAGE = 'eyepaint-color-precision-v1'
const TOLERANCE_STORAGE = 'eyepaint-color-tolerance-v1'

export function loadColorPrecision(): ColorPrecision {
  try {
    const raw = Number(localStorage.getItem(PRECISION_STORAGE))
    if (raw >= 1 && raw <= 5) return raw as ColorPrecision
  } catch {
    /* ignore */
  }
  return 3
}

export function saveColorPrecision(level: ColorPrecision) {
  localStorage.setItem(PRECISION_STORAGE, String(level))
}

export function loadMatchTolerance(fallback: number): number {
  try {
    const raw = Number(localStorage.getItem(TOLERANCE_STORAGE))
    if (Number.isFinite(raw) && raw >= 8 && raw <= 120) return Math.round(raw)
  } catch {
    /* ignore */
  }
  return fallback
}

export function saveMatchTolerance(value: number) {
  localStorage.setItem(TOLERANCE_STORAGE, String(Math.round(value)))
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

export function rgbToHex({ r, g, b }: Rgb) {
  return `#${[r, g, b].map((v) => clampByte(v).toString(16).padStart(2, '0')).join('')}`
}

export function hexToRgb(hex: string): Rgb | null {
  const value = hex.replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}

/** Perceptual-ish distance so green does not dominate matches. */
export function colorDistance(a: Rgb, b: Rgb) {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db)
}

export function rgbToHue({ r, g, b }: Rgb) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  if (delta < 1e-6) return 0
  let hue = 0
  if (max === rn) hue = ((gn - bn) / delta) % 6
  else if (max === gn) hue = (bn - rn) / delta + 2
  else hue = (rn - gn) / delta + 4
  hue *= 60
  if (hue < 0) hue += 360
  return hue
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Не удалось загрузить изображение'))
    img.src = src
  })
}

function drawToCanvas(img: HTMLImageElement, maxSide = 960) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas недоступен')
  ctx.drawImage(img, 0, 0, width, height)
  return { canvas, ctx, width, height }
}

function mergeCloseColors(colors: PaletteColor[], minDistance: number) {
  const merged: PaletteColor[] = []

  for (const color of colors) {
    const near = merged.find((item) => colorDistance(item, color) < minDistance)
    if (!near) {
      merged.push({ ...color })
      continue
    }

    const total = near.count + color.count
    near.r = Math.round((near.r * near.count + color.r * color.count) / total)
    near.g = Math.round((near.g * near.count + color.g * color.count) / total)
    near.b = Math.round((near.b * near.count + color.b * color.count) / total)
    near.count = total
    near.hex = rgbToHex(near)
  }

  return merged
}

export function createPickedColor(rgb: Rgb, existing: PaletteColor[] = []): PaletteColor {
  const hex = rgbToHex(rgb)
  const near = existing.find(
    (item) => item.source === 'pick' && colorDistance(item, rgb) < 10,
  )
  if (near) return near
  return {
    ...rgb,
    hex,
    count: 1,
    source: 'pick',
    id: `pick-${hex.replace('#', '')}-${Date.now().toString(36)}`,
  }
}

export function sortPalette(colors: PaletteColor[], by: 'dominance' | 'hue'): PaletteColor[] {
  const copy = [...colors]
  if (by === 'hue') {
    return copy.sort((a, b) => rgbToHue(a) - rgbToHue(b))
  }
  return copy.sort((a, b) => {
    if ((a.source === 'pick') !== (b.source === 'pick')) {
      return a.source === 'pick' ? -1 : 1
    }
    return b.count - a.count
  })
}

export async function extractPalette(
  src: string,
  precision: ColorPrecision = 3,
  keepPicks: PaletteColor[] = [],
): Promise<PaletteColor[]> {
  const profile = PRECISION_PROFILES[precision]
  const img = await loadImage(src)
  const sampleSide = precision >= 4 ? 960 : 720
  const { ctx, width, height } = drawToCanvas(img, sampleSide)
  const { data } = ctx.getImageData(0, 0, width, height)
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>()
  const step = profile.quantStep
  const stride = precision >= 4 ? 12 : 16

  for (let i = 0; i < data.length; i += stride) {
    const alpha = data[i + 3]
    if (alpha < 28) continue

    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    const rq = Math.round(r / step) * step
    const gq = Math.round(g / step) * step
    const bq = Math.round(b / step) * step
    const key = `${rq},${gq},${bq}`
    const existing = buckets.get(key)
    if (existing) {
      existing.r += r
      existing.g += g
      existing.b += b
      existing.count += 1
    } else {
      buckets.set(key, { r, g, b, count: 1 })
    }
  }

  const ranked = [...buckets.values()]
    .map((bucket) => {
      const color = {
        r: Math.round(bucket.r / bucket.count),
        g: Math.round(bucket.g / bucket.count),
        b: Math.round(bucket.b / bucket.count),
        count: bucket.count,
      }
      return {
        ...color,
        id: '',
        hex: rgbToHex(color),
        source: 'auto' as const,
      } satisfies PaletteColor
    })
    .sort((a, b) => b.count - a.count)

  const auto = mergeCloseColors(ranked, profile.mergeDistance)
    .sort((a, b) => b.count - a.count)
    .slice(0, profile.maxColors)
    .map((color, index) => ({
      ...color,
      source: 'auto' as const,
      id: `c${index}-${color.hex.replace('#', '')}`,
      hex: rgbToHex(color),
    }))

  const picks = keepPicks
    .filter((item) => item.source === 'pick')
    .filter((pick) => !auto.some((item) => colorDistance(item, pick) < 12))

  return [...picks, ...auto]
}

export function pixelMatchesSelection(
  pixel: Rgb,
  selected: PaletteColor[],
  tolerance: number,
) {
  if (selected.length === 0) return false
  return selected.some((color) => colorDistance(pixel, color) <= tolerance)
}

export async function sampleColorAtImagePoint(
  src: string,
  normX: number,
  normY: number,
): Promise<Rgb> {
  const img = await loadImage(src)
  const x = Math.max(0, Math.min(img.naturalWidth - 1, Math.round(normX * img.naturalWidth)))
  const y = Math.max(0, Math.min(img.naturalHeight - 1, Math.round(normY * img.naturalHeight)))
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas недоступен')
  ctx.drawImage(img, x, y, 1, 1, 0, 0, 1, 1)
  const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data
  if (a < 10) throw new Error('Пустой пиксель')
  return { r, g, b }
}

export async function renderFilteredReference(
  src: string,
  selectedColors: PaletteColor[],
  mode: Exclude<ColorFilterMode, 'off'>,
  tolerance: number,
): Promise<string> {
  if (selectedColors.length === 0) {
    throw new Error('Нет выбранных цветов')
  }

  const img = await loadImage(src)
  const { canvas, ctx, width, height } = drawToCanvas(img, 1400)
  const imageData = ctx.getImageData(0, 0, width, height)
  const { data } = imageData

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 10) continue

    const pixel = { r: data[i]!, g: data[i + 1]!, b: data[i + 2]! }
    if (pixelMatchesSelection(pixel, selectedColors, tolerance)) continue

    if (mode === 'mask') {
      data[i + 3] = 0
      continue
    }

    const gray = Math.round(pixel.r * 0.299 + pixel.g * 0.587 + pixel.b * 0.114)
    data[i] = gray
    data[i + 1] = gray
    data[i + 2] = gray
  }

  ctx.putImageData(imageData, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Не удалось обработать референс'))
        return
      }
      resolve(URL.createObjectURL(blob))
    }, 'image/png')
  })
}
