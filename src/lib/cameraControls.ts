/** Best-effort camera controls for Android Chrome / Samsung Internet. */

export type CameraControlCaps = {
  torch: boolean
  exposureCompensation: boolean
  exposureMin: number
  exposureMax: number
  focusPoint: boolean
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function readRange(value: unknown): { min: number; max: number } | null {
  const row = asRecord(value)
  if (!row) return null
  const min = typeof row.min === 'number' ? row.min : null
  const max = typeof row.max === 'number' ? row.max : null
  if (min == null || max == null) return null
  return { min, max }
}

export function readCameraControlCaps(track: MediaStreamTrack | null): CameraControlCaps {
  const empty: CameraControlCaps = {
    torch: false,
    exposureCompensation: false,
    exposureMin: -2,
    exposureMax: 2,
    focusPoint: false,
  }
  if (!track || typeof track.getCapabilities !== 'function') return empty
  try {
    const caps = asRecord(track.getCapabilities())
    if (!caps) return empty
    const exposure = readRange(caps.exposureCompensation)
    return {
      torch: Boolean(caps.torch),
      exposureCompensation: Boolean(exposure),
      exposureMin: exposure?.min ?? -2,
      exposureMax: exposure?.max ?? 2,
      focusPoint: 'pointsOfInterest' in caps || 'focusMode' in caps,
    }
  } catch {
    return empty
  }
}

export async function setTorch(track: MediaStreamTrack, value: boolean) {
  try {
    await track.applyConstraints({
      advanced: [{ torch: value } as MediaTrackConstraintSet],
    })
    return true
  } catch {
    return false
  }
}

export async function setExposureCompensation(track: MediaStreamTrack, value: number) {
  try {
    await track.applyConstraints({
      advanced: [{ exposureCompensation: value } as MediaTrackConstraintSet],
    })
    return true
  } catch {
    return false
  }
}

/** Normalized point 0..1 in video element coordinates. */
export async function setFocusPoint(
  track: MediaStreamTrack,
  x: number,
  y: number,
) {
  const nx = Math.min(1, Math.max(0, x))
  const ny = Math.min(1, Math.max(0, y))
  try {
    await track.applyConstraints({
      advanced: [
        {
          focusMode: 'manual',
          pointsOfInterest: [{ x: nx, y: ny }],
        } as MediaTrackConstraintSet,
      ],
    })
    return true
  } catch {
    try {
      await track.applyConstraints({
        advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
      })
    } catch {
      /* ignore */
    }
    return false
  }
}

/**
 * Builds a MediaStream that repeatedly paints a frozen bitmap.
 * Call stop() to release the animation loop.
 */
export function createFrozenStream(
  video: HTMLVideoElement,
): { stream: MediaStream; stop: () => void } | null {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, width, height)

  const stream = canvas.captureStream(8)
  let alive = true
  const tick = () => {
    if (!alive) return
    ctx.drawImage(canvas, 0, 0)
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)

  return {
    stream,
    stop: () => {
      alive = false
      stream.getTracks().forEach((track) => track.stop())
    },
  }
}
