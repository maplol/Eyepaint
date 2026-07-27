import { useEffect, useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useRoomPeer } from '../hooks/useRoomPeer'
import {
  createRoomCode,
  loadSavedRoomCode,
  normalizeRoomCode,
  saveRoomCode,
} from '../lib/rooms'
import './CameraRoom.css'

type CameraRoomProps = {
  onExit: () => void
}

export function CameraRoom({ onExit }: CameraRoomProps) {
  const [code, setCode] = useState(() => loadSavedRoomCode())
  const [started, setStarted] = useState(false)
  const { videoRef, ready, error, stream } = useCamera(true)
  const room = useRoomPeer({
    enabled: started && ready,
    role: 'camera',
    code,
    localStream: stream,
  })

  useEffect(() => {
    saveRoomCode(code)
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

  const updateCode = (next: string) => {
    setStarted(false)
    setCode(normalizeRoomCode(next))
  }

  const statusText = !ready
    ? 'Открываю камеру…'
    : !started
      ? 'Нажми «Начать трансляцию»'
      : room.status === 'connected'
        ? 'Стрим идёт на ПК'
        : room.status === 'error'
          ? room.error || 'Ошибка связи'
          : room.status === 'waiting' || room.status === 'connecting'
            ? 'Подключаюсь к ПК… оставь экран включённым'
            : room.error || 'Готовлю связь…'

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
        <label className="camroom__field">
          <span className="camroom__label">Код комнаты</span>
          <input
            className="camroom__code"
            value={code}
            maxLength={8}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            onChange={(event) => updateCode(event.target.value)}
            aria-label="Код комнаты"
          />
        </label>

        <button
          type="button"
          className="camroom__btn camroom__btn--block"
          onClick={() => updateCode(createRoomCode())}
        >
          Новый код
        </button>

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
            Начать трансляцию
          </button>
        ) : (
          <button
            type="button"
            className="camroom__cta camroom__cta--ghost"
            onClick={() => setStarted(false)}
          >
            Остановить
          </button>
        )}

        <p className="camroom__hint">
          На ПК: студия → «Связь» → тот же код → «Ждать телефон». Код запоминается на устройстве.
        </p>
      </div>
    </section>
  )
}
