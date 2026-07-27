export type Rgb = { r: number; g: number; b: number }

export type PaletteColor = Rgb & {
  id: string
  hex: string
  count: number
}

export type ColorFilterMode = 'off' | 'gray' | 'mask'

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

export function rgbToHex({ r, g, b }: Rgb) {
  return `#${[r, g, b].map((v) => clampByte(v).toString(16).padStart(2, '0')).join('')}`
}

export function colorDistance(a: Rgb, b: Rgb) {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
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

function mergeCloseColors(colors: PaletteColor[], minDistance = 42) {
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

export async function extractPalette(src: string, maxColors = 8): Promise<PaletteColor[]> {
  const img = await loadImage(src)
  const { ctx, width, height } = drawToCanvas(img, 720)
  const { data } = ctx.getImageData(0, 0, width, height)
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>()
  const step = 28

  for (let i = 0; i < data.length; i += 16) {
    const alpha = data[i + 3]
    if (alpha < 28) continue

    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
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
      } satisfies PaletteColor
    })
    .sort((a, b) => b.count - a.count)

  const merged = mergeCloseColors(ranked, 44)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors)
    .map((color, index) => ({
      ...color,
      id: `c${index}-${color.hex.replace('#', '')}`,
      hex: rgbToHex(color),
    }))

  return merged
}

function nearestPaletteColor(pixel: Rgb, palette: PaletteColor[]) {
  let best = palette[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const color of palette) {
    const distance = colorDistance(pixel, color)
    if (distance < bestDistance) {
      best = color
      bestDistance = distance
    }
  }
  return best
}

export async function renderFilteredReference(
  src: string,
  palette: PaletteColor[],
  selectedIds: string[],
  mode: Exclude<ColorFilterMode, 'off'>,
): Promise<string> {
  if (palette.length === 0 || selectedIds.length === 0) {
    throw new Error('Нет выбранных цветов')
  }

  const selected = new Set(selectedIds)
  const img = await loadImage(src)
  const { canvas, ctx, width, height } = drawToCanvas(img, 1400)
  const imageData = ctx.getImageData(0, 0, width, height)
  const { data } = imageData

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue

    const pixel = { r: data[i], g: data[i + 1], b: data[i + 2] }
    const nearest = nearestPaletteColor(pixel, palette)

    if (selected.has(nearest.id)) continue

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
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Не удалось обработать референс'))
          return
        }
        resolve(URL.createObjectURL(blob))
      },
      'image/png',
    )
  })
}
