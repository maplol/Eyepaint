export type StudioAtmosphere = 'dark' | 'light'

const STORAGE_KEY = 'eyepaint-atmosphere-v1'

export function loadAtmosphere(): StudioAtmosphere {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark') return raw
  } catch {
    /* ignore */
  }
  return 'dark'
}

export function saveAtmosphere(value: StudioAtmosphere) {
  localStorage.setItem(STORAGE_KEY, value)
}
