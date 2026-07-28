import { useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { formatMeasureCm } from '../lib/arPlane'
import { cn } from './studio/studioUi'

type Point = { x: number; y: number }

type ArRulerOverlayProps = {
  enabled: boolean
  /** Stage pixels per centimetre on the locked paper plane */
  pxPerCm: number
  stageRef: RefObject<HTMLElement | null>
}

/**
 * Drag a segment on the stage; length shown in cm from AR marker scale.
 */
export function ArRulerOverlay({ enabled, pxPerCm, stageRef }: ArRulerOverlayProps) {
  const [segment, setSegment] = useState<{ a: Point; b: Point } | null>(null)
  const dragRef = useRef<{ pointerId: number; a: Point } | null>(null)

  if (!enabled || !(pxPerCm > 0.5)) return null

  const toLocal = (clientX: number, clientY: number): Point | null => {
    const stage = stageRef.current
    if (!stage) return null
    const r = stage.getBoundingClientRect()
    return {
      x: clientX - r.left,
      y: clientY - r.top,
    }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const a = toLocal(event.clientX, event.clientY)
    if (!a) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, a }
    setSegment({ a, b: a })
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const b = toLocal(event.clientX, event.clientY)
    if (!b) return
    event.preventDefault()
    setSegment({ a: drag.a, b })
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }
    const b = toLocal(event.clientX, event.clientY)
    dragRef.current = null
    if (!b) return
    const len = Math.hypot(b.x - drag.a.x, b.y - drag.a.y)
    if (len < 6) {
      setSegment(null)
      return
    }
    setSegment({ a: drag.a, b })
  }

  const lengthCm =
    segment && pxPerCm > 0
      ? Math.hypot(segment.b.x - segment.a.x, segment.b.y - segment.a.y) / pxPerCm
      : null
  const label = formatMeasureCm(lengthCm)

  const mid = segment
    ? {
        x: (segment.a.x + segment.b.x) / 2,
        y: (segment.a.y + segment.b.y) / 2,
      }
    : null

  return (
    <div
      className={cn(
        'absolute inset-0 z-[18] touch-none',
        enabled ? 'cursor-crosshair' : 'pointer-events-none',
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      aria-label="Линейка: потяни отрезок"
    >
      {segment && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <line
            x1={segment.a.x}
            y1={segment.a.y}
            x2={segment.b.x}
            y2={segment.b.y}
            stroke="color-mix(in srgb, var(--accent) 85%, white)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle cx={segment.a.x} cy={segment.a.y} r={5} fill="var(--accent)" />
          <circle cx={segment.b.x} cy={segment.b.y} r={5} fill="var(--accent)" />
        </svg>
      )}
      {mid && label && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--glass-border)] bg-[var(--chip-solid)] px-2.5 py-1 text-[0.78rem] font-bold tabular-nums text-[var(--fg-strong)] shadow-[var(--shadow-glass)]"
          style={{ left: mid.x, top: mid.y - 18 }}
        >
          {label}
        </div>
      )}
      {!segment && (
        <p className="pointer-events-none absolute bottom-[calc(var(--safe-bottom)+5.5rem)] left-1/2 z-[1] w-[min(18rem,calc(100%-2rem))] -translate-x-1/2 rounded-full border border-[var(--glass-border-soft)] bg-[var(--chip-solid)] px-3 py-1.5 text-center text-[0.72rem] text-[var(--fg-muted)] min-[960px]:bottom-[calc(var(--safe-bottom)+1.5rem)]">
          Потяни линию — длина в см по маркеру
        </p>
      )}
    </div>
  )
}
