export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')

export const panelClass = 'grid gap-3'

export const sectionTitleClass = 'text-sm font-bold text-paper'

export const sliderLabelsClass =
  'mb-[0.4rem] flex justify-between text-[0.84rem] text-[rgba(231,238,240,0.82)]'

export const rangeInputClass = 'w-full cursor-pointer accent-[var(--accent)]'

export const rowClass = 'grid grid-cols-3 gap-2'

export const tipClass = 'text-center text-[0.78rem] text-[rgba(231,238,240,0.55)]'

export const chipBaseClass =
  'min-h-[2.5rem] rounded-[14px] px-[0.35rem] py-[0.4rem] text-[0.82rem] font-semibold disabled:cursor-not-allowed disabled:opacity-40'

export const chipNeutralClass = cn(
  chipBaseClass,
  'border border-[var(--line-soft)] bg-white/8 text-[var(--mist)]',
)

export const chipAccentClass = (active = false) =>
  cn(
    chipBaseClass,
    active
      ? 'border border-transparent bg-[rgba(224,154,106,0.9)] text-[#2a1a10]'
      : 'border border-[rgba(224,154,106,0.45)] bg-[rgba(224,154,106,0.22)] text-[#ffd9bd]',
  )

export const chipFileClass = cn(
  chipNeutralClass,
  'relative inline-flex cursor-pointer items-center justify-center',
)

export const hiddenFileInputClass = 'absolute h-px w-px opacity-0 pointer-events-none'

export const poseSaveClass =
  'min-h-[2.7rem] rounded-[14px] border border-[rgba(224,154,106,0.4)] bg-[rgba(224,154,106,0.18)] font-bold text-[#ffd9bd]'

export const poseStatsClass = 'grid grid-cols-4 gap-[0.4rem]'

export const poseStatClass =
  'grid gap-[0.12rem] rounded-[12px] border border-white/6 bg-white/7 px-2 py-[0.45rem]'

export const poseStatLabelClass = 'text-[0.68rem] text-[rgba(231,238,240,0.55)]'

export const poseStatValueClass =
  'text-[0.86rem] font-bold text-[var(--paper)] [font-variant-numeric:tabular-nums]'

export const glassButtonClass =
  'inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/12 px-3.5 text-sm font-semibold text-paper shadow-[0_6px_18px_rgba(12,16,18,0.16)] backdrop-blur-md'

export const dockClass =
  'absolute inset-x-3 bottom-[calc(var(--safe-bottom)+0.7rem)] z-[3] flex max-h-[min(58dvh,520px)] flex-col overflow-hidden rounded-3xl border border-white/20 bg-[linear-gradient(170deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.08)_100%)] shadow-[var(--shadow-glass)] backdrop-blur-[22px] backdrop-saturate-[1.25] animate-[rise-in_0.45s_ease_0.04s_both] md:inset-x-auto md:right-4 md:bottom-[calc(var(--safe-bottom)+1rem)] md:w-[min(380px,calc(100%-2rem))] min-[960px]:max-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-5.75rem)] min-[960px]:w-[min(360px,30vw)]'

export const tabBaseClass =
  'min-h-9 rounded-xl px-1 py-1.5 text-[0.75rem] font-semibold text-mist/75 transition-colors hover:text-paper min-[960px]:text-[0.8rem]'

export const tabActiveClass = 'bg-white/18 text-paper'

export const statusBaseClass =
  'absolute inset-x-4 bottom-[36%] rounded-2xl border border-white/20 bg-white/14 px-4 py-4 text-center text-mist shadow-[var(--shadow-glass)] backdrop-blur-[18px] backdrop-saturate-[1.2] animate-[rise-in_0.4s_ease_both] min-[960px]:left-5 min-[960px]:right-auto min-[960px]:max-w-md'

export const statusNoteClass = 'mt-2 text-[0.86rem] text-[var(--text-muted)]'

export const cameraClass = 'absolute inset-0 h-full w-full bg-[#141a1d] object-cover'
