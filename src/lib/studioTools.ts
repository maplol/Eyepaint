export type CalcModeSettings = {
  enabled: boolean
  /** 0..1 strength of paper contrast / bleach */
  strength: number
}

export const DEFAULT_CALC_MODE: CalcModeSettings = {
  enabled: false,
  strength: 0.45,
}

/** CSS filter for the live camera layer (not the reference). */
export function calcModeFilter(settings: CalcModeSettings): string | undefined {
  if (!settings.enabled || settings.strength <= 0.01) return undefined
  const s = settings.strength
  const contrast = 1 + s * 0.55
  const brightness = 1 + s * 0.18
  const saturate = 1 - s * 0.35
  return `contrast(${contrast.toFixed(3)}) brightness(${brightness.toFixed(3)}) saturate(${saturate.toFixed(3)})`
}

export type GuideKind = 'none' | 'thirds' | 'face' | 'figure' | 'perspective'

export type GuideSettings = {
  kind: GuideKind
  opacity: number
}

export const DEFAULT_GUIDES: GuideSettings = {
  kind: 'none',
  opacity: 0.55,
}

export const GUIDE_LABELS: Record<GuideKind, string> = {
  none: 'Нет',
  thirds: '3×3',
  face: 'Лицо',
  figure: 'Рост',
  perspective: 'Персп.',
}

export const GUIDE_TITLES: Record<GuideKind, string> = {
  none: 'Без направляющих',
  thirds: 'Сетка 3×3',
  face: 'Оси лица',
  figure: 'Пропорции фигуры',
  perspective: 'Перспектива (1 точка)',
}

export type LoupeSettings = {
  enabled: boolean
  /** Diameter in CSS pixels */
  size: number
  /** Magnification factor */
  zoom: number
}

export const DEFAULT_LOUPE: LoupeSettings = {
  enabled: false,
  size: 160,
  zoom: 2,
}

export const LOUPE_ZOOM_OPTIONS = [1.5, 2, 2.5, 3] as const
export const LOUPE_SIZE_MIN = 100
export const LOUPE_SIZE_MAX = 260

