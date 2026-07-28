import type { Dispatch, SetStateAction } from 'react'
import type { BrushMaskSettings } from '../../lib/brushMask'
import type {
  ColorFilterMode,
  ColorPrecision,
  PaletteColor,
  PrecisionProfile,
} from '../../lib/colors'
import {
  PALETTE_PRESETS,
  type PalettePresetId,
  type SavedPalette,
} from '../../lib/palettes'
import { CornerAction, TrashIcon } from './CornerAction'
import { PanelTabs } from './PanelTabs'
import { StableLabel } from './StableLabel'
import {
  chipAccentClass,
  chipNeutralClass,
  cn,
  fieldLabelClass,
  rangeInputClass,
  scrollAreaClass,
  sectionDividerClass,
  sliderLabelsClass,
  tipClass,
} from './studioUi'

type ColorsPanelProps = {
  precisionProfile: PrecisionProfile
  colorPrecision: ColorPrecision
  onPrecision: (value: ColorPrecision) => void
  matchTolerance: number
  onTolerance: (value: number) => void
  paletteLoading: boolean
  palette: PaletteColor[]
  visiblePalette: PaletteColor[]
  selectedColorIds: string[]
  selectedSet: Set<string>
  selectionCoverage: number | null
  paletteSort: 'dominance' | 'hue'
  onPaletteSort: () => void
  onToggleColor: (id: string) => void
  onSelectAll: () => void
  onInvert: () => void
  onResetSelection: () => void
  /** Убрать все цвета, взятые пипеткой, из палитры и выбора */
  onClearPicks: () => void
  /** Убрать один pick-цвет */
  onRemovePick: (id: string) => void
  pickMode: boolean
  onPickMode: () => void
  colorMode: ColorFilterMode
  filterBusy: boolean
  onMaskMode: () => void
  onGrayMode: () => void
  brushEnabled: boolean
  brush: BrushMaskSettings
  onBrush: Dispatch<SetStateAction<BrushMaskSettings>>
  onClearBrush: () => void
  onPreset: (id: PalettePresetId) => void
  savedPalettes: SavedPalette[]
  onSavePalette: () => void
  onApplySaved: (palette: SavedPalette) => void
  onDeleteSaved: (id: string) => void
  activeLayerName?: string
}

