import { useEffect, useId, useRef, useState } from 'react'
import {
  layerStackLabel,
  type LayerStackAction,
  type RefLayer,
} from '../../lib/layers'
import { StableLabel } from './StableLabel'
import {
  chipAccentClass,
  chipNeutralClass,
  cn,
  glassButtonClass,
  layersSheetClass,
  mutedTextClass,
  rangeInputClass,
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
}

const STACK_ACTIONS: Array<{ action: LayerStackAction; label: string }> = [
  { action: 'front', label: 'На передний план' },
  { action: 'forward', label: 'Ближе (вперёд)' },
  { action: 'backward', label: 'Дальше (назад)' },
  { action: 'back', label: 'На задний план' },
]

export function LayersPanel(props: LayersPanelProps) {
  const menuRootId = useId()
  const [open, setOpen] = useState(loadLayersOpen)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const prevCountRef = useRef(props.layers.length)

  const displayLayers = [...props.layers].reverse()
  const canReorder = props.layers.length > 1
  const activeLayer =
    props.layers.find((layer) => layer.id === props.activeLayerId) ?? props.layers[0] ?? null

  useEffect(() => {
    saveLayersOpen(open)
  }, [open])

  // Новый aux-слой — сразу открыть экран слоёв
  useEffect(() => {
    if (props.layers.length > prevCountRef.current) setOpen(true)
    prevCountRef.current = props.layers.length
  }, [props.layers.length])

  useEffect(() => {
    if (!menuId) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (menuRef.current?.contains(target)) return
      setMenuId(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuId(null)
        setOpen(false)
      }
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuId])

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
              ? `Активен: ${activeLayer.name} · верх списка ближе`
              : 'Отдельный экран над меню студии'}
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill-mid)] px-3 py-1.5 text-[0.78rem] font-semibold text-[var(--fg-strong)]"
          aria-expanded={true}
          onClick={() => {
            setOpen(false)
            setMenuId(null)
          }}
        >
          Закрыть
        </button>
      </div>

      <ul
        className="grid min-h-0 flex-1 gap-1.5 overflow-auto overscroll-contain px-3 py-2.5 [-webkit-overflow-scrolling:touch]"
        aria-label="Слои референса"
      >
        {displayLayers.map((layer, displayIndex) => {
          const isActive = props.activeLayerId === layer.id
          const isDragging = dragId === layer.id
          const isOver = overId === layer.id && dragId !== layer.id
          const stackHint = layerStackLabel(props.layers, layer.id)
          const menuOpen = menuId === layer.id

          return (
            <li
              key={layer.id}
              className={cn(
                'relative grid gap-1.5 rounded-xl border px-2 py-2 transition-[border-color,background-color,opacity]',
                isActive
                  ? 'border-accent/45 bg-accent/10'
                  : 'border-[var(--glass-border-soft)] bg-[var(--glass-fill)]',
                isDragging && 'opacity-55',
                isOver && 'border-accent/70 bg-accent/15',
              )}
              draggable={canReorder}
              onDragStart={(event) => {
                if (!canReorder) return
                setDragId(layer.id)
                setMenuId(null)
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', layer.id)
              }}
              onDragEnd={() => {
                setDragId(null)
                setOverId(null)
              }}
              onDragOver={(event) => {
                if (!canReorder || !dragId || dragId === layer.id) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setOverId(layer.id)
              }}
              onDragLeave={() => {
                if (overId === layer.id) setOverId(null)
              }}
              onDrop={(event) => {
                event.preventDefault()
                const fromId = dragId ?? event.dataTransfer.getData('text/plain')
                if (!fromId || fromId === layer.id) return
                props.onReorderLayers(fromId, layer.id)
                setDragId(null)
                setOverId(null)
              }}
              onContextMenu={(event) => {
                if (!canReorder && layer.kind !== 'aux') return
                event.preventDefault()
                props.onSelectLayer(layer.id)
                setMenuId(layer.id)
              }}
            >
              <div className="flex items-center gap-1.5">
                {canReorder && (
                  <button
                    type="button"
                    className="grid h-9 w-8 shrink-0 cursor-grab place-items-center rounded-lg text-[var(--fg-faint)] active:cursor-grabbing"
                    aria-label={`Перетащить ${layer.name}`}
                    title="Перетащить"
                    onPointerDown={(event) => event.stopPropagation()}
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
                    setMenuId(null)
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
                    className={cn(chipNeutralClass, 'relative w-10 shrink-0')}
                    aria-label={`Меню слоя ${layer.name}`}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-controls={menuOpen ? `${menuRootId}-${layer.id}` : undefined}
                    onClick={(event) => {
                      event.stopPropagation()
                      props.onSelectLayer(layer.id)
                      setMenuId((prev) => (prev === layer.id ? null : layer.id))
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

              {menuOpen && (
                <div
                  ref={menuRef}
                  id={`${menuRootId}-${layer.id}`}
                  role="menu"
                  className="absolute right-2 top-[2.75rem] z-20 min-w-[11.5rem] overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--panel-inset-bg)] py-1 shadow-[var(--shadow-glass)] backdrop-blur-md"
                >
                  {canReorder &&
                    STACK_ACTIONS.map(({ action, label }) => {
                      const disabled =
                        (action === 'front' && displayIndex === 0) ||
                        (action === 'back' &&
                          displayIndex === displayLayers.length - 1) ||
                        (action === 'forward' && displayIndex === 0) ||
                        (action === 'backward' &&
                          displayIndex === displayLayers.length - 1)
                      return (
                        <button
                          key={action}
                          type="button"
                          role="menuitem"
                          disabled={disabled}
                          className="block w-full px-3 py-2 text-left text-[0.8rem] font-semibold text-[var(--fg-strong)] disabled:cursor-not-allowed disabled:opacity-35 hover:bg-[var(--glass-fill-mid)]"
                          onClick={() => {
                            props.onStackAction(layer.id, action)
                            setMenuId(null)
                          }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  {layer.kind === 'aux' && (
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full border-t border-[var(--glass-border-soft)] px-3 py-2 text-left text-[0.8rem] font-semibold text-[rgba(239,139,139,0.95)] hover:bg-[var(--glass-fill-mid)]"
                      onClick={() => {
                        props.onRemoveLayer(layer.id)
                        setMenuId(null)
                      }}
                    >
                      Удалить слой
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
