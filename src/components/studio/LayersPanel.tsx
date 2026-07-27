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
  mutedTextClass,
  panelCardClass,
  rangeInputClass,
  sectionTitleClass,
  toggleChipClass,
} from './studioUi'

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
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const displayLayers = [...props.layers].reverse()
  const canReorder = props.layers.length > 1

  useEffect(() => {
    if (!menuId) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (menuRef.current?.contains(target)) return
      setMenuId(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuId(null)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuId])

  if (props.layers.length === 0) return null

  return (
    <div className={panelCardClass}>
      <p className={sectionTitleClass}>Слои референса</p>
      <p className={mutedTextClass}>
        Клик — редактировать. Перетащи ≡ или меню ⋮ — порядок (верх списка ближе к тебе).
      </p>

      <ul className="grid gap-1.5" aria-label="Слои референса">
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
                    <span aria-hidden="true" className="text-[0.95rem] leading-none tracking-[-0.12em]">
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
                  className={cn(
                    'absolute right-2 z-20 min-w-[11.5rem] overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--panel-inset-bg)] py-1 shadow-[var(--shadow-glass)] backdrop-blur-md',
                    displayIndex === 0 ? 'top-[2.75rem]' : 'top-[2.75rem]',
                  )}
                >
                  {canReorder &&
                    STACK_ACTIONS.map(({ action, label }) => {
                      const disabled =
                        (action === 'front' && displayIndex === 0) ||
                        (action === 'back' && displayIndex === displayLayers.length - 1) ||
                        (action === 'forward' && displayIndex === 0) ||
                        (action === 'backward' && displayIndex === displayLayers.length - 1)
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

      <p className={`text-center ${mutedTextClass}`}>
        Галерея/камера добавят вспомогательный слой, если основной занят
      </p>
    </div>
  )
}
