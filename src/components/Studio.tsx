import { useEffect, useRef, useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useOverlayTransform } from '../hooks/useOverlayTransform'
import { captureVideoFrame } from '../lib/captureFrame'
import './Studio.css'

type StudioProps = {
  imageUrl: string
  onChangeImage: (file: File) => void
  onExit: () => void
}

export function Studio({ imageUrl, onChangeImage, onExit }: StudioProps) {
  const { videoRef, ready, error } = useCamera(true)
  const [opacity, setOpacity] = useState(0.45)
  const [locked, setLocked] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [uiHidden, setUiHidden] = useState(false)
  const [flash, setFlash] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const { transform, reset, handlers, onWheel } = useOverlayTransform(locked)
  const onWheelRef = useRef(onWheel)
  onWheelRef.current = onWheel

  useEffect(() => {
    const node = stageRef.current
    if (!node) return

    const wheelListener = (event: WheelEvent) => onWheelRef.current(event)
    node.addEventListener('wheel', wheelListener, { passive: false })
    return () => node.removeEventListener('wheel', wheelListener)
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(id)
  }, [toast])

  const showToast = (message: string) => setToast(message)

  const handleCapture = async () => {
    const video = videoRef.current
    if (!video || !ready || capturing) return

    setCapturing(true)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 220)

    try {
      const file = await captureVideoFrame(video)
      onChangeImage(file)
      reset()
      setLocked(false)
      showToast('Кадр стал новым референсом')
    } catch {
      showToast('Не удалось снять кадр')
    } finally {
      setCapturing(false)
    }
  }

  const applyPickedFile = (file: File | undefined) => {
    if (!file) return
    onChangeImage(file)
    reset()
    setLocked(false)
  }

  return (
    <div
      className={`studio ${locked ? 'studio--locked' : ''} ${uiHidden ? 'studio--ui-hidden' : ''}`}
    >
      <div ref={stageRef} className="studio__stage" {...handlers}>
        <video
          ref={videoRef}
          className="studio__camera"
          playsInline
          muted
          autoPlay
        />

        {!ready && !error && (
          <div className="studio__status">Открываю камеру…</div>
        )}
        {error && (
          <div className="studio__status studio__status--error">
            <p>{error}</p>
            <p className="studio__status-note">
              Можно настроить референс заранее — камера понадобится, когда будешь рисовать.
            </p>
          </div>
        )}

        <div
          className="studio__overlay"
          style={{
            opacity,
            transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotation}deg) scale(${transform.scale * (flipped ? -1 : 1)}, ${transform.scale})`,
            pointerEvents: locked ? 'none' : 'auto',
          }}
        >
          <img src={imageUrl} alt="Референс для срисовывания" draggable={false} />
        </div>

        {!locked && <div className="studio__crosshair" aria-hidden="true" />}
        {flash && <div className="studio__flash" aria-hidden="true" />}
      </div>

      {!uiHidden && (
        <header className="studio__top">
          <button type="button" className="studio__glass-btn" onClick={onExit}>
            Назад
          </button>
          <p className="studio__brand">EYEPAINT</p>
          <button
            type="button"
            className="studio__glass-btn"
            onClick={() => setUiHidden(true)}
          >
            Скрыть
          </button>
        </header>
      )}

      {!uiHidden && (
        <footer className="studio__controls">
          <div className="studio__slider">
            <div className="studio__slider-labels">
              <span>Прозрачность</span>
              <span>{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.01}
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
              aria-label="Прозрачность референса"
            />
          </div>

          <div className="studio__shutter-row">
            <button
              type="button"
              className="studio__shutter"
              onClick={() => void handleCapture()}
              disabled={!ready || capturing}
              aria-label="Сфотографировать"
            >
              <span className="studio__shutter-ring" />
            </button>
            <div className="studio__shutter-meta">
              <p className="studio__shutter-title">Снять кадр</p>
              <p className="studio__shutter-note">Станет новым референсом</p>
            </div>
          </div>

          <div className="studio__row">
            <label className="studio__chip studio__chip--file">
              Галерея
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  applyPickedFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </label>
            <label className="studio__chip studio__chip--file">
              Камера
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => {
                  applyPickedFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </label>
            <button type="button" className="studio__chip" onClick={() => setFlipped((v) => !v)}>
              Отразить
            </button>
          </div>

          <div className="studio__row">
            <button type="button" className="studio__chip" onClick={reset}>
              Сброс
            </button>
            <button
              type="button"
              className={`studio__chip studio__chip--accent ${locked ? 'is-active' : ''}`}
              onClick={() => setLocked((v) => !v)}
            >
              {locked ? 'Разблок.' : 'Фикс'}
            </button>
            <button
              type="button"
              className="studio__chip"
              onClick={() => setUiHidden(true)}
            >
              Скрыть UI
            </button>
          </div>

          <p className="studio__tip">
            Тяни · щипок — масштаб и поворот · угол экрана вернёт панели
          </p>
        </footer>
      )}

      {toast && <div className="studio__toast">{toast}</div>}

      {uiHidden && (
        <button
          type="button"
          className="studio__reveal"
          onClick={() => setUiHidden(false)}
          aria-label="Показать интерфейс"
        />
      )}
    </div>
  )
}
