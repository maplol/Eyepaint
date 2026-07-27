export type FeatureFlags = {
  multiLayers: boolean
  brushMask: boolean
  sessionGallery: boolean
  lessons: boolean
  lightTheme: boolean
}

const STORAGE_KEY = 'eyepaint-flags-v1'

export const DEFAULT_FLAGS: FeatureFlags = {
  multiLayers: true,
  brushMask: true,
  sessionGallery: true,
  lessons: true,
  lightTheme: true,
}

export function loadFlags(): FeatureFlags {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_FLAGS }
    const parsed = JSON.parse(raw) as Partial<FeatureFlags>
    return {
      multiLayers: parsed.multiLayers ?? DEFAULT_FLAGS.multiLayers,
      brushMask: parsed.brushMask ?? DEFAULT_FLAGS.brushMask,
      sessionGallery: parsed.sessionGallery ?? DEFAULT_FLAGS.sessionGallery,
      lessons: parsed.lessons ?? DEFAULT_FLAGS.lessons,
      lightTheme: parsed.lightTheme ?? DEFAULT_FLAGS.lightTheme,
    }
  } catch {
    return { ...DEFAULT_FLAGS }
  }
}

export function saveFlags(flags: FeatureFlags) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
}

export function isFlagEnabled(key: keyof FeatureFlags) {
  return loadFlags()[key]
}
