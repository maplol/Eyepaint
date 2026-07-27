import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  layerStackLabel,
  type LayerStackAction,
  type RefLayer,
} from '../../lib/layers'
import { StableLabel } from './StableLabel'
import {
  chipAccentClass,
  chipFileClass,
  chipNeutralClass,
  cn,
  glassButtonClass,
  hiddenFileInputClass,
  layersSheetClass,
  mutedTextClass,
  rangeInputClass,
  rowClass,
  sectionTitleClass,
  toggleChipClass,
} from './studioUi'

const LAYERS_OPEN_KEY = 'eyepaint-layers-sheet-open-v1'

function loadLayersOpen(): boolean {
  try {
    const raw = localStorage.getItem(LAYERS_OPEN_KEY)
    if (raw === null) return false
    return raw === '1'
  } catch {
    return false
  }
}

function saveLayersOpen(open: boolean) {
  try {
    localStorage.setItem(LAYERS_OPEN_KEY, open ? '1' : '0')
  } catch {
    /* ignore */
  }
}

type LayersPanelProps = {
  layers: RefLayer[]
  activeLayerId: string
  onSelectLayer: (id: string) => void
  onLayerOpacity: (id: string, opacity: number) => void
  onLayerVisible: (id: string) => void
  onRemoveLayer: (id: string) => void
  onReorderLayers: (fromId: string, toId: string) => void
  onStackAction: (id: string, action: LayerStackAction) => void
  ready: boolean
  capturing: boolean
  onCapture: () => void
  onPickFile: (file: File | undefined, source: 'gallery' | 'camera') => void
  flipped: boolean
  onFlip: () => void
  locked: boolean
  onToggleLock: () => void
  onReset: () => void
}

const STACK_ACTIONS: Array<{ action: LayerStackAction; label: string }> = [
  { action: 'front', label: 'На передний план' },
  { action: 'forward', label: 'Ближе (вперёд)' },
  { action: 'backward', label: 'Дальше (назад)' },
  { action: 'back', label: 'На задний план' },
]

type MenuAnchor = {
  id: string
  top: number
  left: number
}

