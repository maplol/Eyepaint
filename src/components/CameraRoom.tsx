import { useEffect, useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useRoomPeer } from '../hooks/useRoomPeer'
import {
  loadJoinRoomCode,
  normalizeRoomCode,
  saveJoinRoomCode,
} from '../lib/rooms'
import './CameraRoom.css'

type CameraRoomProps = {
  onExit: () => void
}

export function CameraRoom({ onExit }: CameraRoomProps) {
  const [code, setCode] = useState(() => loadJoinRoomCode())
  const [started, setStarted] = useState(false)
  const { videoRef, ready, error, stream } = useCamera(true)
  const room = useRoomPeer({
    enabled: started && ready && code.length >= 4,
    role: 'camera',
    code,
    localStream: stream,
  })

  useEffect(() => {
    if (code.length >= 4) saveJoinRoomCode(code)
  }, [code])

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

  const statusText = !ready
    ? 'Открываю камеру…'
    : !started
      ? 'Введи код с ПК и нажми «Подключиться»'
      : room.status === 'connected'
        ? 'Стрим идёт на ПК'
        : room.status === 'error'
          ? room.error || 'Ошибка связи'
          : 'Ищу комнату на ПК… оставь экран включённым'

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
            <strong>2.</strong> Введи этот код здесь и подключись
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
