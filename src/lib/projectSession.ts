import type { BrushMaskSettings } from './brushMask'
import { DEFAULT_BRUSH_MASK } from './brushMask'
import type { ColorFilterMode, ColorPrecision } from './colors'
import type { FeatureFlags } from './flags'
import { DEFAULT_FLAGS } from './flags'
import type { HotkeyMap } from './hotkeys'
import { DEFAULT_HOTKEYS } from './hotkeys'
import type { RefLayer } from './layers'
import type { SavedPose } from './poses'
import type {
  CalcModeSettings,
  GuideSettings,
  LoupeSettings,
} from './studioTools'
import { DEFAULT_CALC_MODE, DEFAULT_GUIDES, DEFAULT_LOUPE } from './studioTools'
import type { StudioAtmosphere } from './theme'
import type { OverlayTransform } from '../hooks/useOverlayTransform'
import { DEFAULT_TRANSFORM } from '../hooks/useOverlayTransform'

export const PROJECT_FILE_KIND = 'eyepaint-project' as const
export const PROJECT_FILE_VERSION = 1 as const
export const PROJECT_ACCEPT = '.eyepaint.json,application/json,.json'
export const AUTOSAVE_META_KEY = 'eyepaint-autosave-meta-v1'

export type ProjectLayerSnapshot = {
  id: string
  name: string
  opacity: number
  visible: boolean
  transform: OverlayTransform
  flipped: boolean
  kind: 'primary' | 'aux'
  imageDataUrl: string
}

export type ProjectSnapshotV1 = {
  version: typeof PROJECT_FILE_VERSION
  kind: typeof PROJECT_FILE_KIND
  savedAt: number
  primaryImageDataUrl: string
  layers: ProjectLayerSnapshot[]
  activeLayerId: string
  opacity: number
  calcMode: CalcModeSettings
  guides: GuideSettings
  loupe: LoupeSettings
  atmosphere: StudioAtmosphere
  locked: boolean
  selectedColorIds: string[]
  colorMode: ColorFilterMode
  colorPrecision: ColorPrecision
  matchTolerance: number
  paletteSort: 'dominance' | 'hue'
  brush: BrushMaskSettings
  poses: SavedPose[]
  flags: FeatureFlags
  hotkeys: HotkeyMap
}

export type HydratedProject = {
  imageUrl: string
  layers: RefLayer[]
  activeLayerId: string
  opacity: number
  calcMode: CalcModeSettings
  guides: GuideSettings
  loupe: LoupeSettings
  atmosphere: StudioAtmosphere
  locked: boolean
  selectedColorIds: string[]
  colorMode: ColorFilterMode
  colorPrecision: ColorPrecision
  matchTolerance: number
  paletteSort: 'dominance' | 'hue'
  brush: BrushMaskSettings
  poses: SavedPose[]
  flags: FeatureFlags
  hotkeys: HotkeyMap
  savedAt: number
}

export type AutosaveMeta = {
  savedAt: number
  layerCount: number
}

export async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url
  const response = await fetch(url)
  if (!response.ok) throw new Error('Не удалось прочитать изображение')
  const blob = await response.blob()
  return blobToDataUrl(blob)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Не удалось закодировать изображение'))
    reader.readAsDataURL(blob)
  })
}

function dataUrlToObjectUrl(dataUrl: string): string {
  if (!dataUrl.startsWith('data:')) return dataUrl
  const [header, body] = dataUrl.split(',')
  if (!header || body == null) return dataUrl
  const mime = header.match(/data:([^;]+)/)?.[1] ?? 'image/png'
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}

function normalizeTransform(raw: Partial<OverlayTransform> | undefined): OverlayTransform {
  return {
    x: typeof raw?.x === 'number' ? raw.x : DEFAULT_TRANSFORM.x,
    y: typeof raw?.y === 'number' ? raw.y : DEFAULT_TRANSFORM.y,
    scale: typeof raw?.scale === 'number' ? raw.scale : DEFAULT_TRANSFORM.scale,
    rotation: typeof raw?.rotation === 'number' ? raw.rotation : DEFAULT_TRANSFORM.rotation,
    rotateX: typeof raw?.rotateX === 'number' ? raw.rotateX : DEFAULT_TRANSFORM.rotateX,
    rotateY: typeof raw?.rotateY === 'number' ? raw.rotateY : DEFAULT_TRANSFORM.rotateY,
  }
}

export type StudioSnapshotInput = {
  layers: RefLayer[]
  activeLayerId: string
  opacity: number
  calcMode: CalcModeSettings
  guides: GuideSettings
  loupe: LoupeSettings
  atmosphere: StudioAtmosphere
  locked: boolean
  selectedColorIds: string[]
  colorMode: ColorFilterMode
  colorPrecision: ColorPrecision
  matchTolerance: number
  paletteSort: 'dominance' | 'hue'
  brush: BrushMaskSettings
  poses: SavedPose[]
  flags: FeatureFlags
  hotkeys: HotkeyMap
  primaryFallbackUrl: string
}

