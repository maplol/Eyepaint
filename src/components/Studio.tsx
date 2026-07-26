import { useEffect, useRef, useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useOverlayTransform } from '../hooks/useOverlayTransform'
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
    if (!locked) setUiHidden(false)
  }, [locked])

  return (
    <div className={`studio ${locked ? 'studio--locked' : ''} ${uiHidden ? 'studio--ui-hidden' : ''}`}>
      <div
        ref={stageRef}
        className="studio__stage"
        {...handlers}
      >
        <video
          ref={videoRef}
          className="studio__camera"
          playsInline
          muted
          autoPlay
        />

        {!ready && !error && <div className="studio__status">Открываю камеру…</div>}
        {error && (
          <div className="studio__status studio__status--error">
            <p>{error}</p>
            <p className="studio__status-note">
              Можно всё равно настроить референс — подложи лист и рисуй, когда камера заработает.
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
      </div>

      {!uiHidden && (
        <header className="studio__top">
          <button type="button" className="studio__ghost" onClick={onExit}>
            ← Назад
          </button>
          <p className="studio__brand">EYEPAINT</p>
          <label className="studio__ghost studio__ghost--file">
            Сменить
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  onChangeImage(file)
                  reset()
                  setLocked(false)
                }
              }}
            />
          </label>
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

          <div className="studio__row">
            <button type="button" className="studio__chip" onClick={() => setFlipped((v) => !v)}>
              Отразить
            </button>
            <button type="button" className="studio__chip" onClick={reset}>
              Сброс
            </button>
            <button
              type="button"
              className={`studio__chip studio__chip--accent ${locked ? 'is-active' : ''}`}
              onClick={() => setLocked((v) => !v)}
            >
              {locked ? 'Разблокировать' : 'Зафиксировать'}
            </button>
          </div>

          {locked ? (
            <button
              type="button"
              className="studio__hide-ui"
              onClick={() => setUiHidden(true)}
            >
              Спрятать панели — рисуй
            </button>
          ) : (
            <p className="studio__tip">
              Тяни одним пальцем · щипок — масштаб и поворот · колёсико — зум
            </p>
          )}
        </footer>
      )}

      {uiHidden && (
        <button
          type="button"
          className="studio__reveal"
          onClick={() => setUiHidden(false)}
          aria-label="Показать панели"
        >
          •
        </button>
      )}
    </div>
  )
}
