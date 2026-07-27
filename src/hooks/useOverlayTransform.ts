import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { HotkeyAction } from '../lib/hotkeys'

export type OverlayTransform = {
  x: number
  y: number
  scale: number
  rotation: number
  rotateX: number
  rotateY: number
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

export const DEFAULT_TRANSFORM: OverlayTransform = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  rotateX: 0,
  rotateY: 0,
}

export function buildOverlayCssTransform(transform: OverlayTransform, flipped: boolean) {
  const scaleX = transform.scale * (flipped ? -1 : 1)
  return [
    'translate(-50%, -50%)',
    `translate(${transform.x}px, ${transform.y}px)`,
    'perspective(900px)',
    `rotateX(${transform.rotateX}deg)`,
    `rotateY(${transform.rotateY}deg)`,
    `rotateZ(${transform.rotation}deg)`,
    `scale(${scaleX}, ${transform.scale})`,
  ].join(' ')
}

export function useOverlayTransform(locked: boolean, dragMode: HotkeyAction = 'pan') {
  const [transform, setTransform] = useState<OverlayTransform>(DEFAULT_TRANSFORM)
  const transformRef = useRef(transform)
  const dragModeRef = useRef(dragMode)
  const pointersRef = useRef<Map<number, PointerSample>>(new Map())
  const gestureRef = useRef<{
    mode: 'drag' | 'pinch'
    tool: HotkeyAction
    startTransform: OverlayTransform
    startPointer?: PointerSample
    startDistance?: number
    startAngle?: number
    startMid?: { x: number; y: number }
  } | null>(null)

  useEffect(() => {
    transformRef.current = transform
  }, [transform])

  useEffect(() => {
    dragModeRef.current = dragMode
  }, [dragMode])

  const reset = () => setTransform(DEFAULT_TRANSFORM)

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
        mode: 'drag',
        tool: dragModeRef.current,
        startTransform: { ...transformRef.current },
        startPointer: sample,
      }
    } else if (pointers.length >= 2) {
      const [a, b] = pointers
      gestureRef.current = {
        mode: 'pinch',
        tool: 'pan',
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

    if (gesture.mode === 'drag' && pointers.length === 1 && gesture.startPointer) {
      const p = pointers[0]
      const dx = p.x - gesture.startPointer.x
      const dy = p.y - gesture.startPointer.y
      const start = gesture.startTransform

      if (gesture.tool === 'rotate') {
        setTransform({
          ...start,
          rotation: start.rotation + dx * 0.35,
        })
        return
      }

      if (gesture.tool === 'scale') {
        const next = start.scale * (1 - dy * 0.004)
        setTransform({
          ...start,
          scale: Math.min(6, Math.max(0.2, next)),
        })
        return
      }

      if (gesture.tool === 'tilt') {
        setTransform({
          ...start,
          rotateY: Math.min(60, Math.max(-60, start.rotateY + dx * 0.2)),
          rotateX: Math.min(60, Math.max(-60, start.rotateX - dy * 0.2)),
        })
        return
      }

      setTransform({
        ...start,
        x: start.x + dx,
        y: start.y + dy,
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
        ...gesture.startTransform,
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
        mode: 'drag',
        tool: dragModeRef.current,
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
