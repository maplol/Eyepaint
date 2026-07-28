import { useEffect, useRef, useState, type RefObject } from 'react'
import {
  AR_MARKER,
  planeLockFromCorners,
  type ArPhase,
  type PlaneLock,
  type Point2,
} from '../lib/arPlane'

type WorkerMarker = {
  id: number
  hammingDistance: number
  corners: Point2[]
}

type TrackerOptions = {
  enabled: boolean
  phase: ArPhase
  videoRef: RefObject<HTMLVideoElement | null>
  stageRef: RefObject<HTMLElement | null>
  onLock: (plane: PlaneLock) => void
}

/**
 * Hunts for ArUco center marker (ID 0) while phase === 'hunting'.
 * Locks after N stable frames.
 */
export function useArucoTracker({
  enabled,
  phase,
  videoRef,
  stageRef,
  onLock,
}: TrackerOptions) {
  const [ready, setReady] = useState(false)
  const [lastHit, setLastHit] = useState<WorkerMarker | null>(null)
  const [stableCount, setStableCount] = useState(0)
  const workerRef = useRef<Worker | null>(null)
  const onLockRef = useRef(onLock)
  const pendingRef = useRef(false)
  const stableRef = useRef<{ id: number; corners: Point2[] }[]>([])
  const detectSizeRef = useRef({ w: 1, h: 1 })

  useEffect(() => {
    onLockRef.current = onLock
  }, [onLock])

  useEffect(() => {
    if (!enabled) return
    const base = import.meta.env.BASE_URL || '/'
    const worker = new Worker(`${base}vendor/aruco-worker.js`)
    workerRef.current = worker
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as
        | { type: 'ready' }
        | { type: 'error'; message: string }
        | { type: 'markers'; markers: WorkerMarker[] }
      if (data.type === 'ready') {
        setReady(true)
        return
      }
      if (data.type === 'error') {
        console.warn('[aruco]', data.message)
        pendingRef.current = false
        return
      }
      if (data.type === 'markers') {
        pendingRef.current = false
        const center =
          data.markers.find((m) => m.id === AR_MARKER.centerId) ??
          data.markers.find((m) =>
            (AR_MARKER.cornerIds as readonly number[]).includes(m.id),
          ) ??
          null
        setLastHit(center)
      }
    }
    worker.postMessage({ type: 'init', baseUrl: base })
    return () => {
      worker.terminate()
      workerRef.current = null
      setReady(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || phase !== 'hunting' || !ready) return

    let raf = 0
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const video = videoRef.current
      const worker = workerRef.current
      if (!video || !worker || !ctx || pendingRef.current) return
      if (video.readyState < 2 || video.videoWidth < 16) return

      const maxW = 480
      const scale = Math.min(1, maxW / video.videoWidth)
      const w = Math.max(32, Math.round(video.videoWidth * scale))
      const h = Math.max(32, Math.round(video.videoHeight * scale))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      detectSizeRef.current = { w, h }
      ctx.drawImage(video, 0, 0, w, h)
      const imageData = ctx.getImageData(0, 0, w, h)
      pendingRef.current = true
      worker.postMessage(
        { type: 'frame', width: w, height: h, buffer: imageData.data.buffer },
        [imageData.data.buffer],
      )
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enabled, phase, ready, videoRef])

  useEffect(() => {
    if (phase !== 'hunting') {
      stableRef.current = []
      setStableCount(0)
      return
    }
    if (!lastHit || lastHit.corners.length < 4) {
      stableRef.current = []
      setStableCount(0)
      return
    }

    const corners = lastHit.corners.slice(0, 4) as Point2[]
    const prev = stableRef.current
    const last = prev[prev.length - 1]
    const ok =
      !!last &&
      last.id === lastHit.id &&
      corners.every((c, i) => {
        const p = last.corners[i]
        return p && Math.hypot(c.x - p.x, c.y - p.y) < 28
      })

    const next = ok ? [...prev, { id: lastHit.id, corners }] : [{ id: lastHit.id, corners }]
    stableRef.current = next.slice(-AR_MARKER.stableFramesNeeded)
    setStableCount(stableRef.current.length)

    if (stableRef.current.length < AR_MARKER.stableFramesNeeded) return

    const stage = stageRef.current
    const video = videoRef.current
    if (!stage || !video || video.videoWidth < 1) return

    const stageRect = stage.getBoundingClientRect()
    const { w: detectW, h: detectH } = detectSizeRef.current
    const mapped = mapVideoCornersToStage(
      corners as [Point2, Point2, Point2, Point2],
      video.videoWidth,
      video.videoHeight,
      stageRect.width,
      stageRect.height,
      detectW,
      detectH,
    )

    const quality = Math.max(0.55, 1 - (lastHit.hammingDistance ?? 0) * 0.15)
    if (quality < AR_MARKER.minQuality) return

    const plane = planeLockFromCorners(mapped, stageRect, lastHit.id, quality)
    stableRef.current = []
    setStableCount(0)
    onLockRef.current(plane)
  }, [lastHit, phase, stageRef, videoRef])

  const progress =
    phase === 'hunting' ? Math.min(1, stableCount / AR_MARKER.stableFramesNeeded) : 0

  return { ready, lastHit, progress, stableCount }
}

function mapVideoCornersToStage(
  corners: [Point2, Point2, Point2, Point2],
  videoW: number,
  videoH: number,
  stageW: number,
  stageH: number,
  detectW: number,
  detectH: number,
): [Point2, Point2, Point2, Point2] {
  const cover = Math.max(stageW / videoW, stageH / videoH)
  const ox = (stageW - videoW * cover) / 2
  const oy = (stageH - videoH * cover) / 2
  const sx = videoW / detectW
  const sy = videoH / detectH

  return corners.map((c) => ({
    x: ox + c.x * sx * cover,
    y: oy + c.y * sy * cover,
  })) as [Point2, Point2, Point2, Point2]
}
