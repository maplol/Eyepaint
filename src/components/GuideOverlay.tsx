import type { GuideKind } from '../lib/studioTools'
import { shapesForPreset, type GuidePresetKind } from '../lib/guideShapes'
import { GuideShapesSvg } from './GuideShapesSvg'

type GuideOverlayProps = {
  kind: GuideKind
  opacity: number
}

/** Legacy screen-fixed overlay when flag guideLayers is off. */
export function GuideOverlay({ kind, opacity }: GuideOverlayProps) {
  if (kind === 'none' || opacity <= 0.02) return null
  if (kind === 'perspective') {
    return (
      <GuideShapesSvg
        shapes={shapesForPreset('perspective')}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ opacity }}
      />
    )
  }

  return (
    <GuideShapesSvg
      shapes={shapesForPreset(kind as GuidePresetKind)}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity }}
    />
  )
}
