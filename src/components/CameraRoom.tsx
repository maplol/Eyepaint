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
    <section className="relative min-h-dvh w-full overflow-hidden bg-[var(--ink-deep)] text-[var(--paper)]">
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

      <header className="absolute top-0 right-0 left-0 z-2 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)_minmax(0,auto)] items-center gap-2 px-[0.85rem] pt-[calc(var(--safe-top)+0.75rem)] pb-3">
        <button
          type="button"
          className="min-h-10 justify-self-start rounded-full border border-[var(--line)] bg-white/10 px-[0.85rem] py-1.5 font-semibold"
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
        className="glass-panel absolute right-3 bottom-[calc(var(--safe-bottom)+0.75rem)] left-3 z-2 grid max-w-full gap-3 overflow-hidden rounded-[24px] px-4 pt-[1.05rem] pb-[1.1rem] box-border min-[900px]:left-1/2 min-[900px]:right-auto min-[900px]:w-[min(420px,calc(100%-2rem))] min-[900px]:-translate-x-1/2"
        translate="no"
      >
        <div className="grid gap-[0.35rem] text-[0.82rem] leading-[1.4] text-[rgba(231,238,240,0.78)] [&_strong]:text-[#ffd9bd]">
          <p>
            <strong>1.</strong> На ПК: студия → «Связь» → «Создать комнату»
          </p>
          <p>
            <strong>2.</strong> Введи код здесь и подключись
          </p>
        </div>

        <label className="grid min-w-0 gap-[0.45rem]">
          <span className="block text-[0.78rem] leading-[1.2] text-[var(--text-muted)]">
            Код с компьютера
          </span>
          <input
            className="box-border block min-h-12 w-full min-w-0 rounded-[14px] border border-[var(--line)] bg-[rgba(20,26,29,0.45)] px-[0.7rem] py-[0.55rem] text-center font-[family-name:var(--font-display)] text-[clamp(1.05rem,5.5vw,1.35rem)] font-bold tracking-[0.12em] text-[var(--paper)] uppercase"
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

        <div className="grid gap-[0.45rem]">
          <span className="block text-[0.78rem] leading-[1.2] text-[var(--text-muted)]">
            Качество стрима
          </span>
          <div className="grid grid-cols-2 gap-[0.4rem]">
            {qualityOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`min-h-[2.35rem] rounded-xl border px-[0.45rem] py-[0.35rem] text-[0.78rem] font-semibold ${
                  quality === option.id
                    ? 'border-[rgba(224,154,106,0.5)] bg-[rgba(224,154,106,0.18)] text-[#ffd9bd]'
                    : 'border-[var(--line-soft)] bg-white/6 text-[var(--mist)]'
                } disabled:opacity-55`}
                disabled={probing && !ready}
                onClick={() => setQuality(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-[0.74rem] leading-[1.35] text-[var(--text-muted)]">
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
          className={`text-center text-[0.9rem] leading-[1.35] ${
            room.status === 'error' || error
              ? 'text-[#ffb4b4]'
              : 'text-[rgba(231,238,240,0.82)]'
          }`}
        >
          {error || statusText}
        </p>

        {!started ? (
          <button
            type="button"
            className="min-h-[3.1rem] w-full rounded-full bg-[rgba(224,154,106,0.92)] font-bold text-[#2a1a10] disabled:opacity-45"
            disabled={!ready || code.length < 4}
            onClick={() => setStarted(true)}
          >
            Подключиться
          </button>
        ) : (
          <button
            type="button"
            className="min-h-[3.1rem] w-full rounded-full border border-[var(--line)] bg-white/10 font-bold text-[var(--paper)]"
            onClick={() => setStarted(false)}
          >
            Отключиться
          </button>
        )}
      </div>
    </section>
  )
}
