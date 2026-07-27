import { useEffect, useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useRoomPeer } from '../hooks/useRoomPeer'
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
}

const qualityBtn =
  'min-h-10 rounded-xl border px-2 py-1.5 text-[0.78rem] font-semibold transition-colors'
const qualityIdle =
  'border-white/20 bg-white/10 text-[var(--mist)] active:bg-white/15'
const qualityActive =
  'border-accent/60 bg-accent/25 text-accent-soft shadow-[0_0_0_1px_rgba(224,154,106,0.25)]'

export function CameraRoom({ onExit }: CameraRoomProps) {
  const [code, setCode] = useState(() => loadJoinRoomCode())
  const [started, setStarted] = useState(false)
  const [quality, setQuality] = useState<VideoQuality>(() => loadVideoQuality())
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
  const room = useRoomPeer({
    enabled: started && ready && Boolean(stream) && code.length >= 4,
    role: 'camera',
    code,
    localStream: stream,
    maxBitrate: qualityPreset.maxBitrate,
    maxFramerate: qualityPreset.frameRate,
  })

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

  const statusText = probing
    ? 'Определяю камеру и максимум качества…'
    : !ready
      ? 'Открываю камеру…'
      : !started
        ? 'Введи код с ПК и нажми «Подключиться»'
        : room.status === 'connected'
          ? `Стрим на ПК · ${qualityPreset.label}`
          : room.status === 'error'
            ? room.error || 'Ошибка связи'
            : 'Ищу комнату на ПК… оставь экран включённым'

  const capsNote = capabilities
    ? `Камера: ${capabilities.label} · потолок ${capabilities.maxWidth}×${capabilities.maxHeight}`
    : probing
      ? 'Сканирую датчики камеры…'
      : null

  const outboundWarn =
    room.outboundInfo &&
    trackInfo &&
    room.outboundInfo.width * room.outboundInfo.height <
      (capabilities?.maxWidth ?? 0) * (capabilities?.maxHeight ?? 0) * 0.55
      ? 'Браузер жмёт эфир сильнее, чем снимает камера — Wi‑Fi/кодировщик. 2K обычно стабильнее 4K.'
      : null

  return (
    <section className="relative min-h-dvh w-full overflow-hidden bg-ink-deep text-paper">
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className="h-full w-full bg-[#101418] object-cover"
          playsInline
          muted
          autoPlay
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(14,18,20,0.55),transparent_28%),linear-gradient(to_top,rgba(14,18,20,0.78),transparent_46%)]" />
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
        <span className="w-[4.2rem]" aria-hidden="true" />
      </header>

      <div
        className="glass-panel absolute inset-x-3 bottom-[calc(var(--safe-bottom)+0.75rem)] z-[2] grid max-w-full gap-3 overflow-hidden rounded-3xl px-4 pt-4 pb-4 box-border min-[900px]:inset-x-auto min-[900px]:left-1/2 min-[900px]:w-[min(420px,calc(100%-2rem))] min-[900px]:-translate-x-1/2"
        translate="no"
      >
        <div className="grid gap-1.5 text-[0.82rem] leading-snug text-mist/80 [&_strong]:text-accent-soft">
          <p>
            <strong>1.</strong> На ПК: студия → «Связь» → «Создать комнату»
          </p>
          <p>
            <strong>2.</strong> Введи код здесь и подключись
          </p>
        </div>

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
            readOnly={started}
            onChange={(event) => {
              if (started) return
              setCode(normalizeRoomCode(event.target.value))
            }}
            aria-label="Код с компьютера"
          />
        </label>

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
                disabled={probing && !ready}
                onClick={() => setQuality(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-[0.74rem] leading-snug text-[var(--text-muted)]">
            {capsNote ? `${capsNote}. ` : ''}
            {trackInfo ? `С камеры: ${trackInfo}. ` : ''}
            {room.outboundLabel ? `В эфир на ПК: ${room.outboundLabel}. ` : ''}
            {outboundWarn ??
              (!trackInfo
                ? 'Выбери «Максимум» — приложение само возьмёт потолок этого телефона.'
                : null)}
          </p>
        </div>

        <p
          className={`text-center text-[0.9rem] leading-snug ${
            room.status === 'error' || error ? 'text-danger-soft' : 'text-mist/85'
          }`}
        >
          {error || statusText}
        </p>

        {!started ? (
          <button
            type="button"
            className="min-h-12 w-full rounded-full bg-accent font-bold text-accent-ink shadow-[0_10px_28px_rgba(224,154,106,0.28)] disabled:opacity-45"
            disabled={!ready || code.length < 4}
            onClick={() => setStarted(true)}
          >
            Подключиться
          </button>
        ) : (
          <button
            type="button"
            className="min-h-12 w-full rounded-full border border-white/30 bg-white/15 font-bold text-paper backdrop-blur-md active:bg-white/20"
            onClick={() => setStarted(false)}
          >
            Отключиться
          </button>
        )}
      </div>
    </section>
  )
}
