export type HotkeyAction = 'pan' | 'rotate' | 'scale' | 'tilt'

export type HotkeyMap = Record<HotkeyAction, string>

export const DEFAULT_HOTKEYS: HotkeyMap = {
  pan: ' ',
  rotate: 'r',
  scale: 's',
  tilt: 't',
}

export const HOTKEY_LABELS: Record<HotkeyAction, string> = {
  pan: 'Двигать (зажми + тяни)',
  rotate: 'Поворот (зажми + тяни)',
  scale: 'Масштаб (зажми + тяни)',
  tilt: 'Наклон / проекция (зажми + тяни)',
}

const STORAGE_KEY = 'eyepaint-hotkeys-v1'

export function normalizeHotkey(code: string) {
  if (code === 'Space' || code === ' ') return ' '
  return code.length === 1 ? code.toLowerCase() : code
}

export function formatHotkey(key: string) {
  if (key === ' ') return 'Space'
  return key.length === 1 ? key.toUpperCase() : key
}

export function loadHotkeys(): HotkeyMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_HOTKEYS }
    const parsed = JSON.parse(raw) as Partial<HotkeyMap>
    return {
      pan: typeof parsed.pan === 'string' ? normalizeHotkey(parsed.pan) : DEFAULT_HOTKEYS.pan,
      rotate:
        typeof parsed.rotate === 'string' ? normalizeHotkey(parsed.rotate) : DEFAULT_HOTKEYS.rotate,
      scale:
        typeof parsed.scale === 'string' ? normalizeHotkey(parsed.scale) : DEFAULT_HOTKEYS.scale,
      tilt: typeof parsed.tilt === 'string' ? normalizeHotkey(parsed.tilt) : DEFAULT_HOTKEYS.tilt,
    }
  } catch {
    return { ...DEFAULT_HOTKEYS }
  }
}

export function saveHotkeys(map: HotkeyMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function resolveDragMode(
  heldKeys: Set<string>,
  hotkeys: HotkeyMap,
): HotkeyAction {
  if (heldKeys.has(hotkeys.rotate)) return 'rotate'
  if (heldKeys.has(hotkeys.scale)) return 'scale'
  if (heldKeys.has(hotkeys.tilt)) return 'tilt'
  if (heldKeys.has(hotkeys.pan)) return 'pan'
  return 'pan'
}
