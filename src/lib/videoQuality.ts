export type VideoQuality = 'low' | 'medium' | 'high' | 'quad' | 'uhd' | 'max'

export type QualityPreset = {
  id: VideoQuality
  label: string
  width: number
  height: number
  frameRate: number
  maxBitrate: number
}

export type CameraCapabilitiesInfo = {
  deviceId: string
  label: string
  maxWidth: number
  maxHeight: number
  maxFrameRate: number
}

const BASE_PRESETS: Array<Omit<QualityPreset, 'maxBitrate'> & { maxBitrate?: number }> = [
  { id: 'low', label: 'Низкое · 480p', width: 854, height: 480, frameRate: 24 },
  { id: 'medium', label: 'Среднее · 720p', width: 1280, height: 720, frameRate: 30 },
  { id: 'high', label: 'Высокое · 1080p', width: 1920, height: 1080, frameRate: 30 },
  { id: 'quad', label: 'Quad HD · 1440p', width: 2560, height: 1440, frameRate: 30 },
  { id: 'uhd', label: '4K · 2160p', width: 3840, height: 2160, frameRate: 30 },
]

const STORAGE_KEY = 'eyepaint-video-quality-v2'
const CAPS_CACHE_KEY = 'eyepaint-camera-caps-v2'

export function estimateBitrate(width: number, height: number, frameRate: number) {
  const pixels = width * height
  // Rough bpp target for detail-heavy tracing streams.
  const bitsPerPixel = pixels >= 3840 * 2160 ? 0.12 : pixels >= 1920 * 1080 ? 0.14 : 0.16
  return Math.round(pixels * frameRate * bitsPerPixel)
}

export function withBitrate(preset: Omit<QualityPreset, 'maxBitrate'>): QualityPreset {
  return {
    ...preset,
    maxBitrate: estimateBitrate(preset.width, preset.height, preset.frameRate),
  }
}

/** Fallback map before probing finishes */
export const QUALITY_PRESETS: Record<VideoQuality, QualityPreset> = {
  low: withBitrate(BASE_PRESETS[0]!),
  medium: withBitrate(BASE_PRESETS[1]!),
  high: withBitrate(BASE_PRESETS[2]!),
  quad: withBitrate(BASE_PRESETS[3]!),
  uhd: withBitrate(BASE_PRESETS[4]!),
  max: withBitrate({
    id: 'max',
    label: 'Максимум устройства',
    width: 1920,
    height: 1080,
    frameRate: 30,
  }),
}

export function loadVideoQuality(): VideoQuality {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('eyepaint-video-quality-v1')
    if (!raw) return 'max'
    if (raw === 'ultra') return 'quad'
    if (raw in QUALITY_PRESETS) return raw as VideoQuality
  } catch {
    /* ignore */
  }
  return 'max'
}

export function saveVideoQuality(quality: VideoQuality) {
  localStorage.setItem(STORAGE_KEY, quality)
}

export function describeTrackSettings(stream: MediaStream | null) {
  const track = stream?.getVideoTracks()[0]
  if (!track) return null
  const settings = track.getSettings()
  const width = settings.width ?? 0
  const height = settings.height ?? 0
  const fps = settings.frameRate ? Math.round(settings.frameRate) : null
  if (!width || !height) return null
  return fps ? `${width}×${height} @ ${fps}fps` : `${width}×${height}`
}

function readULongMax(value: number | { max?: number } | undefined, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value && typeof value === 'object' && typeof value.max === 'number') return value.max
  return fallback
}

export function readTrackCapabilities(track: MediaStreamTrack): Omit<CameraCapabilitiesInfo, 'deviceId' | 'label'> {
  const caps = track.getCapabilities?.() as
    | {
        width?: number | { max?: number }
        height?: number | { max?: number }
        frameRate?: number | { max?: number }
      }
    | undefined

  return {
    maxWidth: readULongMax(caps?.width, 1920),
    maxHeight: readULongMax(caps?.height, 1080),
    maxFrameRate: Math.min(60, readULongMax(caps?.frameRate, 30)),
  }
}

function isLikelyBackCamera(label: string) {
  const value = label.toLowerCase()
  // Empty labels (before/without permission text) — include and score by resolution.
  if (!value) return true
  if (/(front|user|face|selfie|передн)/i.test(value)) return false
  return true
}

export function buildQualityOptions(caps: CameraCapabilitiesInfo | null): QualityPreset[] {
  const maxW = caps?.maxWidth ?? 1920
  const maxH = caps?.maxHeight ?? 1080
  const maxFps = Math.min(30, caps?.maxFrameRate ?? 30)

  const options = BASE_PRESETS.filter(
    (preset) => preset.width <= maxW + 8 && preset.height <= maxH + 8,
  ).map((preset) =>
    withBitrate({
      ...preset,
      frameRate: Math.min(preset.frameRate, maxFps),
    }),
  )

  const maxPreset = withBitrate({
    id: 'max',
    label: caps
      ? `Максимум · ${caps.maxWidth}×${caps.maxHeight}`
      : 'Максимум устройства',
    width: maxW,
    height: maxH,
    frameRate: maxFps,
  })

  const withoutDuplicateMax = options.filter(
    (preset) => !(preset.width === maxPreset.width && preset.height === maxPreset.height),
  )

  return [...withoutDuplicateMax, maxPreset]
}

