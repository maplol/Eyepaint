export type RefLayer = {
  id: string
  url: string
  name: string
  opacity: number
  visible: boolean
  /** Primary comes from Studio props; aux are local blobs */
  kind: 'primary' | 'aux'
}

const MAX_LAYERS = 3

export function createPrimaryLayer(url: string): RefLayer {
  return {
    id: 'primary',
    url,
    name: 'Основной',
    opacity: 1,
    visible: true,
    kind: 'primary',
  }
}

export function createAuxLayer(url: string, name: string, existing: RefLayer[]): RefLayer | null {
  if (existing.length >= MAX_LAYERS) return null
  return {
    id: `aux-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    url,
    name,
    opacity: 0.55,
    visible: true,
    kind: 'aux',
  }
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
