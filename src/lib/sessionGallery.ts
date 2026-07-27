export type SessionShotKind = 'start' | 'progress' | 'end'

export type SessionShot = {
  id: string
  createdAt: number
  kind: SessionShotKind
  /** Compressed JPEG data URL */
  dataUrl: string
}

const STORAGE_KEY = 'eyepaint-session-gallery-v1'
const MAX_SHOTS = 10

export function loadSessionShots(): SessionShot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<SessionShot>[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item) =>
          !!item &&
          typeof item.id === 'string' &&
          typeof item.dataUrl === 'string' &&
          typeof item.createdAt === 'number',
      )
      .map((item) => ({
        id: item.id as string,
        createdAt: item.createdAt as number,
        kind: (item.kind as SessionShotKind) || 'progress',
        dataUrl: item.dataUrl as string,
      }))
      .slice(0, MAX_SHOTS)
  } catch {
    return []
  }
}

export function saveSessionShots(shots: SessionShot[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shots.slice(0, MAX_SHOTS)))
}

export function createSessionShot(kind: SessionShotKind, dataUrl: string): SessionShot {
  return {
    id: `shot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
    kind,
    dataUrl,
  }
}

export async function fileToCompressedDataUrl(
  file: File,
  maxSide = 720,
  quality = 0.72,
): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Canvas недоступен')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export const SHOT_KIND_LABEL: Record<SessionShotKind, string> = {
  start: 'До',
  progress: 'Прогресс',
  end: 'После',
}