export function LayersPanel(props: LayersPanelProps) {
  const menuRootId = useId()
  const [open, setOpen] = useState(loadLayersOpen)
  const [dragId, setDragId] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuAnchor | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const itemRefs = useRef(new Map<string, HTMLLIElement>())
  const dragIdRef = useRef<string | null>(null)
  const prevCountRef = useRef(props.layers.length)

  const displayLayers = [...props.layers].reverse()
  const canReorder = props.layers.length > 1
  const displayLayersRef = useRef(displayLayers)
  const onReorderRef = useRef(props.onReorderLayers)

  displayLayersRef.current = displayLayers
  onReorderRef.current = props.onReorderLayers

  const activeLayer =
    props.layers.find((layer) => layer.id === props.activeLayerId) ?? props.layers[0] ?? null

  useEffect(() => {
    saveLayersOpen(open)
  }, [open])

  useEffect(() => {
    if (props.layers.length > prevCountRef.current) setOpen(true)
    prevCountRef.current = props.layers.length
  }, [props.layers.length])

  useEffect(() => {
    dragIdRef.current = dragId
  }, [dragId])

  useEffect(() => {
    if (!menu) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (menuRef.current?.contains(target)) return
      setMenu(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(null)
        if (!dragIdRef.current) setOpen(false)
      }
    }
    const onScroll = () => setMenu(null)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onScroll)
    }
  }, [menu])

  const openLayerMenu = (layerId: string, anchor: DOMRect) => {
    const width = 184
    const estimatedHeight = 220
    let left = Math.min(anchor.right - width, window.innerWidth - width - 8)
    left = Math.max(8, left)
    let top = anchor.bottom + 6
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = Math.max(8, anchor.top - estimatedHeight - 6)
    }
    setMenu({ id: layerId, top, left })
  }

  const findDropTarget = (clientY: number, currentDragId: string) => {
    let bestId: string | null = null
    let bestDist = Number.POSITIVE_INFINITY
    for (const layer of displayLayersRef.current) {
      if (layer.id === currentDragId) continue
      const node = itemRefs.current.get(layer.id)
      if (!node) continue
      const rect = node.getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      const dist = Math.abs(clientY - mid)
      if (clientY >= rect.top && clientY <= rect.bottom && dist < bestDist) {
        bestDist = dist
        bestId = layer.id
      }
    }
    return bestId
  }

  const onHandlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    layerId: string,
  ) => {
    if (!canReorder) return
    event.preventDefault()
    event.stopPropagation()
    setMenu(null)
    setDragId(layerId)
    dragIdRef.current = layerId
    event.currentTarget.setPointerCapture(event.pointerId)

    const onMove = (moveEvent: PointerEvent) => {
      const current = dragIdRef.current
      if (!current) return
      const targetId = findDropTarget(moveEvent.clientY, current)
      if (targetId && targetId !== current) {
        onReorderRef.current(current, targetId)
      }
    }

    const onUp = (upEvent: PointerEvent) => {
      try {
        event.currentTarget.releasePointerCapture(upEvent.pointerId)
      } catch {
        /* ignore */
      }
      event.currentTarget.removeEventListener('pointermove', onMove)
      event.currentTarget.removeEventListener('pointerup', onUp)
      event.currentTarget.removeEventListener('pointercancel', onUp)
      setDragId(null)
      dragIdRef.current = null
    }

    event.currentTarget.addEventListener('pointermove', onMove)
    event.currentTarget.addEventListener('pointerup', onUp)
    event.currentTarget.addEventListener('pointercancel', onUp)
  }

  if (props.layers.length === 0) return null

  if (!open) {
    return (
      <div className="flex shrink-0 justify-end" aria-label="Блок слоёв">
        <button
          type="button"
          className={cn(glassButtonClass, 'max-w-full gap-2 px-3.5 py-2 text-[0.78rem]')}
          aria-expanded={false}
          aria-controls="eyepaint-layers-sheet"
          onClick={() => setOpen(true)}
        >
          <span className="font-bold text-[var(--fg-strong)]">Слои · {props.layers.length}</span>
          <span className="truncate text-[var(--fg-muted)]">
            {activeLayer ? activeLayer.name : 'открыть'}
          </span>
        </button>
      </div>
    )
  }

  const menuLayer = menu ? props.layers.find((layer) => layer.id === menu.id) : null
  const menuDisplayIndex = menu
    ? displayLayers.findIndex((layer) => layer.id === menu.id)
    : -1

  return (
    <section
      id="eyepaint-layers-sheet"
      className={layersSheetClass}
      aria-label="Блок слоёв"
      aria-modal="false"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--glass-border-soft)] px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <p className={sectionTitleClass}>Слои</p>
          <p className={cn(mutedTextClass, 'truncate')}>
            {activeLayer
              ? `Активен: ${activeLayer.name} · тяни ≡ для порядка`
              : 'Экран над меню студии'}
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill-mid)] px-3 py-1.5 text-[0.78rem] font-semibold text-[var(--fg-strong)]"
          aria-expanded={true}
          onClick={() => {
            setOpen(false)
            setMenu(null)
          }}
        >
          Закрыть
        </button>
      </div>

      <ul
        ref={listRef}
        className="grid min-h-0 flex-1 gap-1.5 overflow-auto overscroll-contain px-3 py-2 [-webkit-overflow-scrolling:touch]"
        aria-label="Слои референса"
      >
        {displayLayers.map((layer) => {
          const isActive = props.activeLayerId === layer.id
          const isDragging = dragId === layer.id
          const stackHint = layerStackLabel(props.layers, layer.id)
          const menuOpen = menu?.id === layer.id

          return (
            <li
              key={layer.id}
              ref={(node) => {
                if (node) itemRefs.current.set(layer.id, node)
                else itemRefs.current.delete(layer.id)
              }}
              className={cn(
                'grid gap-1.5 rounded-xl border px-2 py-2 transition-[border-color,background-color,opacity,transform]',
                isActive
                  ? 'border-accent/45 bg-accent/10'
                  : 'border-[var(--glass-border-soft)] bg-[var(--glass-fill)]',
                isDragging && 'opacity-70 ring-1 ring-accent/40',
              )}
              onContextMenu={(event) => {
                if (!canReorder && layer.kind !== 'aux') return
                event.preventDefault()
                props.onSelectLayer(layer.id)
                openLayerMenu(layer.id, new DOMRect(event.clientX, event.clientY, 0, 0))
              }}
            >
              <div className="flex items-center gap-1.5">
                {canReorder && (
                  <button
                    type="button"
                    className="grid h-9 w-8 shrink-0 touch-none cursor-grab place-items-center rounded-lg text-[var(--fg-faint)] active:cursor-grabbing"
                    aria-label={`Перетащить ${layer.name}`}
                    title="Перетащить"
                    onPointerDown={(event) => onHandlePointerDown(event, layer.id)}
                  >
                    <span
                      aria-hidden="true"
                      className="text-[0.95rem] leading-none tracking-[-0.12em]"
                    >
                      ≡
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    props.onSelectLayer(layer.id)
                    setMenu(null)
                  }}
                  aria-pressed={isActive}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span className="block truncate text-[0.82rem] font-semibold text-[var(--fg-strong)]">
                    {layer.name}
                  </span>
                  <span className="block text-[0.68rem] text-[var(--fg-faint)]">
                    {isActive
                      ? `Активен · ${stackHint || 'редактирование'}`
                      : `Нажми · ${stackHint || 'выбрать'}`}
                  </span>
                </button>

                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className={`${chipAccentClass(layer.visible)} ${toggleChipClass}`}
                    aria-pressed={layer.visible}
                    onClick={() => props.onLayerVisible(layer.id)}
                  >
                    <StableLabel active={layer.visible} on="Вкл" off="Выкл" />
                  </button>

                  <button
                    type="button"
                    className={cn(chipNeutralClass, 'w-10 shrink-0')}
                    aria-label={`Меню слоя ${layer.name}`}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-controls={menuOpen ? `${menuRootId}-menu` : undefined}
                    onClick={(event) => {
                      event.stopPropagation()
                      props.onSelectLayer(layer.id)
                      if (menuOpen) {
                        setMenu(null)
                        return
                      }
                      openLayerMenu(layer.id, event.currentTarget.getBoundingClientRect())
                    }}
                  >
                    ⋮
                  </button>
                </div>
              </div>

              <input
                className={rangeInputClass}
                type="range"
                min={0.05}
                max={1}
                step={0.01}
                value={layer.opacity}
                onChange={(event) =>
                  props.onLayerOpacity(layer.id, Number(event.target.value))
                }
                aria-label={`Прозрачность ${layer.name}`}
              />
            </li>
          )
        })}
      </ul>

      <div className="shrink-0 grid gap-2 border-t border-[var(--glass-border-soft)] px-3 py-2.5">
        <div className="grid grid-cols-[auto_1fr] items-center gap-3">
          <button
            type="button"
            className="group grid h-[3.4rem] w-[3.4rem] place-items-center rounded-full border-2 border-[var(--glass-border)] bg-[var(--glass-fill-mid)] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={props.onCapture}
            disabled={!props.ready || props.capturing}
            aria-label="Сфотографировать композит"
          >
            <span className="h-[2.5rem] w-[2.5rem] rounded-full bg-[rgba(245,247,248,0.92)] shadow-[inset_0_0_0_2px_rgba(20,26,29,0.08)] transition-transform group-active:scale-[0.92]" />
          </button>
          <div className="min-w-0">
            <p className="text-[0.86rem] font-bold text-[var(--fg-strong)]">Снять фото</p>
            <p className={mutedTextClass}>Камера + референс</p>
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
                props.onPickFile(event.target.files?.[0], 'gallery')
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
                props.onPickFile(event.target.files?.[0], 'camera')
                event.target.value = ''
              }}
            />
          </label>
          <button
            type="button"
            className={chipAccentClass(props.flipped)}
            aria-pressed={props.flipped}
            onClick={props.onFlip}
          >
            Отражение
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={chipNeutralClass} onClick={props.onReset}>
            Сброс
          </button>
          <button
            type="button"
            className={chipAccentClass(props.locked)}
            aria-pressed={props.locked}
            onClick={props.onToggleLock}
          >
            Фиксация
          </button>
        </div>
      </div>

      {menu &&
        menuLayer &&
        createPortal(
          <div
            ref={menuRef}
            id={`${menuRootId}-menu`}
            role="menu"
            className="fixed z-[80] min-w-[11.5rem] overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--panel-inset-bg)] py-1 shadow-[var(--shadow-glass)] backdrop-blur-md"
            style={{ top: menu.top, left: menu.left }}
          >
            {canReorder &&
              STACK_ACTIONS.map(({ action, label }) => {
                const disabled =
                  (action === 'front' && menuDisplayIndex === 0) ||
                  (action === 'back' && menuDisplayIndex === displayLayers.length - 1) ||
                  (action === 'forward' && menuDisplayIndex === 0) ||
                  (action === 'backward' && menuDisplayIndex === displayLayers.length - 1)
                return (
                  <button
                    key={action}
                    type="button"
                    role="menuitem"
                    disabled={disabled}
                    className="block w-full px-3 py-2 text-left text-[0.8rem] font-semibold text-[var(--fg-strong)] disabled:cursor-not-allowed disabled:opacity-35 hover:bg-[var(--glass-fill-mid)]"
                    onClick={() => {
                      props.onStackAction(menuLayer.id, action)
                      setMenu(null)
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            {menuLayer.kind === 'aux' && (
              <button
                type="button"
                role="menuitem"
                className="block w-full border-t border-[var(--glass-border-soft)] px-3 py-2 text-left text-[0.8rem] font-semibold text-[rgba(239,139,139,0.95)] hover:bg-[var(--glass-fill-mid)]"
                onClick={() => {
                  props.onRemoveLayer(menuLayer.id)
                  setMenu(null)
                }}
              >
                Удалить слой
              </button>
            )}
          </div>,
          document.body,
        )}
    </section>
  )
}
