export type VideoQuality = 'low' | 'medium' | 'high' | 'ultra'

export type QualityPreset = {
  id: VideoQuality
  label: string
  width: number
  height: number
  frameRate: number
  maxBitrate: number
}

export const QUALITY_PRESETS: Record<VideoQuality, QualityPreset> = {
  low: {
    id: 'low',
    label: 'Низкое · 480p',
    width: 854,
    height: 480,
    frameRate: 20,
    maxBitrate: 1_200_000,
  },
  medium: {
    id: 'medium',
    label: 'Среднее · 720p',
    width: 1280,
    height: 720,
    frameRate: 24,
    maxBitrate: 3_500_000,
  },
  high: {
    id: 'high',
    label: 'Высокое · 1080p',
    width: 1920,
    height: 1080,
    frameRate: 30,
    maxBitrate: 8_000_000,
  },
  ultra: {
    id: 'ultra',
    label: 'Максимум · 1440p',
    width: 2560,
    height: 1440,
    frameRate: 30,
    maxBitrate: 14_000_000,
  },
}

const STORAGE_KEY = 'eyepaint-video-quality-v1'

export function loadVideoQuality(): VideoQuality {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && raw in QUALITY_PRESETS) return raw as VideoQuality
  } catch {
    /* ignore */
  }
  return 'high'
}

export function saveVideoQuality(quality: VideoQuality) {
  localStorage.setItem(STORAGE_KEY, quality)
}

export function qualityConstraints(quality: VideoQuality): MediaTrackConstraints {
  const preset = QUALITY_PRESETS[quality]
  return {
    facingMode: { ideal: 'environment' },
    width: { ideal: preset.width, min: Math.min(640, preset.width) },
    height: { ideal: preset.height, min: Math.min(480, preset.height) },
    frameRate: { ideal: preset.frameRate, min: 15 },
  }
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
            ;(params as RTCRtpSendParameters & { degradationPreference?: string }).degradationPreference =
              'maintain-resolution'
          }
          await sender.setParameters(params)
        } catch {
          /* some browsers reject mid-flight updates */
        }
      }),
    ),
  )
}