export function resolveQualityPreset(
  quality: VideoQuality,
  caps: CameraCapabilitiesInfo | null,
): QualityPreset {
  const options = buildQualityOptions(caps)
  return options.find((item) => item.id === quality) ?? options[options.length - 1]!
}

export function qualityConstraints(
  quality: VideoQuality,
  caps: CameraCapabilitiesInfo | null,
  deviceId?: string,
): MediaTrackConstraints {
  const preset = resolveQualityPreset(quality, caps)
  const constraints: MediaTrackConstraints = {
    width: { ideal: preset.width },
    height: { ideal: preset.height },
    frameRate: { ideal: preset.frameRate, max: Math.max(preset.frameRate, 30) },
  }

  if (deviceId) {
    constraints.deviceId = { exact: deviceId }
  } else {
    constraints.facingMode = { ideal: 'environment' }
  }

  if (quality === 'max' && caps) {
    constraints.width = { ideal: caps.maxWidth }
    constraints.height = { ideal: caps.maxHeight }
    constraints.frameRate = {
      ideal: Math.min(30, caps.maxFrameRate),
      max: Math.min(60, caps.maxFrameRate),
    }
  }

  return constraints
}

export function loadCachedCapabilities(): CameraCapabilitiesInfo | null {
  try {
    const raw = sessionStorage.getItem(CAPS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CameraCapabilitiesInfo
    if (!parsed?.deviceId || !parsed.maxWidth || !parsed.maxHeight) return null
    return parsed
  } catch {
    return null
  }
}

export function saveCachedCapabilities(caps: CameraCapabilitiesInfo) {
  try {
    sessionStorage.setItem(CAPS_CACHE_KEY, JSON.stringify(caps))
  } catch {
    /* ignore */
  }
}

/**
 * Finds the rear camera with the highest native capture ceiling.
 * Flagships (e.g. S25+) often expose multiple sensors — we pick the strongest.
 */
export async function probeBestCameraCapabilities(): Promise<CameraCapabilitiesInfo | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null

  const cached = loadCachedCapabilities()
  if (cached) return cached

  // Warm permission so device labels become available.
  try {
    const warm = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    })
    warm.getTracks().forEach((track) => track.stop())
  } catch {
    return null
  }

  const devices = await navigator.mediaDevices.enumerateDevices()
  const candidates = devices
    .filter((device) => device.kind === 'videoinput')
    .filter((device) => isLikelyBackCamera(device.label))
    .slice(0, 6)

  if (candidates.length === 0) {
    candidates.push(
      ...devices.filter((device) => device.kind === 'videoinput').slice(0, 3),
    )
  }

  let best: CameraCapabilitiesInfo | null = null

  for (const device of candidates) {
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          deviceId: { exact: device.deviceId },
          width: { ideal: 8192 },
          height: { ideal: 8192 },
          frameRate: { ideal: 30 },
        },
      })
      const track = stream.getVideoTracks()[0]
      if (!track) continue
      const caps = readTrackCapabilities(track)
      const settings = track.getSettings()
      // Some browsers under-report getCapabilities; actual settings after a
      // high ideal request are a better floor (flagships like S25+).
      const maxWidth = Math.max(caps.maxWidth, settings.width ?? 0)
      const maxHeight = Math.max(caps.maxHeight, settings.height ?? 0)
      const maxFrameRate = Math.max(
        caps.maxFrameRate,
        settings.frameRate ? Math.round(settings.frameRate) : 0,
        30,
      )
      const score = maxWidth * maxHeight
      const bestScore = best ? best.maxWidth * best.maxHeight : 0
      if (!best || score > bestScore) {
        best = {
          deviceId: device.deviceId,
          label: device.label || 'Камера',
          maxWidth,
          maxHeight,
          maxFrameRate: Math.min(60, maxFrameRate),
        }
      }
    } catch {
      /* try next sensor */
    } finally {
      stream?.getTracks().forEach((track) => track.stop())
    }
  }

  if (best) saveCachedCapabilities(best)
  return best
}

export async function applySenderBitrate(
  peers: Record<string, RTCPeerConnection>,
  maxBitrate: number,
) {
  await Promise.all(
    Object.values(peers).flatMap((pc) =>
      pc.getSenders().map(async (sender) => {
        if (sender.track?.kind !== 'video') return
        try {
          const params = sender.getParameters()
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}]
          }
          params.encodings = params.encodings.map((encoding) => ({
            ...encoding,
            maxBitrate,
            scaleResolutionDownBy: 1,
            maxFramerate: encoding.maxFramerate,
          }))
          if ('degradationPreference' in params) {
            ;(
              params as RTCRtpSendParameters & { degradationPreference?: string }
            ).degradationPreference = 'maintain-resolution'
          }
          await sender.setParameters(params)
        } catch {
          /* some browsers reject mid-flight updates */
        }
      }),
    ),
  )
}