export async function buildProjectSnapshot(
  input: StudioSnapshotInput,
): Promise<ProjectSnapshotV1> {
  const layerSnaps: ProjectLayerSnapshot[] = []
  for (const layer of input.layers) {
    const imageDataUrl = await urlToDataUrl(layer.url || input.primaryFallbackUrl)
    layerSnaps.push({
      id: layer.id,
      name: layer.name,
      opacity: layer.opacity,
      visible: layer.visible,
      transform: { ...layer.transform },
      flipped: layer.flipped,
      kind: layer.kind,
      imageDataUrl,
    })
  }

  const primary =
    layerSnaps.find((layer) => layer.kind === 'primary') ?? layerSnaps[0]
  if (!primary) throw new Error('Нет слоёв для сохранения')

  return {
    version: PROJECT_FILE_VERSION,
    kind: PROJECT_FILE_KIND,
    savedAt: Date.now(),
    primaryImageDataUrl: primary.imageDataUrl,
    layers: layerSnaps,
    activeLayerId: input.activeLayerId,
    opacity: input.opacity,
    calcMode: { ...input.calcMode },
    guides: { ...input.guides },
    loupe: { ...input.loupe },
    atmosphere: input.atmosphere,
    locked: input.locked,
    selectedColorIds: [...input.selectedColorIds],
    colorMode: input.colorMode,
    colorPrecision: input.colorPrecision,
    matchTolerance: input.matchTolerance,
    paletteSort: input.paletteSort,
    brush: {
      ...input.brush,
      editing: false,
    },
    poses: input.poses.map((pose) => ({ ...pose, transform: { ...pose.transform } })),
    flags: { ...input.flags },
    hotkeys: { ...input.hotkeys },
  }
}

export function parseProjectSnapshot(raw: unknown): ProjectSnapshotV1 {
  if (!raw || typeof raw !== 'object') throw new Error('Файл повреждён')
  const data = raw as Partial<ProjectSnapshotV1>
  if (data.kind !== PROJECT_FILE_KIND) throw new Error('Это не файл проекта EYEPAINT')
  if (data.version !== PROJECT_FILE_VERSION) throw new Error('Неизвестная версия файла')
  if (!Array.isArray(data.layers) || data.layers.length === 0) {
    throw new Error('В файле нет слоёв')
  }
  if (typeof data.primaryImageDataUrl !== 'string') {
    throw new Error('Нет основного изображения')
  }

  const layers: ProjectLayerSnapshot[] = data.layers.map((layer, index) => {
    if (!layer || typeof layer !== 'object') throw new Error(`Слой #${index + 1} битый`)
    if (typeof layer.imageDataUrl !== 'string') {
      throw new Error(`У слоя #${index + 1} нет картинки`)
    }
    return {
      id: typeof layer.id === 'string' ? layer.id : `layer-${index}`,
      name: typeof layer.name === 'string' ? layer.name : `Слой ${index + 1}`,
      opacity: typeof layer.opacity === 'number' ? layer.opacity : 1,
      visible: layer.visible !== false,
      transform: normalizeTransform(layer.transform),
      flipped: Boolean(layer.flipped),
      kind: layer.kind === 'aux' ? 'aux' : 'primary',
      imageDataUrl: layer.imageDataUrl,
    }
  })

  return {
    version: PROJECT_FILE_VERSION,
    kind: PROJECT_FILE_KIND,
    savedAt: typeof data.savedAt === 'number' ? data.savedAt : Date.now(),
    primaryImageDataUrl: data.primaryImageDataUrl,
    layers,
    activeLayerId:
      typeof data.activeLayerId === 'string' ? data.activeLayerId : layers[0]?.id ?? 'primary',
    opacity: typeof data.opacity === 'number' ? data.opacity : 0.45,
    calcMode: {
      enabled: Boolean(data.calcMode?.enabled),
      strength:
        typeof data.calcMode?.strength === 'number'
          ? data.calcMode.strength
          : DEFAULT_CALC_MODE.strength,
    },
    guides: {
      kind: data.guides?.kind ?? DEFAULT_GUIDES.kind,
      opacity:
        typeof data.guides?.opacity === 'number' ? data.guides.opacity : DEFAULT_GUIDES.opacity,
    },
    loupe: {
      enabled: Boolean(data.loupe?.enabled),
      size: typeof data.loupe?.size === 'number' ? data.loupe.size : DEFAULT_LOUPE.size,
      zoom: typeof data.loupe?.zoom === 'number' ? data.loupe.zoom : DEFAULT_LOUPE.zoom,
    },
    atmosphere: data.atmosphere === 'light' ? 'light' : 'dark',
    locked: Boolean(data.locked),
    selectedColorIds: Array.isArray(data.selectedColorIds)
      ? data.selectedColorIds.filter((id): id is string => typeof id === 'string')
      : [],
    colorMode:
      data.colorMode === 'gray' || data.colorMode === 'mask' || data.colorMode === 'off'
        ? data.colorMode
        : 'off',
    colorPrecision:
      data.colorPrecision === 1 ||
      data.colorPrecision === 2 ||
      data.colorPrecision === 3 ||
      data.colorPrecision === 4 ||
      data.colorPrecision === 5
        ? data.colorPrecision
        : 3,
    matchTolerance: typeof data.matchTolerance === 'number' ? data.matchTolerance : 28,
    paletteSort: data.paletteSort === 'hue' ? 'hue' : 'dominance',
    brush: {
      ...DEFAULT_BRUSH_MASK,
      ...(data.brush ?? {}),
      editing: false,
      dataUrl: typeof data.brush?.dataUrl === 'string' ? data.brush.dataUrl : null,
    },
    poses: Array.isArray(data.poses) ? (data.poses as SavedPose[]) : [],
    flags: { ...DEFAULT_FLAGS, ...(data.flags ?? {}) },
    hotkeys: { ...DEFAULT_HOTKEYS, ...(data.hotkeys ?? {}) },
  }
}

