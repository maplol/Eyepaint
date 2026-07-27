import type { OverlayTransform } from '../hooks/useOverlayTransform'

export type SavedPose = {
  id: string
  name: string
  createdAt: number
  transform: OverlayTransform
  flipped: boolean
  opacity: number
}

const STORAGE_KEY = 'eyepaint-poses-v2'
const MAX_POSES = 24

export function loadPoses(): SavedPose[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('eyepaint-poses-v1')
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<SavedPose>[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (pose): pose is SavedPose =>
          !!pose &&
          typeof pose.id === 'string' &&
          typeof pose.name === 'string' &&
          !!pose.transform &&
          typeof pose.transform.x === 'number' &&
          typeof pose.transform.y === 'number' &&
          typeof pose.transform.scale === 'number' &&
          typeof pose.transform.rotation === 'number',
      )
      .map((pose) => ({
        ...pose,
        flipped: Boolean(pose.flipped),
        opacity:
          typeof pose.opacity === 'number' && pose.opacity > 0 && pose.opacity <= 1
            ? pose.opacity
            : 0.45,
      }))
  } catch {
    return []
  }
}

export function savePoses(poses: SavedPose[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(poses.slice(0, MAX_POSES)))
}

export function nextPoseName(poses: SavedPose[]) {
  const used = new Set(
    poses
      .map((pose) => pose.name.match(/^Поза\s+(\d+)$/i)?.[1])
      .filter(Boolean)
      .map(Number),
  )
  let index = 1
  while (used.has(index)) index += 1
  return `Поза ${index}`
}

export function createPose(
  transform: OverlayTransform,
  flipped: boolean,
  opacity: number,
  poses: SavedPose[],
): SavedPose {
  return {
    id: `pose-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: nextPoseName(poses),
    createdAt: Date.now(),
    transform: { ...transform },
    flipped,
    opacity,
  }
}

export function formatPoseStats(pose: Pick<SavedPose, 'transform' | 'flipped' | 'opacity'>) {
  const scalePercent = Math.round(pose.transform.scale * 100)
  const rotation = Math.round(pose.transform.rotation)
  const x = Math.round(pose.transform.x)
  const y = Math.round(pose.transform.y)
  return {
    scale: `${scalePercent}%`,
    rotation: `${rotation}°`,
    x: `${x}px`,
    y: `${y}px`,
    opacity: `${Math.round(pose.opacity * 100)}%`,
    flipped: pose.flipped ? 'да' : 'нет',
  }
}
