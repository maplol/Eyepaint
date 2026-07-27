import { useEffect, useMemo, useRef, useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import {
  buildOverlayCssTransform,
  useOverlayTransform,
} from '../hooks/useOverlayTransform'
import { useRoomPeer } from '../hooks/useRoomPeer'
import { useStudioHotkeys } from '../hooks/useStudioHotkeys'
import { captureCompositeFrame, saveImageToDevice } from '../lib/captureComposite'
import {
  extractPalette,
  renderFilteredReference,
  type ColorFilterMode,
  type PaletteColor,
} from '../lib/colors'
import {
  DEFAULT_HOTKEYS,
  HOTKEY_LABELS,
  type HotkeyAction,
} from '../lib/hotkeys'
import { createPose, formatPoseStats, loadPoses, savePoses, type SavedPose } from '../lib/poses'
import {
  copyText,
  createRoomCode,
  loadHostRoomCode,
  saveHostRoomCode,
} from '../lib/rooms'

type StudioProps = {
  imageUrl: string
  onChangeImage: (file: File) => void
  onExit: () => void
}

type StudioTab = 'main' | 'project' | 'colors' | 'poses'
type SettingsSection = 'link' | 'keys'

const TABS: Array<[StudioTab, string]> = [
  ['main', 'Основное'],
  ['project', 'Проекция'],
  ['colors', 'Цвета'],
  ['poses', 'Позы'],
]

const STAT_LABELS: Record<string, string> = {
  scale: 'Масштаб',
  rotation: 'Поворот',
  tiltX: 'Наклон X',
  tiltY: 'Наклон Y',
  x: 'X',
  y: 'Y',
  opacity: 'Прозр.',
  flipped: 'Отражение',
}

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')

const rootClass =
  'relative h-dvh w-full overflow-hidden touch-none select-none bg-[var(--ink-deep)] font-[family-name:var(--font-body)] text-[var(--mist)]'

const stageBaseClass =
  'absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_42%,#2a343a_0%,#141a1d_72%)]'

const cameraClass =
  'absolute inset-0 h-full w-full bg-[#141a1d] object-cover'

const statusBaseClass =
  'absolute inset-x-4 bottom-[36%] rounded-2xl border border-white/20 bg-white/14 px-4 py-4 text-center text-mist shadow-[var(--shadow-glass)] backdrop-blur-[18px] backdrop-saturate-[1.2] animate-[rise-in_0.4s_ease_both] min-[960px]:left-5 min-[960px]:right-auto min-[960px]:max-w-md'

const statusNoteClass = 'mt-2 text-[0.86rem] text-[var(--text-muted)]'

const glassButtonClass =
  'inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/12 px-3.5 text-sm font-semibold text-paper shadow-[0_6px_18px_rgba(12,16,18,0.16)] backdrop-blur-md'

const dockClass =
  'absolute inset-x-3 bottom-[calc(var(--safe-bottom)+0.7rem)] z-[3] flex max-h-[min(58dvh,520px)] flex-col overflow-hidden rounded-3xl border border-white/20 bg-[linear-gradient(170deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.08)_100%)] shadow-[var(--shadow-glass)] backdrop-blur-[22px] backdrop-saturate-[1.25] animate-[rise-in_0.45s_ease_0.04s_both] md:inset-x-auto md:right-4 md:bottom-[calc(var(--safe-bottom)+1rem)] md:w-[min(380px,calc(100%-2rem))] min-[960px]:max-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-5.75rem)] min-[960px]:w-[min(360px,30vw)]'

const panelClass = 'grid gap-3'

const sectionTitleClass = 'text-sm font-bold text-paper'

const tabBaseClass =
  'min-h-9 rounded-xl px-1 py-1.5 text-[0.75rem] font-semibold text-mist/75 transition-colors hover:text-paper min-[960px]:text-[0.8rem]'

const tabActiveClass = 'bg-white/18 text-paper'

const sliderLabelsClass =
  'mb-[0.4rem] flex justify-between text-[0.84rem] text-[rgba(231,238,240,0.82)]'

const rangeInputClass = 'w-full cursor-pointer accent-[var(--accent)]'

const rowClass = 'grid grid-cols-3 gap-2'

const chipBaseClass =
  'min-h-[2.5rem] rounded-[14px] px-[0.35rem] py-[0.4rem] text-[0.82rem] font-semibold disabled:cursor-not-allowed disabled:opacity-40'

const chipNeutralClass = cn(
  chipBaseClass,
  'border border-[var(--line-soft)] bg-white/8 text-[var(--mist)]',
)

const chipAccentClass = (active = false) =>
  cn(
    chipBaseClass,
    active
      ? 'border border-transparent bg-[rgba(224,154,106,0.9)] text-[#2a1a10]'
      : 'border border-[rgba(224,154,106,0.45)] bg-[rgba(224,154,106,0.22)] text-[#ffd9bd]',
  )

const chipFileClass = cn(
  chipNeutralClass,
  'relative inline-flex cursor-pointer items-center justify-center',
)

const hiddenFileInputClass = 'absolute h-px w-px opacity-0 pointer-events-none'

const tipClass = 'text-center text-[0.78rem] text-[rgba(231,238,240,0.55)]'

const poseStatsClass = 'grid grid-cols-4 gap-[0.4rem]'

const poseStatClass =
  'grid gap-[0.12rem] rounded-[12px] border border-white/6 bg-white/7 px-2 py-[0.45rem]'

const poseStatLabelClass = 'text-[0.68rem] text-[rgba(231,238,240,0.55)]'

const poseStatValueClass =
  'text-[0.86rem] font-bold text-[var(--paper)] [font-variant-numeric:tabular-nums]'

const poseSaveClass =
  'min-h-[2.7rem] rounded-[14px] border border-[rgba(224,154,106,0.4)] bg-[rgba(224,154,106,0.18)] font-bold text-[#ffd9bd]'

const getStageCursorClass = (locked: boolean, dragMode: string) => {
  if (locked) return 'cursor-default'
  if (dragMode === 'rotate') return 'cursor-crosshair'
  if (dragMode === 'scale') return 'cursor-ns-resize'
  if (dragMode === 'tilt') return 'cursor-move'
  return 'cursor-grab active:cursor-grabbing'
}

export function Studio({ imageUrl, onChangeImage, onExit }: StudioProps) {
  const [roomEnabled, setRoomEnabled] = useState(false)
  const [roomCode, setRoomCode] = useState(() => loadHostRoomCode() ?? createRoomCode())
  const room = useRoomPeer({
    enabled: roomEnabled,
    role: 'host',
    code: roomCode,
  })

  useEffect(() => {
    saveHostRoomCode(roomCode)
  }, [roomCode])

  const { videoRef, ready, error, trackInfo } = useCamera(
    !roomEnabled,
    roomEnabled ? room.remoteStream : null,
  )
  const usingPhoneCam = Boolean(room.remoteStream)

  const [opacity, setOpacity] = useState(0.45)
  const [locked, setLocked] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [uiHidden, setUiHidden] = useState(false)
  const [flash, setFlash] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [tab, setTab] = useState<StudioTab>('main')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('link')

  const [palette, setPalette] = useState<PaletteColor[]>([])
  const [paletteLoading, setPaletteLoading] = useState(false)
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([])
  const [colorMode, setColorMode] = useState<ColorFilterMode>('off')
  const [filteredUrl, setFilteredUrl] = useState<string | null>(null)
  const [filterBusy, setFilterBusy] = useState(false)

  const [poses, setPoses] = useState<SavedPose[]>(() => loadPoses())

  const stageRef = useRef<HTMLDivElement | null>(null)
  const overlayImageRef = useRef<HTMLImageElement | null>(null)
  const {
    hotkeys,
    setHotkeys,
    dragMode,
    listeningFor,
    setListeningFor,
    formatHotkey,
  } = useStudioHotkeys(true)
  const { transform, setTransform, reset, handlers, onWheel } = useOverlayTransform(
    locked,
    dragMode,
  )
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
      showToast(result === 'shared' ? 'Сохранено через «Поделиться»' : 'Фото сохранено')
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

  const cameraLabel = usingPhoneCam
    ? `Камера: телефон${trackInfo ? ` · ${trackInfo}` : ''}`
    : ready
      ? `Камера: локальная${trackInfo ? ` · ${trackInfo}` : ''}`
      : 'Камера: нет'

  return (
    <div className={rootClass}>
      <div
        ref={stageRef}
        className={cn(stageBaseClass, getStageCursorClass(locked, dragMode))}
        {...handlers}
      >
        <video ref={videoRef} className={cameraClass} playsInline muted autoPlay />

        {!ready && !error && !roomEnabled && (
          <div className={statusBaseClass}>Открываю камеру…</div>
        )}
        {roomEnabled && !usingPhoneCam && room.status !== 'error' && (
          <div className={statusBaseClass}>
            Жду телефон в комнате <strong>{roomCode}</strong>…
          </div>
        )}
        {error && !roomEnabled && (
          <div className={cn(statusBaseClass, 'border-[rgba(239,139,139,0.4)]')}>
            <p>{error}</p>
            <p className={statusNoteClass}>
              Можно подключить телефон в настройках (шестерёнка → Связь) или настроить референс заранее.
            </p>
          </div>
        )}
        {roomEnabled && room.status === 'error' && (
          <div className={cn(statusBaseClass, 'border-[rgba(239,139,139,0.4)]')}>
            <p>{room.error || 'Ошибка комнаты'}</p>
            <p className={statusNoteClass}>Попробуй «Новый код» или перезапусти ожидание.</p>
          </div>
        )}

        <div
          className={cn(
            'absolute left-1/2 top-1/2 w-[min(88vw,520px)] origin-center [transform-style:preserve-3d] [will-change:transform,opacity] min-[960px]:w-[min(72vw,620px)]',
            framed &&
              'rounded-[4px] outline-2 outline-offset-[6px] outline-[rgba(224,154,106,0.95)]',
          )}
          style={{
            opacity,
            transform: buildOverlayCssTransform(transform, flipped),
            pointerEvents: locked ? 'none' : 'auto',
          }}
        >
          <img
            ref={overlayImageRef}
            src={displayUrl}
            alt="Референс для срисовывания"
            draggable={false}
            className="h-auto max-h-[75dvh] w-full object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.28)] pointer-events-none"
          />
        </div>

        {!locked && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45"
            aria-hidden="true"
          >
            <span className="absolute left-1/2 top-[-7px] h-[calc(100%_+_14px)] w-px -translate-x-1/2 bg-white/40" />
            <span className="absolute left-[-7px] top-1/2 h-px w-[calc(100%_+_14px)] -translate-y-1/2 bg-white/40" />
          </div>
        )}
        {flash && (
          <div
            className="pointer-events-none absolute inset-0 bg-white/70 animate-[shutter-flash_0.22s_ease_forwards]"
            aria-hidden="true"
          />
        )}
      </div>

      {!uiHidden && (
        <header className="absolute inset-x-0 top-0 z-[4] grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 bg-[linear-gradient(to_bottom,rgba(20,26,29,0.55),transparent)] px-3 pb-3 pt-[calc(var(--safe-top)+0.65rem)] animate-[rise-in_0.35s_ease_both] sm:px-4">
          <button type="button" className={glassButtonClass} onClick={onExit}>
            Назад
          </button>
          <div className="min-w-0 justify-self-center text-center">
            <p className="font-[family-name:var(--font-display)] text-[0.78rem] font-bold tracking-[0.08em] text-paper/90">
              EYEPAINT
            </p>
            <p className="truncate text-[0.68rem] text-mist/60">{cameraLabel}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 justify-self-end">
            {roomEnabled && (
              <span
                className={cn(
                  'hidden rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold sm:inline-flex',
                  usingPhoneCam
                    ? 'border-accent/50 bg-accent/20 text-accent-soft'
                    : 'border-white/20 bg-white/10 text-mist/80',
                )}
              >
                {usingPhoneCam ? 'Телефон' : 'Жду…'}
              </span>
            )}
            <button
              type="button"
              className={cn(
                'grid h-10 w-10 place-items-center rounded-full border backdrop-blur-md',
                settingsOpen
                  ? 'border-accent/55 bg-accent/20 text-accent-soft'
                  : 'border-white/25 bg-white/12 text-paper',
              )}
              aria-label={settingsOpen ? 'Закрыть настройки' : 'Настройки'}
              title={settingsOpen ? 'К студии' : 'Настройки'}
              aria-pressed={settingsOpen}
              onClick={() => setSettingsOpen((value) => !value)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.1 7.1 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.22-1.13.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.77 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.89 14.5a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.41 1.05.73 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.58-.22 1.13-.53 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
                />
              </svg>
            </button>
            <button type="button" className={glassButtonClass} onClick={() => setUiHidden(true)}>
              Скрыть
            </button>
          </div>
        </header>
      )}

      {!uiHidden && (
        <aside className={dockClass} translate={settingsOpen ? 'no' : undefined}>
          {settingsOpen ? (
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3.5 py-3">
              <p className={sectionTitleClass}>Настройки</p>
              <button
                type="button"
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.78rem] font-semibold text-paper"
                onClick={() => setSettingsOpen(false)}
              >
                К студии
              </button>
            </div>
          ) : (
            <div
              className="sticky top-0 z-[2] grid grid-cols-4 gap-1 border-b border-white/10 bg-[linear-gradient(180deg,rgba(28,36,40,0.94)_0%,rgba(28,36,40,0.82)_100%)] px-2 py-2 backdrop-blur-md"
              role="tablist"
              aria-label="Панели студии"
            >
              {TABS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={cn(tabBaseClass, tab === id && tabActiveClass)}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-3.5 py-3 [-webkit-overflow-scrolling:touch]">
            {settingsOpen ? (
              <div className={panelClass}>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={cn(
                      'min-h-10 rounded-xl border text-sm font-semibold',
                      settingsSection === 'link'
                        ? 'border-accent/50 bg-accent/20 text-accent-soft'
                        : 'border-white/15 bg-white/8 text-mist/85',
                    )}
                    onClick={() => setSettingsSection('link')}
                  >
                    Связь
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'min-h-10 rounded-xl border text-sm font-semibold',
                      settingsSection === 'keys'
                        ? 'border-accent/50 bg-accent/20 text-accent-soft'
                        : 'border-white/15 bg-white/8 text-mist/85',
                    )}
                    onClick={() => setSettingsSection('keys')}
                  >
                    Клавиши
                  </button>
                </div>

                {settingsSection === 'link' && (
                  <div className={panelClass}>
                    <p className={sectionTitleClass}>Телефон как камера</p>
                    <div className="grid gap-1.5 rounded-2xl border border-white/12 bg-ink-deep/45 px-3 py-3 text-[0.82rem] leading-snug text-mist/80">
                      <p>
                        <strong className="text-accent-soft">1.</strong> Создай комнату — появится код
                      </p>
                      <p>
                        <strong className="text-accent-soft">2.</strong> На телефоне: «Телефон как
                        камера» → введи код
                      </p>
                      <p>
                        <strong className="text-accent-soft">3.</strong> Смотри «С камеры» и «В эфир»
                        — 2K часто стабильнее 4K
                      </p>
                    </div>

                    {roomEnabled ? (
                      <>
                        <div className="grid gap-1 rounded-2xl border border-white/20 bg-ink-deep/55 px-4 py-3.5 text-center">
                          <span className="text-[0.75rem] text-[var(--text-muted)]">Код комнаты</span>
                          <strong className="font-[family-name:var(--font-display)] text-[clamp(1.4rem,4vw,1.8rem)] font-extrabold tracking-[0.18em] text-paper">
                            {roomCode}
                          </strong>
                        </div>
                        <div className={rowClass}>
                          <button
                            type="button"
                            className={chipNeutralClass}
                            onClick={() => {
                              void copyText(roomCode).then((ok) =>
                                showToast(ok ? 'Код скопирован' : 'Не удалось скопировать'),
                              )
                            }}
                          >
                            Копировать
                          </button>
                          <button
                            type="button"
                            className={chipNeutralClass}
                            onClick={() => {
                              const next = createRoomCode()
                              setRoomCode(next)
                              saveHostRoomCode(next)
                              showToast('Новая комната')
                            }}
                          >
                            Новый код
                          </button>
                          <button
                            type="button"
                            className={cn(
                              chipBaseClass,
                              'border border-danger/40 bg-danger/15 text-danger-soft',
                            )}
                            onClick={() => setRoomEnabled(false)}
                          >
                            Отключить
                          </button>
                        </div>
                        <p className={tipClass}>
                          {room.status === 'connected'
                            ? `Телефон подключён${trackInfo ? ` · ${trackInfo}` : ''}`
                            : room.error || `Жду телефон… код ${roomCode}`}
                        </p>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={poseSaveClass}
                          onClick={() => {
                            if (!roomCode) {
                              const next = createRoomCode()
                              setRoomCode(next)
                              saveHostRoomCode(next)
                            }
                            setRoomEnabled(true)
                          }}
                        >
                          Создать комнату
                        </button>
                        <p className={tipClass}>
                          Код только на ПК. Качество стрима выбирается на телефоне.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {settingsSection === 'keys' && (
                  <div className={panelClass}>
                    <p className={sectionTitleClass}>Горячие клавиши</p>
                    <p className={tipClass}>
                      Зажми клавишу и тяни мышью. Клик по кнопке → назначь новую.
                    </p>
                    <div className="grid gap-2">
                      {(Object.keys(HOTKEY_LABELS) as HotkeyAction[]).map((action) => (
                        <div
                          key={action}
                          className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-white/12 bg-white/8 px-3 py-2.5"
                        >
                          <span className="text-[0.82rem] text-mist/85">{HOTKEY_LABELS[action]}</span>
                          <button
                            type="button"
                            className={cn(
                              'min-h-9 min-w-[4.5rem] rounded-[10px] border border-accent/40 px-2.5 text-[0.78rem] font-bold',
                              listeningFor === action
                                ? 'bg-accent/35 text-accent-ink'
                                : 'bg-accent/15 text-accent-soft',
                            )}
                            onClick={() =>
                              setListeningFor((prev) => (prev === action ? null : action))
                            }
                          >
                            {listeningFor === action ? 'Нажми…' : formatHotkey(hotkeys[action])}
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={chipNeutralClass}
                      onClick={() => {
                        setHotkeys({ ...DEFAULT_HOTKEYS })
                        showToast('Клавиши сброшены')
                      }}
                    >
                      Сбросить по умолчанию
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
            {tab === 'main' && (
              <div className={panelClass}>
                <div>
                  <div className={sliderLabelsClass}>
                    <span>Прозрачность</span>
                    <span>{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    className={rangeInputClass}
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.01}
                    value={opacity}
                    onChange={(event) => setOpacity(Number(event.target.value))}
                    aria-label="Прозрачность референса"
                  />
                </div>

                <div className="grid grid-cols-[auto_1fr] items-center gap-[0.85rem] px-[0.15rem] pb-[0.05rem] pt-[0.15rem]">
                  <button
                    type="button"
                    className="group grid h-[4.1rem] w-[4.1rem] place-items-center rounded-full border-2 border-white/55 bg-white/14 backdrop-blur-[8px] disabled:cursor-not-allowed disabled:opacity-45"
                    onClick={() => void handleCapture()}
                    disabled={!ready || capturing}
                    aria-label="Сфотографировать композит"
                  >
                    <span className="h-[3.1rem] w-[3.1rem] rounded-full bg-[rgba(245,247,248,0.92)] shadow-[inset_0_0_0_2px_rgba(20,26,29,0.08)] transition-transform group-active:scale-[0.92]" />
                  </button>
                  <div>
                    <p className="font-[family-name:var(--font-display)] text-base font-bold text-[var(--paper)]">
                      Снять фото
                    </p>
                    <p className="mt-[0.15rem] text-[0.82rem] text-[var(--text-muted)]">
                      Камера + референс → сохранить
                    </p>
                  </div>
                </div>

                <div className={rowClass}>
                  <label className={chipFileClass}>
                    Галерея
                    <input
                      className={hiddenFileInputClass}
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        applyPickedFile(event.target.files?.[0])
                        event.target.value = ''
                      }}
                    />
                  </label>
                  <label className={chipFileClass}>
                    Камера
                    <input
                      className={hiddenFileInputClass}
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
                    className={chipNeutralClass}
                    onClick={() => setFlipped((value) => !value)}
                  >
                    Отразить
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className={chipNeutralClass} onClick={reset}>
                    Сброс
                  </button>
                  <button
                    type="button"
                    className={chipAccentClass(locked)}
                    onClick={() => setLocked((value) => !value)}
                  >
                    {locked ? 'Разблокировать' : 'Зафиксировать'}
                  </button>
                </div>
              </div>
            )}

            {tab === 'project' && (
              <div className={panelClass}>
                <p className={sectionTitleClass}>Подстройка под угол листа</p>
                <div>
                  <div className={sliderLabelsClass}>
                    <span>Наклон X</span>
                    <span>{Math.round(transform.rotateX)}°</span>
                  </div>
                  <input
                    className={rangeInputClass}
                    type="range"
                    min={-60}
                    max={60}
                    step={1}
                    value={transform.rotateX}
                    onChange={(event) =>
                      setTransform((prev) => ({ ...prev, rotateX: Number(event.target.value) }))
                    }
                  />
                </div>
                <div>
                  <div className={sliderLabelsClass}>
                    <span>Наклон Y</span>
                    <span>{Math.round(transform.rotateY)}°</span>
                  </div>
                  <input
                    className={rangeInputClass}
                    type="range"
                    min={-60}
                    max={60}
                    step={1}
                    value={transform.rotateY}
                    onChange={(event) =>
                      setTransform((prev) => ({ ...prev, rotateY: Number(event.target.value) }))
                    }
                  />
                </div>
                <div>
                  <div className={sliderLabelsClass}>
                    <span>Поворот</span>
                    <span>{Math.round(transform.rotation)}°</span>
                  </div>
                  <input
                    className={rangeInputClass}
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={transform.rotation}
                    onChange={(event) =>
                      setTransform((prev) => ({ ...prev, rotation: Number(event.target.value) }))
                    }
                  />
                </div>
                <div>
                  <div className={sliderLabelsClass}>
                    <span>Масштаб</span>
                    <span>{Math.round(transform.scale * 100)}%</span>
                  </div>
                  <input
                    className={rangeInputClass}
                    type="range"
                    min={0.2}
                    max={4}
                    step={0.01}
                    value={transform.scale}
                    onChange={(event) =>
                      setTransform((prev) => ({ ...prev, scale: Number(event.target.value) }))
                    }
                  />
                </div>
                <button
                  type="button"
                  className={chipNeutralClass}
                  onClick={() =>
                    setTransform((prev) => ({
                      ...prev,
                      rotateX: 0,
                      rotateY: 0,
                      rotation: 0,
                    }))
                  }
                >
                  Сбросить углы
                </button>
                <p className={tipClass}>
                  Если телефон стоит под углом — крути наклоны, пока референс ляжет на лист.
                </p>
              </div>
            )}

            {tab === 'colors' && (
              <div className={panelClass}>
                {paletteLoading ? (
                  <p className={tipClass}>Разбираю цвета референса…</p>
                ) : palette.length === 0 ? (
                  <p className={tipClass}>Не удалось вытащить палитру</p>
                ) : (
                  <>
                    <div
                      className="flex gap-[0.55rem] overflow-x-auto px-[0.1rem] pb-[0.35rem] pt-[0.15rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                      role="group"
                      aria-label="Цвета референса"
                    >
                      {palette.map((color) => {
                        const active = selectedSet.has(color.id)
                        return (
                          <button
                            key={color.id}
                            type="button"
                            className={cn(
                              'h-[2.35rem] w-[2.35rem] flex-none rounded-full border-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]',
                              active
                                ? 'scale-[1.06] border-white shadow-[0_0_0_2px_rgba(224,154,106,0.85),inset_0_0_0_1px_rgba(0,0,0,0.12)]'
                                : 'border-white/35',
                            )}
                            style={{ background: color.hex }}
                            aria-pressed={active}
                            title={color.hex}
                            onClick={() =>
                              setSelectedColorIds((prev) =>
                                prev.includes(color.id)
                                  ? prev.filter((id) => id !== color.id)
                                  : [...prev, color.id],
                              )
                            }
                          />
                        )
                      })}
                    </div>

                    <div className={rowClass}>
                      <button
                        type="button"
                        className={chipAccentClass(colorMode === 'mask')}
                        disabled={selectedColorIds.length === 0 || filterBusy}
                        onClick={() =>
                          setColorMode((mode) => (mode === 'mask' ? 'gray' : 'mask'))
                        }
                      >
                        Только цвет
                      </button>
                      <button
                        type="button"
                        className={chipNeutralClass}
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
                        className={chipNeutralClass}
                        disabled={filterBusy || selectedColorIds.length === 0}
                        onClick={() => setColorMode('gray')}
                      >
                        Серый фон
                      </button>
                    </div>
                    <p className={tipClass}>
                      {filterBusy
                        ? 'Применяю фильтр…'
                        : colorMode === 'mask'
                          ? 'Только выбранные цвета · рамка вокруг референса'
                          : selectedColorIds.length > 0
                            ? 'Выбранные цветные, остальное серое'
                            : 'Кликай кружки — можно несколько'}
                    </p>
                  </>
                )}
              </div>
            )}

            {tab === 'poses' && (
              <div className={panelClass}>
                <div className="grid gap-[0.55rem] rounded-2xl border border-[var(--line-soft)] bg-[rgba(20,26,29,0.28)] px-3 py-[0.7rem]">
                  <p className="text-[0.78rem] font-semibold uppercase tracking-[0.04em] text-[rgba(231,238,240,0.58)]">
                    Сейчас
                  </p>
                  <div className={poseStatsClass}>
                    {Object.entries(formatPoseStats({ transform, flipped, opacity })).map(
                      ([key, value]) => (
                        <div key={key} className={poseStatClass}>
                          <span className={poseStatLabelClass}>{STAT_LABELS[key] ?? key}</span>
                          <strong className={poseStatValueClass}>{value}</strong>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <button type="button" className={poseSaveClass} onClick={handleSavePose}>
                  + Сохранить в список
                </button>

                {poses.length === 0 ? (
                  <p className={tipClass}>Список пуст — сохрани несколько позиций</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 text-[0.8rem] text-[rgba(231,238,240,0.62)]">
                      <span>Сохранённые · {poses.length}</span>
                      <button
                        type="button"
                        className="text-[0.78rem] font-semibold text-[#ef8b8b]"
                        onClick={() => {
                          setPoses([])
                          savePoses([])
                          showToast('Список поз очищен')
                        }}
                      >
                        Очистить всё
                      </button>
                    </div>
                    <ul className="grid list-none gap-[0.55rem]">
                      {poses.map((pose) => {
                        const stats = formatPoseStats(pose)
                        return (
                          <li
                            key={pose.id}
                            className="grid gap-[0.55rem] rounded-2xl border border-[var(--line-soft)] bg-white/8 p-[0.7rem]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[0.95rem] font-bold text-[var(--paper)]">
                                {pose.name}
                              </p>
                              <button
                                type="button"
                                className="min-h-[1.9rem] rounded-full border border-[rgba(239,139,139,0.35)] bg-[rgba(239,139,139,0.12)] px-[0.65rem] py-1 text-[0.75rem] font-semibold text-[#ffb4b4]"
                                onClick={() => {
                                  const next = poses.filter((item) => item.id !== pose.id)
                                  setPoses(next)
                                  savePoses(next)
                                  showToast('Поза удалена')
                                }}
                              >
                                Удалить
                              </button>
                            </div>
                            <div className={poseStatsClass}>
                              {Object.entries(stats).map(([key, value]) => (
                                <div key={key} className={poseStatClass}>
                                  <span className={poseStatLabelClass}>
                                    {STAT_LABELS[key] ?? key}
                                  </span>
                                  <strong className={poseStatValueClass}>{value}</strong>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="min-h-[2.35rem] rounded-[12px] border border-[var(--line)] bg-white/12 text-[0.86rem] font-bold text-[var(--paper)]"
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
              </>
            )}
          </div>
        </aside>
      )}

      {!uiHidden && (
        <div
          className="absolute bottom-[calc(var(--safe-bottom)+1rem)] left-4 z-[3] hidden max-w-[min(28rem,calc(100%-24rem))] rounded-xl border border-white/15 bg-ink-deep/60 px-3 py-2 text-[0.78rem] text-mist/80 backdrop-blur-md min-[960px]:block"
          aria-hidden="true"
        >
          {formatHotkey(hotkeys.pan)} двигать · {formatHotkey(hotkeys.rotate)} поворот ·{' '}
          {formatHotkey(hotkeys.scale)} масштаб · {formatHotkey(hotkeys.tilt)} наклон · колёсико
          зум
        </div>
      )}

      {toast && (
        <div className="absolute left-1/2 top-[calc(var(--safe-top)+4.2rem)] z-[5] -translate-x-1/2 whitespace-nowrap rounded-full border border-white/20 bg-white/16 px-4 py-2.5 text-[0.84rem] text-paper backdrop-blur-md animate-[rise-in_0.25s_ease_both]">
          {toast}
        </div>
      )}

      {uiHidden && (
        <button
          type="button"
          className="absolute bottom-[calc(var(--safe-bottom)+0.35rem)] right-2 z-[6] h-12 w-12 rounded-full border border-white/10 bg-white/5 active:bg-white/15"
          onClick={() => setUiHidden(false)}
          aria-label="Показать интерфейс"
        />
      )}
    </div>
  )
}
