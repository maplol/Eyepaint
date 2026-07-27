import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useRoomPeer } from '../hooks/useRoomPeer'
import {
  createFrozenStream,
  readCameraControlCaps,
  setExposureCompensation,
  setFocusPoint,
  setTorch,
} from '../lib/cameraControls'
import {
  clearJoinParamFromUrl,
  readJoinCodeFromLocation,
} from '../lib/roomQr'
import type { RoomCommand } from '../lib/roomCommands'
import {
  loadJoinRoomCode,
  normalizeRoomCode,
  saveJoinRoomCode,
} from '../lib/rooms'
import {
  loadVideoQuality,
  saveVideoQuality,
  type VideoQuality,
} from '../lib/videoQuality'

type CameraRoomProps = {
  onExit: () => void
  initialCode?: string | null
}

const qualityBtn =
  'min-h-10 rounded-xl border px-2 py-1.5 text-[0.78rem] font-semibold transition-colors'
const qualityIdle =
  'border-white/20 bg-white/10 text-[var(--mist)] active:bg-white/15'
const qualityActive =
  'border-accent/60 bg-accent/25 text-accent-soft shadow-[0_0_0_1px_rgba(224,154,106,0.25)]'

export function CameraRoom({ onExit, initialCode = null }: CameraRoomProps) {
  const [code, setCode] = useState(
    () => initialCode ?? readJoinCodeFromLocation() ?? loadJoinRoomCode(),
  )
  const [started, setStarted] = useState(
    () => Boolean(initialCode ?? readJoinCodeFromLocation()),
  )
  const [quality, setQuality] = useState<VideoQuality>(() => loadVideoQuality())
  const [frozen, setFrozen] = useState(false)
  const [frozenStream, setFrozenStream] = useState<MediaStream | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [exposure, setExposure] = useState(0)
  const [focusMark, setFocusMark] = useState<{ x: number; y: number } | null>(null)
  const [batteryLow, setBatteryLow] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const freezeHandleRef = useRef<{ stream: MediaStream; stop: () => void } | null>(null)
  const liveStreamRef = useRef<MediaStream | null>(null)

  const {
    videoRef,
    ready,
    error,
    stream,
    trackInfo,
    probing,
    capabilities,
    qualityOptions,
    qualityPreset,
  } = useCamera(true, null, quality)

  const publishStream = frozen && frozenStream ? frozenStream : stream

  useEffect(() => {
    if (stream && !frozen) liveStreamRef.current = stream
  }, [stream, frozen])

  const applyFreeze = useCallback(
    (value: boolean) => {
      const video = videoRef.current
      if (value) {
        if (!video || !stream) return
        freezeHandleRef.current?.stop()
        const handle = createFrozenStream(video)
        if (!handle) return
        freezeHandleRef.current = handle
        setFrozenStream(handle.stream)
        setFrozen(true)
        return
      }
      freezeHandleRef.current?.stop()
      freezeHandleRef.current = null
      setFrozenStream(null)
      setFrozen(false)
    },
    [stream, videoRef],
  )

  const handleCommand = useCallback(
    (command: RoomCommand) => {
      const track = (liveStreamRef.current ?? stream)?.getVideoTracks()[0]
      if (command.type === 'freeze') {
        applyFreeze(command.value)
        return
      }
      if (!track) return
      if (command.type === 'torch') {
        void setTorch(track, command.value).then((ok) => {
          if (ok) setTorchOn(command.value)
        })
        return
      }
      if (command.type === 'exposure') {
        void setExposureCompensation(track, command.value).then((ok) => {
          if (ok) setExposure(command.value)
        })
        return
      }
      if (command.type === 'focus') {
        void setFocusPoint(track, command.x, command.y).then((ok) => {
          if (!ok) return
          setFocusMark({ x: command.x, y: command.y })
          window.setTimeout(() => setFocusMark(null), 700)
        })
      }
    },
    [applyFreeze, stream],
  )

  const room = useRoomPeer({
    enabled: started && ready && Boolean(publishStream) && code.length >= 4,
    role: 'camera',
    code,
    localStream: publishStream,
    maxBitrate: qualityPreset.maxBitrate,
    maxFramerate: qualityPreset.frameRate,
    onCommand: handleCommand,
  })

  const controlCaps = useMemo(
    () => readCameraControlCaps((liveStreamRef.current ?? stream)?.getVideoTracks()[0] ?? null),
    [stream],
  )

  useEffect(() => {
    if (code.length >= 4) saveJoinRoomCode(code)
  }, [code])

  useEffect(() => {
    saveVideoQuality(quality)
  }, [quality])

  useEffect(() => {
    if (qualityOptions.some((option) => option.id === quality)) return
    setQuality('max')
  }, [qualityOptions, quality])

  useEffect(() => {
    clearJoinParamFromUrl()
  }, [])

  useEffect(() => {
    if (!started) return
    const wake = async () => {
      try {
        await navigator.wakeLock?.request?.('screen')
      } catch {
        /* optional */
      }
    }
    void wake()
  }, [started])

  useEffect(() => {
    const batteryApi = (
      navigator as Navigator & {
        getBattery?: () => Promise<{ level: number; addEventListener: Function }>
      }
    ).getBattery
    if (!batteryApi) return
    let mounted = true
    void batteryApi.call(navigator).then((battery) => {
      if (!mounted) return
      const sync = () => setBatteryLow(battery.level > 0 && battery.level < 0.15)
      sync()
      battery.addEventListener('levelchange', sync)
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    return () => {
      freezeHandleRef.current?.stop()
    }
  }, [])

  const statusText = probing
    ? 'Определяю камеру…'
    : !ready
      ? 'Открываю камеру…'
      : !started
        ? 'Введи код или открой QR с ПК'
        : room.status === 'connected'
          ? frozen
            ? `Заморожено · ${qualityPreset.label}`
            : `Стрим на ПК · ${qualityPreset.label}`
          : room.status === 'error'
            ? room.error || 'Ошибка связи'
            : 'Ищу комнату на ПК…'

  const onVideoTap = (event: MouseEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    const rect = video.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    const track = (liveStreamRef.current ?? stream)?.getVideoTracks()[0]
    if (!track) return
    void setFocusPoint(track, x, y).then((ok) => {
      if (!ok) return
      setFocusMark({ x, y })
      window.setTimeout(() => setFocusMark(null), 700)
    })
  }

  return (
    <section className="relative min-h-dvh w-full overflow-hidden bg-ink-deep text-paper">
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className="h-full w-full bg-[#101418] object-cover"
          playsInline
          muted
          autoPlay
          onClick={onVideoTap}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(14,18,20,0.5),transparent_24%),linear-gradient(to_top,rgba(14,18,20,0.82),transparent_42%)]" />
        {focusMark && (
          <span
            className="pointer-events-none absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent-soft"
            style={{ left: `${focusMark.x * 100}%`, top: `${focusMark.y * 100}%` }}
          />
        )}
        {frozen && (
          <div className="absolute top-[calc(var(--safe-top)+4.2rem)] left-1/2 z-[2] -translate-x-1/2 rounded-full border border-accent/40 bg-accent/25 px-3 py-1.5 text-[0.78rem] font-bold text-accent-soft">
            Заморожено
          </div>
        )}
      </div>

      <header className="absolute inset-x-0 top-0 z-[2] grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3.5 pt-[calc(var(--safe-top)+0.75rem)] pb-3">
        <button
          type="button"
          className="min-h-10 justify-self-start rounded-full border border-white/25 bg-white/15 px-3.5 py-1.5 text-sm font-semibold text-paper backdrop-blur-md"
          onClick={onExit}
        >
          Назад
        </button>
        <p className="min-w-0 overflow-hidden text-center font-[family-name:var(--font-display)] text-[0.78rem] font-bold tracking-[0.04em] text-ellipsis whitespace-nowrap">
          EYEPAINT · Камера
        </p>
        <button
          type="button"
          className="min-h-10 rounded-full border border-white/20 bg-white/10 px-3 text-[0.78rem] font-semibold"
          onClick={() => setHelpOpen((v) => !v)}
        >
          ?
        </button>
      </header>

      {batteryLow && (
        <p className="absolute top-[calc(var(--safe-top)+3.4rem)] inset-x-4 z-[2] rounded-xl border border-danger/40 bg-danger/20 px-3 py-2 text-center text-[0.78rem] text-danger-soft">
          Батарея &lt; 15% — подключи зарядку, иначе стрим оборвётся
        </p>
      )}

      <div
        className="glass-panel absolute inset-x-3 bottom-[calc(var(--safe-bottom)+0.75rem)] z-[2] grid max-w-full gap-3 overflow-hidden rounded-3xl px-4 pt-4 pb-4 box-border min-[900px]:inset-x-auto min-[900px]:left-1/2 min-[900px]:w-[min(440px,calc(100%-2rem))] min-[900px]:-translate-x-1/2"
        translate="no"
      >
        {(helpOpen || !started) && (
          <div className="grid gap-1.5 text-[0.82rem] leading-snug text-mist/80 [&_strong]:text-accent-soft">
            <p>
              <strong>1.</strong> На ПК: ⚙ → Связь → Создать комнату (код / QR)
            </p>
            <p>
              <strong>2.</strong> Введи код здесь или открой ссылку из QR
            </p>
            <p>
              <strong>3.</strong> Тап по картинке — фокус. Можно заморозить кадр.
            </p>
          </div>
        )}

        {!started && (
          <label className="grid min-w-0 gap-2">
            <span className="block text-[0.78rem] leading-tight text-[var(--text-muted)]">
              Код с компьютера
            </span>
            <input
              className="box-border block min-h-12 w-full min-w-0 rounded-2xl border border-white/25 bg-ink-deep/70 px-3 py-2 text-center font-[family-name:var(--font-display)] text-[clamp(1.05rem,5.5vw,1.35rem)] font-bold tracking-[0.12em] text-paper uppercase outline-none focus:border-accent/50"
              value={code}
              maxLength={8}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              inputMode="text"
              onChange={(event) => setCode(normalizeRoomCode(event.target.value))}
              aria-label="Код с компьютера"
            />
          </label>
        )}

        {started && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`${qualityBtn} ${frozen ? qualityActive : qualityIdle}`}
              onClick={() => applyFreeze(!frozen)}
            >
              {frozen ? 'Снять заморозку' : 'Заморозить'}
            </button>
            <button
              type="button"
              className={`${qualityBtn} ${torchOn ? qualityActive : qualityIdle} disabled:opacity-45`}
              disabled={!controlCaps.torch}
              onClick={() => {
                const track = (liveStreamRef.current ?? stream)?.getVideoTracks()[0]
                if (!track) return
                const next = !torchOn
                void setTorch(track, next).then((ok) => {
                  if (ok) setTorchOn(next)
                })
              }}
            >
              Фонарик
            </button>
          </div>
        )}

        {started && controlCaps.exposureCompensation && (
          <div className="grid gap-1">
            <div className="flex justify-between text-[0.78rem] text-mist/75">
              <span>Экспозиция</span>
              <span>{exposure.toFixed(1)}</span>
            </div>
            <input
              type="range"
              className="w-full accent-[var(--accent)]"
              min={controlCaps.exposureMin}
              max={controlCaps.exposureMax}
              step={0.1}
              value={exposure}
              onChange={(event) => {
                const value = Number(event.target.value)
                setExposure(value)
                const track = (liveStreamRef.current ?? stream)?.getVideoTracks()[0]
                if (track) void setExposureCompensation(track, value)
              }}
            />
          </div>
        )}

        <div className="grid gap-2">
          <span className="block text-[0.78rem] leading-tight text-[var(--text-muted)]">
            Качество стрима
          </span>
          <div className="grid grid-cols-2 gap-2">
            {qualityOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${qualityBtn} ${quality === option.id ? qualityActive : qualityIdle} disabled:opacity-50`}
                disabled={(probing && !ready) || frozen}
                onClick={() => setQuality(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-[0.74rem] leading-snug text-[var(--text-muted)]">
            {capabilities
              ? `Камера: ${capabilities.label} · потолок ${capabilities.maxWidth}×${capabilities.maxHeight}. `
              : ''}
            {trackInfo ? `С камеры: ${trackInfo}. ` : ''}
            {room.outboundLabel ? `В эфир: ${room.outboundLabel}.` : ''}
          </p>
        </div>

        <p
          className={`text-center text-[0.95rem] font-semibold leading-snug ${
            room.status === 'error' || error ? 'text-danger-soft' : 'text-mist/90'
          }`}
        >
          {error || statusText}
        </p>

        {!started ? (
          <button
            type="button"
            className="min-h-14 w-full rounded-full bg-accent text-base font-bold text-accent-ink shadow-[0_10px_28px_rgba(224,154,106,0.28)] disabled:opacity-45"
            disabled={!ready || code.length < 4}
            onClick={() => setStarted(true)}
          >
            Подключиться
          </button>
        ) : (
          <button
            type="button"
            className="min-h-14 w-full rounded-full border border-white/30 bg-white/15 text-base font-bold text-paper backdrop-blur-md active:bg-white/20"
            onClick={() => {
              applyFreeze(false)
              setStarted(false)
            }}
          >
            Отключиться
          </button>
        )}
      </div>
    </section>
  )
}
