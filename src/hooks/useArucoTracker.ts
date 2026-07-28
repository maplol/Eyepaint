import { useEffect, useRef, useState, type RefObject } from 'react'
import {
  AR_MARKER,
  averageMarkerSidePx,
  estimateDistanceCm,
  markerSizeMmForId,
  orderCornersTLTRBRBL,
  planeLockFromCorners,
  pxPerCmOnPlane,
  type ArPhase,
  type PlaneLock,
  type Point2,
} from '../lib/arPlane'

type WorkerMarker = {
  id: number
  hammingDistance: number
  corners: Point2[]
}

export type ArMetricSample = {
  distanceCm: number | null
  pxPerCm: number
  markerVisible: boolean
}

type TrackerOptions = {
  enabled: boolean
  phase: ArPhase
  videoRef: RefObject<HTMLVideoElement | null>
  stageRef: RefObject<HTMLElement | null>
  onLock: (plane: PlaneLock) => void
  /** Live metric while marker is visible (hunting or locked). */
  onMetric?: (sample: ArMetricSample) => void
}

/**
 * Hunts ArUco while hunting; keeps reading frames while locked for live distance.
 */
export function useArucoTracker({
  enabled,
  phase,
  videoRef,
  stageRef,
  onLock,
  onMetric,
}: TrackerOptions) {
  const [ready, setReady] = useState(false)
  const [lastHit, setLastHit] = useState<WorkerMarker | null>(null)
  const [stableCount, setStableCount] = useState(0)
  const [liveDistanceCm, setLiveDistanceCm] = useState<number | null>(null)
  const [markerVisible, setMarkerVisible] = useState(false)
  const workerRef = useRef<Worker | null>(null)
  const onLockRef = useRef(onLock)
  const onMetricRef = useRef(onMetric)
  const pendingRef = useRef(false)
  const stableRef = useRef<{ id: number; corners: Point2[] }[]>([])
  const detectSizeRef = useRef({ w: 1, h: 1 })
  const smoothDistRef = useRef<number | null>(null)
  const missRef = useRef(0)
  const frameSkipRef = useRef(0)

  useEffect(() => {
    onLockRef.current = onLock
  }, [onLock])

  useEffect(() => {
    onMetricRef.current = onMetric
  }, [onMetric])

  useEffect(() => {
    if (!enabled) {
      setLastHit(null)
      setLiveDistanceCm(null)
      setMarkerVisible(false)
      smoothDistRef.current = null
      return
    }
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
    const tracking = phase === 'hunting' || phase === 'locked'
    if (!enabled || !tracking || !ready) return

    let raf = 0
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const video = videoRef.current
      const worker = workerRef.current
      if (!video || !worker || !ctx || pendingRef.current) return
      if (video.readyState < 2 || video.videoWidth < 16) return

      // Locked: every 2nd frame is enough for live cm readout
      if (phase === 'locked') {
        frameSkipRef.current = (frameSkipRef.current + 1) % 2
        if (frameSkipRef.current !== 0) return
      }

      const maxW = phase === 'locked' ? 360 : 480
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
    if (phase === 'hunting') {
      // keep stable logic below
    } else {
      stableRef.current = []
      setStableCount(0)
    }

    if (!lastHit || lastHit.corners.length < 4) {
      missRef.current += 1
      if (missRef.current >= 8) {
        setMarkerVisible(false)
        // keep last smoothed distance briefly; clear after more misses
        if (missRef.current >= 45) {
          setLiveDistanceCm(null)
          smoothDistRef.current = null
          onMetricRef.current?.({
            distanceCm: null,
            pxPerCm: 0,
            markerVisible: false,
          })
        }
      }
      if (phase === 'hunting') {
        stableRef.current = []
        setStableCount(0)
      }
      return
    }

    missRef.current = 0
    const corners = lastHit.corners.slice(0, 4) as [Point2, Point2, Point2, Point2]
    const orderedDetect = orderCornersTLTRBRBL(corners)
    const detectSidePx = averageMarkerSidePx(orderedDetect)
    const detectW = detectSizeRef.current.w
    const markerSizeMm = markerSizeMmForId(lastHit.id)
    const rawDist = estimateDistanceCm({
      markerSidePx: detectSidePx,
      imageWidthPx: detectW,
      markerSizeMm,
    })

    if (rawDist != null) {
      const prev = smoothDistRef.current
      const smoothed = prev == null ? rawDist : prev * 0.72 + rawDist * 0.28
      smoothDistRef.current = smoothed
      setLiveDistanceCm(smoothed)
      setMarkerVisible(true)
    }

    const stage = stageRef.current
    const video = videoRef.current
    let pxPerCm = 0
    if (stage && video && video.videoWidth > 0) {
      const stageRect = stage.getBoundingClientRect()
      const { w: detectW2, h: detectH } = detectSizeRef.current
      const mapped = mapVideoCornersToStage(
        corners,
        video.videoWidth,
        video.videoHeight,
        stageRect.width,
        stageRect.height,
        detectW2,
        detectH,
      )
      const orderedStage = orderCornersTLTRBRBL(mapped)
      pxPerCm = pxPerCmOnPlane(averageMarkerSidePx(orderedStage), markerSizeMm)
    }

    onMetricRef.current?.({
      distanceCm: smoothDistRef.current,
      pxPerCm,
      markerVisible: true,
    })

    if (phase !== 'hunting') return

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
    if (!stage || !video || video.videoWidth < 1) return

    const stageRect = stage.getBoundingClientRect()
    const { w: detectW2, h: detectH } = detectSizeRef.current
    const mapped = mapVideoCornersToStage(
      corners,
      video.videoWidth,
      video.videoHeight,
      stageRect.width,
      stageRect.height,
      detectW2,
      detectH,
    )

    const quality = Math.max(0.55, 1 - (lastHit.hammingDistance ?? 0) * 0.15)
    if (quality < AR_MARKER.minQuality) return

    const plane = planeLockFromCorners(mapped, stageRect, lastHit.id, quality, 1, {
      detectSidePx,
      imageWidthPx: detectW2,
    })
    if (smoothDistRef.current != null) {
      plane.distanceCm = smoothDistRef.current
    }
    stableRef.current = []
    setStableCount(0)
    onLockRef.current(plane)
  }, [lastHit, phase, stageRef, videoRef])

  const progress =
    phase === 'hunting' ? Math.min(1, stableCount / AR_MARKER.stableFramesNeeded) : 0

  return {
    ready,
    lastHit,
    progress,
    stableCount,
    liveDistanceCm,
    markerVisible,
  }
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
