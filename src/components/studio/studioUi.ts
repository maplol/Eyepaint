export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')

export const panelClass = 'grid gap-3'

export const sectionTitleClass = 'text-sm font-bold text-[var(--fg-strong)]'

export const sliderLabelsClass =
  'mb-[0.4rem] flex justify-between text-[0.84rem] text-[var(--fg-slider)]'

export const rangeInputClass = 'w-full cursor-pointer accent-[var(--accent)]'

export const rowClass = 'grid grid-cols-3 gap-2'

export const tipClass = 'text-center text-[0.78rem] text-[var(--fg-faint)]'

/** Chip / grid button — padding по тексту, leading-tight чтобы длинные подписи не вылезали */
export const chipBaseClass =
  'inline-flex min-h-10 items-center justify-center rounded-[14px] px-2.5 py-1.5 text-center text-[0.78rem] font-semibold leading-tight disabled:cursor-not-allowed disabled:opacity-40'

export const chipNeutralClass = cn(
  chipBaseClass,
  'border border-[var(--line-soft)] bg-[var(--glass-fill)] text-[var(--fg)]',
)

export const chipAccentClass = (active = false) =>
  cn(
    chipBaseClass,
    active
      ? 'border border-transparent bg-[var(--chip-accent-bg-active)] text-[var(--chip-accent-fg-active)]'
      : 'border border-[var(--chip-accent-border)] bg-[var(--chip-accent-bg)] text-[var(--chip-accent-fg)]',
  )

export const chipFileClass = cn(
  chipNeutralClass,
  'relative cursor-pointer',
)

export const hiddenFileInputClass = 'absolute h-px w-px opacity-0 pointer-events-none'

export const poseSaveClass =
  'inline-flex min-h-11 w-full items-center justify-center rounded-[14px] border border-[var(--chip-accent-border)] bg-[var(--chip-accent-bg)] px-3 py-2 text-center text-[0.86rem] font-bold leading-tight text-[var(--chip-accent-fg)]'

/** Primary / secondary CTA (онбординг, справка) */
export const ctaPrimaryClass =
  'inline-flex min-h-11 w-full items-center justify-center rounded-full bg-accent px-4 py-2 text-center font-bold leading-tight text-accent-ink'

export const ctaSecondaryClass =
  'inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill-mid)] px-4 py-2 text-center font-semibold leading-tight text-[var(--fg-strong)]'

export const poseStatsClass = 'grid grid-cols-4 gap-[0.4rem]'

export const poseStatClass =
  'grid gap-[0.12rem] rounded-[12px] border border-[var(--glass-border-soft)] bg-[var(--glass-fill)] px-2 py-[0.45rem]'

export const poseStatLabelClass = 'text-[0.68rem] text-[var(--fg-faint)]'

export const poseStatValueClass =
  'text-[0.86rem] font-bold text-[var(--fg-strong)] [font-variant-numeric:tabular-nums]'

export const glassButtonClass =
  'eyepaint-glass-chip inline-flex min-h-10 shrink-0 items-center justify-center rounded-full px-3.5 py-2 text-sm font-semibold leading-tight text-[var(--fg-strong)]'

/** Round icon control (header: back / hide / help) */
export const glassIconButtonClass =
  'eyepaint-glass-chip grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--fg-strong)]'

/** Compact header status / action pill */
export const chromePillClass =
  'inline-flex min-h-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill-mid)] px-3 py-1.5 text-center text-[0.72rem] font-semibold leading-none text-[var(--fg-strong)]'

/** Shared frosted panel — CSS class, работает без blur поверх video */
export const glassSurfaceClass = 'eyepaint-glass'

export type StudioToolId =
  | 'hand'
  | 'eyedropper'
  | 'loupe'
  | 'perspective'
  | 'calc'
  | 'guides'
  | 'poses'
  | 'layers'

export const STUDIO_TOOL_LABELS: Record<StudioToolId, string> = {
  hand: 'Рука',
  eyedropper: 'Цвета',
  loupe: 'Лупа',
  perspective: 'Проекция',
  calc: 'Калька',
  guides: 'Гиды',
  poses: 'Позы',
  layers: 'Слои',
}

/** Outer shell — mobile bottom stack; overflow visible — тени glass не режутся */
export const dockShellClass =
  'absolute bottom-[calc(var(--safe-bottom)+0.35rem)] left-[3.85rem] right-2.5 z-20 flex max-h-[min(58dvh,520px)] min-h-0 flex-col gap-2 overflow-x-visible overflow-y-auto overscroll-contain py-1 animate-[rise-in_0.45s_ease_0.04s_both] eyepaint-scroll min-[960px]:hidden sm:left-[4.2rem]'

