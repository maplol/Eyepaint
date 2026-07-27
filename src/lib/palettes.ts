import type { PaletteColor, Rgb } from './colors'

export type PalettePresetId = 'skin' | 'greens' | 'shadows' | 'mono'

export type PalettePreset = {
  id: PalettePresetId
  label: string
  hint: string
}

export type SavedPalette = {
  id: string
  name: string
  createdAt: number
  hexes: string[]
}

export const PALETTE_PRESETS: PalettePreset[] = [
  { id: 'skin', label: 'Кожа', hint: 'тёплые телесные' },
  { id: 'greens', label: 'Зелень', hint: 'листва / фон' },
  { id: 'shadows', label: 'Тени', hint: 'тёмные участки' },
  { id: 'mono', label: 'Моно', hint: 'нейтрали' },
]

const STORAGE_KEY = 'eyepaint-saved-palettes-v1'
const MAX_SAVED = 12

function luminance({ r, g, b }: Rgb) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function saturation({ r, g, b }: Rgb) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === 0) return 0
  return (max - min) / max
}

function hue({ r, g, b }: Rgb) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d < 1) return 0
  let h = 0
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  if (h < 0) h += 360
  return h
}

export function matchPreset(colors: PaletteColor[], preset: PalettePresetId): string[] {
  return colors
    .filter((color) => {
      const h = hue(color)
      const s = saturation(color)
      const l = luminance(color)
      switch (preset) {
        case 'skin':
          return h >= 10 && h <= 55 && s > 0.12 && l > 55 && l < 230
        case 'greens':
          return h >= 70 && h <= 170 && s > 0.12
        case 'shadows':
          return l < 90
        case 'mono':
          return s < 0.18
        default:
          return false
      }
    })
    .map((color) => color.id)
}

export function loadSavedPalettes(): SavedPalette[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<SavedPalette>[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item) =>
          !!item &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          Array.isArray(item.hexes),
      )
      .map((item) => ({
        id: item.id as string,
        name: item.name as string,
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        hexes: (item.hexes as string[]).filter((hex) => /^#[0-9a-fA-F]{6}$/.test(hex)).slice(0, 24),
      }))
      .slice(0, MAX_SAVED)
  } catch {
    return []
  }
}

export function saveSavedPalettes(palettes: SavedPalette[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes.slice(0, MAX_SAVED)))
}

export function createSavedPalette(name: string, hexes: string[], existing: SavedPalette[]): SavedPalette {
  return {
    id: `pal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || `Палитра ${existing.length + 1}`,
    createdAt: Date.now(),
    hexes: hexes.slice(0, 24),
  }
}

export function selectIdsByHexes(palette: PaletteColor[], hexes: string[]): string[] {
  const set = new Set(hexes.map((hex) => hex.toLowerCase()))
  return palette.filter((color) => set.has(color.hex.toLowerCase())).map((color) => color.id)
}
