import { useEffect, useRef, useState } from 'react'

type CameraState = {
  ready: boolean
  error: string | null
  stream: MediaStream | null
}

export function useCamera(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [state, setState] = useState<CameraState>({
    ready: false,
    error: null,
    stream: null,
  })

  useEffect(() => {
    if (!enabled) return

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
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })

        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop())
          return
        }

        const video = videoRef.current
        if (video) {
          video.srcObject = mediaStream
          await video.play().catch(() => undefined)
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

    void start()

    const video = videoRef.current

    return () => {
      active = false
      mediaStream?.getTracks().forEach((track) => track.stop())
      if (video) {
        video.srcObject = null
      }
    }
  }, [enabled])

  useEffect(() => {
    const video = videoRef.current
    const stream = state.stream
    if (!video || !stream) return
    if (video.srcObject !== stream) {
      video.srcObject = stream
      void video.play().catch(() => undefined)
    }
  }, [state.stream])

  return { videoRef, ...state }
}