export const dockClass = cn(
  'flex min-h-0 max-h-[min(42dvh,380px)] flex-1 flex-col overflow-hidden rounded-3xl',
  glassSurfaceClass,
)

/** Compact vertical tool rail — без скролла; ширина ≥ кнопка + padding */
export const toolRailClass = cn(
  'absolute left-3 top-1/2 z-40 flex w-12 -translate-y-1/2 flex-col items-center gap-1 overflow-hidden overscroll-none rounded-2xl p-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden animate-[rise-in_0.35s_ease_both] sm:left-3.5 min-[960px]:w-[3.25rem] eyepaint-glass-edge',
  glassSurfaceClass,
)

export const toolRailBtnClass =
  'grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-transparent text-[var(--fg-muted)] transition-colors hover:border-[var(--glass-border-soft)] hover:bg-[var(--glass-fill)] hover:text-[var(--fg-strong)] min-[960px]:h-10 min-[960px]:w-10'

export const toolRailBtnActiveClass =
  'border-accent/45 bg-accent/18 text-[var(--chip-accent-fg)] hover:border-accent/55 hover:bg-accent/22 hover:text-[var(--chip-accent-fg)]'

/** Left tool settings */
export const toolInspectorClass = cn(
  'absolute left-[3.85rem] top-[calc(var(--safe-top)+4.35rem)] z-20 hidden w-[min(300px,calc(100vw-22rem))] max-h-[min(48vh,460px)] flex-col overflow-hidden rounded-3xl animate-[rise-in_0.3s_ease_both] min-[960px]:left-[4.45rem] min-[960px]:flex sm:left-[4.2rem]',
  glassSurfaceClass,
)

/** Right layers — raised (top-anchored) */
export const layersColumnClass =
  'absolute right-4 top-[calc(var(--safe-top)+4.35rem)] z-20 hidden h-[min(52vh,480px)] w-[min(300px,26vw)] flex-col overflow-visible min-[960px]:flex'

export const layersColumnPanelClass = cn(
  'flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl',
  glassSurfaceClass,
)

export const layersSheetClass = cn(
  'flex max-h-[min(50dvh,440px)] min-h-0 shrink-0 flex-col overflow-hidden rounded-3xl animate-[rise-in_0.28s_ease_both]',
  glassSurfaceClass,
)

/** Слои в режиме «шапка», когда рядом открыта панель инструмента */
export const layersSheetCompactClass = cn(
  'flex h-auto shrink-0 flex-col overflow-hidden rounded-3xl animate-[rise-in_0.28s_ease_both]',
  glassSurfaceClass,
)

/** Compact fixed-height layer row */
export const layerRowClass =
  'grid h-10 shrink-0 grid-cols-[auto_minmax(0,1fr)_minmax(3.75rem,4.75rem)_auto] items-center gap-1 rounded-lg border px-1'

export const scrollAreaClass = 'eyepaint-scroll'

export const tabBaseClass =
  'inline-flex min-h-9 items-center justify-center rounded-xl px-2 py-1.5 text-center text-[0.75rem] font-semibold leading-tight text-[var(--fg-muted)] transition-colors hover:text-[var(--fg-strong)] min-[960px]:text-[0.8rem]'

export const tabActiveClass = 'bg-[var(--glass-fill-strong)] text-[var(--fg-strong)]'

/** Camera/status toast — bottom, above chrome */
export const statusBaseClass =
  'eyepaint-glass-chip absolute bottom-[calc(var(--safe-bottom)+0.85rem)] left-1/2 z-[20] w-[min(26rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-2xl px-4 py-3 text-center text-[0.92rem] text-[var(--fg)] animate-[rise-in_0.4s_ease_both] min-[960px]:bottom-[calc(var(--safe-bottom)+1.1rem)]'

export const statusNoteClass = 'mt-2 text-[0.86rem] text-[var(--fg-muted)]'

export const cameraClass = 'absolute inset-0 h-full w-full bg-[#141a1d] object-cover'

export const panelCardClass =
  'grid gap-2 rounded-2xl border border-[var(--glass-border-soft)] bg-[var(--panel-inset-bg)] px-3 py-2.5'

export const mutedTextClass = 'text-[0.72rem] text-[var(--fg-faint)]'

export const toggleChipClass = 'w-[3.25rem] shrink-0 text-center'
