import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  layerStackLabel,
  type LayerStackAction,
  type RefLayer,
} from '../../lib/layers'
import {
  chipAccentClass,
  chipFileClass,
  chipNeutralClass,
  cn,
  glassButtonClass,
  hiddenFileInputClass,
  layerRowClass,
  layersColumnPanelClass,
  layersSheetClass,
  layersSheetCompactClass,
  mutedTextClass,
  rangeInputClass,
  rowClass,
  scrollAreaClass,
  sectionTitleClass,
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
  variant?: 'sheet' | 'column'
  /** На мобилке: только шапка, когда рядом открыта панель инструмента */
  compact?: boolean
  onRequestExpand?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
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

type DragGhost = {
  id: string
  width: number
  height: number
  grabX: number
  grabY: number
  pointerX: number
  pointerY: number
  name: string
  hint: string
  active: boolean
}

export function LayersPanel(props: LayersPanelProps) {
  const variant = props.variant ?? 'sheet'
  const compact = Boolean(props.compact) && variant === 'sheet'
  const menuRootId = useId()
  const [internalOpen, setInternalOpen] = useState(loadLayersOpen)
  const controlled = props.open !== undefined
  const open = variant === 'column' ? true : controlled ? Boolean(props.open) : internalOpen
  const setOpen = (next: boolean) => {
    if (!controlled) setInternalOpen(next)
    props.onOpenChange?.(next)
    saveLayersOpen(next)
  }
  const [dragId, setDragId] = useState<string | null>(null)
  const [ghost, setGhost] = useState<DragGhost | null>(null)
  const [menu, setMenu] = useState<MenuAnchor | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const itemRefs = useRef(new Map<string, HTMLLIElement>())
  const dragIdRef = useRef<string | null>(null)
  const ghostNodeRef = useRef<HTMLDivElement | null>(null)
  const cleanupDragRef = useRef<(() => void) | null>(null)
  const prevCountRef = useRef(props.layers.length)

  const displayLayers = [...props.layers].reverse()
  const canReorder = props.layers.length > 1
  const displayLayersRef = useRef(displayLayers)
  const onReorderRef = useRef(props.onReorderLayers)

  displayLayersRef.current = displayLayers
  onReorderRef.current = props.onReorderLayers

  const activeLayer =
    props.layers.find((layer) => layer.id === props.activeLayerId) ?? props.layers[0] ?? null

  const endDrag = () => {
    cleanupDragRef.current?.()
    cleanupDragRef.current = null
    setDragId(null)
    dragIdRef.current = null
    setGhost(null)
  }

  useEffect(() => {
    if (variant === 'column') return
    saveLayersOpen(open)
  }, [open, variant])

  useEffect(() => {
    if (variant === 'column') return
    if (props.layers.length > prevCountRef.current) setOpen(true)
    prevCountRef.current = props.layers.length
  }, [props.layers.length, variant])

  useEffect(() => {
    dragIdRef.current = dragId
  }, [dragId])

  useEffect(() => {
    if (!dragId) return
    const prevUserSelect = document.body.style.userSelect
    const prevCursor = document.body.style.cursor
    const prevTouchAction = document.body.style.touchAction
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
    document.body.style.touchAction = 'none'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') endDrag()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.userSelect = prevUserSelect
      document.body.style.cursor = prevCursor
      document.body.style.touchAction = prevTouchAction
      window.removeEventListener('keydown', onKey)
    }
  }, [dragId])

  useEffect(() => () => cleanupDragRef.current?.(), [])

  useEffect(() => {
    if (!menu) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (menuRef.current?.contains(target)) return
      setMenu(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null)
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
      if (clientY >= rect.top - 8 && clientY <= rect.bottom + 8 && dist < bestDist) {
        bestDist = dist
        bestId = layer.id
      }
    }
    return bestId
  }

  const onHandlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    layer: RefLayer,
  ) => {
    if (!canReorder) return
    event.preventDefault()
    event.stopPropagation()
    setMenu(null)

    const row = itemRefs.current.get(layer.id)
    if (!row) return
    const rect = row.getBoundingClientRect()
    const isActive = props.activeLayerId === layer.id
    const stackHint = layerStackLabel(props.layers, layer.id)
    const pointerId = event.pointerId
    const grabX = event.clientX - rect.left
    const grabY = event.clientY - rect.top

    const nextGhost: DragGhost = {
      id: layer.id,
      width: Math.max(rect.width, 200),
      height: 40,
      grabX,
      grabY: Math.min(grabY, 22),
      pointerX: event.clientX,
      pointerY: event.clientY,
      name: layer.name,
      hint: isActive ? `Активен · ${stackHint || 'edit'}` : stackHint || 'выбрать',
      active: isActive,
    }

    // Не captur'им на кнопку: при live-reorder она размонтируется → pointerup теряется.
    cleanupDragRef.current?.()

    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      const current = dragIdRef.current
      if (!current) return
      moveEvent.preventDefault()

      const node = ghostNodeRef.current
      if (node) {
        node.style.left = `${moveEvent.clientX - grabX}px`
        node.style.top = `${moveEvent.clientY - grabY}px`
      }

      const targetId = findDropTarget(moveEvent.clientY, current)
      if (targetId && targetId !== current) {
        onReorderRef.current(current, targetId)
      }
    }

    const onUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return
      endDrag()
    }

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    cleanupDragRef.current = cleanup

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)

    setDragId(layer.id)
    dragIdRef.current = layer.id
    setGhost(nextGhost)
  }

  if (props.layers.length === 0) return null

  if (variant === 'sheet' && !open) {
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
      className={
        variant === 'column'
          ? layersColumnPanelClass
          : compact
            ? layersSheetCompactClass
            : layersSheetClass
      }
      aria-label="Блок слоёв"
      aria-modal="false"
      data-compact={compact ? 'true' : undefined}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--glass-border-soft)] px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className={sectionTitleClass}>Слои{compact ? ` · ${props.layers.length}` : ''}</p>
          <p className={cn(mutedTextClass, 'truncate')}>
            {compact
              ? activeLayer
                ? activeLayer.name
                : 'Свернуто'
              : activeLayer
                ? `${activeLayer.name} · ≡ порядок`
                : variant === 'column'
                  ? 'Активный слой'
                  : 'Список слоёв'}
          </p>
        </div>
        {variant === 'sheet' && compact && (
          <button
            type="button"
            className="rounded-full border border-accent/45 bg-accent/18 px-3 py-1.5 text-[0.78rem] font-semibold text-[var(--chip-accent-fg)]"
            onClick={() => props.onRequestExpand?.()}
          >
            Развернуть
          </button>
        )}
        {variant === 'sheet' && !compact && (
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
        )}
      </div>

      {!compact && (
      <>
      <ul
        ref={listRef}
        className={cn(
          'flex min-h-0 flex-1 flex-col justify-start gap-1 overflow-auto overscroll-contain px-2.5 py-1.5 [-webkit-overflow-scrolling:touch]',
          scrollAreaClass,
        )}
        aria-label="Слои референса"
      >
        {displayLayers.map((layer) => {
          const isActive = props.activeLayerId === layer.id
          const isDragging = dragId === layer.id
          const stackHint = layerStackLabel(props.layers, layer.id)
          const menuOpen = menu?.id === layer.id

          if (isDragging && ghost) {
            return (
              <li
                key={layer.id}
                ref={(node) => {
                  if (node) itemRefs.current.set(layer.id, node)
                  else itemRefs.current.delete(layer.id)
                }}
                className="h-10 rounded-lg border border-dashed border-accent/45 bg-accent/10"
                aria-hidden="true"
              />
            )
          }

          return (
            <li
              key={layer.id}
              ref={(node) => {
                if (node) itemRefs.current.set(layer.id, node)
                else itemRefs.current.delete(layer.id)
              }}
              className={cn(
                layerRowClass,
                isActive
                  ? 'border-accent/45 bg-accent/10'
                  : 'border-[var(--glass-border-soft)] bg-[var(--glass-fill)]',
              )}
              onContextMenu={(event) => {
                if (!canReorder && layer.kind !== 'aux') return
                event.preventDefault()
                props.onSelectLayer(layer.id)
                openLayerMenu(layer.id, new DOMRect(event.clientX, event.clientY, 0, 0))
              }}
            >
              {canReorder ? (
                <button
                  type="button"
                  className="grid h-8 w-7 shrink-0 touch-none cursor-grab place-items-center rounded-lg text-[var(--fg-faint)] active:cursor-grabbing"
                  aria-label={`Перетащить ${layer.name}`}
                  title="Перетащить"
                  onPointerDown={(event) => onHandlePointerDown(event, layer)}
                >
                  <span
                    aria-hidden="true"
                    className="text-[0.9rem] leading-none tracking-[-0.12em]"
                  >
                    ≡
                  </span>
                </button>
              ) : (
                <span className="w-1" aria-hidden="true" />
              )}

              <button
                type="button"
                className="min-w-0 text-left"
                onClick={() => {
                  props.onSelectLayer(layer.id)
                  setMenu(null)
                }}
                aria-pressed={isActive}
                aria-current={isActive ? 'true' : undefined}
              >
                <span className="block truncate text-[0.78rem] font-semibold text-[var(--fg-strong)]">
                  {layer.name}
                </span>
                <span className="block truncate text-[0.62rem] text-[var(--fg-faint)]">
                  {isActive ? `Активен · ${stackHint || 'edit'}` : stackHint || 'выбрать'}
                </span>
              </button>

              <input
                className={cn(rangeInputClass, 'h-7')}
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

              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-lg border text-[var(--fg-muted)] transition-colors',
                    layer.visible
                      ? 'border-accent/40 bg-accent/15 text-[var(--chip-accent-fg)]'
                      : 'border-[var(--glass-border-soft)] bg-[var(--glass-fill)] opacity-55',
                  )}
                  aria-label={
                    layer.visible ? `Видимость ${layer.name}: показан` : `Видимость ${layer.name}: скрыт`
                  }
                  aria-pressed={layer.visible}
                  title={layer.visible ? 'Скрыть слой' : 'Показать слой'}
                  onClick={() => props.onLayerVisible(layer.id)}
                >
                  {layer.visible ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M3 3l18 18M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2M9.9 5.2A11 11 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-4.2 4.8M6.1 6.1A18 18 0 0 0 2 12s3.5 7 10 7c1.3 0 2.5-.2 3.6-.6"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  className={cn(chipNeutralClass, 'min-h-8 w-8 shrink-0 rounded-lg px-0 py-0')}
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
            </li>
          )
        })}
      </ul>

      <div className="shrink-0 grid gap-1.5 border-t border-[var(--glass-border-soft)] px-2.5 py-2">
        <div className="grid grid-cols-[auto_1fr] items-center gap-2.5">
          <button
            type="button"
            className="group grid h-[2.85rem] w-[2.85rem] place-items-center rounded-full border-2 border-[var(--glass-border)] bg-[var(--glass-fill-mid)] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={props.onCapture}
            disabled={!props.ready || props.capturing}
            aria-label="Сфотографировать композит"
          >
            <span className="h-[2.05rem] w-[2.05rem] rounded-full bg-[rgba(245,247,248,0.92)] shadow-[inset_0_0_0_2px_rgba(20,26,29,0.08)] transition-transform group-active:scale-[0.92]" />
          </button>
          <div className="min-w-0">
            <p className="text-[0.8rem] font-bold text-[var(--fg-strong)]">Снять фото</p>
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
      </>
      )}

      {ghost &&
        createPortal(
          <div
            ref={ghostNodeRef}
            className={cn(
              'pointer-events-none fixed z-[90] flex items-center gap-1.5 rounded-xl border px-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.35)]',
              ghost.active
                ? 'border-accent/55 bg-[color-mix(in_srgb,var(--panel-inset-bg)_92%,var(--accent)_8%)]'
                : 'border-[var(--glass-border)] bg-[var(--panel-inset-bg)]',
            )}
            style={{
              width: ghost.width,
              height: ghost.height,
              left: ghost.pointerX - ghost.grabX,
              top: ghost.pointerY - ghost.grabY,
              transform: 'scale(1.04) rotate(1.25deg)',
              willChange: 'left, top',
            }}
            aria-hidden="true"
          >
            <span
              aria-hidden="true"
              className="grid h-8 w-7 shrink-0 place-items-center text-[var(--fg-faint)]"
            >
              ≡
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.78rem] font-semibold text-[var(--fg-strong)]">
                {ghost.name}
              </span>
              <span className="block truncate text-[0.62rem] text-[var(--fg-faint)]">
                {ghost.hint}
              </span>
            </span>
          </div>,
          document.body,
        )}

      {menu &&
        menuLayer &&
        createPortal(
          <div
            ref={menuRef}
            id={`${menuRootId}-menu`}
            role="menu"
            className="eyepaint-glass-chip fixed z-[80] min-w-[11.5rem] overflow-hidden rounded-xl py-1"
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
