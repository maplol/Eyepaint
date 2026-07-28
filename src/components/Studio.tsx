import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react'
import { GuideOverlay } from './GuideOverlay'
import { HelpToggleButton } from './HelpSystem'
import { Toast } from './Toast'
import { ColorsPanel } from './studio/ColorsPanel'
import { LayersPanel } from './studio/LayersPanel'
import { LoupeOverlay } from './studio/LoupeOverlay'
import { MainPanel } from './studio/MainPanel'
import { MaskPainter } from './studio/MaskPainter'
import { PosesPanel } from './studio/PosesPanel'
import { ProjectPanel } from './studio/ProjectPanel'
import { SettingsPanel } from './studio/SettingsPanel'
import { ToolRail } from './studio/ToolRail'
import {
  cameraClass,
  chromePillClass,
  cn,
  dockClass,
  dockShellClass,
  glassIconButtonClass,
  layersColumnClass,
  scrollAreaClass,
  sectionTitleClass,
  statusBaseClass,
  statusNoteClass,
  STUDIO_TOOL_LABELS,
  toolInspectorClass,
  type StudioToolId,
} from './studio/studioUi'
import { useCamera } from '../hooks/useCamera'
import {
  DEFAULT_TRANSFORM,
  buildOverlayCssTransform,
  useOverlayTransform,
  type OverlayTransform,
} from '../hooks/useOverlayTransform'
import { useRoomPeer } from '../hooks/useRoomPeer'
import { useStudioHotkeys } from '../hooks/useStudioHotkeys'
import { DEFAULT_BRUSH_MASK, type BrushMaskSettings } from '../lib/brushMask'
import { captureCompositeFrame, saveImageToDevice } from '../lib/captureComposite'
import {
  PRECISION_PROFILES,
  createPickedColor,
  estimateSelectionCoverage,
  extractPalette,
  loadColorPrecision,
  loadMatchTolerance,
  renderFilteredReference,
  sampleColorAtImagePoint,
  saveColorPrecision,
  saveMatchTolerance,
  sortPalette,
  type ColorFilterMode,
  type ColorPrecision,
  type PaletteColor,
} from '../lib/colors'
import { loadFlags, saveFlags, type FeatureFlags } from '../lib/flags'
import {
  applyLayerStackAction,
  canAddAux,
  createAuxLayer,
  createPrimaryLayer,
  MAX_LAYERS,
  nextAuxName,
  patchLayerTransform,
  reorderLayersInDisplayOrder,
  revokeAuxUrls,
  syncPrimaryUrl,
  type LayerStackAction,
  type RefLayer,
} from '../lib/layers'
import {
  buildProjectSnapshot,
  clearAutosave,
  downloadProjectSnapshot,
  formatAutosaveTime,
  writeAutosave,
  type AutosaveMeta,
  type HydratedProject,
} from '../lib/projectSession'
import {
  createSavedPalette,
  loadSavedPalettes,
  matchPreset,
  saveSavedPalettes,
  selectIdsByHexes,
  type PalettePresetId,
  type SavedPalette,
} from '../lib/palettes'
import {
  createPose,
  downloadPosesJson,
  importPosesJson,
  loadPoses,
  renderPoseThumbnail,
  savePoses,
  type SavedPose,
} from '../lib/poses'
import {
  copyText,
  createRoomCode,
  loadHostRoomCode,
  saveHostRoomCode,
} from '../lib/rooms'
import { buildJoinUrl, renderJoinQrDataUrl } from '../lib/roomQr'
import {
  createSessionShot,
  downloadDataUrl,
  fileToCompressedDataUrl,
  loadSessionShots,
  saveSessionShots,
  type SessionShot,
} from '../lib/sessionGallery'
import {
  DEFAULT_CALC_MODE,
  DEFAULT_GUIDES,
  DEFAULT_LOUPE,
  calcModeFilter,
  type CalcModeSettings,
  type GuideKind,
  type GuideSettings,
  type LoupeSettings,
} from '../lib/studioTools'
import { loadAtmosphere, saveAtmosphere, type StudioAtmosphere } from '../lib/theme'

type StudioProps = {
  imageUrl: string
  onChangeImage: (file: File) => void
  onExit: () => void
  lessonBoot?: {
    guide: GuideKind
    opacity: number
    calcStrength?: number
    tip?: string
    title?: string
  } | null
  projectBoot?: HydratedProject | null
  onAutosaveWritten?: (meta: AutosaveMeta | null) => void
}

type SettingsSection = 'link' | 'keys' | 'flags' | 'project'

const LAYERS_OPEN_KEY = 'eyepaint-layers-sheet-open-v1'

function loadLayersSheetOpen(): boolean {
  try {
    const raw = localStorage.getItem(LAYERS_OPEN_KEY)
    if (raw === null) return true
    return raw === '1'
  } catch {
    return true
  }
}

function useDesktopStudioLayout() {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia('(min-width: 960px)')
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(min-width: 960px)').matches,
    () => true,
  )
}

const getStageCursorClass = (locked: boolean, dragMode: string) => {
  if (locked) return 'cursor-default'
  if (dragMode === 'rotate') return 'cursor-crosshair'
  if (dragMode === 'scale') return 'cursor-ns-resize'
  if (dragMode === 'tilt') return 'cursor-move'
  return 'cursor-grab active:cursor-grabbing'
}

const formatSessionRemaining = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const rootClass =
  'relative h-dvh w-full overflow-hidden touch-none select-none bg-[var(--ink-deep)] font-[family-name:var(--font-body)] text-[var(--fg)]'

const stageBase =
  'absolute inset-0 z-0 overflow-hidden bg-[radial-gradient(circle_at_50%_42%,#2a343a_0%,#141a1d_72%)]'

const stageLight =
  'absolute inset-0 z-0 overflow-hidden bg-[radial-gradient(circle_at_50%_42%,#d8e0e4_0%,#b7c2c8_72%)]'

