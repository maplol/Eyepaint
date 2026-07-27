import type { OverlayTransform } from '../hooks/useOverlayTransform'
import { DEFAULT_TRANSFORM } from '../hooks/useOverlayTransform'

export type SavedPose = {
  id: string
  name: string
  createdAt: number
  transform: OverlayTransform
  flipped: boolean
  opacity: number
  /** Small JPEG/PNG data URL preview */
  thumbnail?: string | null
  /** Optional color selection ids snapshot (best-effort) */
  selectedColorIds?: string[]
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

function normalizePose(pose: Partial<SavedPose>): SavedPose | null {
  if (!pose || typeof pose.id !== 'string' || typeof pose.name !== 'string' || !pose.transform) {
    return null
  }
  return {
    id: pose.id,
    name: pose.name,
    createdAt: typeof pose.createdAt === 'number' ? pose.createdAt : Date.now(),
    transform: normalizeTransform(pose.transform),
    flipped: Boolean(pose.flipped),
    opacity:
      typeof pose.opacity === 'number' && pose.opacity > 0 && pose.opacity <= 1
        ? pose.opacity
        : 0.45,
    thumbnail: typeof pose.thumbnail === 'string' ? pose.thumbnail : null,
    selectedColorIds: Array.isArray(pose.selectedColorIds)
      ? pose.selectedColorIds.filter((id) => typeof id === 'string')
      : undefined,
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
    return parsed.map(normalizePose).filter((pose): pose is SavedPose => !!pose)
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
  extras?: { thumbnail?: string | null; selectedColorIds?: string[] },
): SavedPose {
  return {
    id: `pose-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: nextPoseName(poses),
    createdAt: Date.now(),
    transform: { ...DEFAULT_TRANSFORM, ...transform },
    flipped,
    opacity,
    thumbnail: extras?.thumbnail ?? null,
    selectedColorIds: extras?.selectedColorIds,
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

export async function renderPoseThumbnail(
  imageUrl: string,
  transform: OverlayTransform,
  flipped: boolean,
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const node = new Image()
    node.onload = () => resolve(node)
    node.onerror = () => reject(new Error('Не удалось загрузить превью'))
    node.crossOrigin = 'anonymous'
    node.src = imageUrl
  })

  const size = 96
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas недоступен')

  ctx.fillStyle = '#141a1d'
  ctx.fillRect(0, 0, size, size)
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.rotate((transform.rotation * Math.PI) / 180)
  const zoom = Math.min(2.2, Math.max(0.4, transform.scale)) * 0.85
  ctx.scale(zoom * (flipped ? -1 : 1), zoom)
  const aspect = img.naturalWidth / Math.max(1, img.naturalHeight)
  let drawW = size * 0.9
  let drawH = drawW / aspect
  if (drawH > size * 0.9) {
    drawH = size * 0.9
    drawW = drawH * aspect
  }
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
  ctx.restore()

  return canvas.toDataURL('image/jpeg', 0.82)
}

export function exportPosesJson(poses: SavedPose[]) {
  return JSON.stringify(
    {
      version: 1,
      app: 'eyepaint',
      exportedAt: Date.now(),
      poses,
    },
    null,
    2,
  )
}

export function importPosesJson(raw: string): SavedPose[] {
  const parsed = JSON.parse(raw) as { poses?: Partial<SavedPose>[] } | Partial<SavedPose>[]
  const list = Array.isArray(parsed) ? parsed : parsed.poses
  if (!Array.isArray(list)) throw new Error('Нет массива поз')
  const poses = list.map(normalizePose).filter((pose): pose is SavedPose => !!pose)
  if (poses.length === 0) throw new Error('Пустой импорт')
  return poses
}

export function downloadPosesJson(poses: SavedPose[]) {
  const blob = new Blob([exportPosesJson(poses)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `eyepaint-poses-${Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}
