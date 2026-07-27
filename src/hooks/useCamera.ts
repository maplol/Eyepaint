import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildQualityOptions,
  describeTrackSettings,
  probeBestCameraCapabilities,
  qualityConstraints,
  readTrackCapabilities,
  resolveQualityPreset,
  type CameraCapabilitiesInfo,
  type VideoQuality,
} from '../lib/videoQuality'

type CameraState = {
  ready: boolean
  error: string | null
  stream: MediaStream | null
  trackInfo: string | null
  probing: boolean
  capabilities: CameraCapabilitiesInfo | null
}

export function useCamera(
  enabled: boolean,
  externalStream: MediaStream | null = null,
  quality: VideoQuality = 'max',
) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<CameraState>({
    ready: false,
    error: null,
    stream: null,
    trackInfo: null,
    probing: false,
    capabilities: null,
  })

  const qualityOptions = useMemo(
    () => buildQualityOptions(state.capabilities),
    [state.capabilities],
  )
  const qualityPreset = useMemo(
    () => resolveQualityPreset(quality, state.capabilities),
    [quality, state.capabilities],
  )

  useEffect(() => {
    if (externalStream) {
      streamRef.current = null
      setState({
        ready: true,
        error: null,
        stream: externalStream,
        trackInfo: describeTrackSettings(externalStream),
        probing: false,
        capabilities: null,
      })
      return () => {
        setState((prev) =>
          prev.stream === externalStream
            ? {
                ready: false,
                error: null,
                stream: null,
                trackInfo: null,
                probing: false,
                capabilities: null,
              }
            : prev,
        )
      }
    }

    if (!enabled) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setState({
        ready: false,
        error: null,
        stream: null,
        trackInfo: null,
        probing: false,
        capabilities: null,
      })
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
            probing: false,
            capabilities: null,
          })
        }
        return
      }

      setState((prev) => ({ ...prev, probing: true, error: null }))
      const caps = await probeBestCameraCapabilities()
      if (!active) return

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: qualityConstraints(quality, caps, caps?.deviceId),
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

        const liveTrack = mediaStream.getVideoTracks()[0]
        let liveCaps = caps
        if (liveTrack) {
          const fromTrack = readTrackCapabilities(liveTrack)
          const settings = liveTrack.getSettings()
          liveCaps = {
            deviceId:
              caps?.deviceId ?? settings.deviceId ?? liveTrack.getSettings().deviceId ?? 'default',
            label: caps?.label || liveTrack.label || 'Камера',
            maxWidth: Math.max(fromTrack.maxWidth, settings.width ?? 0, caps?.maxWidth ?? 0),
            maxHeight: Math.max(fromTrack.maxHeight, settings.height ?? 0, caps?.maxHeight ?? 0),
            maxFrameRate: Math.min(
              60,
              Math.max(
                fromTrack.maxFrameRate,
                settings.frameRate ? Math.round(settings.frameRate) : 0,
                caps?.maxFrameRate ?? 0,
                30,
              ),
            ),
          }
        }

        streamRef.current = mediaStream
        setState({
          ready: true,
          error: null,
          stream: mediaStream,
          trackInfo: describeTrackSettings(mediaStream),
          probing: false,
          capabilities: liveCaps,
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
            probing: false,
            capabilities: caps,
          })
        } catch {
          if (active) {
            setState({
              ready: false,
              error: 'Не удалось открыть камеру. Разреши доступ и обнови страницу.',
              stream: null,
              trackInfo: null,
              probing: false,
              capabilities: caps,
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
    // Quality changes use applyConstraints in a separate effect (avoid tearing the stream).
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, externalStream])

  useEffect(() => {
    if (externalStream || !enabled) return
    const stream = streamRef.current
    const track = stream?.getVideoTracks()[0]
    if (!track) return

    let cancelled = false
    const caps = state.capabilities
    void track
      .applyConstraints(qualityConstraints(quality, caps, caps?.deviceId))
      .then(() => {
        if (cancelled) return
        setState((prev) => ({
          ...prev,
          trackInfo: describeTrackSettings(stream),
        }))
      })
      .catch(() => {
        /* keep current */
      })

    return () => {
      cancelled = true
    }
  }, [quality, enabled, externalStream, state.capabilities])

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

  return {
    videoRef,
    ready: state.ready,
    error: state.error,
    stream: state.stream,
    trackInfo: state.trackInfo,
    probing: state.probing,
    capabilities: state.capabilities,
    qualityOptions,
    qualityPreset,
  }
}
