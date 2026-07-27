import { useEffect, useMemo, useRef, useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useOverlayTransform } from '../hooks/useOverlayTransform'
import { captureCompositeFrame, saveImageToDevice } from '../lib/captureComposite'
import {
  extractPalette,
  renderFilteredReference,
  type ColorFilterMode,
  type PaletteColor,
} from '../lib/colors'
import { createPose, formatPoseStats, loadPoses, savePoses, type SavedPose } from '../lib/poses'
import './Studio.css'

type StudioProps = {
  imageUrl: string
  onChangeImage: (file: File) => void
  onExit: () => void
}

type StudioTab = 'main' | 'colors' | 'poses'

export function Studio({ imageUrl, onChangeImage, onExit }: StudioProps) {
  const { videoRef, ready, error } = useCamera(true)
  const [opacity, setOpacity] = useState(0.45)
  const [locked, setLocked] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [uiHidden, setUiHidden] = useState(false)
  const [flash, setFlash] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [tab, setTab] = useState<StudioTab>('main')

  const [palette, setPalette] = useState<PaletteColor[]>([])
  const [paletteLoading, setPaletteLoading] = useState(false)
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([])
  const [colorMode, setColorMode] = useState<ColorFilterMode>('off')
  const [filteredUrl, setFilteredUrl] = useState<string | null>(null)
  const [filterBusy, setFilterBusy] = useState(false)

  const [poses, setPoses] = useState<SavedPose[]>(() => loadPoses())

  const stageRef = useRef<HTMLDivElement | null>(null)
  const overlayImageRef = useRef<HTMLImageElement | null>(null)
  const { transform, setTransform, reset, handlers, onWheel } = useOverlayTransform(locked)
  const onWheelRef = useRef(onWheel)
  onWheelRef.current = onWheel

  const displayUrl = filteredUrl ?? imageUrl
  const framed = colorMode === 'mask'

  const showToast = (message: string) => setToast(message)

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

  useEffect(() => {
    let cancelled = false
    setPalette([])
    setSelectedColorIds([])
    setColorMode('off')
    setFilteredUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setPaletteLoading(true)

    void extractPalette(imageUrl)
      .then((colors) => {
        if (!cancelled) setPalette(colors)
      })
      .catch(() => {
        if (!cancelled) setPalette([])
      })
      .finally(() => {
        if (!cancelled) setPaletteLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [imageUrl])

  useEffect(() => {
    let cancelled = false

    if (colorMode === 'off' || selectedColorIds.length === 0) {
      setFilteredUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setFilterBusy(false)
      return
    }

    setFilterBusy(true)
    void renderFilteredReference(
      imageUrl,
      palette,
      selectedColorIds,
      colorMode === 'mask' ? 'mask' : 'gray',
    )
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        setFilteredUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
      })
      .catch(() => {
        if (!cancelled) setToast('Не удалось применить цвета')
      })
      .finally(() => {
        if (!cancelled) setFilterBusy(false)
      })

    return () => {
      cancelled = true
    }
  }, [imageUrl, palette, selectedColorIds, colorMode])

  const selectedSet = useMemo(() => new Set(selectedColorIds), [selectedColorIds])

  const toggleColor = (id: string) => {
    setSelectedColorIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      return next
    })
  }

  useEffect(() => {
    if (selectedColorIds.length === 0) {
      setColorMode('off')
      return
    }
    setColorMode((mode) => (mode === 'off' ? 'gray' : mode))
  }, [selectedColorIds])

  const handleCapture = async () => {
    const stage = stageRef.current
    const video = videoRef.current
    const overlayImage = overlayImageRef.current
    if (!stage || !video || !overlayImage || !ready || capturing) return

    setCapturing(true)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 220)

    try {
      const file = await captureCompositeFrame({
        stage,
        video,
        overlayImage,
        transform,
        opacity,
        flipped,
        framed,
      })
      const result = await saveImageToDevice(file)
      showToast(result === 'shared' ? 'Сохранено через «Поделиться»' : 'Фото сохранено на телефон')
    } catch {
      showToast('Не удалось сохранить фото')
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

  const handleSavePose = () => {
    const next = [createPose(transform, flipped, opacity, poses), ...poses].slice(0, 24)
    setPoses(next)
    savePoses(next)
    showToast('Позиция сохранена')
  }

  const handleApplyPose = (pose: SavedPose) => {
    setTransform({ ...pose.transform })
    setFlipped(pose.flipped)
    setOpacity(pose.opacity)
    showToast(`Вернули: ${pose.name}`)
  }

  const handleDeletePose = (id: string) => {
    const next = poses.filter((pose) => pose.id !== id)
    setPoses(next)
    savePoses(next)
    showToast('Поза удалена')
  }

  const handleClearPoses = () => {
    setPoses([])
    savePoses([])
    showToast('Список поз очищен')
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

        {!ready && !error && <div className="studio__status">Открываю камеру…</div>}
        {error && (
          <div className="studio__status studio__status--error">
            <p>{error}</p>
            <p className="studio__status-note">
              Можно настроить референс заранее — камера понадобится, когда будешь рисовать.
            </p>
          </div>
        )}

        <div
          className={`studio__overlay ${framed ? 'studio__overlay--framed' : ''}`}
          style={{
            opacity,
            transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotation}deg) scale(${transform.scale * (flipped ? -1 : 1)}, ${transform.scale})`,
            pointerEvents: locked ? 'none' : 'auto',
          }}
        >
          <img
            ref={overlayImageRef}
            src={displayUrl}
            alt="Референс для срисовывания"
            draggable={false}
          />
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
          <button type="button" className="studio__glass-btn" onClick={() => setUiHidden(true)}>
            Скрыть
          </button>
        </header>
      )}

      {!uiHidden && (
        <footer className="studio__controls">
          <div className="studio__tabs" role="tablist" aria-label="Панели студии">
            {(
              [
                ['main', 'Основное'],
                ['colors', 'Цвета'],
                ['poses', 'Позы'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`studio__tab ${tab === id ? 'is-active' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'main' && (
            <div className="studio__panel">
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
                  aria-label="Сфотографировать композит"
                >
                  <span className="studio__shutter-ring" />
                </button>
                <div className="studio__shutter-meta">
                  <p className="studio__shutter-title">Снять фото</p>
                  <p className="studio__shutter-note">Камера + референс → на телефон</p>
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
                <button
                  type="button"
                  className="studio__chip"
                  onClick={() => setFlipped((value) => !value)}
                >
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
                  onClick={() => setLocked((value) => !value)}
                >
                  {locked ? 'Разблок.' : 'Фикс'}
                </button>
                <button type="button" className="studio__chip" onClick={() => setUiHidden(true)}>
                  Скрыть UI
                </button>
              </div>
            </div>
          )}

          {tab === 'colors' && (
            <div className="studio__panel">
              {paletteLoading ? (
                <p className="studio__tip">Разбираю цвета референса…</p>
              ) : palette.length === 0 ? (
                <p className="studio__tip">Не удалось вытащить палитру</p>
              ) : (
                <>
                  <div className="studio__swatches" role="group" aria-label="Цвета референса">
                    {palette.map((color) => {
                      const active = selectedSet.has(color.id)
                      return (
                        <button
                          key={color.id}
                          type="button"
                          className={`studio__swatch ${active ? 'is-active' : ''}`}
                          style={{ background: color.hex }}
                          aria-pressed={active}
                          aria-label={`Цвет ${color.hex}`}
                          title={color.hex}
                          onClick={() => toggleColor(color.id)}
                        />
                      )
                    })}
                  </div>

                  <div className="studio__row">
                    <button
                      type="button"
                      className={`studio__chip studio__chip--accent ${colorMode === 'mask' ? 'is-active' : ''}`}
                      disabled={selectedColorIds.length === 0 || filterBusy}
                      onClick={() =>
                        setColorMode((mode) => (mode === 'mask' ? 'gray' : 'mask'))
                      }
                    >
                      Только цвет
                    </button>
                    <button
                      type="button"
                      className="studio__chip"
                      disabled={selectedColorIds.length === 0}
                      onClick={() => {
                        setSelectedColorIds([])
                        setColorMode('off')
                      }}
                    >
                      Сбросить
                    </button>
                    <button
                      type="button"
                      className="studio__chip"
                      disabled={filterBusy}
                      onClick={() => {
                        if (selectedColorIds.length === 0) return
                        setColorMode('gray')
                      }}
                    >
                      Серый фон
                    </button>
                  </div>

                  <p className="studio__tip">
                    {filterBusy
                      ? 'Применяю фильтр…'
                      : colorMode === 'mask'
                        ? 'Только выбранные цвета · рамка, чтобы не потерять референс'
                        : selectedColorIds.length > 0
                          ? 'Выбранные цветные, остальное серое'
                          : 'Кликай кружки — можно несколько'}
                  </p>
                </>
              )}
            </div>
          )}

          {tab === 'poses' && (
            <div className="studio__panel">
              <div className="studio__pose-now">
                <p className="studio__pose-now-title">Сейчас</p>
                <div className="studio__pose-stats">
                  {Object.entries(
                    formatPoseStats({ transform, flipped, opacity }),
                  ).map(([key, value]) => (
                    <div key={key} className="studio__pose-stat">
                      <span>
                        {key === 'scale'
                          ? 'Масштаб'
                          : key === 'rotation'
                            ? 'Поворот'
                            : key === 'opacity'
                              ? 'Прозр.'
                              : key === 'flipped'
                                ? 'Отражение'
                                : key.toUpperCase()}
                      </span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <button type="button" className="studio__pose-save" onClick={handleSavePose}>
                + Сохранить в список
              </button>

              {poses.length === 0 ? (
                <p className="studio__tip">Список пуст — сохрани несколько позиций и возвращай их</p>
              ) : (
                <>
                  <div className="studio__pose-head">
                    <span>Сохранённые · {poses.length}</span>
                    <button type="button" className="studio__pose-clear" onClick={handleClearPoses}>
                      Очистить всё
                    </button>
                  </div>
                  <ul className="studio__pose-list">
                    {poses.map((pose) => {
                      const stats = formatPoseStats(pose)
                      return (
                        <li key={pose.id} className="studio__pose-card">
                          <div className="studio__pose-card-top">
                            <p className="studio__pose-name">{pose.name}</p>
                            <button
                              type="button"
                              className="studio__pose-delete"
                              aria-label={`Удалить ${pose.name}`}
                              onClick={() => handleDeletePose(pose.id)}
                            >
                              Удалить
                            </button>
                          </div>
                          <div className="studio__pose-stats">
                            <div className="studio__pose-stat">
                              <span>Масштаб</span>
                              <strong>{stats.scale}</strong>
                            </div>
                            <div className="studio__pose-stat">
                              <span>Поворот</span>
                              <strong>{stats.rotation}</strong>
                            </div>
                            <div className="studio__pose-stat">
                              <span>X</span>
                              <strong>{stats.x}</strong>
                            </div>
                            <div className="studio__pose-stat">
                              <span>Y</span>
                              <strong>{stats.y}</strong>
                            </div>
                            <div className="studio__pose-stat">
                              <span>Прозр.</span>
                              <strong>{stats.opacity}</strong>
                            </div>
                            <div className="studio__pose-stat">
                              <span>Отражение</span>
                              <strong>{stats.flipped}</strong>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="studio__pose-apply"
                            onClick={() => handleApplyPose(pose)}
                          >
                            Применить
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </div>
          )}
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
