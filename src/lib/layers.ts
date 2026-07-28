import {
  DEFAULT_TRANSFORM,
  type OverlayTransform,
} from '../hooks/useOverlayTransform'
import type { GuideShape } from './guideShapes'

export type RefLayerKind = 'primary' | 'aux' | 'guide'

export type RefLayer = {
  id: string
  url: string
  name: string
  opacity: number
  visible: boolean
  /** Independent pose for this reference / guide */
  transform: OverlayTransform
  flipped: boolean
  /** Primary comes from Studio props; aux are local blobs; guide holds shapes */
  kind: RefLayerKind
  /** Only for kind === 'guide' — local 0..100 shapes */
  shapes?: GuideShape[]
}

/** Soft ceiling — без жёсткого UX-лимита в 3; страхует от OOM */
export const MAX_LAYERS = 48

export function createPrimaryLayer(url: string): RefLayer {
  return {
    id: 'primary',
    url,
    name: 'Основной',
    opacity: 1,
    visible: true,
    transform: { ...DEFAULT_TRANSFORM },
    flipped: false,
    kind: 'primary',
  }
}

export function createAuxLayer(url: string, name: string, existing: RefLayer[]): RefLayer | null {
  if (existing.length >= MAX_LAYERS) return null
  const offset = (existing.length % 12) * 24
  return {
    id: `aux-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    url,
    name,
    opacity: 0.55,
    visible: true,
    transform: {
      ...DEFAULT_TRANSFORM,
      x: offset,
      y: offset,
    },
    flipped: false,
    kind: 'aux',
  }
}

export function nextGuideName(layers: RefLayer[]) {
  const count = layers.filter((layer) => layer.kind === 'guide').length + 1
  return `Гид ${count}`
}

export function createGuideLayer(
  existing: RefLayer[],
  opts?: { shapes?: GuideShape[]; opacity?: number; name?: string },
): RefLayer | null {
  if (existing.length >= MAX_LAYERS) return null
  return {
    id: `guide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    url: '',
    name: opts?.name ?? nextGuideName(existing),
    opacity: opts?.opacity ?? 0.7,
    visible: true,
    transform: { ...DEFAULT_TRANSFORM },
    flipped: false,
    kind: 'guide',
    shapes: opts?.shapes ? [...opts.shapes] : [],
  }
}

/** One shared guide layer — create if missing, return updated stack + id. */
export function ensureGuideLayer(
  layers: RefLayer[],
  opts?: { shapes?: GuideShape[]; opacity?: number },
): { layers: RefLayer[]; guideId: string } {
  const existing = layers.find((layer) => layer.kind === 'guide')
  if (existing) {
    if (!opts) return { layers, guideId: existing.id }
    return {
      guideId: existing.id,
      layers: layers.map((layer) =>
        layer.id === existing.id
          ? {
              ...layer,
              shapes: opts.shapes ? [...opts.shapes] : layer.shapes,
              opacity: opts.opacity ?? layer.opacity,
              visible: true,
            }
          : layer,
      ),
    }
  }
  const created = createGuideLayer(layers, opts)
  if (!created) {
    const fallback = layers[layers.length - 1]
    return { layers, guideId: fallback?.id ?? 'primary' }
  }
  return { layers: [...layers, created], guideId: created.id }
}

export function findGuideLayer(layers: RefLayer[]) {
  return layers.find((layer) => layer.kind === 'guide') ?? null
}

export function patchGuideShapes(
  layers: RefLayer[],
  guideId: string,
  shapes: GuideShape[] | ((prev: GuideShape[]) => GuideShape[]),
): RefLayer[] {
  return layers.map((layer) => {
    if (layer.id !== guideId || layer.kind !== 'guide') return layer
    const prev = layer.shapes ?? []
    const next = typeof shapes === 'function' ? shapes(prev) : shapes
    return { ...layer, shapes: next, visible: true }
  })
}

export function nextAuxName(layers: RefLayer[]) {
  const count = layers.filter((layer) => layer.kind === 'aux').length + 1
  return `Слой ${count}`
}

export function syncPrimaryUrl(layers: RefLayer[], url: string): RefLayer[] {
  const hasPrimary = layers.some((layer) => layer.kind === 'primary')
  if (!hasPrimary) return [createPrimaryLayer(url), ...layers]
  return layers.map((layer) =>
    layer.kind === 'primary' ? { ...layer, url } : layer,
  )
}

export function revokeAuxUrls(layers: RefLayer[], keepIds?: Set<string>) {
  for (const layer of layers) {
    if (layer.kind !== 'aux') continue
    if (keepIds?.has(layer.id)) continue
    if (layer.url.startsWith('blob:')) URL.revokeObjectURL(layer.url)
  }
}

export function canAddAux(layers: RefLayer[]) {
  return layers.length < MAX_LAYERS
}

export function patchLayerTransform(
  layers: RefLayer[],
  layerId: string,
  update: OverlayTransform | ((prev: OverlayTransform) => OverlayTransform),
): RefLayer[] {
  return layers.map((layer) => {
    if (layer.id !== layerId) return layer
    const next = typeof update === 'function' ? update(layer.transform) : update
    return { ...layer, transform: next }
  })
}

/** Paint order: index 0 = farthest back, last = frontmost (closest to viewer). */
export type LayerStackAction = 'front' | 'forward' | 'backward' | 'back'

export function applyLayerStackAction(
  layers: RefLayer[],
  id: string,
  action: LayerStackAction,
): RefLayer[] {
  const index = layers.findIndex((layer) => layer.id === id)
  if (index < 0) return layers
  if (layers.length < 2) return layers

  const next = [...layers]
  const [item] = next.splice(index, 1)

  switch (action) {
    case 'front':
      next.push(item)
      break
    case 'back':
      next.unshift(item)
      break
    case 'forward': {
      const insertAt = Math.min(index + 1, next.length)
      next.splice(insertAt, 0, item)
      break
    }
    case 'backward': {
      const insertAt = Math.max(index - 1, 0)
      next.splice(insertAt, 0, item)
      break
    }
  }

  return next
}

/**
 * Reorder by dragging in the UI list where the top row is frontmost
 * (display = reverse of paint order).
 */
export function reorderLayersInDisplayOrder(
  layers: RefLayer[],
  fromId: string,
  toId: string,
): RefLayer[] {
  if (fromId === toId) return layers
  const display = [...layers].reverse()
  const from = display.findIndex((layer) => layer.id === fromId)
  const to = display.findIndex((layer) => layer.id === toId)
  if (from < 0 || to < 0) return layers
  const nextDisplay = [...display]
  const [item] = nextDisplay.splice(from, 1)
  nextDisplay.splice(to, 0, item)
  return nextDisplay.reverse()
}

export function layerStackLabel(layers: RefLayer[], id: string): string {
  const index = layers.findIndex((layer) => layer.id === id)
  if (index < 0) return ''
  if (layers.length === 1) return 'единственный'
  if (index === layers.length - 1) return 'передний'
  if (index === 0) return 'задний'
  return `${layers.length - index} спереди`
}

export function isGuideLayer(layer: RefLayer) {
  return layer.kind === 'guide'
}

export function guideLayerIsOn(layers: RefLayer[]) {
  const guide = findGuideLayer(layers)
  return Boolean(guide?.visible && (guide.shapes?.length ?? 0) > 0)
}
