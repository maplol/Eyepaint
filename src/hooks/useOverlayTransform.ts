import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

export type OverlayTransform = {
  x: number
  y: number
  scale: number
  rotation: number
}

type PointerSample = {
  id: number
  x: number
  y: number
}

function distance(a: PointerSample, b: PointerSample) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function angle(a: PointerSample, b: PointerSample) {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
}

function midpoint(a: PointerSample, b: PointerSample) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

const DEFAULT: OverlayTransform = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
}

export function useOverlayTransform(locked: boolean) {
  const [transform, setTransform] = useState<OverlayTransform>(DEFAULT)
  const transformRef = useRef(transform)
  const pointersRef = useRef<Map<number, PointerSample>>(new Map())
  const gestureRef = useRef<{
    mode: 'pan' | 'pinch'
    startTransform: OverlayTransform
    startPointer?: PointerSample
    startDistance?: number
    startAngle?: number
    startMid?: { x: number; y: number }
  } | null>(null)

  useEffect(() => {
    transformRef.current = transform
  }, [transform])

  const reset = () => setTransform(DEFAULT)

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (locked) return
    event.currentTarget.setPointerCapture(event.pointerId)

    const sample: PointerSample = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
    pointersRef.current.set(event.pointerId, sample)

    const pointers = [...pointersRef.current.values()]
    if (pointers.length === 1) {
      gestureRef.current = {
        mode: 'pan',
        startTransform: { ...transformRef.current },
        startPointer: sample,
      }
    } else if (pointers.length >= 2) {
      const [a, b] = pointers
      gestureRef.current = {
        mode: 'pinch',
        startTransform: { ...transformRef.current },
        startDistance: distance(a, b),
        startAngle: angle(a, b),
        startMid: midpoint(a, b),
      }
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (locked || !pointersRef.current.has(event.pointerId)) return

    pointersRef.current.set(event.pointerId, {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    })

    const gesture = gestureRef.current
    if (!gesture) return

    const pointers = [...pointersRef.current.values()]

    if (gesture.mode === 'pan' && pointers.length === 1 && gesture.startPointer) {
      const p = pointers[0]
      setTransform({
        ...gesture.startTransform,
        x: gesture.startTransform.x + (p.x - gesture.startPointer.x),
        y: gesture.startTransform.y + (p.y - gesture.startPointer.y),
      })
      return
    }

    if (gesture.mode === 'pinch' && pointers.length >= 2) {
      const [a, b] = pointers
      const nextDistance = distance(a, b)
      const nextAngle = angle(a, b)
      const nextMid = midpoint(a, b)
      const scaleFactor =
        gesture.startDistance && gesture.startDistance > 0
          ? nextDistance / gesture.startDistance
          : 1

      setTransform({
        x:
          gesture.startTransform.x +
          (nextMid.x - (gesture.startMid?.x ?? nextMid.x)),
        y:
          gesture.startTransform.y +
          (nextMid.y - (gesture.startMid?.y ?? nextMid.y)),
        scale: Math.min(6, Math.max(0.2, gesture.startTransform.scale * scaleFactor)),
        rotation:
          gesture.startTransform.rotation +
          (nextAngle - (gesture.startAngle ?? nextAngle)),
      })
    }
  }

  const endPointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.delete(event.pointerId)
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        /* already released */
      }
    }

    const pointers = [...pointersRef.current.values()]
    if (pointers.length === 0) {
      gestureRef.current = null
      return
    }

    if (pointers.length === 1) {
      gestureRef.current = {
        mode: 'pan',
        startTransform: { ...transformRef.current },
        startPointer: pointers[0],
      }
    }
  }

  const onWheel = (event: WheelEvent) => {
    if (locked) return
    event.preventDefault()
    const delta = event.deltaY > 0 ? 0.92 : 1.08
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(6, Math.max(0.2, prev.scale * delta)),
    }))
  }

  return {
    transform,
    setTransform,
    reset,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
    },
    onWheel,
  }
}
