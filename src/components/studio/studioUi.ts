export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')

export const panelClass = 'grid gap-3'

export const sectionTitleClass = 'text-sm font-bold text-[var(--fg-strong)]'

export const sliderLabelsClass =
  'mb-[0.4rem] flex justify-between text-[0.84rem] text-[var(--fg-slider)]'

export const rangeInputClass = 'w-full cursor-pointer accent-[var(--accent)]'

export const rowClass = 'grid grid-cols-3 gap-2'

export const tipClass = 'text-center text-[0.78rem] text-[var(--fg-faint)]'

export const chipBaseClass =
  'min-h-[2.5rem] rounded-[14px] px-[0.35rem] py-[0.4rem] text-[0.82rem] font-semibold disabled:cursor-not-allowed disabled:opacity-40'

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
  'relative inline-flex cursor-pointer items-center justify-center',
)

export const hiddenFileInputClass = 'absolute h-px w-px opacity-0 pointer-events-none'

export const poseSaveClass =
  'min-h-[2.7rem] rounded-[14px] border border-[var(--chip-accent-border)] bg-[var(--chip-accent-bg)] font-bold text-[var(--chip-accent-fg)]'

export const poseStatsClass = 'grid grid-cols-4 gap-[0.4rem]'

export const poseStatClass =
  'grid gap-[0.12rem] rounded-[12px] border border-[var(--glass-border-soft)] bg-[var(--glass-fill)] px-2 py-[0.45rem]'

export const poseStatLabelClass = 'text-[0.68rem] text-[var(--fg-faint)]'

export const poseStatValueClass =
  'text-[0.86rem] font-bold text-[var(--fg-strong)] [font-variant-numeric:tabular-nums]'

export const glassButtonClass =
  'inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill-mid)] px-3.5 text-sm font-semibold text-[var(--fg-strong)] shadow-[var(--shadow-glass)] backdrop-blur-md'

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

/** Outer shell — mobile bottom stack (one panel at a time) */
export const dockShellClass =
  'absolute bottom-[calc(var(--safe-bottom)+0.55rem)] left-[3.25rem] right-3 z-[3] flex max-h-[min(54dvh,480px)] min-h-0 flex-col gap-2 overflow-hidden animate-[rise-in_0.45s_ease_0.04s_both] min-[960px]:hidden sm:left-[3.6rem]'

export const dockClass =
  'flex min-h-0 max-h-[min(50dvh,460px)] flex-1 flex-col overflow-hidden rounded-3xl border border-[var(--glass-border)] [background-image:var(--dock-bg)] shadow-[var(--shadow-glass)] backdrop-blur-[22px] backdrop-saturate-[1.25]'

/** Compact vertical tool rail — centered, not full-height */
export const toolRailClass =
  'absolute left-2 top-1/2 z-[5] flex w-11 max-h-[min(68vh,30rem)] -translate-y-1/2 flex-col items-center gap-1 overflow-y-auto overscroll-contain rounded-2xl border border-[var(--glass-border)] [background-image:var(--dock-bg)] p-1.5 shadow-[var(--shadow-glass)] backdrop-blur-[18px] animate-[rise-in_0.35s_ease_both] eyepaint-scroll sm:left-3 min-[960px]:w-12'

export const toolRailBtnClass =
  'grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-transparent text-[var(--fg-muted)] transition-colors hover:border-[var(--glass-border-soft)] hover:bg-[var(--glass-fill)] hover:text-[var(--fg-strong)] min-[960px]:h-10 min-[960px]:w-10'

export const toolRailBtnActiveClass =
  'border-accent/45 bg-accent/18 text-[var(--chip-accent-fg)] hover:border-accent/55 hover:bg-accent/22 hover:text-[var(--chip-accent-fg)]'

/** Left tool settings — compact floating card, not full column */
export const toolInspectorClass =
  'absolute left-[3.55rem] top-[calc(var(--safe-top)+4.35rem)] z-[4] hidden w-[min(300px,calc(100vw-22rem))] max-h-[min(48vh,460px)] flex-col overflow-hidden rounded-3xl border border-[var(--glass-border)] [background-image:var(--dock-bg)] shadow-[var(--shadow-glass)] backdrop-blur-[22px] animate-[rise-in_0.3s_ease_both] min-[960px]:left-[4.1rem] min-[960px]:flex sm:left-[3.9rem]'

/** Right layers — fixed taller card, bottom-right */
export const layersColumnClass =
  'absolute bottom-[calc(var(--safe-bottom)+1rem)] right-4 z-[3] hidden h-[min(58vh,540px)] w-[min(300px,26vw)] flex-col overflow-hidden min-[960px]:flex'

export const layersColumnPanelClass =
  'flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl border border-[var(--glass-border)] [background-image:var(--dock-bg)] shadow-[var(--shadow-glass)] backdrop-blur-[22px] backdrop-saturate-[1.25]'

export const layersSheetClass =
  'flex h-[min(50dvh,440px)] shrink-0 flex-col overflow-hidden rounded-3xl border border-[var(--glass-border)] [background-image:var(--dock-bg)] shadow-[var(--shadow-glass)] backdrop-blur-[22px] backdrop-saturate-[1.25] animate-[rise-in_0.28s_ease_both]'

export const scrollAreaClass = 'eyepaint-scroll'

export const tabBaseClass =
  'min-h-9 rounded-xl px-1 py-1.5 text-[0.75rem] font-semibold text-[var(--fg-muted)] transition-colors hover:text-[var(--fg-strong)] min-[960px]:text-[0.8rem]'

export const tabActiveClass = 'bg-[var(--glass-fill-strong)] text-[var(--fg-strong)]'

export const statusBaseClass =
  'absolute inset-x-4 bottom-[36%] rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-fill-strong)] px-4 py-4 text-center text-[var(--fg)] shadow-[var(--shadow-glass)] backdrop-blur-[18px] backdrop-saturate-[1.2] animate-[rise-in_0.4s_ease_both] min-[960px]:left-5 min-[960px]:right-auto min-[960px]:max-w-md'

export const statusNoteClass = 'mt-2 text-[0.86rem] text-[var(--fg-muted)]'

export const cameraClass = 'absolute inset-0 h-full w-full bg-[#141a1d] object-cover'

export const panelCardClass =
  'grid gap-2 rounded-2xl border border-[var(--glass-border-soft)] bg-[var(--glass-fill)] px-3 py-2.5'

export const mutedTextClass = 'text-[0.72rem] text-[var(--fg-faint)]'

export const toggleChipClass = 'w-[3.25rem] shrink-0 text-center'
