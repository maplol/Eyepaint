import { useEffect, useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useRoomPeer } from '../hooks/useRoomPeer'
import { createRoomCode, normalizeRoomCode } from '../lib/rooms'
import './CameraRoom.css'

type CameraRoomProps = {
  onExit: () => void
}

export function CameraRoom({ onExit }: CameraRoomProps) {
  const [code, setCode] = useState(() => createRoomCode())
  const [started, setStarted] = useState(false)
  const { videoRef, ready, error, stream } = useCamera(true)
  const room = useRoomPeer({
    enabled: started && ready,
    role: 'camera',
    code,
    localStream: stream,
  })

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
      ? 'Нажми «Начать трансляцию»'
      : room.status === 'connected'
        ? 'Стрим идёт на ПК'
        : room.status === 'waiting' || room.status === 'connecting'
          ? 'Жду ПК в этой комнате…'
          : room.error || 'Ошибка связи'

  return (
    <section className="camroom">
      <div className="camroom__stage">
        <video ref={videoRef} className="camroom__video" playsInline muted autoPlay />
        <div className="camroom__scrim" />
      </div>

      <header className="camroom__top">
        <button type="button" className="camroom__btn" onClick={onExit}>
          Назад
        </button>
        <p className="camroom__brand">EYEPAINT · Камера</p>
        <span className="camroom__spacer" />
      </header>

      <div className="camroom__panel">
        <p className="camroom__label">Код комнаты</p>
        <div className="camroom__code-row">
          <input
            className="camroom__code"
            value={code}
            maxLength={8}
            spellCheck={false}
            onChange={(event) => {
              setStarted(false)
              setCode(normalizeRoomCode(event.target.value))
            }}
            aria-label="Код комнаты"
          />
          <button
            type="button"
            className="camroom__btn"
            onClick={() => {
              setStarted(false)
              setCode(createRoomCode())
            }}
          >
            Новый
          </button>
        </div>

        <p className="camroom__status">{error || statusText}</p>

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
          <button type="button" className="camroom__cta camroom__cta--ghost" onClick={() => setStarted(false)}>
            Остановить
          </button>
        )}

        <p className="camroom__hint">
          На ПК открой студию → вкладка «Связь» → введи этот код. Телефон только камера, референс
          двигаешь на компьютере.
        </p>
      </div>
    </section>
  )
}
