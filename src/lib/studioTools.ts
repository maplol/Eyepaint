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

export type GuideKind = 'none' | 'thirds' | 'face' | 'figure'

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
}

export const GUIDE_TITLES: Record<GuideKind, string> = {
  none: 'Без направляющих',
  thirds: 'Сетка 3×3',
  face: 'Оси лица',
  figure: 'Пропорции фигуры',
}