export function hydrateProjectSnapshot(snapshot: ProjectSnapshotV1): HydratedProject {
  const layers: RefLayer[] = snapshot.layers.map((layer) => ({
    id: layer.id,
    name: layer.name,
    opacity: layer.opacity,
    visible: layer.visible,
    transform: { ...layer.transform },
    flipped: layer.flipped,
    kind: layer.kind,
    url: dataUrlToObjectUrl(layer.imageDataUrl),
  }))

  const primary = layers.find((layer) => layer.kind === 'primary') ?? layers[0]
  return {
    imageUrl: primary?.url ?? dataUrlToObjectUrl(snapshot.primaryImageDataUrl),
    layers,
    activeLayerId: snapshot.activeLayerId,
    opacity: snapshot.opacity,
    calcMode: snapshot.calcMode,
    guides: snapshot.guides,
    loupe: snapshot.loupe,
    atmosphere: snapshot.atmosphere,
    locked: snapshot.locked,
    selectedColorIds: snapshot.selectedColorIds,
    colorMode: snapshot.colorMode,
    colorPrecision: snapshot.colorPrecision,
    matchTolerance: snapshot.matchTolerance,
    paletteSort: snapshot.paletteSort,
    brush: snapshot.brush,
    poses: snapshot.poses,
    flags: snapshot.flags,
    hotkeys: snapshot.hotkeys,
    savedAt: snapshot.savedAt,
  }
}

export async function readProjectFile(file: File): Promise<HydratedProject> {
  const text = await file.text()
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('Файл не JSON')
  }
  return hydrateProjectSnapshot(parseProjectSnapshot(raw))
}

export function downloadProjectSnapshot(snapshot: ProjectSnapshotV1, filename?: string) {
  const stamp = new Date(snapshot.savedAt).toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const name = filename ?? `eyepaint-${stamp}.eyepaint.json`
  const blob = new Blob([JSON.stringify(snapshot)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('eyepaint-sessions-v1', 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('autosave')) {
        db.createObjectStore('autosave')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB недоступен'))
  })
}

export async function writeAutosave(snapshot: ProjectSnapshotV1): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('autosave', 'readwrite')
    tx.objectStore('autosave').put(snapshot, 'current')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Не удалось сохранить автосейв'))
  })
  db.close()
  const meta: AutosaveMeta = {
    savedAt: snapshot.savedAt,
    layerCount: snapshot.layers.length,
  }
  try {
    localStorage.setItem(AUTOSAVE_META_KEY, JSON.stringify(meta))
  } catch {
    /* ignore */
  }
}

export async function readAutosave(): Promise<HydratedProject | null> {
  try {
    const db = await openDb()
    const snapshot = await new Promise<ProjectSnapshotV1 | undefined>((resolve, reject) => {
      const tx = db.transaction('autosave', 'readonly')
      const req = tx.objectStore('autosave').get('current')
      req.onsuccess = () => resolve(req.result as ProjectSnapshotV1 | undefined)
      req.onerror = () => reject(req.error ?? new Error('Не удалось прочитать автосейв'))
    })
    db.close()
    if (!snapshot) return null
    return hydrateProjectSnapshot(parseProjectSnapshot(snapshot))
  } catch {
    return null
  }
}

export async function clearAutosave(): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('autosave', 'readwrite')
      tx.objectStore('autosave').delete('current')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Не удалось очистить автосейв'))
    })
    db.close()
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(AUTOSAVE_META_KEY)
  } catch {
    /* ignore */
  }
}

export function loadAutosaveMeta(): AutosaveMeta | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_META_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AutosaveMeta
    if (typeof parsed.savedAt !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

export function formatAutosaveTime(savedAt: number) {
  try {
    return new Date(savedAt).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'ранее'
  }
}
