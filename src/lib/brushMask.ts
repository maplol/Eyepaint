export type BrushMaskSettings = {
  enabled: boolean
  editing: boolean
  /** 'keep' = paint areas to keep; 'remove' = paint areas to hide */
  mode: 'keep' | 'remove'
  combine: 'and' | 'or'
  brushSize: number
  /** PNG data URL of grayscale mask, same aspect as reference sample */
  dataUrl: string | null
}

export const DEFAULT_BRUSH_MASK: BrushMaskSettings = {
  enabled: false,
  editing: false,
  mode: 'keep',
  combine: 'and',
  brushSize: 28,
  dataUrl: null,
}

const MASK_SIDE = 512

export function createBlankMaskCanvas(width = MASK_SIDE, height = MASK_SIDE) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas недоступен')
  // Transparent = outside mask; paint white to mark
  ctx.clearRect(0, 0, width, height)
  return { canvas, ctx }
}

export async function loadMaskImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Не удалось загрузить маску'))
    img.src = dataUrl
  })
}

export async function sampleMaskAlpha(
  dataUrl: string,
  width: number,
  height: number,
): Promise<Uint8ClampedArray> {
  const img = await loadMaskImage(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas недоступен')
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height).data
}

/** True if this pixel should be treated as "in brush mask" */
export function isMaskedPixel(
  alpha: number,
  mode: BrushMaskSettings['mode'],
): boolean {
  const painted = alpha > 24
  return mode === 'keep' ? painted : !painted
}
