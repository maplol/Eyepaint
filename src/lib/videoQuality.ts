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
    frameRate: 15,
    maxBitrate: 600_000,
  },
  medium: {
    id: 'medium',
    label: 'Среднее · 720p',
    width: 1280,
    height: 720,
    frameRate: 24,
    maxBitrate: 1_800_000,
  },
  high: {
    id: 'high',
    label: 'Высокое · 1080p',
    width: 1920,
    height: 1080,
    frameRate: 30,
    maxBitrate: 4_000_000,
  },
  ultra: {
    id: 'ultra',
    label: 'Максимум · 1440p',
    width: 2560,
    height: 1440,
    frameRate: 30,
    maxBitrate: 7_000_000,
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
    width: { ideal: preset.width },
    height: { ideal: preset.height },
    frameRate: { ideal: preset.frameRate },
  }
}

export async function applySenderBitrate(
  peers: Record<string, RTCPeerConnection>,
  maxBitrate: number,
) {
  await Promise.all(
    Object.values(peers).flatMap((pc) =>
      pc.getSenders().map(async (sender) => {
        if (sender.track?.kind !== 'video') return
        const params = sender.getParameters()
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}]
        }
        params.encodings = params.encodings.map((encoding) => ({
          ...encoding,
          maxBitrate,
        }))
        try {
          await sender.setParameters(params)
        } catch {
          /* some browsers reject mid-flight updates */
        }
      }),
    ),
  )
}