export function ColorsPanel(props: ColorsPanelProps) {
  const hasPalette = props.palette.length > 0 || props.paletteLoading
  const pickCount = props.palette.filter((c) => c.source === 'pick').length

  const pickTab = (
    <div className="grid gap-0">
      {!hasPalette ? (
        <p className={tipClass}>Не удалось вытащить палитру</p>
      ) : (
        <div className="grid gap-2.5 pl-0">
          <div className="flex min-h-7 items-center justify-between gap-2">
            <p className="min-w-0 text-[0.78rem] leading-snug text-[var(--fg-muted)]">
              {props.paletteLoading
                ? 'Обновляю палитру…'
                : `${props.palette.length} · выбрано ${props.selectedColorIds.length}${
                    props.selectionCoverage != null
                      ? ` · ~${props.selectionCoverage}%`
                      : ''
                  }`}
            </p>
            <button
              type="button"
              className="inline-flex min-h-7 shrink-0 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill)] px-2.5 py-1 text-center text-[0.72rem] font-semibold leading-none text-[var(--fg)] disabled:opacity-50"
              disabled={props.paletteLoading && props.palette.length === 0}
              onClick={props.onPaletteSort}
            >
              {props.paletteSort === 'hue' ? 'По тону' : 'По частоте'}
            </button>
          </div>

          <div
            className={cn(
              'relative flex min-h-12 min-w-0 w-full gap-2 overflow-x-auto overscroll-x-contain px-0.5 py-1.5',
              scrollAreaClass,
            )}
            role="group"
            aria-label="Цвета референса"
            aria-busy={props.paletteLoading}
          >
            {props.paletteLoading && props.visiblePalette.length === 0
              ? Array.from({ length: props.precisionProfile.maxColors }, (_, index) => (
                  <span
                    key={`sk-${index}`}
                    className="h-10 w-10 flex-none animate-pulse rounded-full border border-[var(--glass-border-soft)] bg-[var(--glass-fill-mid)]"
                  />
                ))
              : props.visiblePalette.map((color) => {
                  const active = props.selectedSet.has(color.id)
                  const isPick = color.source === 'pick'
                  return (
                    <div key={color.id} className="relative h-10 w-10 flex-none">
                      <button
                        type="button"
                        className={cn(
                          'h-full w-full rounded-full border-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] transition-opacity',
                          props.paletteLoading && 'opacity-55',
                          active
                            ? 'scale-[1.06] border-white shadow-[0_0_0_2px_rgba(224,154,106,0.85),inset_0_0_0_1px_rgba(0,0,0,0.12)]'
                            : 'border-white/35',
                        )}
                        style={{ background: color.hex }}
                        aria-pressed={active}
                        disabled={props.paletteLoading}
                        title={`${color.hex}${isPick ? ' · пипетка' : ''}`}
                        onClick={() => props.onToggleColor(color.id)}
                      />
                      {isPick && (
                        <button
                          type="button"
                          className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full border border-ink-deep bg-danger text-[0.55rem] font-bold leading-none text-ink-deep"
                          aria-label={`Убрать пипетку ${color.hex}`}
                          title="Убрать цвет пипетки"
                          onClick={(event) => {
                            event.stopPropagation()
                            props.onRemovePick(color.id)
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )
                })}
          </div>

          <button
            type="button"
            className={cn(
              'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border px-3 text-[0.86rem] font-bold leading-tight transition-colors',
              props.pickMode
                ? 'border-accent/60 bg-accent text-accent-ink shadow-[0_0_0_1px_rgba(224,154,106,0.35)]'
                : 'border-accent/45 bg-accent/20 text-[var(--chip-accent-fg)] hover:bg-accent/30',
            )}
            disabled={props.paletteLoading}
            aria-pressed={props.pickMode}
            onClick={props.onPickMode}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 21l7-7M14.5 5.5l4 4M9 16l-2.5 2.5M16 4l4 4-8.5 8.5H9v-2.5L16 4Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {props.pickMode ? 'Пипетка вкл — клик по референсу' : 'Пипетка'}
          </button>

          {pickCount > 0 && (
            <button
              type="button"
              className="text-center text-[0.75rem] font-semibold text-[var(--danger-soft)]"
              onClick={props.onClearPicks}
            >
              Убрать цвета пипетки · {pickCount}
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={chipNeutralClass}
              disabled={props.paletteLoading || props.palette.length === 0}
              onClick={props.onSelectAll}
            >
              Все
            </button>
            <button
              type="button"
              className={chipNeutralClass}
              disabled={props.paletteLoading || props.selectedColorIds.length === 0}
              onClick={props.onInvert}
            >
              Инверт
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={chipAccentClass(props.colorMode === 'mask')}
              disabled={
                (props.selectedColorIds.length === 0 && !props.brush.dataUrl) || props.filterBusy
              }
              onClick={props.onMaskMode}
            >
              Только цвет
            </button>
            <button
              type="button"
              className={chipAccentClass(props.colorMode === 'gray')}
              disabled={
                props.filterBusy ||
                (props.selectedColorIds.length === 0 && !props.brush.dataUrl)
              }
              onClick={props.onGrayMode}
            >
              Серый фон
            </button>
          </div>

          <div className={cn(sectionDividerClass, 'grid gap-3')}>
            <div>
              <div className={sliderLabelsClass}>
                <span>Точность</span>
                <span>
                  {props.precisionProfile.label} · {props.precisionProfile.maxColors}
                </span>
              </div>
              <input
                className={rangeInputClass}
                type="range"
                min={1}
                max={5}
                step={1}
                value={props.colorPrecision}
                onChange={(event) =>
                  props.onPrecision(Number(event.target.value) as ColorPrecision)
                }
                aria-label="Точность палитры"
              />
            </div>
            <div>
              <div className={sliderLabelsClass}>
                <span>Допуск</span>
                <span>{props.matchTolerance}</span>
              </div>
              <input
                className={rangeInputClass}
                type="range"
                min={12}
                max={100}
                step={1}
                value={props.matchTolerance}
                onChange={(event) => props.onTolerance(Number(event.target.value))}
                aria-label="Допуск совпадения цвета"
              />
            </div>
          </div>

          <div className={cn(sectionDividerClass, 'grid gap-2')}>
            <p className={fieldLabelClass}>Пресеты</p>
            <div className="grid grid-cols-4 gap-2">
              {PALETTE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={chipNeutralClass}
                  title={preset.hint}
                  disabled={props.palette.length === 0}
                  onClick={() => props.onPreset(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const brushTab = (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className={fieldLabelClass}>Кисть-маска</p>
        <button
          type="button"
          className={cn(chipAccentClass(props.brush.editing), 'min-w-[6.5rem]')}
          aria-pressed={props.brush.editing}
          onClick={() =>
            props.onBrush((prev) => ({
              ...prev,
              editing: !prev.editing,
              enabled: true,
            }))
          }
        >
          <StableLabel active={props.brush.editing} on="Рисую…" off="Рисовать" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={chipAccentClass(props.brush.mode === 'keep')}
          onClick={() => props.onBrush((prev) => ({ ...prev, mode: 'keep' }))}
        >
          Оставить
        </button>
        <button
          type="button"
          className={chipAccentClass(props.brush.mode === 'remove')}
          onClick={() => props.onBrush((prev) => ({ ...prev, mode: 'remove' }))}
        >
          Убрать
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={chipAccentClass(props.brush.combine === 'and')}
          onClick={() => props.onBrush((prev) => ({ ...prev, combine: 'and' }))}
        >
          AND
        </button>
        <button
          type="button"
          className={chipAccentClass(props.brush.combine === 'or')}
          onClick={() => props.onBrush((prev) => ({ ...prev, combine: 'or' }))}
        >
          OR
        </button>
      </div>
      <div>
        <div className={sliderLabelsClass}>
          <span>Кисть</span>
          <span>{props.brush.brushSize}</span>
        </div>
        <input
          className={rangeInputClass}
          type="range"
          min={8}
          max={80}
          step={1}
          value={props.brush.brushSize}
          onChange={(event) =>
            props.onBrush((prev) => ({
              ...prev,
              brushSize: Number(event.target.value),
            }))
          }
        />
      </div>
      <p className={tipClass}>
        {props.filterBusy
          ? 'Применяю фильтр…'
          : 'Кисть режет зону цвета (AND/OR) на активном слое'}
      </p>
    </div>
  )

  const savedTab = (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className={fieldLabelClass}>Избранные</p>
        <button
          type="button"
          className={cn(chipNeutralClass, 'shrink-0 px-3')}
          disabled={props.selectedColorIds.length === 0}
          onClick={props.onSavePalette}
        >
          Сохранить
        </button>
      </div>
      {props.savedPalettes.length === 0 ? (
        <p className={tipClass}>Пока пусто — сохрани выбранные hex</p>
      ) : (
        <ul className="grid gap-2">
          {props.savedPalettes.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-[var(--glass-border-soft)] bg-[var(--glass-fill)] px-2.5 py-2"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => props.onApplySaved(item)}
              >
                <p className="truncate text-[0.82rem] font-semibold text-[var(--fg-strong)]">
                  {item.name}
                </p>
                <p className="truncate text-[0.68rem] text-[var(--fg-faint)]">
                  {item.hexes.slice(0, 6).join(' · ')}
                </p>
              </button>
              <button
                type="button"
                className="text-[0.72rem] font-semibold text-danger-soft"
                onClick={() => props.onDeleteSaved(item.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  const tabs = [
    {
      id: 'pick',
      label: 'Палитра',
      content: pickTab,
      corner: (
        <CornerAction
          label="Сбросить выбор"
          disabled={props.paletteLoading || props.selectedColorIds.length === 0}
          onClick={props.onResetSelection}
        >
          <TrashIcon />
        </CornerAction>
      ),
    },
    ...(props.brushEnabled
      ? [
          {
            id: 'brush',
            label: 'Кисть',
            content: brushTab,
            corner: (
              <CornerAction label="Очистить маску" onClick={props.onClearBrush}>
                <TrashIcon />
              </CornerAction>
            ),
          },
        ]
      : []),
    { id: 'saved', label: 'Избранное', content: savedTab },
  ]

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-2')}>
      {props.activeLayerName && (
        <p className="shrink-0 rounded-xl border border-accent/30 bg-accent/12 px-3 py-2 text-center text-[0.78rem] text-[var(--chip-accent-fg)]">
          Цвета для слоя: <strong>{props.activeLayerName}</strong>
        </p>
      )}
      <PanelTabs tabs={tabs} storageKey="eyepaint-colors-tab" />
    </div>
  )
}
