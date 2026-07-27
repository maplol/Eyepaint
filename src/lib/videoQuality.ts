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

export type OutboundVideoInfo = {
  width: number
  height: number
  fps: number | null
  bitrateKbps: number | null
}

const BASE_PRESETS: Array<Omit<QualityPreset, 'maxBitrate'>> = [
  { id: 'low', label: 'Низкое · 480p', width: 854, height: 480, frameRate: 24 },
  { id: 'medium', label: 'Среднее · 720p', width: 1280, height: 720, frameRate: 30 },
  { id: 'high', label: 'Высокое · 1080p', width: 1920, height: 1080, frameRate: 30 },
  { id: 'quad', label: '2K · 1440p', width: 2560, height: 1440, frameRate: 30 },
  { id: 'uhd', label: '4K · 2160p', width: 3840, height: 2160, frameRate: 30 },
]

const STORAGE_KEY = 'eyepaint-video-quality-v2'
const CAPS_CACHE_KEY = 'eyepaint-camera-caps-v3'

/** Detail-heavy tracing needs much more bpp than a typical video call. */
export function estimateBitrate(width: number, height: number, frameRate: number) {
  const pixels = width * height
  const bitsPerPixel =
    pixels >= 3840 * 2160 ? 0.22 : pixels >= 2560 * 1440 ? 0.2 : pixels >= 1920 * 1080 ? 0.18 : 0.16
  const raw = Math.round(pixels * frameRate * bitsPerPixel)

  // Floors so WebRTC does not silently scaleResolutionDownBy under load.
  if (pixels >= 3840 * 2160) return Math.max(raw, 32_000_000)
  if (pixels >= 2560 * 1440) return Math.max(raw, 18_000_000)
  if (pixels >= 1920 * 1080) return Math.max(raw, 10_000_000)
  if (pixels >= 1280 * 720) return Math.max(raw, 4_500_000)
  return Math.max(raw, 2_000_000)
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

export function describeOutbound(info: OutboundVideoInfo | null) {
  if (!info?.width || !info?.height) return null
  const fps = info.fps ? ` @ ${Math.round(info.fps)}fps` : ''
  const br = info.bitrateKbps ? ` · ~${Math.round(info.bitrateKbps / 1000)} Мбит/с` : ''
  return `${info.width}×${info.height}${fps}${br}`
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

function preferHardwareCodecs(pc: RTCPeerConnection) {
  const capabilities = RTCRtpSender.getCapabilities?.('video')
  if (!capabilities?.codecs?.length) return

  const ranked = [...capabilities.codecs].sort((a, b) => {
    const score = (codec: RTCRtpCodec) => {
      const mime = codec.mimeType.toLowerCase()
      // Samsung / Chrome Android: H264 HW usually sustains higher res than VP8.
      if (mime.includes('h264')) return 0
      if (mime.includes('vp9')) return 1
      if (mime.includes('av1')) return 2
      if (mime.includes('vp8')) return 3
      return 4
    }
    return score(a) - score(b)
  })

  for (const transceiver of pc.getTransceivers()) {
    if (transceiver.sender.track?.kind !== 'video' && transceiver.receiver.track?.kind !== 'video') {
      continue
    }
    try {
      transceiver.setCodecPreferences?.(ranked)
    } catch {
      /* optional */
    }
  }
}

export async function applySenderBitrate(
  peers: Record<string, RTCPeerConnection>,
  maxBitrate: number,
  maxFramerate = 30,
) {
  await Promise.all(
    Object.values(peers).map(async (pc) => {
      preferHardwareCodecs(pc)

      await Promise.all(
        pc.getSenders().map(async (sender) => {
          if (sender.track?.kind !== 'video') return
          try {
            sender.track.contentHint = 'detail'
          } catch {
            /* optional */
          }
          try {
            const params = sender.getParameters()
            if (!params.encodings || params.encodings.length === 0) {
              params.encodings = [{}]
            }
            // Single full-res encoding — drop simulcast layers that steal bitrate.
            const primary = params.encodings[0] ?? {}
            params.encodings = [
              {
                ...primary,
                active: true,
                maxBitrate,
                scaleResolutionDownBy: 1,
                maxFramerate,
                priority: 'high',
                networkPriority: 'high',
              },
            ]
            ;(
              params as RTCRtpSendParameters & { degradationPreference?: string }
            ).degradationPreference = 'maintain-resolution'
            await sender.setParameters(params)
          } catch {
            /* some browsers reject mid-flight updates */
          }
        }),
      )
    }),
  )
}

/** Force senders to re-bind the (possibly re-constrained) local track. */
export async function refreshSenderTracks(
  peers: Record<string, RTCPeerConnection>,
  stream: MediaStream | null,
) {
  const track = stream?.getVideoTracks()[0]
  if (!track) return
  await Promise.all(
    Object.values(peers).flatMap((pc) =>
      pc.getSenders().map(async (sender) => {
        if (sender.track?.kind !== 'video' && sender.track != null) return
        try {
          await sender.replaceTrack(track)
        } catch {
          /* ignore */
        }
      }),
    ),
  )
}

const outboundByteCursor = new WeakMap<RTCPeerConnection, { bytes: number; at: number }>()

export async function readOutboundVideoInfo(
  peers: Record<string, RTCPeerConnection>,
): Promise<OutboundVideoInfo | null> {
  for (const pc of Object.values(peers)) {
    try {
      const stats = await pc.getStats()
      for (const report of stats.values()) {
        const row = report as RTCStats & {
          type: string
          kind?: string
          frameWidth?: number
          frameHeight?: number
          framesPerSecond?: number
          bytesSent?: number
          timestamp?: number
        }
        if (row.type !== 'outbound-rtp' || row.kind !== 'video') continue
        if (!row.frameWidth || !row.frameHeight) continue

        let bitrateKbps: number | null = null
        if (typeof row.bytesSent === 'number' && typeof row.timestamp === 'number') {
          const prev = outboundByteCursor.get(pc)
          if (prev) {
            const dt = (row.timestamp - prev.at) / 1000
            if (dt > 0.2) {
              bitrateKbps = ((row.bytesSent - prev.bytes) * 8) / dt / 1000
            }
          }
          outboundByteCursor.set(pc, { bytes: row.bytesSent, at: row.timestamp })
        }

        return {
          width: row.frameWidth,
          height: row.frameHeight,
          fps: row.framesPerSecond ?? null,
          bitrateKbps,
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null
}
