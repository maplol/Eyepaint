import type { OverlayTransform } from '../hooks/useOverlayTransform'

export type SavedPose = {
  id: string
  name: string
  createdAt: number
  transform: OverlayTransform
  flipped: boolean
}

const STORAGE_KEY = 'eyepaint-poses-v1'

export function loadPoses(): SavedPose[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedPose[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (pose) =>
        pose &&
        typeof pose.id === 'string' &&
        typeof pose.name === 'string' &&
        pose.transform &&
        typeof pose.transform.x === 'number',
    )
  } catch {
    return []
  }
}

export function savePoses(poses: SavedPose[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(poses))
}

export function createPose(
  transform: OverlayTransform,
  flipped: boolean,
  index: number,
): SavedPose {
  return {
    id: `pose-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `Поза ${index}`,
    createdAt: Date.now(),
    transform: { ...transform },
    flipped,
  }
}
