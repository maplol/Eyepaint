import type { CSSProperties, PointerEventHandler, Ref } from 'react'
import type { GuideShape } from '../lib/guideShapes'

type GuideShapesSvgProps = {
  shapes: GuideShape[]
  selectedId?: string | null
  draft?: GuideShape | null
  className?: string
  style?: CSSProperties
  svgRef?: Ref<SVGSVGElement>
  onPointerDown?: PointerEventHandler<SVGSVGElement>
  onPointerMove?: PointerEventHandler<SVGSVGElement>
  onPointerUp?: PointerEventHandler<SVGSVGElement>
  onPointerCancel?: PointerEventHandler<SVGSVGElement>
}

function ShapePath({
  shape,
  selected,
}: {
  shape: GuideShape
  selected?: boolean
}) {
  const stroke = shape.stroke ?? '#ffd9bd'
  const sw = selected ? 0.7 : 0.42
  const common = {
    fill: 'none' as const,
    stroke,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  if (shape.type === 'line') {
    return (
      <line
        x1={shape.a.x}
        y1={shape.a.y}
        x2={shape.b.x}
        y2={shape.b.y}
        {...common}
        strokeDasharray={shape.dash ? '1.4 1' : undefined}
      />
    )
  }
  if (shape.type === 'rect') {
    return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} {...common} />
  }
  if (shape.type === 'ellipse') {
    return (
      <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...common} />
    )
  }
  return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />
}

export function GuideShapesSvg({
  shapes,
  selectedId,
  draft,
  className,
  style,
  svgRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: GuideShapesSvgProps) {
  return (
    <svg
      ref={svgRef}
      className={className}
      style={style}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden={!onPointerDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {shapes.map((shape) => (
        <ShapePath key={shape.id} shape={shape} selected={shape.id === selectedId} />
      ))}
      {draft && <ShapePath shape={draft} selected />}
    </svg>
  )
}
