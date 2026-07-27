import { useEffect, useRef, useState } from 'react'
import {
  qualityConstraints,
  QUALITY_PRESETS,
  type VideoQuality,
} from '../lib/videoQuality'

type CameraState = {
  ready: boolean
  error: string | null
  stream: MediaStream | null
}

export function useCamera(
  enabled: boolean,
  externalStream: MediaStream | null = null,
  quality: VideoQuality = 'high',
) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [state, setState] = useState<CameraState>({
    ready: false,
    error: null,
    stream: null,
  })

  useEffect(() => {
    if (externalStream) {
      setState({ ready: true, error: null, stream: externalStream })
      return () => {
        setState((prev) =>
          prev.stream === externalStream
            ? { ready: false, error: null, stream: null }
            : prev,
        )
      }
    }

    if (!enabled) {
      setState({ ready: false, error: null, stream: null })
      return
    }

    let active = true
    let mediaStream: MediaStream | null = null

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (active) {
          setState({
            ready: false,
            error: 'Камера недоступна в этом браузере. Нужен HTTPS или localhost.',
            stream: null,
          })
        }
        return
      }

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: qualityConstraints(quality),
        })

        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop())
          return
        }

        for (const track of mediaStream.getVideoTracks()) {
          try {
            track.contentHint = 'detail'
          } catch {
            /* optional */
          }
        }

        setState({ ready: true, error: null, stream: mediaStream })
      } catch {
        // Fallback without exact constraints if device rejects ideals.
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: 'environment' } },
          })
          if (!active) {
            mediaStream.getTracks().forEach((track) => track.stop())
            return
          }
          setState({ ready: true, error: null, stream: mediaStream })
        } catch {
          if (active) {
            setState({
              ready: false,
              error: 'Не удалось открыть камеру. Разреши доступ и обнови страницу.',
              stream: null,
            })
          }
        }
      }
    }

    void start()

    return () => {
      active = false
      mediaStream?.getTracks().forEach((track) => track.stop())
      setState({ ready: false, error: null, stream: null })
    }
  }, [enabled, externalStream, quality])

  useEffect(() => {
    const video = videoRef.current
    const stream = state.stream
    if (!video) return

    if (!stream) {
      video.srcObject = null
      return
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream
      void video.play().catch(() => undefined)
    }
  }, [state.stream])

  return { videoRef, ...state, qualityPreset: QUALITY_PRESETS[quality] }
}