export function Studio({
  imageUrl,
  onChangeImage,
  onExit,
  lessonBoot,
  projectBoot,
  onAutosaveWritten,
}: StudioProps) {
  const [roomEnabled, setRoomEnabled] = useState(false)
  const [roomCode, setRoomCode] = useState(() => loadHostRoomCode() ?? createRoomCode())
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [remoteFrozen, setRemoteFrozen] = useState(false)
  const [remoteTorch, setRemoteTorch] = useState(false)
  const room = useRoomPeer({
    enabled: roomEnabled,
    role: 'host',
    code: roomCode,
  })

  useEffect(() => {
    saveHostRoomCode(roomCode)
  }, [roomCode])

  useEffect(() => {
    if (!roomEnabled || !roomCode) {
      setQrDataUrl(null)
      return
    }
    let cancelled = false
    void renderJoinQrDataUrl(roomCode)
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [roomEnabled, roomCode])

  const { videoRef, ready, error, trackInfo } = useCamera(
    !roomEnabled,
    roomEnabled ? room.remoteStream : null,
  )
  const usingPhoneCam = Boolean(room.remoteStream)

  useEffect(() => {
    if (usingPhoneCam) return
    setRemoteFrozen(false)
    setRemoteTorch(false)
  }, [usingPhoneCam])

  const [flags, setFlags] = useState<FeatureFlags>(() => projectBoot?.flags ?? loadFlags())
  const [atmosphere, setAtmosphere] = useState<StudioAtmosphere>(
    () => projectBoot?.atmosphere ?? loadAtmosphere(),
  )
  const [opacity, setOpacity] = useState(
    () => projectBoot?.opacity ?? lessonBoot?.opacity ?? 0.45,
  )
  const [calcMode, setCalcMode] = useState<CalcModeSettings>(() =>
    projectBoot?.calcMode
      ? { ...projectBoot.calcMode }
      : {
          ...DEFAULT_CALC_MODE,
          enabled: Boolean(lessonBoot?.calcStrength),
          strength: lessonBoot?.calcStrength ?? DEFAULT_CALC_MODE.strength,
        },
  )
  const [guides, setGuides] = useState<GuideSettings>(() =>
    projectBoot?.guides
      ? { ...projectBoot.guides }
      : {
          ...DEFAULT_GUIDES,
          kind: lessonBoot?.guide ?? DEFAULT_GUIDES.kind,
        },
  )
  const [loupe, setLoupe] = useState<LoupeSettings>(() =>
    projectBoot?.loupe ? { ...projectBoot.loupe } : { ...DEFAULT_LOUPE },
  )
  const [loupePos, setLoupePos] = useState({ x: 50, y: 50 })
  const [loupeVisible, setLoupeVisible] = useState(false)
  const [sessionMins, setSessionMins] = useState<null | 25 | 45 | 90>(null)
  const [sessionEndsAt, setSessionEndsAt] = useState<number | null>(null)
  const [timerNow, setTimerNow] = useState(() => Date.now())
  const [autoSessionShot, setAutoSessionShot] = useState(true)
  const [shots, setShots] = useState<SessionShot[]>(() => loadSessionShots())
  const [layers, setLayers] = useState<RefLayer[]>(() =>
    projectBoot?.layers?.length
      ? projectBoot.layers.map((layer) => ({
          ...layer,
          transform: { ...layer.transform },
        }))
      : [createPrimaryLayer(imageUrl)],
  )
  const [activeLayerId, setActiveLayerId] = useState(
    () => projectBoot?.activeLayerId ?? 'primary',
  )
  const [locked, setLocked] = useState(() => projectBoot?.locked ?? false)
  const [uiHidden, setUiHidden] = useState(false)
  const [flash, setFlash] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<StudioToolId | null>(null)
  const [toolPanelOpen, setToolPanelOpen] = useState(false)
  const [layersSheetOpen, setLayersSheetOpen] = useState(loadLayersSheetOpen)
  const desktopLayout = useDesktopStudioLayout()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('link')
  const [savingProject, setSavingProject] = useState(false)
  const [autosaveLabel, setAutosaveLabel] = useState<string | null>(() =>
    projectBoot ? formatAutosaveTime(projectBoot.savedAt) : null,
  )

  const [palette, setPalette] = useState<PaletteColor[]>([])
  const [paletteLoading, setPaletteLoading] = useState(false)
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>(
    () => projectBoot?.selectedColorIds ?? [],
  )
  const [colorMode, setColorMode] = useState<ColorFilterMode>(
    () => projectBoot?.colorMode ?? 'off',
  )
  const [filteredUrl, setFilteredUrl] = useState<string | null>(null)
  const [filterBusy, setFilterBusy] = useState(false)
  const [colorPrecision, setColorPrecision] = useState<ColorPrecision>(
    () => projectBoot?.colorPrecision ?? loadColorPrecision(),
  )
  const [matchTolerance, setMatchTolerance] = useState(() =>
    projectBoot?.matchTolerance ??
    loadMatchTolerance(PRECISION_PROFILES[loadColorPrecision()].defaultTolerance),
  )
  const [pickMode, setPickMode] = useState(false)
  const [paletteSort, setPaletteSort] = useState<'dominance' | 'hue'>(
    () => projectBoot?.paletteSort ?? 'dominance',
  )
  const [selectionCoverage, setSelectionCoverage] = useState<number | null>(null)
  const [brush, setBrush] = useState<BrushMaskSettings>(() =>
    projectBoot?.brush ? { ...projectBoot.brush, editing: false } : { ...DEFAULT_BRUSH_MASK },
  )
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>(() => loadSavedPalettes())
  const paletteRef = useRef(palette)
  const colorSourceRef = useRef(imageUrl)
  const precisionRef = useRef(colorPrecision)
  paletteRef.current = palette

  const activeLayer = layers.find((layer) => layer.id === activeLayerId) ?? layers[0] ?? null
  const colorSourceUrl = activeLayer?.url ?? imageUrl
  const activeLayerName = activeLayer?.name ?? 'Основной'

  const [poses, setPoses] = useState<SavedPose[]>(() => projectBoot?.poses ?? loadPoses())

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
  const transform = activeLayer?.transform ?? DEFAULT_TRANSFORM
  const flipped = activeLayer?.flipped ?? false

  const setTransform: Dispatch<SetStateAction<OverlayTransform>> = (update) => {
    setLayers((prev) => patchLayerTransform(prev, activeLayerId, update))
  }

  const { reset, handlers, onWheel } = useOverlayTransform(
    locked || brush.editing,
    dragMode,
    transform,
    setTransform,
  )
  const onWheelRef = useRef(onWheel)
  onWheelRef.current = onWheel

  const displayUrl = filteredUrl ?? colorSourceUrl
  const framed = colorMode === 'mask'
  const showToast = (message: string) => setToast(message)

  useEffect(() => {
    if (!lessonBoot?.tip) return
    const label = lessonBoot.title ? `Урок · ${lessonBoot.title}` : 'Урок'
    showToast(`${label}: ${lessonBoot.tip}`)
    // tip once when lesson opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const layerDisplayUrl = (layerId: string, fallbackUrl: string) =>
    layerId === activeLayerId && filteredUrl ? filteredUrl : fallbackUrl

  useEffect(() => {
    if (!projectBoot?.hotkeys) return
    setHotkeys({ ...projectBoot.hotkeys })
  }, [projectBoot, setHotkeys])

  useEffect(() => {
    if (!projectBoot) return
    savePoses(projectBoot.poses)
    saveFlags(projectBoot.flags)
  }, [projectBoot])

  const collectSnapshotInput = () => ({
    layers,
    activeLayerId,
    opacity,
    calcMode,
    guides,
    loupe,
    atmosphere,
    locked,
    selectedColorIds,
    colorMode,
    colorPrecision,
    matchTolerance,
    paletteSort,
    brush,
    poses,
    flags,
    hotkeys,
    primaryFallbackUrl: imageUrl,
  })

  const handleSaveProjectFile = () => {
    setSavingProject(true)
    void buildProjectSnapshot(collectSnapshotInput())
      .then((snapshot) => {
        downloadProjectSnapshot(snapshot)
        showToast('Проект сохранён в файл')
      })
      .catch(() => showToast('Не удалось сохранить проект'))
      .finally(() => setSavingProject(false))
  }

  const handleClearAutosave = () => {
    void clearAutosave().then(() => {
      setAutosaveLabel(null)
      onAutosaveWritten?.(null)
      showToast('Автосейв очищен')
    })
  }

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      void buildProjectSnapshot(collectSnapshotInput())
        .then(async (snapshot) => {
          if (cancelled) return
          await writeAutosave(snapshot)
          if (cancelled) return
          const meta: AutosaveMeta = {
            savedAt: snapshot.savedAt,
            layerCount: snapshot.layers.length,
          }
          setAutosaveLabel(formatAutosaveTime(snapshot.savedAt))
          onAutosaveWritten?.(meta)
        })
        .catch(() => undefined)
    }, 1800)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot on meaningful studio edits
  }, [
    layers,
    activeLayerId,
    opacity,
    calcMode,
    guides,
    loupe,
    atmosphere,
    locked,
    selectedColorIds,
    colorMode,
    colorPrecision,
    matchTolerance,
    paletteSort,
    brush,
    poses,
    flags,
    hotkeys,
    imageUrl,
  ])

  useEffect(() => {
    const onUnload = () => {
      void buildProjectSnapshot(collectSnapshotInput())
        .then((snapshot) => writeAutosave(snapshot))
        .catch(() => undefined)
    }
    window.addEventListener('pagehide', onUnload)
    return () => window.removeEventListener('pagehide', onUnload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    layers,
    activeLayerId,
    opacity,
    calcMode,
    guides,
    loupe,
    atmosphere,
    locked,
    selectedColorIds,
    colorMode,
    colorPrecision,
    matchTolerance,
    paletteSort,
    brush,
    poses,
    flags,
    hotkeys,
    imageUrl,
  ])

  useEffect(() => {
    saveFlags(flags)
  }, [flags])

  useEffect(() => {
    saveAtmosphere(atmosphere)
    document.documentElement.dataset.atmosphere = atmosphere
    return () => {
      delete document.documentElement.dataset.atmosphere
    }
  }, [atmosphere])

  useEffect(() => {
    setLayers((prev) => syncPrimaryUrl(prev, imageUrl))
  }, [imageUrl])

  useEffect(() => {
    const node = stageRef.current
    if (!node) return
    const wheelListener = (event: WheelEvent) => {
      onWheelRef.current(event)
    }
    node.addEventListener('wheel', wheelListener, { passive: false })
    return () => node.removeEventListener('wheel', wheelListener)
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (!sessionEndsAt) return
    const tick = () => {
      const remaining = sessionEndsAt - Date.now()
      if (remaining <= 0) {
        setSessionEndsAt(null)
        setSessionMins(null)
        setToast('Сессия окончена')
        return
      }
      setTimerNow(Date.now())
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [sessionEndsAt])

  useEffect(() => {
    let cancelled = false
    const sourceChanged = colorSourceRef.current !== colorSourceUrl
    const precisionChanged = precisionRef.current !== colorPrecision
    colorSourceRef.current = colorSourceUrl
    precisionRef.current = colorPrecision
    saveColorPrecision(colorPrecision)

    if (sourceChanged) {
      setSelectedColorIds([])
      setColorMode('off')
      setPickMode(false)
      setBrush((prev) => ({ ...prev, dataUrl: null, editing: false }))
      setFilteredUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }

    if (sourceChanged || precisionChanged) {
      const nextTolerance = PRECISION_PROFILES[colorPrecision].defaultTolerance
      setMatchTolerance(nextTolerance)
      saveMatchTolerance(nextTolerance)
    }

    setPaletteLoading(true)
    const picks = sourceChanged
      ? []
      : paletteRef.current.filter((item) => item.source === 'pick')

    void extractPalette(colorSourceUrl, colorPrecision, picks)
      .then((colors) => {
        if (cancelled) return
        setPalette(colors)
        setSelectedColorIds((prev) =>
          sourceChanged ? [] : prev.filter((id) => colors.some((c) => c.id === id)),
        )
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
  }, [colorSourceUrl, colorPrecision])

  useEffect(() => {
    saveMatchTolerance(matchTolerance)
  }, [matchTolerance])

  useEffect(() => {
    let cancelled = false
    const selectedColors = palette.filter((color) => selectedColorIds.includes(color.id))
    const brushOpts =
      brush.dataUrl && flags.brushMask
        ? {
            maskDataUrl: brush.dataUrl,
            maskMode: brush.mode,
            combine: brush.combine,
          }
        : undefined

    const hasWork =
      (colorMode !== 'off' && (selectedColors.length > 0 || Boolean(brushOpts))) ||
      (Boolean(brushOpts) && selectedColors.length === 0)

    if (!hasWork) {
      setFilteredUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setFilterBusy(false)
      return
    }

    const mode = colorMode === 'mask' ? 'mask' : 'gray'
    setFilterBusy(true)
    void renderFilteredReference(colorSourceUrl, selectedColors, mode, matchTolerance, brushOpts)
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
  }, [
    colorSourceUrl,
    palette,
    selectedColorIds,
    colorMode,
    matchTolerance,
    brush.dataUrl,
    brush.mode,
    brush.combine,
    flags.brushMask,
  ])

  useEffect(() => {
    const selectedColors = palette.filter((color) => selectedColorIds.includes(color.id))
    if (selectedColors.length === 0) {
      setSelectionCoverage(null)
      return
    }
    let cancelled = false
    void estimateSelectionCoverage(colorSourceUrl, selectedColors, matchTolerance).then((value) => {
      if (!cancelled) setSelectionCoverage(value)
    })
    return () => {
      cancelled = true
    }
  }, [colorSourceUrl, palette, selectedColorIds, matchTolerance])

  const selectedSet = useMemo(() => new Set(selectedColorIds), [selectedColorIds])
  const visiblePalette = useMemo(
    () => sortPalette(palette, paletteSort),
    [palette, paletteSort],
  )
  const precisionProfile = PRECISION_PROFILES[colorPrecision]
  const visibleLayers = layers.filter((layer) => layer.visible)

  useEffect(() => {
    if (selectedColorIds.length === 0 && !brush.dataUrl) {
      setColorMode('off')
      return
    }
    setColorMode((mode) => (mode === 'off' ? 'gray' : mode))
  }, [selectedColorIds, brush.dataUrl])

  const handleOverlayPick = (event: MouseEvent<HTMLDivElement>) => {
    if (!pickMode || brush.editing) return
    event.stopPropagation()
    const target = overlayImageRef.current
    if (!target) return
    const rect = target.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) return
    const normX = (event.clientX - rect.left) / rect.width
    const normY = (event.clientY - rect.top) / rect.height
    if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return

    void (async () => {
      try {
        const rgb = await sampleColorAtImagePoint(colorSourceUrl, normX, normY)
        const picked = createPickedColor(rgb, paletteRef.current)
        setPalette((prev) =>
          prev.some((item) => item.id === picked.id) ? prev : [picked, ...prev],
        )
        setSelectedColorIds((prev) =>
          prev.includes(picked.id) ? prev : [...prev, picked.id],
        )
        setColorMode((mode) => (mode === 'off' ? 'gray' : mode))
        setToast(`Пипетка · ${picked.hex}`)
      } catch {
        setToast('Не удалось взять цвет')
      }
    })()
  }

  useEffect(() => {
    if (activeTool !== 'eyedropper' && pickMode) setPickMode(false)
    if (activeTool !== 'eyedropper' && brush.editing) {
      setBrush((prev) => ({ ...prev, editing: false }))
    }
  }, [activeTool, pickMode, brush.editing])

  const captureProgressFile = async () => {
    const stage = stageRef.current
    const video = videoRef.current
    const overlayImage = overlayImageRef.current
    if (!stage || !video || !overlayImage || !ready) return null
    return captureCompositeFrame({
      stage,
      video,
      overlayImage,
      transform,
      opacity,
      flipped,
      framed,
    })
  }

  const pushShot = async (kind: SessionShot['kind']) => {
    try {
      const file = await captureProgressFile()
      if (!file) {
        showToast('Камера ещё не готова')
        return
      }
      const dataUrl = await fileToCompressedDataUrl(file)
      const next = [createSessionShot(kind, dataUrl), ...shots].slice(0, 10)
      setShots(next)
      saveSessionShots(next)
      showToast(kind === 'start' ? 'Снимок «до» сохранён' : 'Прогресс сохранён')
    } catch {
      showToast('Не удалось сохранить снимок')
    }
  }

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
    if (flags.multiLayers) {
      if (!canAddAux(layers)) {
        showToast(`Лимит ${MAX_LAYERS} слоёв — удали лишние`)
        return
      }
      const url = URL.createObjectURL(file)
      const aux = createAuxLayer(url, nextAuxName(layers), layers)
      if (aux) {
        setLayers((prev) => [...prev, aux])
        setActiveLayerId(aux.id)
        showToast(`${aux.name} · двигай и крась этот слой`)
        return
      }
      URL.revokeObjectURL(url)
      showToast(`Лимит ${MAX_LAYERS} слоёв — удали лишние`)
      return
    }
    onChangeImage(file)
    setActiveLayerId('primary')
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === 'primary'
          ? {
              ...layer,
              transform: { ...DEFAULT_TRANSFORM },
              flipped: false,
            }
          : layer,
      ),
    )
    setLocked(false)
  }

  const selectLayer = (id: string) => {
    if (id === activeLayerId) return
    setActiveLayerId(id)
    const layer = layers.find((item) => item.id === id)
    showToast(layer ? `Активен: ${layer.name} · двигай его` : 'Слой выбран')
  }

  const handleSavePose = () => {
    void (async () => {
      let thumbnail: string | null = null
      try {
        thumbnail = await renderPoseThumbnail(displayUrl, transform, flipped)
      } catch {
        thumbnail = null
      }
      const next = [
        createPose(transform, flipped, opacity, poses, {
          thumbnail,
          selectedColorIds,
        }),
        ...poses,
      ].slice(0, 24)
      setPoses(next)
      savePoses(next)
      showToast('Позиция сохранена')
    })()
  }

  const handleApplyPose = (pose: SavedPose) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === activeLayerId
          ? {
              ...layer,
              transform: { ...pose.transform },
              flipped: pose.flipped,
              opacity: pose.opacity,
            }
          : layer,
      ),
    )
    if (pose.selectedColorIds?.length) {
      setSelectedColorIds(
        pose.selectedColorIds.filter((id) => palette.some((color) => color.id === id)),
      )
    }
    showToast(`Вернули на слой: ${pose.name}`)
  }

  const handleStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!loupe.enabled) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100))
    setLoupePos({ x, y })
    setLoupeVisible(true)
  }

  const startSession = (minutes: 25 | 45 | 90) => {
    const now = Date.now()
    setTimerNow(now)
    setSessionMins(minutes)
    setSessionEndsAt(now + minutes * 60_000)
    if (flags.sessionGallery && autoSessionShot) {
      void pushShot('start')
    }
  }

  const toggleRemoteFreeze = () => {
    const value = !remoteFrozen
    void room.sendCommand({ type: 'freeze', value }).then((ok) => {
      if (ok) setRemoteFrozen(value)
      else showToast('Телефон не ответил')
    })
  }

  const toggleRemoteTorch = () => {
    const value = !remoteTorch
    void room.sendCommand({ type: 'torch', value }).then((ok) => {
      if (ok) setRemoteTorch(value)
      else showToast('Телефон не ответил')
    })
  }

  const sessionRemainingLabel =
    sessionEndsAt && sessionMins ? formatSessionRemaining(sessionEndsAt - timerNow) : null
  const roomJoinUrl = roomEnabled && roomCode ? buildJoinUrl(roomCode) : null
  const cameraLabel = usingPhoneCam
    ? `Камера: телефон${trackInfo ? ` · ${trackInfo}` : ''}${remoteFrozen ? ' · freeze' : ''}`
    : ready
      ? `Камера: локальная${trackInfo ? ` · ${trackInfo}` : ''}`
      : 'Камера: нет'

  const showToolInspector =
    settingsOpen || (toolPanelOpen && activeTool !== null && activeTool !== 'layers')

  const loupeMode = activeTool === 'loupe' && loupe.enabled
  const blockLayerGestures = loupeMode || pickMode || brush.editing

  /** Exclusive modes die when switching tools; sticky overlays stay until their rail toggle. */
  const deactivateExclusive = (tool: StudioToolId | null) => {
    if (!tool) return
    if (tool === 'eyedropper') {
      setPickMode(false)
      setBrush((prev) => (prev.editing ? { ...prev, editing: false } : prev))
    }
    if (tool === 'loupe') {
      setLoupe((prev) => (prev.enabled ? { ...prev, enabled: false } : prev))
      setLoupeVisible(false)
    }
  }

  const deactivateSticky = (tool: StudioToolId | null) => {
    if (!tool) return
    if (tool === 'calc') {
      setCalcMode((prev) => (prev.enabled ? { ...prev, enabled: false } : prev))
    }
    if (tool === 'guides') {
      setGuides((prev) => (prev.kind === 'none' ? prev : { ...prev, kind: 'none' }))
    }
  }

  const deactivateOneTool = (tool: StudioToolId | null) => {
    deactivateExclusive(tool)
    deactivateSticky(tool)
  }

  const handleSelectTool = (tool: StudioToolId) => {
    setSettingsOpen(false)
    if (tool === 'layers') {
      deactivateExclusive(activeTool)
      setToolPanelOpen(false)
      setLayersSheetOpen((prev) => {
        const next = !prev
        setActiveTool(next ? 'layers' : null)
        return next
      })
      return
    }

    const stickyOn =
      (tool === 'guides' && guides.kind !== 'none') || (tool === 'calc' && calcMode.enabled)

    // Sticky: повторный клик при открытой панели = выкл; иначе — снова открыть панель
    if (stickyOn) {
      if (activeTool === tool && toolPanelOpen) {
        deactivateSticky(tool)
        setActiveTool(null)
        setToolPanelOpen(false)
        return
      }
      deactivateExclusive(activeTool)
      setActiveTool(tool)
      setToolPanelOpen(true)
      return
    }

    // Exclusive / обычные: повторный клик = выкл
    if (activeTool === tool) {
      deactivateOneTool(tool)
      setActiveTool(null)
      setToolPanelOpen(false)
      return
    }

    deactivateExclusive(activeTool)
    setActiveTool(tool)
    setToolPanelOpen(true)

    if (tool === 'eyedropper') {
      setPickMode(true)
      setBrush((prev) => ({ ...prev, editing: false }))
    }
    if (tool === 'loupe') {
      setLoupe((prev) => ({ ...prev, enabled: true }))
      setLoupeVisible(true)
      setLoupePos({ x: 50, y: 50 })
    }
    if (tool === 'calc') {
      setCalcMode((prev) => ({ ...prev, enabled: true }))
    }
    if (tool === 'guides') {
      setGuides((prev) => ({ ...prev, kind: prev.kind === 'none' ? 'thirds' : prev.kind }))
    }
  }

  const layersPanel = (
    <LayersPanel
      variant={desktopLayout ? 'column' : 'sheet'}
      compact={!desktopLayout && showToolInspector && !settingsOpen}
      onRequestExpand={() => {
        setToolPanelOpen(false)
        setActiveTool('layers')
        setLayersSheetOpen(true)
      }}
      open={layersSheetOpen}
      onOpenChange={(next) => {
        setLayersSheetOpen(next)
        if (!next && activeTool === 'layers') setActiveTool(null)
        if (next) setActiveTool('layers')
      }}
      layers={layers}
      activeLayerId={activeLayerId}
      onSelectLayer={selectLayer}
      onReorderLayers={(fromId, toId) => {
        setLayers((prev) => reorderLayersInDisplayOrder(prev, fromId, toId))
        setActiveLayerId(fromId)
      }}
      onStackAction={(id, action: LayerStackAction) => {
        setLayers((prev) => applyLayerStackAction(prev, id, action))
        setActiveLayerId(id)
        const labels: Record<LayerStackAction, string> = {
          front: 'на передний план',
          forward: 'ближе',
          backward: 'дальше',
          back: 'на задний план',
        }
        showToast(`Слой ${labels[action]}`)
      }}
      onLayerOpacity={(id, value) =>
        setLayers((prev) =>
          prev.map((layer) => (layer.id === id ? { ...layer, opacity: value } : layer)),
        )
      }
      onLayerVisible={(id) =>
        setLayers((prev) =>
          prev.map((layer) =>
            layer.id === id ? { ...layer, visible: !layer.visible } : layer,
          ),
        )
      }
      onRemoveLayer={(id) => {
        setLayers((prev) => {
          const target = prev.find((layer) => layer.id === id)
          if (target?.kind === 'aux') revokeAuxUrls([target])
          return prev.filter((layer) => layer.id !== id)
        })
        if (activeLayerId === id) setActiveLayerId('primary')
      }}
      ready={ready}
      capturing={capturing}
      onCapture={() => void handleCapture()}
      onPickFile={(file) => applyPickedFile(file)}
      flipped={flipped}
      onFlip={() =>
        setLayers((prev) =>
          prev.map((layer) =>
            layer.id === activeLayerId ? { ...layer, flipped: !layer.flipped } : layer,
          ),
        )
      }
      locked={locked}
      onToggleLock={() => setLocked((value) => !value)}
      onReset={reset}
    />
  )

  const mainPanelProps = {
    opacity,
    onOpacity: setOpacity,
    calcMode,
    onCalcMode: setCalcMode,
    guides,
    onGuides: setGuides,
    loupe,
    onLoupeChange: setLoupe,
    sessionMins,
    sessionRemainingLabel,
    onStartSession: startSession,
    usingPhoneCam,
    remoteFrozen,
    remoteTorch,
    onToggleFreeze: toggleRemoteFreeze,
    onToggleTorch: toggleRemoteTorch,
    galleryEnabled: flags.sessionGallery,
    autoSessionShot,
    onAutoSessionShot: setAutoSessionShot,
    shots,
    onProgressShot: () => void pushShot('progress'),
    onDownloadShot: (shot: SessionShot) =>
      downloadDataUrl(shot.dataUrl, `eyepaint-${shot.kind}-${shot.createdAt}.jpg`),
    onClearShots: () => {
      setShots([])
      saveSessionShots([])
      showToast('Галерея очищена')
    },
    atmosphere,
    atmosphereEnabled: flags.lightTheme,
    onAtmosphere: setAtmosphere,
  }

  const toolPanelBody = settingsOpen ? (
    <SettingsPanel
      section={settingsSection}
      onSection={setSettingsSection}
      roomEnabled={roomEnabled}
      roomCode={roomCode}
      qrDataUrl={qrDataUrl}
      roomJoinUrl={roomJoinUrl}
      roomStatus={room.status}
      roomError={room.error}
      trackInfo={trackInfo}
      onCopyCode={() => {
        void copyText(roomCode).then((ok) =>
          showToast(ok ? 'Код скопирован' : 'Не удалось скопировать'),
        )
      }}
      onNewCode={() => {
        const next = createRoomCode()
        setRoomCode(next)
        saveHostRoomCode(next)
        showToast('Новая комната')
      }}
      onDisableRoom={() => setRoomEnabled(false)}
      onEnableRoom={() => {
        if (!roomCode) {
          const next = createRoomCode()
          setRoomCode(next)
          saveHostRoomCode(next)
        }
        setRoomEnabled(true)
      }}
      hotkeys={hotkeys}
      listeningFor={listeningFor}
      setListeningFor={setListeningFor}
      formatHotkey={formatHotkey}
      setHotkeys={setHotkeys}
      onHotkeysResetToast={() => showToast('Клавиши сброшены')}
      flags={flags}
      onFlags={setFlags}
      onSaveProject={handleSaveProjectFile}
      onClearAutosave={handleClearAutosave}
      savingProject={savingProject}
      autosaveLabel={autosaveLabel}
    />
  ) : activeTool === 'hand' ? (
    <MainPanel {...mainPanelProps} focus="hand" />
  ) : activeTool === 'calc' ? (
    <MainPanel {...mainPanelProps} focus="calc" />
  ) : activeTool === 'guides' ? (
    <MainPanel {...mainPanelProps} focus="guides" />
  ) : activeTool === 'loupe' ? (
    <MainPanel {...mainPanelProps} focus="loupe" />
  ) : activeTool === 'perspective' ? (
    <ProjectPanel transform={transform} setTransform={setTransform} />
  ) : activeTool === 'eyedropper' ? (
    <ColorsPanel
      precisionProfile={precisionProfile}
      colorPrecision={colorPrecision}
      onPrecision={setColorPrecision}
      matchTolerance={matchTolerance}
      onTolerance={setMatchTolerance}
      paletteLoading={paletteLoading}
      palette={palette}
      visiblePalette={visiblePalette}
      selectedColorIds={selectedColorIds}
      selectedSet={selectedSet}
      selectionCoverage={selectionCoverage}
      paletteSort={paletteSort}
      onPaletteSort={() =>
        setPaletteSort((value) => (value === 'hue' ? 'dominance' : 'hue'))
      }
      onToggleColor={(id) =>
        setSelectedColorIds((prev) =>
          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
        )
      }
      onSelectAll={() => setSelectedColorIds(palette.map((c) => c.id))}
      onInvert={() => {
        const set = new Set(selectedColorIds)
        setSelectedColorIds(palette.filter((c) => !set.has(c.id)).map((c) => c.id))
      }}
      onResetSelection={() => {
        setSelectedColorIds([])
        setColorMode('off')
      }}
      pickMode={pickMode}
      onPickMode={() => {
        setPickMode((value) => !value)
        setBrush((prev) => ({ ...prev, editing: false }))
        setActiveTool('eyedropper')
      }}
      colorMode={colorMode}
      filterBusy={filterBusy}
      onMaskMode={() => setColorMode((mode) => (mode === 'mask' ? 'gray' : 'mask'))}
      onGrayMode={() => setColorMode('gray')}
      brushEnabled={flags.brushMask}
      brush={brush}
      onBrush={setBrush}
      onClearBrush={() =>
        setBrush((prev) => ({
          ...prev,
          dataUrl: null,
          editing: false,
        }))
      }
      onPreset={(id: PalettePresetId) => {
        const ids = matchPreset(palette, id)
        setSelectedColorIds(ids)
        if (ids.length === 0) showToast('Пресет ничего не нашёл')
        else showToast(`Пресет · ${ids.length} цветов`)
      }}
      savedPalettes={savedPalettes}
      onSavePalette={() => {
        const hexes = palette
          .filter((color) => selectedColorIds.includes(color.id))
          .map((color) => color.hex)
        if (hexes.length === 0) return
        const next = [
          createSavedPalette(`Палитра ${savedPalettes.length + 1}`, hexes, savedPalettes),
          ...savedPalettes,
        ].slice(0, 12)
        setSavedPalettes(next)
        saveSavedPalettes(next)
        showToast('Палитра сохранена')
      }}
      onApplySaved={(item) => {
        const ids = selectIdsByHexes(palette, item.hexes)
        setSelectedColorIds(ids)
        showToast(
          ids.length > 0
            ? `Применено: ${item.name}`
            : 'Нет совпадений на этом референсе',
        )
      }}
      onDeleteSaved={(id) => {
        const next = savedPalettes.filter((item) => item.id !== id)
        setSavedPalettes(next)
        saveSavedPalettes(next)
      }}
      activeLayerName={flags.multiLayers ? activeLayerName : undefined}
    />
  ) : activeTool === 'poses' ? (
    <PosesPanel
      transform={transform}
      flipped={flipped}
      opacity={opacity}
      poses={poses}
      onSave={handleSavePose}
      onApply={handleApplyPose}
      onDelete={(id) => {
        const next = poses.filter((item) => item.id !== id)
        setPoses(next)
        savePoses(next)
        showToast('Поза удалена')
      }}
      onClear={() => {
        setPoses([])
        savePoses([])
        showToast('Список поз очищен')
      }}
      onExport={() => {
        downloadPosesJson(poses)
        showToast('JSON экспортирован')
      }}
      onImportFile={(file) => {
        if (!file) return
        void file
          .text()
          .then((raw) => {
            const imported = importPosesJson(raw)
            const next = [...imported, ...poses].slice(0, 24)
            setPoses(next)
            savePoses(next)
            showToast(`Импорт · ${imported.length}`)
          })
          .catch(() => showToast('Не удалось импортировать'))
      }}
    />
  ) : null

  const toolPanelChrome = (
    <>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--glass-border-soft)] px-3.5 py-2.5">
        <p className={sectionTitleClass}>
          {settingsOpen
            ? 'Настройки'
            : activeTool && activeTool !== 'layers'
              ? STUDIO_TOOL_LABELS[activeTool]
              : 'Инструмент'}
        </p>
        <button
          type="button"
          className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill-mid)] px-3 py-1.5 text-[0.78rem] font-semibold leading-none text-[var(--fg-strong)]"
          onClick={() => {
            if (settingsOpen) setSettingsOpen(false)
            else setToolPanelOpen(false)
          }}
        >
          {settingsOpen ? 'К студии' : 'Закрыть'}
        </button>
      </div>
      <div
        className={cn(
          'min-h-0 flex-1 overflow-auto overscroll-contain px-3.5 py-3 [-webkit-overflow-scrolling:touch]',
          scrollAreaClass,
        )}
      >
        {toolPanelBody}
      </div>
    </>
  )

  return (
    <div className={rootClass} data-atmosphere={atmosphere}>
      <div
        ref={stageRef}
        className={cn(
          atmosphere === 'light' ? stageLight : stageBase,
          getStageCursorClass(locked || blockLayerGestures, dragMode),
          loupeMode && 'touch-none cursor-crosshair',
        )}
        onPointerDown={(event) => {
          handleStagePointerMove(event)
          if (loupeMode) {
            event.currentTarget.setPointerCapture(event.pointerId)
            event.preventDefault()
            return
          }
          if (!blockLayerGestures) handlers.onPointerDown(event)
        }}
        onPointerMove={(event) => {
          handleStagePointerMove(event)
          if (loupeMode) {
            event.preventDefault()
            return
          }
          if (!blockLayerGestures) handlers.onPointerMove(event)
        }}
        onPointerUp={(event) => {
          if (loupeMode) {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
            return
          }
          if (!blockLayerGestures) handlers.onPointerUp(event)
        }}
        onPointerCancel={(event) => {
          if (loupeMode) {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
            return
          }
          if (!blockLayerGestures) handlers.onPointerCancel(event)
        }}
        onPointerLeave={() => {
          if (!loupeMode) setLoupeVisible(false)
        }}
      >
        <video
          ref={videoRef}
          className={cameraClass}
          style={{ filter: calcModeFilter(calcMode) }}
          playsInline
          muted
          autoPlay
        />

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

        {visibleLayers.map((layer, index) => {
          const isActive = activeLayerId === layer.id
          const isPrimary = layer.kind === 'primary'
          const layerUrl = isPrimary ? imageUrl : layer.url
          return (
            <div
              key={layer.id}
              className={cn(
                'absolute left-1/2 top-1/2 w-[min(88vw,520px)] origin-center [transform-style:preserve-3d] [will-change:transform,opacity] min-[960px]:w-[min(72vw,620px)]',
                isActive &&
                  framed &&
                  'rounded-[4px] outline-2 outline-offset-[6px] outline-[rgba(224,154,106,0.95)]',
                isActive &&
                  (pickMode || brush.editing) &&
                  'cursor-crosshair ring-2 ring-accent/70 ring-offset-2 ring-offset-transparent',
              )}
              style={{
                opacity: opacity * layer.opacity,
                transform: buildOverlayCssTransform(layer.transform, layer.flipped),
                zIndex: 2 + index,
                pointerEvents:
                  loupeMode
                    ? 'none'
                    : isActive && (pickMode || brush.editing)
                      ? 'auto'
                      : locked
                        ? 'none'
                        : isActive
                          ? 'auto'
                          : 'none',
              }}
              onClick={isActive ? handleOverlayPick : undefined}
              onPointerDown={(event) => {
                if (isActive && (pickMode || brush.editing)) {
                  event.stopPropagation()
                }
              }}
            >
              <img
                ref={isActive ? overlayImageRef : undefined}
                src={layerDisplayUrl(layer.id, layerUrl)}
                alt={isPrimary ? 'Референс для срисовывания' : layer.name}
                draggable={false}
                className="pointer-events-none h-auto max-h-[75dvh] w-full object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
              />
              {flags.brushMask && isPrimary && isActive && (
                <MaskPainter
                  settings={brush}
                  onChange={(dataUrl) =>
                    setBrush((prev) => ({
                      ...prev,
                      dataUrl,
                      enabled: true,
                    }))
                  }
                  className="absolute inset-0 h-full w-full"
                />
              )}
            </div>
          )
        })}

        <GuideOverlay kind={guides.kind} opacity={guides.opacity} />

        {loupe.enabled && loupeVisible && (
          <LoupeOverlay
            visible
            size={loupe.size}
            zoom={loupe.zoom}
            pos={loupePos}
            stageRef={stageRef}
            sourceVideoRef={videoRef}
            layers={visibleLayers.map((layer) => ({
              ...layer,
              url: layerDisplayUrl(layer.id, layer.kind === 'primary' ? imageUrl : layer.url),
            }))}
            activeLayerId={activeLayerId}
            opacity={opacity}
            framedActive={framed}
            calcFilter={calcModeFilter(calcMode)}
          />
        )}

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
        <header
          className="absolute inset-x-0 top-0 z-30 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 pb-3 pt-[calc(var(--safe-top)+0.65rem)] animate-[rise-in_0.35s_ease_both] sm:px-4"
          style={{ background: 'var(--header-fade)' }}
        >
          <button
            type="button"
            className={glassIconButtonClass}
            onClick={onExit}
            aria-label="Назад"
            title="Назад"
            data-help="studio-back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 6 9 12l6 6"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="min-w-0 justify-self-center text-center">
            <p className="font-[family-name:var(--font-display)] text-[0.78rem] font-bold tracking-[0.08em] text-[var(--fg-strong)]">
              EYEPAINT
            </p>
            <p className="truncate text-[0.68rem] text-[var(--fg-muted)]">{cameraLabel}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 justify-self-end">
            <HelpToggleButton />
            {roomEnabled && (
              <span
                className={cn(
                  chromePillClass,
                  'hidden sm:inline-flex',
                  usingPhoneCam
                    ? 'border-accent/50 bg-accent/20 text-[var(--chip-accent-fg)]'
                    : 'text-[var(--fg-muted)]',
                )}
              >
                {usingPhoneCam ? 'Телефон' : 'Жду…'}
              </span>
            )}
            <button
              type="button"
              className={cn(
                glassIconButtonClass,
                settingsOpen && 'border-accent/55 bg-accent/20 text-[var(--chip-accent-fg)]',
              )}
              aria-label={settingsOpen ? 'Закрыть настройки' : 'Настройки'}
              title={settingsOpen ? 'К студии' : 'Настройки'}
              aria-pressed={settingsOpen}
              data-help="studio-settings"
              onClick={() => {
                setSettingsOpen((value) => {
                  const next = !value
                  if (next) {
                    setToolPanelOpen(false)
                    setActiveTool(null)
                    deactivateExclusive(activeTool)
                    if (!desktopLayout) setLayersSheetOpen(false)
                  }
                  return next
                })
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.1 7.1 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.22-1.13.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.77 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.89 14.5a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.41 1.05.73 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.58-.22 1.13-.53 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
                />
              </svg>
            </button>
            <button
              type="button"
              className={glassIconButtonClass}
              onClick={() => setUiHidden(true)}
              aria-label="Скрыть интерфейс"
              title="Скрыть"
              data-help="studio-hide"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3 3l18 18M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2M9.9 5.2A11 11 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-4.2 4.8M6.1 6.1A18 18 0 0 0 2 12s3.5 7 10 7c1.3 0 2.5-.2 3.6-.6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </header>
      )}

      {!uiHidden && (
        <>
          {!settingsOpen && (
            <ToolRail
              activeTool={activeTool}
              layersSheetOpen={layersSheetOpen}
              guidesOn={guides.kind !== 'none'}
              calcOn={calcMode.enabled}
              loupeOn={loupeMode}
              onSelect={handleSelectTool}
            />
          )}

          {desktopLayout &&
            flags.multiLayers &&
            layers.length > 0 &&
            layersSheetOpen && <div className={layersColumnClass}>{layersPanel}</div>}

          {desktopLayout && showToolInspector && (
            <aside
              className={cn(
                toolInspectorClass,
                settingsOpen && 'max-h-[min(62vh,560px)] w-[min(320px,calc(100vw-22rem))]',
              )}
              translate={settingsOpen ? 'no' : undefined}
              aria-label={settingsOpen ? 'Настройки' : 'Настройки инструмента'}
            >
              {toolPanelChrome}
            </aside>
          )}

          {!desktopLayout && (
            <div className={dockShellClass}>
              {!settingsOpen && flags.multiLayers && layers.length > 0 && layersPanel}
              {showToolInspector && (
                <aside
                  className={cn(dockClass, settingsOpen && 'max-h-[min(58dvh,520px)]')}
                  translate={settingsOpen ? 'no' : undefined}
                  aria-label={settingsOpen ? 'Настройки' : 'Настройки инструмента'}
                >
                  {toolPanelChrome}
                </aside>
              )}
            </div>
          )}
        </>
      )}

      {!uiHidden && desktopLayout && !showToolInspector && (
        <div
          className="pointer-events-none absolute left-[4.85rem] right-[min(320px,28vw)] top-[calc(var(--safe-top)+3.6rem)] z-[2] hidden text-center text-[0.72rem] text-[var(--fg-faint)] min-[960px]:block"
          aria-hidden="true"
        >
          {formatHotkey(hotkeys.pan)} двигать · {formatHotkey(hotkeys.rotate)} поворот ·{' '}
          {formatHotkey(hotkeys.scale)} масштаб · {formatHotkey(hotkeys.tilt)} наклон · колёсико
          зум
        </div>
      )}

      {toast && <Toast message={toast} />}

      {uiHidden && (
        <button
          type="button"
          className="eyepaint-glass-chip absolute bottom-[calc(var(--safe-bottom)+0.35rem)] right-2 z-40 grid h-12 w-12 place-items-center rounded-full text-[var(--fg-strong)]"
          onClick={() => setUiHidden(false)}
          aria-label="Показать интерфейс"
          data-help="studio-show"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </button>
      )}
    </div>
  )
}
