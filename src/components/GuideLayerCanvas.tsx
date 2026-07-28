import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  draftShapeFromDrag,
  hitTestGuideShape,
  type GuideDrawTool,
  type GuidePoint,
  type GuideShape,
} from '../lib/guideShapes'
import { GuideShapesSvg } from './GuideShapesSvg'
import { cn } from './studio/studioUi'

type GuideLayerCanvasProps = {
  shapes: GuideShape[]
  interactive: boolean
  drawTool: GuideDrawTool
  selectedId: string | null
  onSelect: (id: string | null) => void
  onCommitShape: (shape: GuideShape) => void
  className?: string
}

function clientToLocal(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): GuidePoint {
  const rect = svg.getBoundingClientRect()
  const x = ((clientX - rect.left) / Math.max(1, rect.width)) * 100
  const y = ((clientY - rect.top) / Math.max(1, rect.height)) * 100
  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  }
}

export function GuideLayerCanvas({
  shapes,
  interactive,
  drawTool,
  selectedId,
  onSelect,
  onCommitShape,
  className,
}: GuideLayerCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [draft, setDraft] = useState<GuideShape | null>(null)
  const dragRef = useRef<{
    pointerId: number
    start: GuidePoint
    tool: Exclude<GuideDrawTool, 'select'>
  } | null>(null)

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactive) return
    const svg = svgRef.current
    if (!svg) return
    event.stopPropagation()
    event.preventDefault()
    const p = clientToLocal(svg, event.clientX, event.clientY)

    if (drawTool === 'select') {
      let hit: string | null = null
      for (let i = shapes.length - 1; i >= 0; i -= 1) {
        const shape = shapes[i]!
        if (hitTestGuideShape(shape, p)) {
          hit = shape.id
          break
        }
      }
      onSelect(hit)
      return
    }

    svg.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, start: p, tool: drawTool }
    setDraft(draftShapeFromDrag(drawTool, p, p))
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    const svg = svgRef.current
    if (!drag || !svg || drag.pointerId !== event.pointerId) return
    event.stopPropagation()
    const p = clientToLocal(svg, event.clientX, event.clientY)
    setDraft(draftShapeFromDrag(drag.tool, drag.start, p))
  }

  const endDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    const svg = svgRef.current
    if (!drag || !svg || drag.pointerId !== event.pointerId) return
    event.stopPropagation()
    try {
      svg.releasePointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }
    dragRef.current = null
    const p = clientToLocal(svg, event.clientX, event.clientY)
    const shape = draftShapeFromDrag(drag.tool, drag.start, p)
    setDraft(null)
    const size =
      shape.type === 'line'
        ? Math.hypot(shape.b.x - shape.a.x, shape.b.y - shape.a.y)
        : shape.type === 'rect'
          ? Math.hypot(shape.w, shape.h)
          : shape.type === 'ellipse'
            ? Math.max(shape.rx, shape.ry)
            : shape.r
    if (size < 1.2) return
    onCommitShape(shape)
    onSelect(shape.id)
  }

  return (
    <GuideShapesSvg
      svgRef={svgRef}
      shapes={shapes}
      selectedId={selectedId}
      draft={draft}
      className={cn(
        'aspect-square w-full overflow-visible drop-shadow-[0_6px_16px_rgba(0,0,0,0.35)]',
        interactive ? 'touch-none cursor-crosshair' : 'pointer-events-none',
        className,
      )}
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? endDrag : undefined}
      onPointerCancel={interactive ? endDrag : undefined}
    />
  )
}
