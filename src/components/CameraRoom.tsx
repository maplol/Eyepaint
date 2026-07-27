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
import './CameraRoom.css'

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
  })

  useEffect(() => {
    if (code.length >= 4) saveJoinRoomCode(code)
  }, [code])

  useEffect(() => {
    saveVideoQuality(quality)
  }, [quality])

  // Drop presets the device cannot reach (e.g. 4K on a 1080p webcam).
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

  return (
    <section className="camroom">
      <div className="camroom__stage">
        <video ref={videoRef} className="camroom__video" playsInline muted autoPlay />
        <div className="camroom__scrim" />
      </div>

      <header className="camroom__top">
        <button type="button" className="camroom__btn camroom__btn--top" onClick={onExit}>
          Назад
        </button>
        <p className="camroom__brand">EYEPAINT · Камера</p>
        <span className="camroom__spacer" aria-hidden="true" />
      </header>

      <div className="camroom__panel" translate="no">
        <div className="camroom__steps">
          <p>
            <strong>1.</strong> На ПК: студия → «Связь» → «Создать комнату»
          </p>
          <p>
            <strong>2.</strong> Введи код здесь и подключись
          </p>
        </div>

        <label className="camroom__field">
          <span className="camroom__label">Код с компьютера</span>
          <input
            className="camroom__code"
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

        <div className="camroom__quality">
          <span className="camroom__label">Качество стрима</span>
          <div className="camroom__quality-grid">
            {qualityOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`camroom__quality-btn ${quality === option.id ? 'is-active' : ''}`}
                disabled={probing && !ready}
                onClick={() => setQuality(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="camroom__quality-note">
            {capsNote ? `${capsNote}. ` : ''}
            {trackInfo
              ? `Сейчас с камеры: ${trackInfo}`
              : 'Выбери «Максимум» — приложение само возьмёт потолок этого телефона.'}
          </p>
        </div>

        <p className={`camroom__status ${room.status === 'error' || error ? 'is-error' : ''}`}>
          {error || statusText}
        </p>

        {!started ? (
          <button
            type="button"
            className="camroom__cta"
            disabled={!ready || code.length < 4}
            onClick={() => setStarted(true)}
          >
            Подключиться
          </button>
        ) : (
          <button
            type="button"
            className="camroom__cta camroom__cta--ghost"
            onClick={() => setStarted(false)}
          >
            Отключиться
          </button>
        )}
      </div>
    </section>
  )
}
