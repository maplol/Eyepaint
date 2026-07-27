import type { OverlayTransform } from '../hooks/useOverlayTransform'
import { DEFAULT_TRANSFORM } from '../hooks/useOverlayTransform'

export type SavedPose = {
  id: string
  name: string
  createdAt: number
  transform: OverlayTransform
  flipped: boolean
  opacity: number
}

const STORAGE_KEY = 'eyepaint-poses-v3'
const MAX_POSES = 24

function normalizeTransform(raw: Partial<OverlayTransform> | undefined): OverlayTransform {
  return {
    x: typeof raw?.x === 'number' ? raw.x : 0,
    y: typeof raw?.y === 'number' ? raw.y : 0,
    scale: typeof raw?.scale === 'number' ? raw.scale : 1,
    rotation: typeof raw?.rotation === 'number' ? raw.rotation : 0,
    rotateX: typeof raw?.rotateX === 'number' ? raw.rotateX : 0,
    rotateY: typeof raw?.rotateY === 'number' ? raw.rotateY : 0,
  }
}

export function loadPoses(): SavedPose[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem('eyepaint-poses-v2') ??
      localStorage.getItem('eyepaint-poses-v1')
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<SavedPose>[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (pose) =>
          !!pose &&
          typeof pose.id === 'string' &&
          typeof pose.name === 'string' &&
          !!pose.transform,
      )
      .map((pose) => ({
        id: pose.id as string,
        name: pose.name as string,
        createdAt: typeof pose.createdAt === 'number' ? pose.createdAt : Date.now(),
        transform: normalizeTransform(pose.transform),
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
    transform: { ...DEFAULT_TRANSFORM, ...transform },
    flipped,
    opacity,
  }
}

export function formatPoseStats(pose: Pick<SavedPose, 'transform' | 'flipped' | 'opacity'>) {
  return {
    scale: `${Math.round(pose.transform.scale * 100)}%`,
    rotation: `${Math.round(pose.transform.rotation)}°`,
    tiltX: `${Math.round(pose.transform.rotateX)}°`,
    tiltY: `${Math.round(pose.transform.rotateY)}°`,
    x: `${Math.round(pose.transform.x)}px`,
    y: `${Math.round(pose.transform.y)}px`,
    opacity: `${Math.round(pose.opacity * 100)}%`,
    flipped: pose.flipped ? 'да' : 'нет',
  }
}
