import { useEffect, useRef, useState } from 'react'
import {
  describeTrackSettings,
  qualityConstraints,
  QUALITY_PRESETS,
  type VideoQuality,
} from '../lib/videoQuality'

type CameraState = {
  ready: boolean
  error: string | null
  stream: MediaStream | null
  trackInfo: string | null
}

export function useCamera(
  enabled: boolean,
  externalStream: MediaStream | null = null,
  quality: VideoQuality = 'high',
) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<CameraState>({
    ready: false,
    error: null,
    stream: null,
    trackInfo: null,
  })

  // Local camera open/close (stream identity stays stable across quality changes)
  useEffect(() => {
    if (externalStream) {
      streamRef.current = null
      setState({
        ready: true,
        error: null,
        stream: externalStream,
        trackInfo: describeTrackSettings(externalStream),
      })
      return () => {
        setState((prev) =>
          prev.stream === externalStream
            ? { ready: false, error: null, stream: null, trackInfo: null }
            : prev,
        )
      }
    }

    if (!enabled) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setState({ ready: false, error: null, stream: null, trackInfo: null })
      return
    }

    let active = true

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (active) {
          setState({
            ready: false,
            error: 'Камера недоступна в этом браузере. Нужен HTTPS или localhost.',
            stream: null,
            trackInfo: null,
          })
        }
        return
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
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

        streamRef.current = mediaStream
        setState({
          ready: true,
          error: null,
          stream: mediaStream,
          trackInfo: describeTrackSettings(mediaStream),
        })
      } catch {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: 'environment' } },
          })
          if (!active) {
            mediaStream.getTracks().forEach((track) => track.stop())
            return
          }
          streamRef.current = mediaStream
          setState({
            ready: true,
            error: null,
            stream: mediaStream,
            trackInfo: describeTrackSettings(mediaStream),
          })
        } catch {
          if (active) {
            setState({
              ready: false,
              error: 'Не удалось открыть камеру. Разреши доступ и обнови страницу.',
              stream: null,
              trackInfo: null,
            })
          }
        }
      }
    }

    void start()

    return () => {
      active = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    // quality applied separately via applyConstraints to avoid reconnect storms
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, externalStream])

  // Apply quality without tearing down the MediaStream (keeps room connection stable)
  useEffect(() => {
    if (externalStream || !enabled) return
    const stream = streamRef.current
    const track = stream?.getVideoTracks()[0]
    if (!track) return

    let cancelled = false
    void track
      .applyConstraints(qualityConstraints(quality))
      .then(() => {
        if (cancelled) return
        setState((prev) => ({
          ...prev,
          trackInfo: describeTrackSettings(stream),
        }))
      })
      .catch(() => {
        /* device may reject some presets; keep current */
      })

    return () => {
      cancelled = true
    }
  }, [quality, enabled, externalStream])

  useEffect(() => {
    if (!externalStream) return
    setState((prev) => ({
      ...prev,
      trackInfo: describeTrackSettings(externalStream),
    }))
  }, [externalStream])

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
